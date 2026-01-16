"use client";

import { useState, FormEvent } from "react";

interface VideoInputProps {
  onSubmit: (videoUrl: string) => void;
  isLoading: boolean;
}

export default function VideoInput({ onSubmit, isLoading }: VideoInputProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  const validateUrl = (url: string): boolean => {
    // YouTube URL patterns
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
    // Direct video URL patterns
    const videoRegex = /\.(mp4|webm|mov|avi)(\?.*)?$/i;

    return youtubeRegex.test(url) || videoRegex.test(url);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!videoUrl.trim()) {
      setError("Please enter a video URL");
      return;
    }

    if (!validateUrl(videoUrl)) {
      setError(
        "Please enter a valid YouTube URL or direct video file URL (.mp4, .webm, .mov)"
      );
      return;
    }

    onSubmit(videoUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="video-url"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Video URL
        </label>
        <input
          id="video-url"
          type="url"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="input-field"
          disabled={isLoading}
        />
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Analyzing...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Analyze Video
            </>
          )}
        </button>

        {isLoading && (
          <span className="text-sm text-gray-400">
            This may take 30-60 seconds...
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Supported: YouTube videos, direct .mp4/.webm/.mov URLs
      </p>
    </form>
  );
}
