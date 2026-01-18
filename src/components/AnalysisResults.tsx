"use client";

import { AgenticOutput } from "@/lib/gemini";

interface AnalysisResult {
  status: string;
  message?: string;
  videoId?: string;
  videoUrl?: string;
  estimatedTime?: string;
  error?: string;
  analysis?: AgenticOutput;
  formattedOutput?: string;
}

interface AnalysisResultsProps {
  result: AnalysisResult;
  status: "success" | "error";
}

export default function AnalysisResults({
  result,
  status,
}: AnalysisResultsProps) {
  if (status === "error") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-red-400">Analysis Failed</h3>
        </div>
        <p className="text-gray-300">{result.error}</p>
      </div>
    );
  }

  const analysis = result.analysis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <svg
          className="w-6 h-6 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-green-400">
          {result.status === "pending" ? "Analysis Initiated" : "Analysis Complete"}
        </h3>
      </div>

      {/* Summary Section */}
      {analysis?.summary && (
        <div className="glass-card p-6 rounded-xl space-y-3">
          <h2 className="text-2xl font-bold gradient-text">
            {analysis.summary.title}
          </h2>
          <p className="text-gray-300">{analysis.summary.description}</p>
          <div className="flex gap-4 text-sm">
            <span className="endpoint-tag">{analysis.summary.primaryTopic}</span>
            {analysis.summary.duration && (
              <span className="text-gray-500">Duration: {analysis.summary.duration}</span>
            )}
          </div>
        </div>
      )}

      {/* Actionable Insights */}
      {analysis?.actionableInsights && analysis.actionableInsights.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-accent-cyan flex items-center gap-2">
            <span>⚡</span> Actionable Insights
          </h4>
          <div className="space-y-2">
            {analysis.actionableInsights.map((insight, i) => (
              <div key={i} className="glass-card p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <span className={`status-badge ${
                    insight.priority === "high" ? "bg-red-500/20 text-red-400" :
                    insight.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                    "bg-green-500/20 text-green-400"
                  } text-xs px-2 py-1 rounded`}>
                    {insight.priority.toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-200 font-medium">{insight.insight}</p>
                    {insight.implementation && (
                      <p className="text-gray-400 text-sm mt-1">→ {insight.implementation}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Endpoints */}
      {analysis?.extractedEndpoints && analysis.extractedEndpoints.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-accent-purple flex items-center gap-2">
            <span>🔗</span> Extracted Endpoints
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.extractedEndpoints.map((ep, i) => (
              <div key={i} className="endpoint-tag">
                <span className="text-accent-cyan">{ep.method || "GET"}</span>{" "}
                <code>{ep.endpoint}</code>
                <span className="text-gray-500 ml-2">– {ep.purpose}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Workflow */}
      {analysis?.generatedWorkflow && analysis.generatedWorkflow.steps && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-accent-orange flex items-center gap-2">
            <span>🔧</span> {analysis.generatedWorkflow.name}
          </h4>
          {analysis.generatedWorkflow.description && (
            <p className="text-gray-400 text-sm">{analysis.generatedWorkflow.description}</p>
          )}
          <div className="space-y-2">
            {analysis.generatedWorkflow.steps.map((step, i) => (
              <div key={i} className="glass-card p-3 rounded-lg flex gap-4">
                <span className="text-accent-cyan font-bold">{step.stepNumber}.</span>
                <div className="flex-1">
                  <p className="text-gray-200">{step.action}</p>
                  {step.command && (
                    <code className="block mt-1 text-sm text-gray-400 bg-black/30 px-2 py-1 rounded">
                      $ {step.command}
                    </code>
                  )}
                </div>
              </div>
            ))}
          </div>
          {analysis.generatedWorkflow.estimatedTime && (
            <p className="text-gray-500 text-sm">
              ⏱ Estimated time: {analysis.generatedWorkflow.estimatedTime}
            </p>
          )}
        </div>
      )}

      {/* Perceived Learnings */}
      {analysis?.perceivedLearnings && analysis.perceivedLearnings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-green-400 flex items-center gap-2">
            <span>📚</span> Perceived Learnings
          </h4>
          <div className="space-y-2">
            {analysis.perceivedLearnings.map((learning, i) => (
              <div key={i} className="glass-card p-4 rounded-lg">
                <p className="text-gray-200 font-medium">{learning.learning}</p>
                <p className="text-gray-400 text-sm mt-1">
                  <strong>Applicability:</strong> {learning.applicability}
                </p>
                {learning.suggestedChange && (
                  <p className="text-accent-cyan text-sm mt-1">
                    <strong>Suggested Change:</strong> {learning.suggestedChange}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Artifacts */}
      {analysis?.codeArtifacts && analysis.codeArtifacts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
            <span>📄</span> Code Artifacts
          </h4>
          <div className="space-y-3">
            {analysis.codeArtifacts.map((artifact, i) => (
              <div key={i} className="glass-card rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-black/40 flex justify-between items-center">
                  <span className="font-mono text-sm text-gray-300">{artifact.filename}</span>
                  <span className="text-xs text-gray-500">{artifact.language}</span>
                </div>
                <pre className="p-4 text-sm overflow-x-auto">
                  <code className="text-gray-300">{artifact.code}</code>
                </pre>
                <p className="px-4 py-2 text-sm text-gray-500 border-t border-gray-700">
                  {artifact.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Footer */}
      <div className="border-t border-gray-700 pt-4 grid gap-2 text-sm">
        {result.videoId && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Video ID</span>
            <code className="endpoint-tag text-xs">{result.videoId}</code>
          </div>
        )}
        {result.videoUrl && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">URL</span>
            <a
              href={result.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-cyan hover:underline truncate max-w-[300px]"
            >
              {result.videoUrl}
            </a>
          </div>
        )}
      </div>

      {result.status === "pending" && (
        <p className="text-sm text-gray-500 mt-4">
          Full processing requires background worker integration. The API will
          return results asynchronously.
        </p>
      )}
    </div>
  );
}
