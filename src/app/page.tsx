import VideoAnalyzer from "@/components/VideoAnalyzer";

/**
 * Homepage - Server Component
 *
 * Static content is server-rendered for better performance:
 * - Hero section (title, description)
 * - API endpoints info
 * - Footer
 *
 * Interactive content is handled by client islands:
 * - VideoAnalyzer (input + results with state management)
 */
export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl w-full space-y-8">
        {/* Hero Section - Server Rendered */}
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

        {/* Client Island - Interactive Video Analysis */}
        <VideoAnalyzer />

        {/* API Info - Server Rendered */}
        <div className="glass-card p-6 text-center animate-slide-up">
          <h3 className="text-lg font-semibold mb-4">
            API Endpoints <span className="status-badge">Active</span>
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="endpoint-tag">GET /health</span>
            <span className="endpoint-tag">POST /api/analyze</span>
            <span className="endpoint-tag">POST /api/analyze/youtube</span>
          </div>
        </div>

        {/* Footer - Server Rendered */}
        <footer className="text-center text-gray-600 text-sm">
          Powered by GenAIScript + Gemini + Cloudflare Workers
        </footer>
      </div>
    </main>
  );
}
