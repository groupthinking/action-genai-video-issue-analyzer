import { NextRequest, NextResponse } from "next/server";

// For static export, this route handler will be compiled out.
// In development or with a Node.js runtime, it proxies to the Worker.
const WORKER_API_URL =
  process.env.WORKER_API_URL || "https://uvai.io/api/analyze";

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

    // Forward to Cloudflare Worker
    const response = await fetch(WORKER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        videoUrl: body.videoUrl,
        outputMode: body.outputMode || "agentic",
        items: body.items,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
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
      },
    },
    { status: 405 }
  );
}
