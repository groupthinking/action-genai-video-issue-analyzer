/**
 * Pub/Sub Integration for Video Analysis Jobs
 *
 * This module provides the bridge between the API ingestion layer
 * and the async worker processing via Google Cloud Pub/Sub.
 *
 * Architecture:
 * - API → Pub/Sub Topic (video-analysis-jobs)
 * - Worker ← Pub/Sub Subscription (push to Cloud Run worker)
 */

import { processVideoJob, createJob, getJob, type VideoJob } from "./orchestrator";
import type { AnalysisTaskType } from "./pipeline-config";

// Pub/Sub message interface
export interface PubSubMessage {
  jobId: string;
  videoUrl: string;
  taskType: AnalysisTaskType;
  timestamp: string;
  retryCount: number;
}

// Pub/Sub push request body (from Cloud Run)
export interface PubSubPushRequest {
  message: {
    data: string; // Base64 encoded JSON
    messageId: string;
    publishTime: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

/**
 * Create a Pub/Sub message from a job
 */
export function createPubSubMessage(job: VideoJob): PubSubMessage {
  return {
    jobId: job.id,
    videoUrl: job.videoUrl,
    taskType: job.taskType,
    timestamp: new Date().toISOString(),
    retryCount: 0,
  };
}

/**
 * Decode a Pub/Sub push request
 */
export function decodePubSubPush(request: PubSubPushRequest): PubSubMessage | null {
  try {
    const data = Buffer.from(request.message.data, "base64").toString("utf-8");
    return JSON.parse(data) as PubSubMessage;
  } catch (error) {
    console.error("Failed to decode Pub/Sub message:", error);
    return null;
  }
}

/**
 * Encode a message for Pub/Sub publishing
 */
export function encodePubSubMessage(message: PubSubMessage): string {
  return Buffer.from(JSON.stringify(message)).toString("base64");
}

/**
 * Publish a job to Pub/Sub (simulation for local development)
 * In production, this would use @google-cloud/pubsub
 */
export async function publishToQueue(
  videoUrl: string,
  taskType: AnalysisTaskType = "full_analysis"
): Promise<{ jobId: string; messageId: string }> {
  // Create the job first
  const job = createJob(videoUrl, taskType);
  const message = createPubSubMessage(job);

  // In production: Use Google Cloud Pub/Sub client
  // const pubsub = new PubSub();
  // const topic = pubsub.topic('video-analysis-jobs');
  // const [messageId] = await topic.publishMessage({ data: Buffer.from(JSON.stringify(message)) });

  // For local development: Process directly (simulating async)
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  console.log(`[PubSub] Published message ${messageId} for job ${job.id}`);

  // Simulate async processing
  setImmediate(() => {
    processVideoJob(job.id).catch(console.error);
  });

  return { jobId: job.id, messageId };
}

/**
 * Handle incoming Pub/Sub push request (Cloud Run worker endpoint)
 */
export async function handlePubSubPush(
  request: PubSubPushRequest
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const message = decodePubSubPush(request);

  if (!message) {
    return { success: false, error: "Invalid message format" };
  }

  console.log(`[PubSub] Received message for job ${message.jobId} (retry: ${message.retryCount})`);

  // Check if job exists
  const job = getJob(message.jobId);
  if (!job) {
    return { success: false, error: `Job ${message.jobId} not found` };
  }

  // Process the job
  try {
    await processVideoJob(message.jobId);
    return { success: true, jobId: message.jobId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PubSub] Job ${message.jobId} failed:`, errorMessage);
    return { success: false, jobId: message.jobId, error: errorMessage };
  }
}

/**
 * Configuration for Pub/Sub topics and subscriptions
 */
export const PUBSUB_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT || "uvai-730bb",
  topics: {
    jobs: "video-analysis-jobs",
    results: "video-analysis-results",
    deadLetter: "video-analysis-dead-letter",
  },
  subscriptions: {
    worker: "video-analysis-worker",
    resultsProcessor: "video-analysis-results-processor",
  },
  settings: {
    ackDeadlineSeconds: 600, // 10 minutes for video processing
    maxRetries: 3,
    retryPolicy: {
      minimumBackoff: "10s",
      maximumBackoff: "600s",
    },
  },
} as const;
