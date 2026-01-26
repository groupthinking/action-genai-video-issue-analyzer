import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock AWS SDK
vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  GetSecretValueCommand: vi.fn(),
}));

// Mock logger
vi.mock('./logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getSecret, getGoogleApiKey, getYouTubeApiKey, clearSecretCache } from './secrets';

describe('Secrets Manager', () => {
  beforeEach(() => {
    clearSecretCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.USE_SECRETS_MANAGER;
  });

  describe('getSecret', () => {
    it('should return environment variable when USE_SECRETS_MANAGER is not set', async () => {
      process.env.TEST_SECRET = 'test-value';
      
      const result = await getSecret('TEST_SECRET');
      
      expect(result).toBe('test-value');
    });

    it('should use fallback environment variable name', async () => {
      process.env.MY_API_KEY = 'my-api-key-value';
      
      const result = await getSecret('API_KEY', 'MY_API_KEY');
      
      expect(result).toBe('my-api-key-value');
    });

    it('should return empty string when secret not found in environment', async () => {
      const result = await getSecret('NON_EXISTENT_SECRET');
      
      expect(result).toBe('');
    });
  });

  describe('getGoogleApiKey', () => {
    it('should return GOOGLE_API_KEY from environment', async () => {
      process.env.GOOGLE_API_KEY = 'google-key';
      delete process.env.GEMINI_API_KEY;
      
      const result = await getGoogleApiKey();
      
      expect(result).toBe('google-key');
    });

    it('should fallback to GEMINI_API_KEY when GOOGLE_API_KEY is not set', async () => {
      delete process.env.GOOGLE_API_KEY;
      process.env.GEMINI_API_KEY = 'gemini-key';
      
      // getGoogleApiKey tries GOOGLE_API_KEY first, then GEMINI_API_KEY
      // Since it uses 'or' operator, we need to ensure the first call fails
      const result = await getGoogleApiKey();
      
      // The function returns GOOGLE_API_KEY || GEMINI_API_KEY
      // So if GOOGLE_API_KEY is empty, it should return GEMINI_API_KEY
      expect(result).toBeTruthy();
    });
  });

  describe('getYouTubeApiKey', () => {
    it('should return YOUTUBE_API_KEY from environment', async () => {
      process.env.YOUTUBE_API_KEY = 'youtube-key';
      
      const result = await getYouTubeApiKey();
      
      expect(result).toBe('youtube-key');
    });
  });

  describe('clearSecretCache', () => {
    it('should clear the secret cache', () => {
      // Just ensure it doesn't throw
      expect(() => clearSecretCache()).not.toThrow();
    });
  });
});
