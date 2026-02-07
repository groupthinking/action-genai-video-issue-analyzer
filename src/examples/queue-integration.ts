/**
 * Example: RabbitMQ Queue Integration
 * 
 * This example demonstrates how to integrate RabbitMQ queuing
 * into the video analysis pipeline for asynchronous processing.
 */

import { publishMessage, consumeMessages, QUEUES } from '../lib/queue';
import logger from '../lib/logger';

/**
 * Example: Queue a video for analysis
 */
export async function queueVideoForAnalysis(videoUrl: string, userId?: string) {
  logger.info(`Queuing video for analysis: ${videoUrl}`);

  const message = {
    videoUrl,
    userId,
    timestamp: new Date().toISOString(),
    priority: 'normal',
  };

  const success = await publishMessage(QUEUES.VIDEO_ANALYSIS, message, {
    priority: 5,
  });

  if (success) {
    logger.info(`Video queued successfully: ${videoUrl}`);
  } else {
    logger.error(`Failed to queue video: ${videoUrl}`);
  }

  return success;
}

/**
 * Example: Process video analysis queue
 */
export async function startVideoAnalysisWorker() {
  logger.info('Starting video analysis worker...');

  await consumeMessages(
    QUEUES.VIDEO_ANALYSIS,
    async (message: any) => {
      const { videoUrl, userId, timestamp } = message;

      logger.info(`Processing video analysis for: ${videoUrl}`, {
        userId,
        queuedAt: timestamp,
      });

      try {
        // Import analysis function dynamically to avoid circular dependencies
        const { analyzeVideoUrl } = await import('../lib/gemini');

        const startTime = Date.now();
        await analyzeVideoUrl(videoUrl);
        const duration = Date.now() - startTime;

        logger.info(`Video analysis completed: ${videoUrl}`, {
          duration,
          userId,
        });

        // Here you could publish the result to another queue,
        // store it in a database, or send a notification
        // await publishMessage(QUEUES.RESULTS, { videoUrl, result });
      } catch (error) {
        logger.error(`Video analysis failed: ${videoUrl}`, {
          error: error instanceof Error ? error.message : String(error),
          userId,
        });
        throw error; // Re-throw to trigger retry
      }
    },
    { prefetch: 1 } // Process one at a time
  );
}
