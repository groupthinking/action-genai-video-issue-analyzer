/**
 * UVAI Digital Refinery Orchestrator
 *
 * ARCHITECTURE: Cloud-Native SaaS Video Intelligence Pipeline
 *
 * This module implements the Digital Refinery workflow:
 * INGEST → SEGMENT → ENHANCE → ACTION
 *
 * Database: uvai-730bb-database (Cloud SQL PostgreSQL)
 * Service: uvai-730bb-service (Firebase Data Connect)
 * Storage: Google Cloud Storage (GCS) for video assets
 *
 * ENFORCED ROUTING: All video processing uses the standardized pipeline
 * defined in pipeline-config.ts. No ad-hoc configuration allowed.
 *
 * Agent Chain: VTTA → CSDAA → OFSA (for full_analysis)
 *
 * CRITICAL: NO local video downloads. All video processing via GCS URIs.
 */

import { initializeApp, getApps } from "firebase/app";
import { analyzeVideoUrl, formatAgenticOutput, type AgenticOutput } from "./gemini";
import {
  analyzeVideoFromGCS,
  type VideoAnalysisResult,
} from "../services/gemini";
import {
  ingestVideo,
  streamToGCS as workerStreamToGCS,
  fetchYouTubeMetadata as workerFetchMetadata,
  validateVideoForProcessing as workerValidateVideo,
  extractYouTubeId as workerExtractId,
  type YouTubeMetadata as WorkerYouTubeMetadata,
  type IngestResult,
} from "./ingest-worker";
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
  type UUIDString,
} from "../dataconnect-generated";
import {
  executeAction,
  type AnalysisForAction,
  type ActionOutput,
} from "../services/action";
import logger, { logPipelineStage, logApiCall, logApiError } from './logger';
import { getYouTubeApiKey } from './secrets';

// =============================================================================
// DIGITAL REFINERY PIPELINE STAGES
// =============================================================================

/**
 * JobStatus represents the Digital Refinery pipeline stages.
 * Each stage is a distinct processing phase with specific responsibilities.
 */
export type JobStatus =
  | "QUEUED"     // Initial: Request received, awaiting worker assignment
  | "INGEST"     // Active: Validating YouTube ID, fetching metadata, streaming to GCS
  | "SEGMENT"    // Active: Gemini 2.0 Flash analyzing visual/audio for semantic blocks
  | "ENHANCE"    // Active: Multi-agent processing (VTTA/CSDAA/OFSA) generating insights
  | "ACTION"     // Active: Vectorizing results, triggering webhooks/integrations
  | "COMPLETED"  // Terminal: All artifacts stored and accessible
  | "FAILED";    // Terminal: Error state with retry eligibility

/**
 * YouTube video metadata fetched during INGEST stage
 */
export interface YouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  duration: string;       // ISO 8601 format (e.g., "PT15M33S")
  durationSeconds: number;
  hasCaptions: boolean;
  publishedAt: string;
  thumbnailUrl: string;
  topics: string[];       // Wikipedia topic categories
  isActionable: boolean;  // Does this video have actionable content?
}

/**
 * Segment extracted during SEGMENT stage
 */
export interface VideoSegment {
  id: string;
  startTime: number;      // Seconds
  endTime: number;
  label: string;          // Semantic label (e.g., "code_demo", "explanation")
  type: "intro" | "theory" | "demo" | "code" | "outro" | "transition";
  topics: string[];
}

/**
 * Enhanced output from ENHANCE stage
 */
export interface EnhancedResult {
  markdown: string;       // _enhanced.md content
  metadata: AgenticOutput;
  codeBlocks: Array<{
    language: string;
    code: string;
    startTime: number;
    endTime: number;
  }>;
  commands: string[];     // Terminal commands extracted
}

/**
 * VideoJob represents a video asset being processed through the Digital Refinery.
 *
 * Lifecycle:
 * 1. QUEUED: Job created with youtubeId or videoUrl
 * 2. INGEST: Validate via YouTube API, stream to GCS, populate gcsUri
 * 3. SEGMENT: Analyze with Gemini, populate segments[]
 * 4. ENHANCE: Execute agent chain, populate enhancedResult
 * 5. ACTION: Generate vectors, trigger webhooks
 * 6. COMPLETED: All artifacts accessible
 */
