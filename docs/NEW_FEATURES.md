# New Features Documentation

This document describes the newly added features for optimization and productivity.

## 1. Winston Logger

### Overview
A structured logging system using Winston that provides comprehensive error tracking and debugging capabilities.

### Features
- Colored console output in development
- JSON logs in production
- Separate log files for errors, combined logs, exceptions, and rejections
- Helper functions for common logging patterns

### Usage

```typescript
import logger, { logApiCall, logApiError, logProlongedTask, logPipelineStage } from './lib/logger';

// Basic logging
logger.info('Application started');
logger.error('An error occurred', { error: error.message });

// Log API calls
logApiCall('Gemini', '/api/analyze', 1234); // with duration
logApiCall('YouTube', '/api/videos'); // without duration

// Log API errors
logApiError('Gemini', '/api/analyze', new Error('Connection timeout'), 5000);

// Log prolonged tasks
logProlongedTask('Video Processing', 10000, 5000); // Warns if exceeds threshold

// Log pipeline stages
logPipelineStage('INGEST', 'video123', 'start');
logPipelineStage('ENHANCE', 'video456', 'complete', 2500);
logPipelineStage('SEGMENT', 'video789', 'error');
```

### Configuration
Set the `LOG_LEVEL` environment variable to control logging verbosity:
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: Info, warnings, and errors (default)
- `http`: HTTP requests, info, warnings, and errors
- `debug`: All logs including debug messages

## 2. AWS Secrets Manager Integration

### Overview
Secure secret management using AWS Secrets Manager with automatic fallback to environment variables.

### Features
- Secure storage of API keys and credentials
- Automatic caching with TTL
- Graceful fallback to environment variables in development
- Support for multiple secret sources

### Usage

```typescript
import { 
  getSecret, 
  getGoogleApiKey, 
  getYouTubeApiKey,
  getCloudSQLPassword 
} from './lib/secrets';

// Get a specific secret
const apiKey = await getSecret('MY_API_KEY');

// Get predefined secrets
const googleKey = await getGoogleApiKey();
const youtubeKey = await getYouTubeApiKey();
const dbPassword = await getCloudSQLPassword();
```

### Configuration
Set `USE_SECRETS_MANAGER=true` to enable AWS Secrets Manager. Otherwise, it falls back to environment variables.

Required environment variables:
- `AWS_REGION`: AWS region (default: us-east-1)
- For local development, set secrets as environment variables

## 3. RabbitMQ Queue Service

### Overview
Asynchronous message queuing for external API calls to prevent blocking during high load.

### Features
- Multiple queues for different pipeline stages
- Persistent messages
- Automatic reconnection
- Prefetch control for fair dispatch
- Queue monitoring and management

### Available Queues
- `VIDEO_ANALYSIS`: Main video analysis queue
- `YOUTUBE_INGEST`: YouTube video ingestion
- `GEMINI_ENHANCE`: Gemini enhancement stage
- `EMBEDDING_GENERATION`: Embedding generation

### Usage

```typescript
import { 
  connect, 
  disconnect, 
  publishMessage, 
  consumeMessages, 
  QUEUES 
} from './lib/queue';

// Connect to RabbitMQ (automatically called when needed)
await connect();

// Publish a message
await publishMessage(QUEUES.VIDEO_ANALYSIS, {
  videoUrl: 'https://youtube.com/watch?v=...',
  userId: 'user123',
}, { priority: 5 });

// Consume messages
await consumeMessages(
  QUEUES.VIDEO_ANALYSIS,
  async (message) => {
    // Process message
    console.log('Processing:', message);
  },
  { prefetch: 1 }
);

// Disconnect when done
await disconnect();
```

### Configuration
Set `RABBITMQ_URL` environment variable:
```
RABBITMQ_URL=amqp://username:password@localhost:5672
```

### Example Integration
See `src/examples/queue-integration.ts` for complete examples of:
- Queuing videos for analysis
- Processing video analysis queue
- YouTube ingest worker
- Multi-stage pipeline integration

## 4. Playwright E2E Testing

### Overview
End-to-end testing framework for validating the application's core functionality.

### Features
- Tests across multiple browsers (Chromium, Firefox, WebKit)
- Mobile viewport testing
- Automatic screenshot and video capture on failure
- HTML test reports

### Usage

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# View test report
npm run test:e2e:report
```

### Test Files
- `tests/e2e/video-analysis.spec.ts`: Core video analysis flow tests

### Writing Tests

```typescript
import { test, expect } from '@playwright/test';

test('should display video input form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel(/video url/i)).toBeVisible();
});
```

## 5. Unit Tests

### Overview
Comprehensive unit tests for core modules using Vitest.

### New Test Files
- `src/lib/logger.test.ts`: Winston logger tests
- `src/lib/secrets.test.ts`: Secrets manager tests
- `src/lib/queue.test.ts`: RabbitMQ queue tests

### Usage

```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Environment Variables

Add these to your `.env` file:

```bash
# Logging
LOG_LEVEL=info

# AWS Secrets Manager
USE_SECRETS_MANAGER=false  # Set to true in production
AWS_REGION=us-east-1

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# API Keys (for local development when USE_SECRETS_MANAGER=false)
GOOGLE_API_KEY=your-google-api-key
YOUTUBE_API_KEY=your-youtube-api-key
CLOUDSQL_PASSWORD=your-db-password
FIREBASE_API_KEY=your-firebase-key
```

## Migration Guide

### Replacing Console.log with Logger

Before:
```typescript
console.log('[INGEST] Starting video ingest:', videoId);
console.error('Failed to analyze video:', error);
```

After:
```typescript
import logger from './lib/logger';

logger.info('[INGEST] Starting video ingest', { videoId });
logger.error('Failed to analyze video', { error: error.message });
```

### Replacing Hardcoded API Keys

Before:
```typescript
const YOUTUBE_API_KEY = 'AIzaSyDnzvT2S3Y27ypu-e2LIMQxWtMYhCHwpsQ';
```

After:
```typescript
import { getYouTubeApiKey } from './lib/secrets';

const YOUTUBE_API_KEY = await getYouTubeApiKey();
```

### Adding Asynchronous Processing

Before (synchronous):
```typescript
const result = await analyzeVideo(videoUrl);
return result;
```

After (with queue):
```typescript
import { publishMessage, QUEUES } from './lib/queue';

await publishMessage(QUEUES.VIDEO_ANALYSIS, { videoUrl });
return { status: 'queued' };
```

## Best Practices

1. **Logging**: Always use structured logging with context objects
2. **Secrets**: Never commit secrets to version control
3. **Queues**: Use appropriate prefetch values based on task complexity
4. **Testing**: Write tests for all new features and bug fixes
5. **Error Handling**: Always log errors with full context

## Troubleshooting

### RabbitMQ Connection Issues
- Ensure RabbitMQ is running: `docker run -d -p 5672:5672 rabbitmq:3-management`
- Check connection URL format: `amqp://user:pass@host:port`

### AWS Secrets Manager Issues
- Ensure AWS credentials are configured
- Check IAM permissions for secretsmanager:GetSecretValue
- Verify secret names match exactly

### Test Failures
- Run tests individually to isolate issues
- Check test logs in `playwright-report/` and `logs/`
- Ensure test environment variables are set
