import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock next/font
vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-inter' }),
  JetBrains_Mono: () => ({ variable: '--font-mono' }),
}));

// Mock environment variables
vi.stubEnv('GOOGLE_API_KEY', 'test-api-key-for-testing');
