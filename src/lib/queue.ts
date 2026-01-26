/**
 * RabbitMQ Queue Service
 * 
 * Provides asynchronous message queuing for external API calls
 * to prevent blocking during high load.
 */

import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import logger from './logger';
import { getRabbitMQUrl } from './secrets';

// Queue names
export const QUEUES = {
  VIDEO_ANALYSIS: 'video_analysis',
  YOUTUBE_INGEST: 'youtube_ingest',
  GEMINI_ENHANCE: 'gemini_enhance',
  EMBEDDING_GENERATION: 'embedding_generation',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];

// Singleton connection and channel
let connection: Connection | null = null;
let channel: Channel | null = null;
let isConnecting = false;

/**
 * Connect to RabbitMQ
 */
export async function connect(): Promise<void> {
  if (connection && channel) {
    logger.debug('RabbitMQ already connected');
    return;
  }

  if (isConnecting) {
    logger.debug('RabbitMQ connection in progress, waiting...');
    // Wait for connection to complete with exponential backoff
    let waitTime = 500;
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      if (connection && channel) {
        return;
      }
      waitTime *= 2;
    }
    throw new Error('RabbitMQ connection timeout');
  }

  try {
    isConnecting = true;
    const url = await getRabbitMQUrl();
    logger.info(`Connecting to RabbitMQ: ${url.replace(/\/\/.*@/, '//***@')}`);

    connection = await amqp.connect(url);
    channel = await connection.createChannel();

    // Create queues
    for (const queueName of Object.values(QUEUES)) {
      await channel.assertQueue(queueName, { durable: true });
      logger.info(`Queue created/verified: ${queueName}`);
    }

    // Handle connection errors
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { error: err.message });
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    logger.info('RabbitMQ connected successfully');
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ', {
      error: error instanceof Error ? error.message : String(error),
    });
    connection = null;
    channel = null;
    isConnecting = false; // Reset flag before throwing to prevent deadlock
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Disconnect from RabbitMQ
 */
export async function disconnect(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info('RabbitMQ disconnected');
  } catch (error) {
    logger.error('Error disconnecting from RabbitMQ', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Publish a message to a queue
 */
export async function publishMessage(
  queueName: QueueName,
  message: object,
  options?: { priority?: number }
): Promise<boolean> {
  try {
    if (!channel) {
      await connect();
    }

    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    const sent = channel.sendToQueue(queueName, messageBuffer, {
      persistent: true,
      priority: options?.priority,
    });

    if (sent) {
      logger.debug(`Message published to queue: ${queueName}`, { message });
    } else {
      logger.warn(`Failed to publish message to queue: ${queueName}`);
    }

    return sent;
  } catch (error) {
    logger.error(`Error publishing message to queue: ${queueName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Consume messages from a queue
 */
export async function consumeMessages(
  queueName: QueueName,
  handler: (message: object) => Promise<void>,
  options?: { prefetch?: number }
): Promise<void> {
  try {
    if (!channel) {
      await connect();
    }

    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }

    // Set prefetch count for fair dispatch
    await channel.prefetch(options?.prefetch || 1);

    logger.info(`Starting to consume messages from queue: ${queueName}`);

    await channel.consume(
      queueName,
      async (msg: ConsumeMessage | null) => {
        if (!msg) {
          return;
        }

        try {
          const messageContent = JSON.parse(msg.content.toString());
          logger.debug(`Processing message from queue: ${queueName}`, { message: messageContent });

          await handler(messageContent);

          // Acknowledge the message
          channel?.ack(msg);
          logger.debug(`Message acknowledged: ${queueName}`);
        } catch (error) {
          logger.error(`Error processing message from queue: ${queueName}`, {
            error: error instanceof Error ? error.message : String(error),
          });

          // Reject and requeue the message
          // TODO: Consider implementing a retry limit mechanism (e.g., using message headers
          // to track retry count) or moving permanently failing messages to a dead-letter
          // queue after a certain number of retries to avoid infinite loops.
          channel?.nack(msg, false, true);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    logger.error(`Error consuming messages from queue: ${queueName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get queue status
 */
export async function getQueueStatus(queueName: QueueName): Promise<{
  messageCount: number;
  consumerCount: number;
}> {
  try {
    if (!channel) {
      await connect();
    }

    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }

    const queueInfo = await channel.checkQueue(queueName);
    return {
      messageCount: queueInfo.messageCount,
      consumerCount: queueInfo.consumerCount,
    };
  } catch (error) {
    logger.error(`Error getting queue status: ${queueName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Purge all messages from a queue (useful for testing)
 */
export async function purgeQueue(queueName: QueueName): Promise<void> {
  try {
    if (!channel) {
      await connect();
    }

    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }

    await channel.purgeQueue(queueName);
    logger.info(`Queue purged: ${queueName}`);
  } catch (error) {
    logger.error(`Error purging queue: ${queueName}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
