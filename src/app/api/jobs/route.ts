/**
 * Job Submission API Route
 *
 * POST /api/jobs - Submit a new video analysis job
 * GET /api/jobs - List all jobs with optional status filter
 *
 * FIREBASE DATA CONNECT: All operations persist to Cloud SQL PostgreSQL
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createJob,
  listJobs,
  getJobStats,
  processVideoJob,
  formatJobResponse,
  type JobStatus,
} from "@/lib/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoUrl, async = true } = body;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "videoUrl is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(videoUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Create the job (now async - writes to Cloud SQL)
    const job = await createJob(videoUrl);

    if (async) {
      // Return immediately, process in background
      // In production, this would publish to Pub/Sub
      processVideoJob(job.id).catch(console.error);

      return NextResponse.json({
        message: "Job submitted successfully",
        job: formatJobResponse(job),
        storage: "Cloud SQL PostgreSQL (Firebase Data Connect)",
      }, { status: 202 });
    } else {
      // Synchronous processing (for testing)
      const completedJob = await processVideoJob(job.id);
      return NextResponse.json({
        message: "Job completed",
        job: formatJobResponse(completedJob),
        storage: "Cloud SQL PostgreSQL (Firebase Data Connect)",
      });
    }
  } catch (error) {
    console.error("Job submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit job", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as JobStatus | null;
    const includeStats = searchParams.get("stats") === "true";

    // List jobs (now async - reads from Cloud SQL)
    const jobs = await listJobs(status || undefined);

    const response: Record<string, unknown> = {
      jobs: jobs.map(formatJobResponse),
      count: jobs.length,
      storage: "Cloud SQL PostgreSQL (Firebase Data Connect)",
    };

    if (includeStats) {
      response.stats = await getJobStats();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("List jobs error:", error);
    return NextResponse.json(
      { error: "Failed to list jobs", details: String(error) },
      { status: 500 }
    );
  }
}