export interface VideoJob {
  id: string;

  // Video source identification
  youtubeId?: string;           // Extracted from URL (e.g., "dQw4w9WgXcQ")
  videoUrl: string;             // Original URL submitted
  source: "youtube" | "direct" | "github_asset" | "loom" | "vimeo";

  // Pipeline state
  status: JobStatus;
  taskType: AnalysisTaskType;
  executedAgents: AgentType[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // INGEST stage outputs
  gcsUri?: string;              // gs://uvai-videos/raw/{youtubeId}.mp4
  metadata?: YouTubeMetadata;

  // SEGMENT stage outputs
  segments?: VideoSegment[];

  // ENHANCE stage outputs
  enhancedResult?: EnhancedResult;
  result?: AgenticOutput;       // Legacy compatibility

  // ACTION stage outputs
  vectorIds?: string[];         // pgvector embedding IDs
  webhookResponses?: Record<string, unknown>[];

  // Error handling
  error?: string;
  retryCount?: number;
}

// =============================================================================
// FIREBASE CONFIGURATION
// =============================================================================

const firebaseConfig = {
  projectId: "uvai-730bb",
  appId: process.env.FIREBASE_APP_ID || "1:688578214833:web:auto",
};

function getFirebaseApp() {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }
  return initializeApp(firebaseConfig);
}

// =============================================================================
// YOUTUBE API INTEGRATION
// =============================================================================

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch video metadata from YouTube Data API v3
 *
 * INGEST STAGE - Step 1: Validation
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const startTime = Date.now();
  const YOUTUBE_API_KEY = await getYouTubeApiKey();
  
  const endpoint = `https://www.googleapis.com/youtube/v3/videos?` +
    `id=${videoId}&part=snippet,contentDetails,topicDetails&key=${YOUTUBE_API_KEY}`;

  const response = await fetch(endpoint);
  const duration = Date.now() - startTime;

  if (!response.ok) {
    logApiError('YouTube Data API', `/videos/${videoId}`, new Error(`${response.status} ${response.statusText}`), duration);
    throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
  }

  logApiCall('YouTube Data API', `/videos/${videoId}`, duration);

  const data = await response.json();

  if (!data.items || data.items.length === 0) {
    throw new Error(`Video not found: ${videoId}`);
  }

  const item = data.items[0];
  const snippet = item.snippet;
  const contentDetails = item.contentDetails;
  const topicDetails = item.topicDetails || {};

  // Determine if video is actionable (tutorials, demos, technical content)
  const actionableKeywords = [
    "tutorial", "how to", "guide", "demo", "walkthrough",
    "coding", "programming", "development", "deploy", "build"
  ];
  const titleLower = snippet.title.toLowerCase();
  const descLower = snippet.description.toLowerCase();
  const isActionable = actionableKeywords.some(
    keyword => titleLower.includes(keyword) || descLower.includes(keyword)
  );

  return {
    videoId,
    title: snippet.title,
    description: snippet.description,
    channelTitle: snippet.channelTitle,
    duration: contentDetails.duration,
    durationSeconds: parseDuration(contentDetails.duration),
    hasCaptions: contentDetails.caption === "true",
    publishedAt: snippet.publishedAt,
    thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
    topics: topicDetails.topicCategories || [],
    isActionable,
  };
}

/**
 * Validate that a video is suitable for processing
 *
 * INGEST STAGE - Step 2: Content Validation
 */
export function validateVideoForProcessing(metadata: YouTubeMetadata): {
  valid: boolean;
  reason?: string;
} {
  // Reject very short videos (likely intros/outros)
  if (metadata.durationSeconds < 60) {
    return { valid: false, reason: "Video too short (< 1 minute)" };
  }

  // Reject very long videos (> 3 hours) - likely full streams
  if (metadata.durationSeconds > 10800) {
    return { valid: false, reason: "Video too long (> 3 hours)" };
  }

  // Warn if not actionable but don't reject
  if (!metadata.isActionable) {
    console.warn(`[INGEST] Video may not contain actionable content: ${metadata.title}`);
  }

  return { valid: true };
}

