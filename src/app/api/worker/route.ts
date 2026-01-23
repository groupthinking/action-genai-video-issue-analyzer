/**
 * Pub/Sub Worker Endpoint
 *
 * POST /api/worker - Receive Pub/Sub push messages for async job processing
 *
 * This endpoint is called by Cloud Pub/Sub when a new video analysis
 * job is published to the queue.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  handlePubSubPush,
  type PubSubPushRequest,
} from "@/lib/pubsub";

export async function POST(request: NextRequest) {
  try {
    // Verify this is a Pub/Sub push request
    const body = await request.json() as PubSubPushRequest;

    if (!body.message?.data) {
      return NextResponse.json(
        { error: "Invalid Pub/Sub message format" },
        { status: 400 }
      );
    }

    // Process the message
    const result = await handlePubSubPush(body);

    if (result.success) {
      // Return 200 to acknowledge the message
      return NextResponse.json({
        status: "processed",
        jobId: result.jobId,
      });
    } else {
      // Return 500 to trigger retry (if retries available)
      console.error(`Worker error: ${result.error}`);
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Worker endpoint error:", error);
    // Return 500 to trigger Pub/Sub retry
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Health check for the worker
export async function GET() {
  return NextResponse.json({
    status: "ready",
    endpoint: "/api/worker",
    description: "Pub/Sub push endpoint for video analysis jobs",
  });
}
