/**
 * UVAI MCP Server
 *
 * Model Context Protocol server wrapper for the Video-to-Agentic Action API.
 * Exposes video analysis capabilities as MCP Resources, Tools, and Prompts.
 *
 * Usage:
 *   npx tsx src/mcp/server.ts
 *
 * Or via MCP config:
 *   { "server": { "command": "npx", "args": ["tsx", "src/mcp/server.ts"] } }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { analyzeVideoUrl, formatAgenticOutput, AgenticOutput } from "../lib/gemini.js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server metadata
const SERVER_NAME = "uvai-video-analyzer";
const SERVER_VERSION = "1.0.0";

// Initialize MCP Server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

// ============================================================================
// RESOURCES
// ============================================================================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "uvai://health",
        name: "Service Health",
        description: "Current service health status including version and environment",
        mimeType: "application/json",
      },
      {
        uri: "uvai://schema/agentic-output",
        name: "AgenticOutput Schema",
        description: "JSON Schema for the structured AI analysis output format",
        mimeType: "application/json",
      },
      {
        uri: "uvai://docs/api",
        name: "API Documentation",
        description: "OpenAPI 3.0 specification for all endpoints",
        mimeType: "application/yaml",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  switch (uri) {
    case "uvai://health":
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              status: "healthy",
              service: SERVER_NAME,
              version: SERVER_VERSION,
              environment: process.env.NODE_ENV || "development",
              timestamp: new Date().toISOString(),
              capabilities: ["video-analysis", "workflow-generation", "code-extraction"],
            }, null, 2),
          },
        ],
      };

    case "uvai://schema/agentic-output":
      // Return the AgenticOutput TypeScript interface as JSON Schema
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify({
              $schema: "http://json-schema.org/draft-07/schema#",
              title: "AgenticOutput",
              type: "object",
              required: ["summary", "actionableInsights", "generatedWorkflow"],
              properties: {
                summary: {
                  type: "object",
                  required: ["title", "description", "primaryTopic"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    duration: { type: "string" },
                    primaryTopic: { type: "string" },
                  },
                },
                extractedEndpoints: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["endpoint", "purpose"],
                    properties: {
                      endpoint: { type: "string" },
                      method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
                      purpose: { type: "string" },
                      timestamp: { type: "string" },
                    },
                  },
                },
                actionableInsights: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["insight", "priority"],
                    properties: {
                      insight: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      implementation: { type: "string" },
                    },
                  },
                },
                generatedWorkflow: {
                  type: "object",
                  required: ["name", "steps"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    steps: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["stepNumber", "action"],
                        properties: {
                          stepNumber: { type: "integer" },
                          action: { type: "string" },
                          command: { type: "string" },
                          code: { type: "string" },
                          expectedOutput: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            }, null, 2),
          },
        ],
      };

    case "uvai://docs/api":
      try {
        const openApiPath = join(__dirname, "../../openapi.yaml");
        const openApiContent = readFileSync(openApiPath, "utf-8");
        return {
          contents: [
            {
              uri,
              mimeType: "application/yaml",
              text: openApiContent,
            },
          ],
        };
      } catch {
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: "OpenAPI spec not found. Run from repository root.",
            },
          ],
        };
      }

    default:
      throw new Error(`Unknown resource: ${uri}`);
  }
});

// ============================================================================
// TOOLS
// ============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_video",
        description: "Analyze a video URL and extract structured agentic output including endpoints, capabilities, workflows, and code artifacts",
        inputSchema: {
          type: "object" as const,
          properties: {
            videoUrl: {
              type: "string",
              description: "URL of the video to analyze (YouTube, direct MP4, etc.)",
            },
            items: {
              type: "string",
              description: "Specific items to extract from the video",
              default: "API endpoints, model capabilities, technical implementations",
            },
          },
          required: ["videoUrl"],
        },
      },
      {
        name: "format_output",
        description: "Convert AgenticOutput JSON to formatted Markdown for human-readable display",
        inputSchema: {
          type: "object" as const,
          properties: {
            analysis: {
              type: "object",
              description: "AgenticOutput JSON object to format",
            },
          },
          required: ["analysis"],
        },
      },
      {
        name: "list_datasets",
        description: "List BigQuery datasets for a given Google Cloud project",
        inputSchema: {
          type: "object" as const,
          properties: {
            project: {
              type: "string",
              description: "Google Cloud Project ID",
            },
          },
          required: ["project"],
        },
      },
      {
        name: "list_repositories",
        description: "List Artifact Registry repositories in a specific region",
        inputSchema: {
          type: "object" as const,
          properties: {
            project: {
              type: "string",
              description: "Google Cloud Project ID",
            },
            location: {
              type: "string",
              description: "GCP region (e.g., 'us-central1')",
            },
          },
          required: ["project", "location"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "analyze_video": {
      const videoUrl = args?.videoUrl as string;
      const items = args?.items as string | undefined;

      if (!videoUrl) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "videoUrl is required" }),
            },
          ],
          isError: true,
        };
      }

      try {
        const analysis = await analyzeVideoUrl(videoUrl, items);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: error instanceof Error ? error.message : "Analysis failed",
                videoUrl,
              }),
            },
          ],
          isError: true,
        };
      }
    }

    case "format_output": {
      const analysis = args?.analysis as AgenticOutput;

      if (!analysis) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "analysis object is required" }),
            },
          ],
          isError: true,
        };
      }

      try {
        const formatted = formatAgenticOutput(analysis);
        return {
          content: [
            {
              type: "text" as const,
              text: formatted,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Failed to format output" }),
            },
          ],
          isError: true,
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// ============================================================================
// PROMPTS
// ============================================================================

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "video_analysis",
        description: "Comprehensive video analysis prompt for extracting technical implementations",
        arguments: [
          {
            name: "videoUrl",
            description: "URL of the video to analyze",
            required: true,
          },
          {
            name: "focus",
            description: "Specific focus area (e.g., 'API design', 'architecture patterns')",
            required: false,
          },
        ],
      },
      {
        name: "workflow_generation",
        description: "Generate executable workflow from video content",
        arguments: [
          {
            name: "videoUrl",
            description: "URL of the video to analyze",
            required: true,
          },
          {
            name: "targetPlatform",
            description: "Target platform for workflow (e.g., 'GitHub Actions', 'n8n', 'Cloudflare')",
            required: false,
          },
        ],
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "video_analysis": {
      const videoUrl = args?.videoUrl;
      const focus = args?.focus || "technical implementations";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Analyze this video and extract ${focus}:

Video URL: ${videoUrl}

Please provide:
1. Summary with title and primary topic
2. All API endpoints mentioned or demonstrated
3. Model/system capabilities shown
4. Actionable insights with priority levels
5. Step-by-step workflow to replicate the demonstrated functionality
6. Any code artifacts shown or implied
7. Key learnings that could be applied to existing projects`,
            },
          },
        ],
      };
    }

    case "workflow_generation": {
      const videoUrl = args?.videoUrl;
      const targetPlatform = args?.targetPlatform || "generic";

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Generate an executable ${targetPlatform} workflow from this video:

Video URL: ${videoUrl}

Create a complete workflow that:
1. Replicates the functionality demonstrated in the video
2. Includes all necessary prerequisites
3. Has clear step-by-step instructions with commands
4. Includes any required code snippets
5. Estimates time to complete
6. Lists expected outputs at each step`,
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`UVAI MCP Server v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
