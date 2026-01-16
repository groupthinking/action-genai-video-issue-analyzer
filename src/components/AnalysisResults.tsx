"use client";

interface AnalysisResult {
  status: string;
  message?: string;
  videoId?: string;
  videoUrl?: string;
  estimatedTime?: string;
  error?: string;
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

  return (
    <div className="space-y-4">
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

      <div className="grid gap-3">
        {result.message && (
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-gray-400">Message</span>
            <span className="text-gray-200">{result.message}</span>
          </div>
        )}

        {result.videoId && (
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-gray-400">Video ID</span>
            <code className="endpoint-tag text-sm">{result.videoId}</code>
          </div>
        )}

        {result.videoUrl && (
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
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

        {result.estimatedTime && (
          <div className="flex justify-between items-center py-2 border-b border-gray-700">
            <span className="text-gray-400">Estimated Time</span>
            <span className="status-badge pending">{result.estimatedTime}</span>
          </div>
        )}

        <div className="flex justify-between items-center py-2">
          <span className="text-gray-400">Status</span>
          <span
            className={`status-badge ${
              result.status === "pending" ? "pending" : ""
            }`}
          >
            {result.status}
          </span>
        </div>
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
