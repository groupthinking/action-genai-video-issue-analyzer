/**
 * Individual Job API Route
 *
 * GET /api/jobs/[jobId] - Get job status and result
 * DELETE /api/jobs/[jobId] - Cancel/delete a job
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
    const job = getJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      job: formatJobResponse(job),
    });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json(
      { error: "Failed to get job" },
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
    const job = getJob(jobId);

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

    updateJobStatus(jobId, "FAILED", { error: "Cancelled by user" });

    return NextResponse.json({
      message: "Job cancelled",
      job: formatJobResponse(getJob(jobId)!),
    });
  } catch (error) {
    console.error("Cancel job error:", error);
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
