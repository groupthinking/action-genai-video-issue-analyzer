import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logger, { logApiCall, logApiError, logProlongedTask, logPipelineStage } from './logger';

describe('Logger', () => {
  beforeEach(() => {
    // Spy on logger methods
    vi.spyOn(logger, 'info');
    vi.spyOn(logger, 'error');
    vi.spyOn(logger, 'warn');
    vi.spyOn(logger, 'http');
    vi.spyOn(logger, 'debug');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logApiCall', () => {
    it('should log API call with service and endpoint', () => {
      logApiCall('Gemini', '/api/analyze');
      
      expect(logger.http).toHaveBeenCalledWith(
        'API Call: Gemini /api/analyze'
      );
    });

    it('should log API call with duration', () => {
      logApiCall('YouTube', '/api/videos', 1234);
      
      expect(logger.http).toHaveBeenCalledWith(
        'API Call: YouTube /api/videos (1234ms)'
      );
    });
  });

  describe('logApiError', () => {
    it('should log API error with service and endpoint', () => {
      const error = new Error('Connection timeout');
      logApiError('Gemini', '/api/analyze', error);
      
      expect(logger.error).toHaveBeenCalledWith(
        'API Error: Gemini /api/analyze',
        expect.objectContaining({
          error: 'Connection timeout',
          stack: expect.any(String),
        })
      );
    });

    it('should log API error with duration', () => {
      const error = new Error('Rate limit exceeded');
      logApiError('YouTube', '/api/videos', error, 5000);
      
      expect(logger.error).toHaveBeenCalledWith(
        'API Error: YouTube /api/videos (5000ms)',
        expect.objectContaining({
          error: 'Rate limit exceeded',
        })
      );
    });
  });

  describe('logProlongedTask', () => {
    it('should log warning when task exceeds threshold', () => {
      logProlongedTask('Video Processing', 10000, 5000);
      
      expect(logger.warn).toHaveBeenCalledWith(
        'Prolonged Task: Video Processing took 10000ms (threshold: 5000ms)'
      );
    });

    it('should not log when task is within threshold', () => {
      logProlongedTask('Quick Task', 1000, 5000);
      
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('logPipelineStage', () => {
    it('should log info for start status', () => {
      logPipelineStage('INGEST', 'video123', 'start');
      
      expect(logger.info).toHaveBeenCalledWith(
        'Pipeline INGEST: video123 - start'
      );
    });

    it('should log info for complete status with duration', () => {
      logPipelineStage('ENHANCE', 'video456', 'complete', 2500);
      
      expect(logger.info).toHaveBeenCalledWith(
        'Pipeline ENHANCE: video456 - complete (2500ms)'
      );
    });

    it('should log error for error status', () => {
      logPipelineStage('SEGMENT', 'video789', 'error');
      
      expect(logger.error).toHaveBeenCalledWith(
        'Pipeline SEGMENT: video789 - error'
      );
    });
  });
});