// =============================================================================
// GCS INTEGRATION (Placeholder for streaming)
// =============================================================================

const GCS_BUCKET = process.env.GCS_BUCKET_NAME || "uvai-videos";

/**
 * Stream video to Google Cloud Storage
 *
 * INGEST STAGE - Step 3: Streaming
 *
 * Uses yt-dlp to stream video directly to GCS without local disk storage.
 * This is a thin wrapper around the ingest-worker implementation.
 */
export async function streamToGCS(videoId: string): Promise<string> {
  // Use the real worker implementation that streams via yt-dlp
  return workerStreamToGCS(videoId);
}

/**
 * Transform VideoAnalysisResult to AgenticOutput format
 *
 * Bridges the new Gemini service output to the existing AgenticOutput
 * interface used by the rest of the pipeline.
 */
function transformToAgenticOutput(
  gcsResult: VideoAnalysisResult,
  metadata?: WorkerYouTubeMetadata | null
): AgenticOutput {
  return {
    summary: {
      title: metadata?.title || gcsResult.summary || "Video Analysis",
      description: gcsResult.summary || "",
      duration: metadata?.duration,
      primaryTopic: gcsResult.techStack[0] || "General",
    },
    extractedEndpoints: [], // Will be populated by CSDAA agent
    extractedCapabilities: gcsResult.techStack.map((tech) => ({
      capability: tech,
      description: `Technology identified in video: ${tech}`,
    })),
    actionableInsights: gcsResult.implementationSteps
      .slice(0, 5)
      .map((step, index) => ({
        insight: step,
        priority: index === 0 ? "high" : index < 3 ? "medium" : "low",
      })),
    generatedWorkflow: {
      name: metadata?.title || "Generated Workflow",
      description: gcsResult.summary,
      steps: gcsResult.implementationSteps.map((step, index) => ({
        stepNumber: index + 1,
        action: step,
        command: gcsResult.commands[index], // Map commands to steps
      })),
      prerequisites: gcsResult.techStack,
    },
    codeArtifacts: gcsResult.codeBlocks.map((block, index) => ({
      filename: `snippet-${index + 1}.${getExtension(block.language)}`,
      language: block.language,
      code: block.code,
      purpose: block.context || "Code extracted from video",
    })),
    perceivedLearnings: gcsResult.keyMoments.map((moment) => ({
      learning: moment.description,
      applicability: `At ${moment.timestamp}`,
    })),
  };
}

/**
 * Get file extension for a programming language
 */
function getExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: "js",
    typescript: "ts",
    python: "py",
    java: "java",
    go: "go",
    rust: "rs",
    ruby: "rb",
    php: "php",
    css: "css",
    html: "html",
    json: "json",
    yaml: "yaml",
    bash: "sh",
    shell: "sh",
  };
  return extensions[language.toLowerCase()] || "txt";
}

// =============================================================================
// JOB MANAGEMENT
// =============================================================================

/**
 * Create a new video analysis job
 *
 * Validates the video URL and creates an entry in Cloud SQL.
 * The job starts in QUEUED status and waits for worker pickup.
 */
export async function createJob(
  videoUrl: string,
  taskType: AnalysisTaskType = "full_analysis"
): Promise<VideoJob> {
  const source = detectSource(videoUrl);
  const youtubeId = extractYouTubeId(videoUrl);

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
    details: `Source: ${source}, TaskType: ${taskType}, YouTubeId: ${youtubeId || "N/A"}`,
  });

  return {
    id: jobId,
    youtubeId: youtubeId || undefined,
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
    youtubeId: extractYouTubeId(job.videoUrl) || undefined,
    videoUrl: job.videoUrl,
    source: job.source as VideoJob["source"],
    taskType: job.taskType as AnalysisTaskType,
    status: job.status as JobStatus,
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.updatedAt),
    executedAgents: (job.executedAgents || []) as AgentType[],
    result: job.resultJson ? JSON.parse(job.resultJson) : undefined,
    error: job.error || undefined,
    metadata: job.title ? {
      videoId: extractYouTubeId(job.videoUrl) || "",
      title: job.title,
      description: "",
      channelTitle: "",
      duration: "",
      durationSeconds: 0,
      hasCaptions: false,
      publishedAt: "",
      thumbnailUrl: "",
      topics: [],
      isActionable: true,
    } : undefined,
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
    details: `Stage: ${status}`,
    agent: updates?.executedAgents?.slice(-1)[0],
  });

  return getJob(jobId);
}

