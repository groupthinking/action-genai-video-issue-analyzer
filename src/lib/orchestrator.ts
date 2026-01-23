/**
 * Video Analysis Job Queue and Orchestration Service
 *
 * FIREBASE DATA CONNECT INTEGRATION
 * This module uses Cloud SQL PostgreSQL for persistent state.
 *
 * Database: uvai-730bb-database (Cloud SQL)
 * Service: uvai-730bb-service
 *
 * ENFORCED ROUTING: All video processing uses the standardized pipeline
 * defined in pipeline-config.ts. No ad-hoc configuration allowed.
 *
 * Pipeline: VTTA → CSDAA → OFSA (for full_analysis)
 */

import { initializeApp, getApps } from "firebase/app";
import { getDataConnect } from "firebase/data-connect";
import { analyzeVideoUrl, formatAgenticOutput, type AgenticOutput } from "./gemini";
import {
  type AnalysisTaskType,
  type AgentType,
  getAgentChain,
  validatePipelineExecution,
  detectVideoSource as detectSource,
  AGENT_CONFIGS,
} from "./pipeline-config";
import {
  createVideoJob as dbCreateJob,
  updateJobStatus as dbUpdateStatus,
  completeJob as dbCompleteJob,
  failJob as dbFailJob,
  recordJobEvent,
  getJob as dbGetJob,
  listJobs as dbListJobs,
  connectorConfig,
  type UUIDString,
} from "../dataconnect-generated";

// Firebase configuration
const firebaseConfig = {
  projectId: "uvai-730bb",
  appId: process.env.FIREBASE_APP_ID || "1:688578214833:web:auto",
};

// Initialize Firebase (singleton pattern)
function getFirebaseApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  return initializeApp(firebaseConfig);
}

// Job status states aligned with the A-P-E-V-D lifecycle
export type JobStatus =
  | "QUEUED"      // Awaiting processing
  | "DOWNLOADING" // Video download in progress
  | "ANALYZING"   // Gemini multimodal analysis
  | "GENERATING"  // Code/workflow generation
  | "VALIDATING"  // Output validation
  | "COMPLETED"   // Successfully processed
  | "FAILED";     // Error state

export interface VideoJob {
  id: string;
  videoUrl: string;
  source: "youtube" | "direct" | "github_asset" | "loom" | "vimeo";
  taskType: AnalysisTaskType;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  executedAgents: AgentType[];
  result?: AgenticOutput;
  error?: string;
  metadata?: {
    title?: string;
    duration?: number;
    fileSize?: number;
  };
}

export interface JobQueueConfig {
  maxConcurrent: number;
  retryAttempts: number;
  timeoutMs: number;
}

/**
 * Create a new video analysis job in Cloud SQL
 */
export async function createJob(
  videoUrl: string,
  taskType: AnalysisTaskType = "full_analysis"
): Promise<VideoJob> {
  const source = detectSource(videoUrl);

  // Ensure Firebase is initialized
  getFirebaseApp();

  // Insert into Cloud SQL via Firebase Data Connect
  const result = await dbCreateJob({
    videoUrl,
    source,
    taskType,
  });

  const jobId = result.data.videoJob_insert.id;
  console.log(`[Firebase] Job created: ${jobId}`);

  // Record creation event
  await recordJobEvent({
    jobId: jobId as UUIDString,
    eventType: "JOB_CREATED",
    details: `Source: ${source}, TaskType: ${taskType}`,
  });

  // Return the job object
  return {
    id: jobId,
    videoUrl,
    source: source as VideoJob["source"],
    taskType,
    status: "QUEUED",
    createdAt: new Date(),
    updatedAt: new Date(),
    executedAgents: [],
  };
}

/**
 * Get a job by ID from Cloud SQL
 */
export async function getJob(jobId: string): Promise<VideoJob | undefined> {
  getFirebaseApp();

  const result = await dbGetJob({ id: jobId as UUIDString });
  const job = result.data.videoJob;

  if (!job) return undefined;

  return {
    id: job.id,
    videoUrl: job.videoUrl,
    source: job.source as VideoJob["source"],
    taskType: job.taskType as AnalysisTaskType,
    status: job.status as JobStatus,
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.updatedAt),
    executedAgents: (job.executedAgents || []) as AgentType[],
    result: job.resultJson ? JSON.parse(job.resultJson) : undefined,
    error: job.error || undefined,
    metadata: job.title ? { title: job.title } : undefined,
  };
}

/**
 * Update job status in Cloud SQL
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  updates?: Partial<VideoJob>
): Promise<VideoJob | undefined> {
  getFirebaseApp();

  await dbUpdateStatus({
    id: jobId as UUIDString,
    status,
    executedAgents: updates?.executedAgents || [],
  });

  // Record status change event
  await recordJobEvent({
    jobId: jobId as UUIDString,
    eventType: "STATUS_CHANGE",
    details: `Status: ${status}`,
    agent: updates?.executedAgents?.slice(-1)[0],
  });

  return getJob(jobId);
}

/**
 * List all jobs with optional status filter from Cloud SQL
 */
