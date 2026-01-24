/**
 * Legacy Gemini Integration for URL-based Video Analysis
 *
 * DEPRECATED: This module provides backward compatibility for URL-based analysis.
 * New implementations should use src/services/gemini.ts with GCS URIs.
 *
 * Migrated to use the unified @google/genai SDK.
 */

import { GoogleGenAI, Type, type Content, type Schema } from "@google/genai";

// =============================================================================
// Schema Definition (using new SDK format with Type enum)
// =============================================================================

const agenticOutputSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Title derived from video content" },
        description: { type: Type.STRING, description: "Brief description of what the video demonstrates" },
        duration: { type: Type.STRING, description: "Estimated duration of key content" },
        primaryTopic: { type: Type.STRING, description: "Main technical topic covered" },
      },
      required: ["title", "description", "primaryTopic"],
    },
    extractedEndpoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          endpoint: { type: Type.STRING, description: "API endpoint URL or path" },
          method: { type: Type.STRING, description: "HTTP method (GET, POST, etc.)" },
          purpose: { type: Type.STRING, description: "What this endpoint does" },
          timestamp: { type: Type.STRING, description: "When it appears in video" },
        },
        required: ["endpoint", "purpose"],
      },
    },
    extractedCapabilities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          capability: { type: Type.STRING, description: "Name of the capability" },
          description: { type: Type.STRING, description: "How it works" },
          useCase: { type: Type.STRING, description: "Practical application" },
          timestamp: { type: Type.STRING, description: "When demonstrated" },
        },
        required: ["capability", "description"],
      },
    },
    actionableInsights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          insight: { type: Type.STRING, description: "The actionable insight" },
          priority: { type: Type.STRING, description: "high, medium, or low" },
          implementation: { type: Type.STRING, description: "How to implement this" },
        },
        required: ["insight", "priority"],
      },
    },
    generatedWorkflow: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Workflow name" },
        description: { type: Type.STRING, description: "What this workflow accomplishes" },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              stepNumber: { type: Type.NUMBER },
              action: { type: Type.STRING, description: "Action to take" },
              command: { type: Type.STRING, description: "CLI command if applicable" },
              code: { type: Type.STRING, description: "Code snippet if applicable" },
              expectedOutput: { type: Type.STRING, description: "What should happen" },
            },
            required: ["stepNumber", "action"],
          },
        },
        prerequisites: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        estimatedTime: { type: Type.STRING, description: "Time to complete" },
      },
      required: ["name", "steps"],
    },
    codeArtifacts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          filename: { type: Type.STRING, description: "Suggested filename" },
          language: { type: Type.STRING, description: "Programming language" },
          code: { type: Type.STRING, description: "The actual code" },
          purpose: { type: Type.STRING, description: "What this code does" },
        },
        required: ["filename", "language", "code", "purpose"],
      },
    },
    perceivedLearnings: {
      type: Type.ARRAY,
      description: "Key learnings that could be applied to modify an existing project",
      items: {
        type: Type.OBJECT,
        properties: {
          learning: { type: Type.STRING, description: "The specific learning or pattern" },
          applicability: { type: Type.STRING, description: "How this applies to existing projects" },
          suggestedChange: { type: Type.STRING, description: "Specific modification to make" },
        },
        required: ["learning", "applicability"],
      },
    },
  },
  required: ["summary", "actionableInsights", "generatedWorkflow"],
};

// =============================================================================
// Prompt Template
// =============================================================================

const AGENTIC_PROMPT = `You are a Video-to-Agentic Action Agent. Your goal is to transform video content into executable, deployable business systems.

## Your Mission
Analyze this video through the lens of "Functional Workflow Mirroring" - extract not just what is shown, but create executable code and workflows that replicate the demonstrated functionality.

## Output Requirements
1. **Summary**: Provide a clear title, description, and identify the primary technical topic
2. **Extracted Endpoints**: List every API endpoint or URL mentioned with method and purpose
3. **Extracted Capabilities**: Document all model/system capabilities demonstrated
4. **Actionable Insights**: Provide prioritized takeaways with implementation guidance
5. **Generated Workflow**: Create a step-by-step executable workflow with CLI commands and code snippets
6. **Code Artifacts**: Extract or generate any code shown or implied in the video
7. **Perceived Learnings**: Identify patterns and learnings that could be applied to modify existing projects

## Analysis Focus
- Extract specific technical implementations shown
- Identify reusable patterns and architectures
- Generate working code that mirrors demonstrated functionality
- Provide clear deployment instructions where applicable`;