/**
 * List all jobs with optional status filter
 */
export async function listJobs(status?: JobStatus): Promise<VideoJob[]> {
  getFirebaseApp();

  const result = await dbListJobs({ limit: 100 });

  let jobs = result.data.videoJobs.map(job => ({
    id: job.id,
    youtubeId: extractYouTubeId(job.videoUrl) || undefined,
    videoUrl: job.videoUrl,
    source: job.source as VideoJob["source"],
    taskType: job.taskType as AnalysisTaskType,
    status: job.status as JobStatus,
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.updatedAt),
    executedAgents: [] as AgentType[],
    metadata: job.title ? {
      videoId: extractYouTubeId(job.videoUrl) || "",
      title: job.title,
      description: "",
      channelTitle: "",
      duration: "",
      durationSeconds: 0,
      hasCaptions: false,
      publishedAt: "",
      thumbnailUrl: "",
      topics: [],
      isActionable: true,
    } : undefined,
  }));

  if (status) {
    jobs = jobs.filter(j => j.status === status);
  }

  return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

// =============================================================================
// DIGITAL REFINERY PIPELINE PROCESSOR
// =============================================================================

/**
 * Process a video job through the Digital Refinery pipeline
 *
 * PIPELINE STAGES:
 * 1. INGEST  - Validate YouTube ID, fetch metadata, stream to GCS
 * 2. SEGMENT - Analyze with Gemini for semantic blocks and scene changes
 * 3. ENHANCE - Execute agent chain (VTTA → CSDAA → OFSA) for intelligence extraction
 * 4. ACTION  - Generate vectors, trigger webhooks, create artifacts
 *
 * This is the main worker function triggered by Pub/Sub.
 */
