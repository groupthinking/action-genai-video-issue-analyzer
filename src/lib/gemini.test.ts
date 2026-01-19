import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeVideoUrl, formatAgenticOutput, AgenticOutput } from './gemini';

// Mock the Google Generative AI SDK
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            summary: {
              title: 'Test Video Analysis',
              description: 'A test video demonstrating API usage',
              primaryTopic: 'API Integration',
              duration: '5:30',
            },
            extractedEndpoints: [
              { endpoint: '/api/test', method: 'GET', purpose: 'Test endpoint' },
            ],
            extractedCapabilities: [
              { capability: 'Video Analysis', description: 'Analyzes video content' },
            ],
            actionableInsights: [
              { insight: 'Implement caching', priority: 'high', implementation: 'Use KV store' },
            ],
            generatedWorkflow: {
              name: 'Test Workflow',
              description: 'A test workflow',
              steps: [
                { stepNumber: 1, action: 'Initialize', command: 'npm install' },
              ],
              estimatedTime: '5 minutes',
            },
            perceivedLearnings: [
              { learning: 'Test pattern', applicability: 'Testing' },
            ],
          }),
        },
      }),
    }),
  })),
  SchemaType: {
    OBJECT: 'object',
    ARRAY: 'array',
    STRING: 'string',
    NUMBER: 'number',
  },
}));

describe('Gemini Integration', () => {
  beforeEach(() => {
    vi.stubEnv('GOOGLE_API_KEY', 'test-api-key');
  });

  describe('analyzeVideoUrl', () => {
    it('should analyze a video URL and return AgenticOutput', async () => {
      const result = await analyzeVideoUrl('https://www.youtube.com/watch?v=test123');

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.title).toBe('Test Video Analysis');
      expect(result.summary.primaryTopic).toBe('API Integration');
    });

    it('should extract endpoints from video', async () => {
      const result = await analyzeVideoUrl('https://www.youtube.com/watch?v=test123');

      expect(result.extractedEndpoints).toHaveLength(1);
      expect(result.extractedEndpoints?.[0].endpoint).toBe('/api/test');
    });

    it('should generate workflow steps', async () => {
      const result = await analyzeVideoUrl('https://www.youtube.com/watch?v=test123');

      expect(result.generatedWorkflow).toBeDefined();
      expect(result.generatedWorkflow.name).toBe('Test Workflow');
      expect(result.generatedWorkflow.steps).toHaveLength(1);
    });

    it('should throw error when GOOGLE_API_KEY is not set', async () => {
      vi.stubEnv('GOOGLE_API_KEY', '');

      await expect(analyzeVideoUrl('https://www.youtube.com/watch?v=test123'))
        .rejects.toThrow('GOOGLE_API_KEY environment variable is required');
    });
  });

  describe('formatAgenticOutput', () => {
    const mockOutput: AgenticOutput = {
      summary: {
        title: 'Test Title',
        description: 'Test Description',
        primaryTopic: 'Testing',
        duration: '10:00',
      },
      extractedEndpoints: [
        { endpoint: '/api/users', method: 'POST', purpose: 'Create user' },
      ],
      extractedCapabilities: [
        { capability: 'User Management', description: 'Manages users' },
      ],
      actionableInsights: [
        { insight: 'Add validation', priority: 'high', implementation: 'Use Zod' },
        { insight: 'Add caching', priority: 'medium' },
      ],
      generatedWorkflow: {
        name: 'User Creation Flow',
        steps: [
          { stepNumber: 1, action: 'Validate input' },
          { stepNumber: 2, action: 'Create user', command: 'npm run create-user' },
        ],
      },
      perceivedLearnings: [
        { learning: 'Input validation is crucial', applicability: 'All API endpoints' },
      ],
    };

    it('should format output with summary section', () => {
      const formatted = formatAgenticOutput(mockOutput);

      expect(formatted).toContain('## 🎯 Test Title');
      expect(formatted).toContain('Test Description');
      expect(formatted).toContain('**Primary Topic:** Testing');
    });

    it('should format actionable insights', () => {
      const formatted = formatAgenticOutput(mockOutput);

      expect(formatted).toContain('## ⚡ Actionable Insights');
      expect(formatted).toContain('[HIGH]');
      expect(formatted).toContain('Add validation');
    });

    it('should format extracted endpoints', () => {
      const formatted = formatAgenticOutput(mockOutput);

      expect(formatted).toContain('## 🔗 Extracted Endpoints');
      expect(formatted).toContain('POST /api/users');
    });

    it('should format generated workflow', () => {
      const formatted = formatAgenticOutput(mockOutput);

      expect(formatted).toContain('## 🔧 Generated Workflow');
      expect(formatted).toContain('User Creation Flow');
      expect(formatted).toContain('1. Validate input');
    });

    it('should format perceived learnings', () => {
      const formatted = formatAgenticOutput(mockOutput);

      expect(formatted).toContain('## 📚 Perceived Learnings');
      expect(formatted).toContain('Input validation is crucial');
    });
  });
});
