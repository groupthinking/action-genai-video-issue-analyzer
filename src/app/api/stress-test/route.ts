/**
 * Stress Test API Endpoint
 *
 * POST /api/stress-test - Run stress tests and return results
 */

import { NextRequest, NextResponse } from "next/server";
import { runStressTests } from "@/lib/stress-test";

export async function POST(request: NextRequest) {
  try {
    console.log("[StressTest] Starting stress tests...");

    const results = await runStressTests();

    return NextResponse.json({
      success: results.passed,
      summary: results.passed ? "All tests passed" : "Some tests failed",
      results: results.results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Stress test error:", error);
    return NextResponse.json(
      { error: "Stress test failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/stress-test",
    method: "POST",
    description: "Run stress tests on the video analysis pipeline",
    tests: [
      "Concurrent Write Performance",
      "Read Performance",
      "Pipeline Routing Validation",
      "Event Recording Throughput",
      "Memory Usage Under Load",
    ],
  });
}
