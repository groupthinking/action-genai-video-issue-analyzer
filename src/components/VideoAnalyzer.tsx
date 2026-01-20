"use client";

import { useState } from "react";
import VideoInput from "@/components/VideoInput";
import AnalysisResults from "@/components/AnalysisResults";

type AnalysisStatus = "idle" | "loading" | "success" | "error";

interface AnalysisResult {
  status: string;
  message?: string;
  videoId?: string;
  videoUrl?: string;
  estimatedTime?: string;
  error?: string;
}

/**
 * Client island for video analysis interaction.
 * Handles state management and API calls while allowing
 * the parent page to be a Server Component.
 */
export default function VideoAnalyzer() {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async (videoUrl: string) => {
    setStatus("loading");
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl, outputMode: "agentic" }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setStatus("success");
      } else {
        setResult({ status: "error", error: data.error || "Analysis failed" });
        setStatus("error");
      }
    } catch (error) {
      setResult({
        status: "error",
        error: error instanceof Error ? error.message : "Network error",
      });
      setStatus("error");
    }
  };

  return (
    <>
      {/* Input Card */}
      <div className="glass-card p-8 animate-slide-up">
        <VideoInput onSubmit={handleAnalyze} isLoading={status === "loading"} />
      </div>

      {/* Results */}
      {(status === "success" || status === "error") && result && (
        <div className="glass-card p-8 animate-slide-up">
          <AnalysisResults result={result} status={status} />
        </div>
      )}
    </>
  );
}