// =============================================================================
// Type Definitions
// =============================================================================

export interface AgenticOutput {
  summary: {
    title: string;
    description: string;
    duration?: string;
    primaryTopic: string;
  };
  extractedEndpoints?: Array<{
    endpoint: string;
    method?: string;
    purpose: string;
    timestamp?: string;
  }>;
  extractedCapabilities?: Array<{
    capability: string;
    description: string;
    useCase?: string;
    timestamp?: string;
  }>;
  actionableInsights: Array<{
    insight: string;
    priority: string;
    implementation?: string;
  }>;
  generatedWorkflow: {
    name: string;
    description?: string;
    steps: Array<{
      stepNumber: number;
      action: string;
      command?: string;
      code?: string;
      expectedOutput?: string;
    }>;
    prerequisites?: string[];
    estimatedTime?: string;
  };
  codeArtifacts?: Array<{
    filename: string;
    language: string;
    code: string;
    purpose: string;
  }>;
  perceivedLearnings?: Array<{
    learning: string;
    applicability: string;
    suggestedChange?: string;
  }>;
}

// =============================================================================
// Client Initialization
// =============================================================================

let genAIClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY or GEMINI_API_KEY environment variable is required");
  }

  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// =============================================================================
// Video Analysis Functions
// =============================================================================

/**
 * Analyze a video URL using Gemini
 *
 * DEPRECATED: This function uses text-based URL analysis.
 * For production, use analyzeVideoFromGCS from src/services/gemini.ts
 */
export async function analyzeVideoUrl(
  videoUrl: string,
  items?: string
): Promise<AgenticOutput> {
  const client = getClient();
  const contextItems = items || "API endpoints, model capabilities, technical implementations";

  const prompt = `${AGENTIC_PROMPT}

## Context Items to Extract
${contextItems}

## Video to Analyze
Please analyze this video: ${videoUrl}

This is a video URL that may be:
1. A YouTube video (youtube.com, youtu.be)
2. A direct video file (.mp4, .webm, .mov)

For YouTube videos, use your knowledge base to provide relevant analysis based on:
- The video ID extracted from the URL
- Any context you have about the channel or content type
- Common patterns for technical/tutorial videos

Provide comprehensive analysis with:
- Summary with title and main topic
- Extracted API endpoints if discussed
- Extracted capabilities demonstrated
- Actionable implementation insights
- Step-by-step workflow to replicate
- Code artifacts shown or implied
- Key learnings for project integration`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: agenticOutputSchema,
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    });

    const text = response.text || "";

    // Parse JSON response
    const analysis = JSON.parse(text) as AgenticOutput;
    return analysis;
  } catch (error) {
    console.error("Video analysis error:", error);

    // Return a structured error response
    return {
      summary: {
        title: "Video Analysis Error",
        description: `Unable to analyze video at ${videoUrl}. For full video analysis including downloading and transcription, use the GenAIScript CLI or GitHub Action.`,
        primaryTopic: "Error",
      },
      actionableInsights: [
        {
          insight: "Use GenAIScript for complete video analysis",
          priority: "high",
          implementation: "Run: npx genaiscript run action-video-issue-analyzer --video-url YOUR_URL",
        },
      ],
      generatedWorkflow: {
        name: "Alternative Video Analysis Flow",
        steps: [
          { stepNumber: 1, action: "Clone the repository", command: "git clone https://github.com/groupthinking/action-genai-video-issue-analyzer" },
          { stepNumber: 2, action: "Set up environment", command: "cp .env.example .env && vim .env  # Add GOOGLE_API_KEY" },
          { stepNumber: 3, action: "Run video analysis", command: "npx genaiscript run action-video-issue-analyzer" },
        ],
      },
    };
  }
}

