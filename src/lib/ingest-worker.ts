/**
 * UVAI Ingest Worker
 *
 * ARCHITECTURE: Cloud-Native Video Streaming to GCS
 *
 * This worker handles the INGEST stage of the Digital Refinery:
 * 1. Validate video via YouTube Data API
 * 2. Stream video directly to GCS (no local disk)
 * 3. Return gs:// URI for downstream processing
 *
 * CRITICAL: Zero-disk footprint design for Cloud Run compatibility.
 * A 4GB video on a 2GB Cloud Run instance works perfectly because
 * we only buffer a few kilobytes at a time.
 */

import { Storage } from '@google-cloud/storage';
import { spawn } from 'child_process';
import logger, { logApiCall, logApiError, logPipelineStage } from './logger';
import { getYouTubeApiKey } from './secrets';

// =============================================================================
// CONFIGURATION
// =============================================================================

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'uvai-videos';

// =============================================================================
// YOUTUBE METADATA
// =============================================================================

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  duration: string;
  durationSeconds: number;
  hasCaptions: boolean;
  publishedAt: string;
  thumbnailUrl: string;
  topics: string[];
  isActionable: boolean;
}

/**
 * Parse ISO 8601 duration to seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch video metadata from YouTube Data API v3
 *
 * INGEST STAGE - Step 1: Validation
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const startTime = Date.now();
  const YOUTUBE_API_KEY = await getYouTubeApiKey();
  
  const endpoint = `https://www.googleapis.com/youtube/v3/videos?` +
    `id=${videoId}&part=snippet,contentDetails,topicDetails&key=${YOUTUBE_API_KEY}`;

  try {
    logger.debug(`Fetching YouTube metadata for video: ${videoId}`);
    const response = await fetch(endpoint);
    const duration = Date.now() - startTime;

    if (!response.ok) {
      // Sanitize endpoint to avoid logging API key
      const sanitizedEndpoint = endpoint.replace(/([?&]key=)[^&]*/i, '$1***');
      logApiError('YouTube Data API', sanitizedEndpoint, new Error(`${response.status} ${response.statusText}`), duration);
      throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
    }

    logApiCall('YouTube Data API', `/videos/${videoId}`, duration);

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const item = data.items[0];
    const snippet = item.snippet;
    const contentDetails = item.contentDetails;
    const topicDetails = item.topicDetails || {};

    // Determine if video is actionable (tutorials, demos, technical content)
    const actionableKeywords = [
      'tutorial', 'how to', 'guide', 'demo', 'walkthrough',
      'coding', 'programming', 'development', 'deploy', 'build',
      'api', 'sdk', 'framework', 'cloud', 'kubernetes', 'docker'
    ];
    const titleLower = snippet.title.toLowerCase();
    const descLower = snippet.description.toLowerCase();
    const isActionable = actionableKeywords.some(
      keyword => titleLower.includes(keyword) || descLower.includes(keyword)
    );

    return {
      videoId,
      title: snippet.title,
      description: snippet.description,
      channelTitle: snippet.channelTitle,
      duration: contentDetails.duration,
      durationSeconds: parseDuration(contentDetails.duration),
      hasCaptions: contentDetails.caption === 'true',
      publishedAt: snippet.publishedAt,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      topics: topicDetails.topicCategories || [],
      isActionable,
    };
  } catch (error) {
    logger.error('Failed to fetch YouTube metadata', {
      videoId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Validate that a video is suitable for processing
 *
 * INGEST STAGE - Step 2: Content Validation
 */
export function validateVideoForProcessing(metadata: YouTubeMetadata): {
  valid: boolean;
  reason?: string;
} {
  // Reject very short videos (likely intros/outros)
  if (metadata.durationSeconds < 30) {
    return { valid: false, reason: 'Video too short (< 30 seconds)' };
  }

  // Reject very long videos (> 3 hours) - likely full streams
  if (metadata.durationSeconds > 10800) {
    return { valid: false, reason: 'Video too long (> 3 hours)' };
  }

  // Warn if not actionable but don't reject
  if (!metadata.isActionable) {
    logger.warn('[INGEST] Video may not contain actionable content', { 
      title: metadata.title,
      videoId: metadata.videoId 
    });
  }

  return { valid: true };
}

// =============================================================================
// GCS STREAMING
// =============================================================================

/**
 * Streams a video directly from YouTube to GCS without saving to local disk.
 *
 * INGEST STAGE - Step 3: Streaming
 *
 * This is the core of the zero-disk-footprint architecture:
 * 1. yt-dlp outputs video binary to stdout
 * 2. We pipe stdout directly to GCS write stream
 * 3. Only a few KB buffered at any time
 *
 * @param videoId The YouTube Video ID
 * @returns The final GCS URI (gs://...)
 */
export async function streamToGCS(videoId: string): Promise<string> {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const fileName = `raw/${videoId}.mp4`;
  const file = storage.bucket(bucketName).file(fileName);

  logger.info('[INGEST] Starting stream', { 
    videoId, 
    destination: `gs://${bucketName}/${fileName}` 
  });

  return new Promise((resolve, reject) => {
    // 1. Create the GCS Write Stream
    const gcsStream = file.createWriteStream({
      resumable: false, // Optimizing for single-stream throughput
      metadata: {
        contentType: 'video/mp4',
        metadata: {
          source: 'youtube',
          originalId: videoId,
          ingestedAt: new Date().toISOString(),
        }
      }
    });

    // 2. Spawn yt-dlp process
    // -f b: Select best combined format
    // -o -: Output binary to STDOUT (zero-disk)
    // --extractor-args: Use android client to bypass SABR restrictions
    // --no-warnings: Suppress non-critical warnings
    const ytDlp = spawn('yt-dlp', [
      '--extractor-args', 'youtube:player_client=android',
      '-f', 'b',
      '-o', '-',
      '--no-warnings',
      videoUrl
    ]);

    // 3. Pipe stdout (video data) directly to GCS
    ytDlp.stdout.pipe(gcsStream);

    // 4. Error Handling & Cleanup

    // Collect stderr for error reporting
    let stderrData = '';
    ytDlp.stderr.on('data', (data) => {
      stderrData += data.toString();
      // Log progress updates (yt-dlp sends progress to stderr)
      const progressMatch = data.toString().match(/(\d+\.\d+)%/);
      if (progressMatch) {
        logger.debug('[INGEST] Download progress', { 
          videoId, 
          progress: `${progressMatch[1]}%` 
        });
      }
    });

    ytDlp.on('error', (err) => {
      logger.error('[INGEST] yt-dlp process error', { 
        videoId, 
        error: err.message 
      });
      gcsStream.destroy(err);
      reject(err);
    });

    ytDlp.on('close', (code) => {
      if (code !== 0) {
        const error = new Error(`yt-dlp exited with code ${code}: ${stderrData}`);
        logger.error('[INGEST] yt-dlp failed', { 
          videoId, 
          code, 
          stderr: stderrData 
        });
        gcsStream.destroy(error);
        reject(error);
      } else {
        // Wait for the GCS stream to finish closing
        gcsStream.end();
      }
    });

    gcsStream.on('finish', () => {
      const gcsUri = `gs://${bucketName}/${fileName}`;
      logger.info('[INGEST] Stream complete', { videoId, gcsUri });
      resolve(gcsUri);
    });

    gcsStream.on('error', (err) => {
      logger.error('[INGEST] GCS stream error', { 
        videoId, 
        error: err.message 
      });
      ytDlp.kill(); // Kill the downloader if upload fails
      reject(err);
    });
  });
}

// =============================================================================
// COMPLETE INGEST WORKFLOW
// =============================================================================

export interface IngestResult {
  gcsUri: string;
  metadata: YouTubeMetadata;
  duration: number; // Processing time in ms
}

/**
 * Complete INGEST stage workflow
 *
 * 1. Validate video via YouTube API
 * 2. Stream video to GCS
 * 3. Return GCS URI and metadata
 */
export async function ingestVideo(videoId: string): Promise<IngestResult> {
  const startTime = Date.now();

  logPipelineStage('INGEST', videoId, 'start');
  logger.info('[INGEST] Starting ingestion', { videoId });

  // Step 1: Fetch and validate metadata
  logger.info('[INGEST] Step 1/3: Fetching YouTube metadata', { videoId });
  const metadata = await fetchYouTubeMetadata(videoId);
  logger.info('[INGEST] Video metadata fetched', { 
    videoId,
    title: metadata.title, 
    duration: metadata.duration 
  });

  // Step 2: Validate content
  logger.info('[INGEST] Step 2/3: Validating video content', { videoId });
  const validation = validateVideoForProcessing(metadata);
  if (!validation.valid) {
    throw new Error(`Video validation failed: ${validation.reason}`);
  }
  logger.info('[INGEST] Validation passed', { 
    videoId,
    isActionable: metadata.isActionable 
  });

  // Step 3: Stream to GCS
  logger.info('[INGEST] Step 3/3: Streaming to GCS', { videoId });
  const gcsUri = await streamToGCS(videoId);

  const duration = Date.now() - startTime;
  logPipelineStage('INGEST', videoId, 'complete', duration);
  logger.info('[INGEST] Ingestion complete', { videoId, gcsUri, duration });

  return {
    gcsUri,
    metadata,
    duration,
  };
}

// =============================================================================
// UTILITY: Extract YouTube ID
// =============================================================================

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// =============================================================================
// CLI TEST (when run directly)
// =============================================================================

// Allow running this file directly for testing
if (require.main === module) {
  const testVideoId = process.argv[2] || 'Jg2al3n-QeE'; // Default test video

  console.log(`\n[TEST] Running ingest worker test with video: ${testVideoId}\n`);

  ingestVideo(testVideoId)
    .then(result => {
      console.log('\n[TEST] Ingest successful!');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('\n[TEST] Ingest failed:', err.message);
      process.exit(1);
    });
}
