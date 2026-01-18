import { NextRequest, NextResponse } from "next/server";
import { analyzeVideoUrl, formatAgenticOutput, AgenticOutput } from "@/lib/gemini";

// Force dynamic rendering for API routes (required with output: "export")
export const dynamic = "force-dynamic";

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const regex =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate video URL
    if (!body.videoUrl) {
      return NextResponse.json(
        {
          error: "Missing required field: videoUrl",
          example: {
            videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
            outputMode: "agentic",
          },
        },
        { status: 400 }
      );
    }

    const videoId = extractYouTubeId(body.videoUrl);
    const items = body.items || "API endpoints, model capabilities, technical implementations";

    // Check if GOOGLE_API_KEY is available
    if (!process.env.GOOGLE_API_KEY) {
      console.log("GOOGLE_API_KEY not set, returning mock response");
      return NextResponse.json(
        {
          status: "pending",
          message: "Video analysis initiated (dev mode - no API key)",
          videoId: videoId,
          videoUrl: body.videoUrl,
          outputMode: body.outputMode || "agentic",
          estimatedTime: "30-60 seconds",
          note: "Set GOOGLE_API_KEY in .env for real analysis.",
          mockData: {
            title: "Video Analysis Preview",
            summary:
              "In production, this would contain the AI-generated analysis of the video content including extracted endpoints, model capabilities, and actionable insights.",
            extractedItems: [
              "API endpoint: /api/analyze",
              "Model: Gemini 2.0 Flash",
              "Capability: Video transcription and analysis",
            ],
          },
        },
        { status: 202 }
      );
    }

    // Perform real Gemini video analysis
    console.log(`Starting Gemini analysis for: ${body.videoUrl}`);

    try {
      const analysis: AgenticOutput = await analyzeVideoUrl(body.videoUrl, items);

      return NextResponse.json(
        {
          status: "success",
          message: "Video analysis completed",
          videoId: videoId,
          videoUrl: body.videoUrl,
          outputMode: body.outputMode || "agentic",
          analysis: analysis,
          formattedOutput: formatAgenticOutput(analysis),
        },
        { status: 200 }
      );
    } catch (analysisError) {
      console.error("Gemini analysis error:", analysisError);

      // Return error with details
      return NextResponse.json(
        {
          status: "error",
          message: "Video analysis failed",
          videoId: videoId,
          videoUrl: body.videoUrl,
          error: analysisError instanceof Error ? analysisError.message : "Unknown error",
          note: "Gemini may not be able to directly access this video URL. For YouTube videos, consider using the GenAIScript CLI which includes yt-dlp support.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Method not allowed. Use POST.",
      example: {
        videoUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
        outputMode: "agentic",
        items: "API endpoints, model capabilities",
      },
    },
    { status: 405 }
  );
}
