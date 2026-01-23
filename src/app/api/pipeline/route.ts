/**
 * Pipeline Status API Route
 *
 * GET /api/pipeline - Get pipeline configuration and health status
 */

import { NextRequest, NextResponse } from "next/server";
import {
  AGENT_CONFIGS,
  PIPELINE_ROUTES,
  type AgentType,
  type AnalysisTaskType,
} from "@/lib/pipeline-config";
import { getJobStats } from "@/lib/orchestrator";

export async function GET(request: NextRequest) {
  try {
    const stats = getJobStats();

    // Calculate health status
    const totalJobs = Object.values(stats).reduce((a, b) => a + b, 0);
    const failedRatio = totalJobs > 0 ? stats.FAILED / totalJobs : 0;
    const healthStatus = failedRatio > 0.5 ? "degraded" : failedRatio > 0.1 ? "warning" : "healthy";

    return NextResponse.json({
      health: {
        status: healthStatus,
        timestamp: new Date().toISOString(),
        stats,
      },
      pipeline: {
        description: "Video Analysis Pipeline (VTTA → CSDAA → OFSA)",
        routes: PIPELINE_ROUTES,
        agents: Object.entries(AGENT_CONFIGS).map(([key, config]) => ({
          id: key,
          ...config,
        })),
      },
      capabilities: {
        supportedSources: ["youtube", "direct", "github_asset", "loom", "vimeo"],
        taskTypes: Object.keys(PIPELINE_ROUTES) as AnalysisTaskType[],
        outputFormats: ["json", "markdown"],
      },
      version: "1.0.0",
    });
  } catch (error) {
    console.error("Pipeline status error:", error);
    return NextResponse.json(
      { error: "Failed to get pipeline status" },
      { status: 500 }
    );
  }
}
