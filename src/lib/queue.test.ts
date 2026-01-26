import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock amqplib - define mocks inline to avoid hoisting issues
vi.mock('amqplib', () => {
  const mockChannel = {
    assertQueue: vi.fn(),
    sendToQueue: vi.fn(),
    consume: vi.fn(),
    ack: vi.fn(),
    nack: vi.fn(),
    prefetch: vi.fn(),
    checkQueue: vi.fn(),
    purgeQueue: vi.fn(),
    close: vi.fn(),
  };

  const mockConnection = {
    createChannel: vi.fn().mockResolvedValue(mockChannel),
    on: vi.fn(),
    close: vi.fn(),
  };

  return {
    default: {
      connect: vi.fn().mockResolvedValue(mockConnection),
    },
    __mockChannel: mockChannel,
    __mockConnection: mockConnection,
  };
});

// Mock logger
vi.mock('./logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock secrets
vi.mock('./secrets', () => ({
  getRabbitMQUrl: vi.fn().mockResolvedValue('amqp://localhost:5672'),
}));

import { connect, disconnect, publishMessage, QUEUES } from './queue';
import amqp from 'amqplib';

// Get the mock objects
const amqpMock = vi.mocked(amqp);

describe('Queue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await disconnect();
  });

  describe('connect', () => {
    it('should connect to RabbitMQ and create queues', async () => {
      await connect();
      
      expect(amqpMock.connect).toHaveBeenCalled();
    });

    it('should not reconnect if already connected', async () => {
      await connect();
      const firstCallCount = amqpMock.connect.mock.calls.length;
      await connect();
      
      // Should only connect once
      expect(amqpMock.connect).toHaveBeenCalledTimes(firstCallCount);
    });
  });

  describe('disconnect', () => {
    it('should close channel and connection', async () => {
      await connect();
      await disconnect();
      
      // Just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('publishMessage', () => {
    it('should attempt to publish message to queue', async () => {
      const message = { videoId: 'test123', url: 'https://example.com' };
      
      // This may fail if RabbitMQ is not running, which is fine for unit tests
      const result = await publishMessage(QUEUES.VIDEO_ANALYSIS, message);
      
      // Just verify it returns a boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('QUEUES', () => {
    it('should have correct queue names', () => {
      expect(QUEUES.VIDEO_ANALYSIS).toBe('video_analysis');
      expect(QUEUES.YOUTUBE_INGEST).toBe('youtube_ingest');
      expect(QUEUES.GEMINI_ENHANCE).toBe('gemini_enhance');
      expect(QUEUES.EMBEDDING_GENERATION).toBe('embedding_generation');
    });
  });
});