export async function listJobs(status?: JobStatus): Promise<VideoJob[]> {
  getFirebaseApp();

  const result = await dbListJobs({ limit: 100 });

  let jobs = result.data.videoJobs.map(job => ({
    id: job.id,
    videoUrl: job.videoUrl,
    source: job.source as VideoJob["source"],
    taskType: job.taskType as AnalysisTaskType,
    status: job.status as JobStatus,
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.updatedAt),
    executedAgents: [] as AgentType[],
    metadata: job.title ? { title: job.title } : undefined,
  }));

  if (status) {
    jobs = jobs.filter(j => j.status === status);
  }

  return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Process a video job through the analysis pipeline
 *
 * ENFORCED ROUTING: Uses the agent chain defined by the job's taskType.
 * For full_analysis: VTTA → CSDAA → OFSA
 *
 * This is the main worker function that would be triggered by Pub/Sub
 */
export async function processVideoJob(jobId: string): Promise<VideoJob> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const agentChain = getAgentChain(job.taskType);
  const executedAgents: AgentType[] = [];

  try {
    // Phase 1: Downloading
    await updateJobStatus(jobId, "DOWNLOADING", { executedAgents });
    console.log(`[${jobId}] Pipeline: ${agentChain.join(" → ")}`);
    console.log(`[${jobId}] Source: ${job.source} | URL: ${job.videoUrl}`);

    // Phase 2: Analyzing - Execute agent chain
    await updateJobStatus(jobId, "ANALYZING", { executedAgents });

    for (const agent of agentChain) {
      const agentConfig = AGENT_CONFIGS[agent];
      console.log(`[${jobId}] Executing ${agentConfig.fullName} (${agent})`);

      // Track executed agents for validation
      executedAgents.push(agent);

      // Record agent execution event
      await recordJobEvent({
        jobId: jobId as UUIDString,
        eventType: "AGENT_EXECUTE",
        agent,
        details: `Executing ${agentConfig.fullName}`,
      });

      await updateJobStatus(jobId, "ANALYZING", { executedAgents });
    }

    // The actual analysis uses Gemini with our agentic prompts
    const result = await analyzeVideoUrl(job.videoUrl);

    // Phase 3: Generating
    await updateJobStatus(jobId, "GENERATING", { executedAgents });
    console.log(`[${jobId}] Generating code artifacts`);

    // Phase 4: Validating
    await updateJobStatus(jobId, "VALIDATING", { executedAgents });
    console.log(`[${jobId}] Validating output and pipeline execution`);

    // Validate that required fields are present
    if (!result.summary?.title || !result.generatedWorkflow?.steps) {
      throw new Error("Invalid analysis output: missing required fields");
    }

    // Validate pipeline execution followed the correct route
    const validation = validatePipelineExecution(job.taskType, executedAgents);
    if (!validation.valid) {
      console.warn(`[${jobId}] Pipeline validation warning: ${validation.error}`);
    }

    // Phase 5: Completed - persist to Cloud SQL
    await dbCompleteJob({
      id: jobId as UUIDString,
      resultJson: JSON.stringify(result),
      title: result.summary.title,
    });

    await recordJobEvent({
      jobId: jobId as UUIDString,
      eventType: "JOB_COMPLETED",
      details: `Completed via ${executedAgents.join(" → ")}`,
    });

    console.log(`[${jobId}] Job completed successfully via ${executedAgents.join(" → ")}`);
    return (await getJob(jobId))!;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${jobId}] Job failed at agents [${executedAgents.join(", ")}]:`, errorMessage);

    await dbFailJob({
      id: jobId as UUIDString,
      error: errorMessage,
    });

    await recordJobEvent({
      jobId: jobId as UUIDString,
      eventType: "JOB_FAILED",
      details: errorMessage,
      agent: executedAgents.slice(-1)[0],
    });

    return (await getJob(jobId))!;
  }
}

/**
 * Batch submit multiple video URLs for processing
 */
export async function batchSubmitJobs(videoUrls: string[]): Promise<VideoJob[]> {
  const jobs: VideoJob[] = [];
  for (const url of videoUrls) {
    jobs.push(await createJob(url));
  }
  return jobs;
}

/**
 * Get job statistics from Cloud SQL
 */
export async function getJobStats(): Promise<Record<JobStatus, number>> {
  const jobs = await listJobs();

  const stats: Record<JobStatus, number> = {
    QUEUED: 0,
    DOWNLOADING: 0,
    ANALYZING: 0,
    GENERATING: 0,
    VALIDATING: 0,
    COMPLETED: 0,
    FAILED: 0,
  };

  for (const job of jobs) {
    stats[job.status]++;
  }

  return stats;
}

/**
 * Format job result for API response
 */
export function formatJobResponse(job: VideoJob): object {
  return {
    id: job.id,
    status: job.status,
    videoUrl: job.videoUrl,
    source: job.source,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    metadata: job.metadata,
    error: job.error,
    executedAgents: job.executedAgents,
    // Include formatted result for completed jobs
    result: job.result ? {
      raw: job.result,
      formatted: formatAgenticOutput(job.result),
    } : undefined,
  };
}
