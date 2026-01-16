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

export default function HomePage() {
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
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold gradient-text">UVAI</h1>
          <p className="text-xl md:text-2xl text-gray-400">
            Video-to-Agentic Action Execution System
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Transform YouTube videos into executable code, structured workflows,
            and deployment instructions using AI.
          </p>
        </div>

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

        {/* API Info */}
        <div className="glass-card p-6 text-center animate-slide-up">
          <h3 className="text-lg font-semibold mb-4">
            API Endpoints{" "}
            <span className="status-badge">Active</span>
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="endpoint-tag">GET /health</span>
            <span className="endpoint-tag">POST /api/analyze</span>
            <span className="endpoint-tag">POST /api/analyze/youtube</span>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-sm">
          Powered by GenAIScript + Gemini + Cloudflare Workers
        </footer>
      </div>
    </main>
  );
}
