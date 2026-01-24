/**
 * Semantic Search API Route
 *
 * POST /api/search - Search video analyses using semantic similarity
 *
 * Uses pgvector for vector similarity search across all stored video embeddings.
 */

import { NextRequest, NextResponse } from "next/server";
import { searchSimilar, listRecentEmbeddings } from "@/services/embedding";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10 } = body;

    if (!query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    if (typeof query !== "string" || query.length < 3) {
      return NextResponse.json(
        { error: "query must be a string with at least 3 characters" },
        { status: 400 }
      );
    }

    console.log(`[SEARCH] Query: "${query}" (limit: ${limit})`);

    const results = await searchSimilar(query, Math.min(limit, 50));

    return NextResponse.json({
      query,
      resultCount: results.length,
      results: results.map((r) => ({
        content: r.content,
        segmentType: r.segmentType,
        similarity: Math.round(r.similarity * 1000) / 1000, // 3 decimal places
        job: {
          id: r.jobId,
          title: r.jobTitle,
          videoUrl: r.videoUrl,
        },
      })),
    });
  } catch (error) {
    console.error("Search error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED") || error.message.includes("connect")) {
        return NextResponse.json(
          {
            error: "Database connection failed",
            hint: "Ensure Cloud SQL is accessible. In local dev, use Cloud SQL Auth Proxy.",
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: "Search failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    // List recent embeddings (no search, just listing)
    const embeddings = await listRecentEmbeddings(Math.min(limit, 100));

    return NextResponse.json({
      count: embeddings.length,
      embeddings: embeddings.map((e) => ({
        id: e.id,
        segmentType: e.segmentType,
        segmentIndex: e.segmentIndex,
        content: e.content.substring(0, 200) + (e.content.length > 200 ? "..." : ""),
        job: {
          id: e.jobId,
          title: e.jobTitle,
          videoUrl: e.videoUrl,
        },
      })),
    });
  } catch (error) {
    console.error("List embeddings error:", error);
    return NextResponse.json(
      { error: "Failed to list embeddings", details: String(error) },
      { status: 500 }
    );
  }
}
