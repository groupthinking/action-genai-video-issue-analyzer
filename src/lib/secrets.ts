/**
 * Secrets Manager Configuration
 * 
 * Provides secure access to secrets using AWS Secrets Manager.
 * Falls back to environment variables in development.
 */

import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import logger from './logger';

// Initialize the Secrets Manager client
const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Cache for secrets to avoid repeated API calls
const secretCache: Map<string, { value: string; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a secret from AWS Secrets Manager with caching
 * Falls back to environment variable in development or when AWS is not configured
 */
export async function getSecret(secretName: string, envFallback?: string): Promise<string> {
  // Check if we should use Secrets Manager (production) or env vars (development)
  const useSecretsManager = process.env.USE_SECRETS_MANAGER === 'true';
  
  if (!useSecretsManager) {
    // Development mode: use environment variables
    const envValue = process.env[envFallback || secretName];
    if (!envValue) {
      logger.warn(`Secret not found in environment: ${secretName}`);
      return '';
    }
    return envValue;
  }

  // Check cache first
  const cached = secretCache.get(secretName);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug(`Using cached secret: ${secretName}`);
    return cached.value;
  }

  try {
    logger.debug(`Fetching secret from AWS Secrets Manager: ${secretName}`);
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);
    const secretValue = response.SecretString || '';

    // Cache the secret
    secretCache.set(secretName, {
      value: secretValue,
      timestamp: Date.now(),
    });

    logger.debug(`Successfully fetched secret: ${secretName}`);
    return secretValue;
  } catch (error) {
    logger.error(`Failed to fetch secret from AWS Secrets Manager: ${secretName}`, {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to environment variable
    const envValue = process.env[envFallback || secretName];
    if (envValue) {
      logger.warn(`Using environment variable fallback for: ${secretName}`);
      return envValue;
    }

    throw new Error(`Secret not found: ${secretName}`);
  }
}

/**
 * Get Google API Key
 */
export async function getGoogleApiKey(): Promise<string> {
  return getSecret('GOOGLE_API_KEY', 'GOOGLE_API_KEY') || getSecret('GEMINI_API_KEY', 'GEMINI_API_KEY');
}

/**
 * Get YouTube API Key
 */
export async function getYouTubeApiKey(): Promise<string> {
  return getSecret('YOUTUBE_API_KEY', 'YOUTUBE_API_KEY');
}

/**
 * Get CloudSQL Password
 */
export async function getCloudSQLPassword(): Promise<string> {
  return getSecret('CLOUDSQL_PASSWORD', 'CLOUDSQL_PASSWORD');
}

/**
 * Get Firebase API Key
 */
export async function getFirebaseApiKey(): Promise<string> {
  return getSecret('FIREBASE_API_KEY', 'FIREBASE_API_KEY');
}

/**
 * Get RabbitMQ connection URL
 */
export async function getRabbitMQUrl(): Promise<string> {
  return getSecret('RABBITMQ_URL', 'RABBITMQ_URL') || 'amqp://localhost:5672';
}

/**
 * Clear the secret cache (useful for testing or forcing refresh)
 */
export function clearSecretCache(): void {
  secretCache.clear();
  logger.debug('Secret cache cleared');
}