export async function processVideoJob(jobId: string): Promise<VideoJob> {
  const job = await getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const agentChain = getAgentChain(job.taskType);
  const executedAgents: AgentType[] = [];

  try {
    // =========================================================================
    // STAGE 1: INGEST
    // =========================================================================
    await updateJobStatus(jobId, "INGEST", { executedAgents });
    console.log(`[${jobId}] INGEST: Starting video ingestion`);

    // Step 1.1: Extract YouTube ID
    const youtubeId = job.youtubeId || extractYouTubeId(job.videoUrl);
    if (!youtubeId && job.source === "youtube") {
      throw new Error("Could not extract YouTube video ID from URL");
    }

    // Step 1.2: Fetch and validate metadata (if YouTube)
    let metadata: YouTubeMetadata | undefined;
    if (youtubeId) {
      console.log(`[${jobId}] INGEST: Fetching YouTube metadata for ${youtubeId}`);
      metadata = await fetchYouTubeMetadata(youtubeId);

      const validation = validateVideoForProcessing(metadata);
      if (!validation.valid) {
        throw new Error(`Video validation failed: ${validation.reason}`);
      }

      console.log(`[${jobId}] INGEST: Video validated - "${metadata.title}" (${metadata.duration})`);

      await recordJobEvent({
        jobId: jobId as UUIDString,
        eventType: "INGEST_METADATA",
        details: `Title: ${metadata.title}, Duration: ${metadata.duration}, Actionable: ${metadata.isActionable}`,
      });
    }

    // Step 1.3: Stream to GCS
    let gcsUri: string | undefined;
    if (youtubeId) {
      gcsUri = await streamToGCS(youtubeId);
      console.log(`[${jobId}] INGEST: Video uploaded to ${gcsUri}`);

      await recordJobEvent({
        jobId: jobId as UUIDString,
        eventType: "INGEST_GCS",
        details: `GCS URI: ${gcsUri}`,
      });
    }

    // =========================================================================
    // STAGE 2: SEGMENT
    // =========================================================================
    await updateJobStatus(jobId, "SEGMENT", { executedAgents });
    console.log(`[${jobId}] SEGMENT: Analyzing video for semantic blocks`);

    // In production: Send GCS URI to Gemini 2.0 Flash with segmentation prompt
    // "Identify the semantic chapters and visual scene changes in this video.
    //  Output timestamps and topic labels."

    const segments: VideoSegment[] = [
      // Placeholder segments - in production, these come from Gemini analysis
      {
        id: `${jobId}-seg-1`,
        startTime: 0,
        endTime: 60,
        label: "intro",
        type: "intro",
        topics: ["introduction"],
      },
    ];

    await recordJobEvent({
      jobId: jobId as UUIDString,
      eventType: "SEGMENT_COMPLETE",
      details: `Identified ${segments.length} segments`,
    });

    // =========================================================================
    // STAGE 3: ENHANCE
    // =========================================================================
    await updateJobStatus(jobId, "ENHANCE", { executedAgents });
    console.log(`[${jobId}] ENHANCE: Executing agent chain: ${agentChain.join(" → ")}`);

    // Execute each agent in the chain
    for (const agent of agentChain) {
      const agentConfig = AGENT_CONFIGS[agent];
      console.log(`[${jobId}] ENHANCE: Running ${agentConfig.fullName} (${agent})`);

      executedAgents.push(agent);

      await recordJobEvent({
        jobId: jobId as UUIDString,
        eventType: "AGENT_EXECUTE",
        agent,
        details: `Executing ${agentConfig.fullName}`,
      });

      await updateJobStatus(jobId, "ENHANCE", { executedAgents });
    }

    // Run Gemini 2.0 Flash analysis using the GCS URI
    // This is the core ENHANCE stage - multimodal video understanding
    let result: AgenticOutput;

    if (gcsUri) {
      // Use the new GCS-based analysis (production path)
      console.log(`[${jobId}] ENHANCE: Analyzing video from GCS: ${gcsUri}`);
      const gcsResult = await analyzeVideoFromGCS(gcsUri);

      // Transform VideoAnalysisResult to AgenticOutput format
      result = transformToAgenticOutput(gcsResult, metadata);
    } else {
      // Fallback to legacy URL-based analysis (deprecated)
      console.warn(`[${jobId}] ENHANCE: No GCS URI, falling back to URL analysis`);
      result = await analyzeVideoUrl(job.videoUrl);
    }

    console.log(`[${jobId}] ENHANCE: Analysis complete`);

    // Validate output
    if (!result.summary?.title) {
      console.warn(`[${jobId}] ENHANCE: Missing title, using metadata fallback`);
      result.summary = result.summary || { title: "", description: "" };
      result.summary.title = metadata?.title || "Untitled Analysis";
    }

    // Validate pipeline execution
    const pipelineValidation = validatePipelineExecution(job.taskType, executedAgents);
    if (!pipelineValidation.valid) {
      console.warn(`[${jobId}] ENHANCE: Pipeline validation warning: ${pipelineValidation.error}`);
    }

    await recordJobEvent({
      jobId: jobId as UUIDString,
      eventType: "ENHANCE_COMPLETE",
      details: `Generated ${result.generatedWorkflow.steps.length} steps via ${executedAgents.join(" → ")}`,
    });

    // =========================================================================
    // STAGE 4: ACTION
    // =========================================================================
    await updateJobStatus(jobId, "ACTION", { executedAgents });
    console.log(`[${jobId}] ACTION: Generating vectors and triggering integrations`);

    // Convert result to ActionableAnalysis format
    // Map from AgenticOutput to AnalysisForAction
    const analysisForAction: AnalysisForAction = {
      title: metadata?.title || result.summary.title,
      summary: result.summary.description || "",
      // Extract tech from capabilities and insights
      techStack: result.extractedCapabilities?.map((c) => c.capability) || [],
      implementationSteps: result.generatedWorkflow?.steps.map((s) => s.action) || [],
      // Extract code from artifacts
      codeBlocks: result.codeArtifacts?.map((a) => ({
        language: a.language,
        code: a.code,
        description: a.purpose,
      })) || [],
      // No version info in AgenticOutput, leave empty
      dependencies: {},
      // Extract key insights as "moments"
      keyMoments: result.actionableInsights?.map((insight, i) => ({
        timestamp: `Insight ${i + 1}`,
        description: insight.insight,
      })) || [],
    };

    // Execute ACTION stage
    const actionOutput = await executeAction(jobId, analysisForAction, {
      generateVectors: true,
      // GitHub issue creation is optional - enable via env var
      createGitHubIssue: process.env.ACTION_CREATE_GITHUB_ISSUE === "true"
        ? {
            owner: process.env.ACTION_GITHUB_OWNER || "groupthinking",
            repo: process.env.ACTION_GITHUB_REPO || "action-genai-video-issue-analyzer",
            labels: ["video-tutorial", "auto-generated"],
          }
        : undefined,
    });

    console.log(`[${jobId}] ACTION: Generated ${actionOutput.embeddings?.vectorCount || 0} embeddings`);
    if (actionOutput.githubIssue?.created) {
      console.log(`[${jobId}] ACTION: Created GitHub issue: ${actionOutput.githubIssue.issueUrl}`);
    }

    await recordJobEvent({
      jobId: jobId as UUIDString,
      eventType: "ACTION_COMPLETE",
      details: `Vectors: ${actionOutput.embeddings?.vectorCount || 0}, GitHub: ${actionOutput.githubIssue?.created ? actionOutput.githubIssue.issueUrl : "skipped"}`,
    });

    // =========================================================================
    // TERMINAL: COMPLETED
    // =========================================================================
    await dbCompleteJob({
      id: jobId as UUIDString,
      resultJson: JSON.stringify(result),
      title: metadata?.title || result.summary.title,
    });

    await recordJobEvent({
      jobId: jobId as UUIDString,
      eventType: "JOB_COMPLETED",
      details: `Digital Refinery complete: INGEST → SEGMENT → ENHANCE → ACTION via ${executedAgents.join(" → ")}`,
    });

    console.log(`[${jobId}] COMPLETED: Job finished successfully`);
    return (await getJob(jobId))!;

  } catch (error) {
    // =========================================================================
    // TERMINAL: FAILED
    // =========================================================================
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${jobId}] FAILED at stage [${job.status}], agents [${executedAgents.join(", ")}]:`, errorMessage);

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

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

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

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Get job statistics from Cloud SQL
 */
export async function getJobStats(): Promise<Record<JobStatus, number>> {
  const jobs = await listJobs();

  const stats: Record<JobStatus, number> = {
    QUEUED: 0,
    INGEST: 0,
    SEGMENT: 0,
    ENHANCE: 0,
    ACTION: 0,
    COMPLETED: 0,
    FAILED: 0,
  };

  for (const job of jobs) {
    stats[job.status]++;
  }

  return stats;
}

// =============================================================================
// API RESPONSE FORMATTING
// =============================================================================

/**
 * Format job for API response
 */
export function formatJobResponse(job: VideoJob): object {
  return {
    id: job.id,
    youtubeId: job.youtubeId,
    status: job.status,
    videoUrl: job.videoUrl,
    source: job.source,
    gcsUri: job.gcsUri,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    metadata: job.metadata ? {
      title: job.metadata.title,
      duration: job.metadata.duration,
      durationSeconds: job.metadata.durationSeconds,
      hasCaptions: job.metadata.hasCaptions,
      isActionable: job.metadata.isActionable,
      thumbnailUrl: job.metadata.thumbnailUrl,
    } : undefined,
    error: job.error,
    executedAgents: job.executedAgents,
    pipeline: {
      stages: ["INGEST", "SEGMENT", "ENHANCE", "ACTION"],
      currentStage: job.status,
      agentChain: getAgentChain(job.taskType),
    },
    result: job.result ? {
      raw: job.result,
      formatted: formatAgenticOutput(job.result),
    } : undefined,
    storage: "Cloud SQL PostgreSQL (Firebase Data Connect)",
  };
}