// =============================================================================
// Output Formatting
// =============================================================================

export function formatAgenticOutput(analysis: AgenticOutput): string {
  const sections: string[] = [];

  // Summary
  sections.push(`# ${analysis.summary.title}\n`);
  sections.push(`${analysis.summary.description}\n`);
  sections.push(`**Primary Topic:** ${analysis.summary.primaryTopic}`);
  if (analysis.summary.duration) {
    sections.push(`**Duration:** ${analysis.summary.duration}`);
  }
  sections.push("");

  // Extracted Endpoints
  if (analysis.extractedEndpoints?.length) {
    sections.push("## Extracted Endpoints\n");
    for (const endpoint of analysis.extractedEndpoints) {
      sections.push(`- **${endpoint.method || "GET"} ${endpoint.endpoint}**: ${endpoint.purpose}`);
    }
    sections.push("");
  }

  // Extracted Capabilities
  if (analysis.extractedCapabilities?.length) {
    sections.push("## Extracted Capabilities\n");
    for (const cap of analysis.extractedCapabilities) {
      sections.push(`### ${cap.capability}`);
      sections.push(cap.description);
      if (cap.useCase) {
        sections.push(`*Use Case: ${cap.useCase}*`);
      }
      sections.push("");
    }
  }

  // Actionable Insights
  if (analysis.actionableInsights?.length) {
    sections.push("## Actionable Insights\n");
    for (const insight of analysis.actionableInsights) {
      const priorityEmoji = insight.priority === "high" ? "🔴" : insight.priority === "medium" ? "🟡" : "🟢";
      sections.push(`${priorityEmoji} **${insight.insight}**`);
      if (insight.implementation) {
        sections.push(`   *Implementation: ${insight.implementation}*`);
      }
    }
    sections.push("");
  }

  // Generated Workflow
  if (analysis.generatedWorkflow) {
    sections.push(`## Workflow: ${analysis.generatedWorkflow.name}\n`);
    if (analysis.generatedWorkflow.description) {
      sections.push(analysis.generatedWorkflow.description);
      sections.push("");
    }
    if (analysis.generatedWorkflow.prerequisites?.length) {
      sections.push("**Prerequisites:**");
      for (const prereq of analysis.generatedWorkflow.prerequisites) {
        sections.push(`- ${prereq}`);
      }
      sections.push("");
    }
    sections.push("**Steps:**\n");
    for (const step of analysis.generatedWorkflow.steps) {
      sections.push(`${step.stepNumber}. ${step.action}`);
      if (step.command) {
        sections.push(`   \`\`\`bash\n   ${step.command}\n   \`\`\``);
      }
      if (step.code) {
        sections.push(`   \`\`\`\n   ${step.code}\n   \`\`\``);
      }
    }
    sections.push("");
  }

  // Code Artifacts
  if (analysis.codeArtifacts?.length) {
    sections.push("## Code Artifacts\n");
    for (const artifact of analysis.codeArtifacts) {
      sections.push(`### ${artifact.filename}`);
      sections.push(`*${artifact.purpose}*\n`);
      sections.push(`\`\`\`${artifact.language}`);
      sections.push(artifact.code);
      sections.push("```\n");
    }
  }

  // Perceived Learnings
  if (analysis.perceivedLearnings?.length) {
    sections.push("## Key Learnings\n");
    for (const learning of analysis.perceivedLearnings) {
      sections.push(`### 💡 ${learning.learning}`);
      sections.push(`*Applicability: ${learning.applicability}*`);
      if (learning.suggestedChange) {
        sections.push(`**Suggested Change:** ${learning.suggestedChange}`);
      }
      sections.push("");
    }
  }

  return sections.join("\n");
}

export default {
  analyzeVideoUrl,
  formatAgenticOutput,
};
