/**
 * Individual Job API Route
 *
 * GET /api/jobs/[jobId] - Get job status and result
 * DELETE /api/jobs/[jobId] - Cancel/delete a job
 *
 * FIREBASE DATA CONNECT: All operations persist to Cloud SQL PostgreSQL
 */

import { NextRequest, NextResponse } from "next/server";
import { getJob, updateJobStatus, formatJobResponse } from "@/lib/orchestrator";

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { jobId } = await params;
    // Now async - reads from Cloud SQL
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      job: formatJobResponse(job),
      storage: "Cloud SQL PostgreSQL (Firebase Data Connect)",
    });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json(
      { error: "Failed to get job", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { jobId } = await params;
    // Now async - reads from Cloud SQL
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Can only cancel queued or in-progress jobs
    if (job.status === "COMPLETED" || job.status === "FAILED") {
      return NextResponse.json(
        { error: "Cannot cancel a completed or failed job" },
        { status: 400 }
      );
    }

    // Now async - writes to Cloud SQL
    await updateJobStatus(jobId, "FAILED", { error: "Cancelled by user" } as any);
    const updatedJob = await getJob(jobId);

    return NextResponse.json({
      message: "Job cancelled",
      job: formatJobResponse(updatedJob!),
      storage: "Cloud SQL PostgreSQL (Firebase Data Connect)",
    });
  } catch (error) {
    console.error("Cancel job error:", error);
    return NextResponse.json(
      { error: "Failed to cancel job", details: String(error) },
      { status: 500 }
    );
  }
}
