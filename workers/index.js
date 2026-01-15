/**
 * Video Action Analyzer - Cloudflare Worker
 *
 * Provides REST API for video analysis using GenAIScript
 * Deployed at uvai.io
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers for API access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      switch (url.pathname) {
        case '/health':
          return new Response(JSON.stringify({
            status: 'healthy',
            service: 'video-action-analyzer',
            version: '1.0.0',
            environment: env.ENVIRONMENT || 'production',
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case '/api/analyze':
          return await handleAnalyze(request, env, corsHeaders);

        case '/api/analyze/youtube':
          return await handleYouTubeAnalyze(request, env, corsHeaders);

        default:
          // Serve a simple landing page for the root
          if (url.pathname === '/' || url.pathname === '') {
            return serveLandingPage(corsHeaders);
          }
          return new Response(JSON.stringify({ error: 'Not Found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Handle video analysis request
 */
async function handleAnalyze(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const contentType = request.headers.get('content-type') || '';
  let videoUrl, outputMode, items;

  if (contentType.includes('application/json')) {
    const body = await request.json();
    videoUrl = body.videoUrl;
    outputMode = body.outputMode || 'agentic';
    items = body.items || 'API endpoints, model capabilities';
  } else {
    return new Response(JSON.stringify({
      error: 'Invalid content type. Use application/json.'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!videoUrl) {
    return new Response(JSON.stringify({
      error: 'Missing required field: videoUrl',
      example: { videoUrl: 'https://www.youtube.com/watch?v=VIDEO_ID', outputMode: 'agentic' }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // For now, return a pending response - full implementation requires
  // background processing with Durable Objects or Queue integration
  return new Response(JSON.stringify({
    status: 'pending',
    message: 'Video analysis initiated',
    videoUrl: videoUrl,
    outputMode: outputMode,
    estimatedTime: '30-60 seconds',
    note: 'Full processing requires background worker integration'
  }), {
    status: 202,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Handle YouTube-specific analysis
 */
async function handleYouTubeAnalyze(request, env, corsHeaders) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const { youtubeUrl, outputMode = 'agentic' } = body;

  if (!youtubeUrl) {
    return new Response(JSON.stringify({
      error: 'Missing required field: youtubeUrl',
      example: { youtubeUrl: 'https://www.youtube.com/watch?v=VIDEO_ID' }
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Validate YouTube URL
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
  const match = youtubeUrl.match(youtubeRegex);

  if (!match) {
    return new Response(JSON.stringify({
      error: 'Invalid YouTube URL format',
      expectedFormats: [
        'https://www.youtube.com/watch?v=VIDEO_ID',
        'https://youtu.be/VIDEO_ID',
        'https://www.youtube.com/embed/VIDEO_ID'
      ]
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const videoId = match[1];

  return new Response(JSON.stringify({
    status: 'pending',
    message: 'YouTube analysis initiated',
    videoId: videoId,
    youtubeUrl: youtubeUrl,
    outputMode: outputMode,
    estimatedTime: '30-60 seconds',
    note: 'Full processing requires background worker integration'
  }), {
    status: 202,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Serve landing page
 */
function serveLandingPage(corsHeaders) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UVAI - Video-to-Agentic Action System</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      color: #e4e4e4;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      max-width: 800px;
      padding: 3rem;
      text-align: center;
    }
    h1 {
      font-size: 3.5rem;
      background: linear-gradient(90deg, #00d4ff, #7c3aed, #f97316);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }
    .tagline {
      font-size: 1.5rem;
      color: #a0a0a0;
      margin-bottom: 2rem;
    }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 2rem;
      margin: 1rem 0;
      backdrop-filter: blur(10px);
    }
    .endpoint {
      font-family: monospace;
      background: rgba(0,212,255,0.1);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      display: inline-block;
      margin: 0.5rem;
    }
    .status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: #22c55e;
      border-radius: 999px;
      font-size: 0.875rem;
      margin-left: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>UVAI</h1>
    <p class="tagline">Video-to-Agentic Action Execution System</p>

    <div class="card">
      <h2>🎯 Transform Video → Executable Code</h2>
      <p style="margin: 1rem 0; color: #a0a0a0;">
        Analyze YouTube videos and generate structured workflows, code artifacts, and deployment instructions.
      </p>
    </div>

    <div class="card">
      <h3>API Endpoints <span class="status">Active</span></h3>
      <p class="endpoint">GET /health</p>
      <p class="endpoint">POST /api/analyze</p>
      <p class="endpoint">POST /api/analyze/youtube</p>
    </div>

    <p style="margin-top: 2rem; color: #666;">
      Powered by GenAIScript + Cloudflare Workers
    </p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html' }
  });
}
