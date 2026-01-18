import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

// Agentic Output Schema - matches the GenAIScript schema
const agenticOutputSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Title derived from video content" },
        description: { type: SchemaType.STRING, description: "Brief description of what the video demonstrates" },
        duration: { type: SchemaType.STRING, description: "Estimated duration of key content" },
        primaryTopic: { type: SchemaType.STRING, description: "Main technical topic covered" },
      },
      required: ["title", "description", "primaryTopic"],
    },
    extractedEndpoints: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          endpoint: { type: SchemaType.STRING, description: "API endpoint URL or path" },
          method: { type: SchemaType.STRING, description: "HTTP method (GET, POST, etc.)" },
          purpose: { type: SchemaType.STRING, description: "What this endpoint does" },
          timestamp: { type: SchemaType.STRING, description: "When it appears in video" },
        },
        required: ["endpoint", "purpose"],
      },
    },
    extractedCapabilities: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          capability: { type: SchemaType.STRING, description: "Name of the capability" },
          description: { type: SchemaType.STRING, description: "How it works" },
          useCase: { type: SchemaType.STRING, description: "Practical application" },
          timestamp: { type: SchemaType.STRING, description: "When demonstrated" },
        },
        required: ["capability", "description"],
      },
    },
    actionableInsights: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          insight: { type: SchemaType.STRING, description: "The actionable insight" },
          priority: { type: SchemaType.STRING, description: "high, medium, or low" },
          implementation: { type: SchemaType.STRING, description: "How to implement this" },
        },
        required: ["insight", "priority"],
      },
    },
    generatedWorkflow: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Workflow name" },
        description: { type: SchemaType.STRING, description: "What this workflow accomplishes" },
        steps: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              stepNumber: { type: SchemaType.NUMBER },
              action: { type: SchemaType.STRING, description: "Action to take" },
              command: { type: SchemaType.STRING, description: "CLI command if applicable" },
              code: { type: SchemaType.STRING, description: "Code snippet if applicable" },
              expectedOutput: { type: SchemaType.STRING, description: "What should happen" },
            },
            required: ["stepNumber", "action"],
          },
        },
        prerequisites: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
        estimatedTime: { type: SchemaType.STRING, description: "Time to complete" },
      },
      required: ["name", "steps"],
    },
    codeArtifacts: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          filename: { type: SchemaType.STRING, description: "Suggested filename" },
          language: { type: SchemaType.STRING, description: "Programming language" },
          code: { type: SchemaType.STRING, description: "The actual code" },
          purpose: { type: SchemaType.STRING, description: "What this code does" },
        },
        required: ["filename", "language", "code", "purpose"],
      },
    },
    perceivedLearnings: {
      type: SchemaType.ARRAY,
      description: "Key learnings that could be applied to modify an existing project",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          learning: { type: SchemaType.STRING, description: "The specific learning or pattern" },
          applicability: { type: SchemaType.STRING, description: "How this applies to existing projects" },
          suggestedChange: { type: SchemaType.STRING, description: "Specific modification to make" },
        },
        required: ["learning", "applicability"],
      },
    },
  },
  required: ["summary", "actionableInsights", "generatedWorkflow"],
};

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

export async function analyzeVideoUrl(
  videoUrl: string,
  items?: string
): Promise<AgenticOutput> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY environment variable is required");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use Gemini 2.0 Flash for video understanding
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: agenticOutputSchema,
    },
  });

  const contextItems = items || "API endpoints, model capabilities, technical implementations";

  const prompt = `${AGENTIC_PROMPT}

## Context Items to Extract
${contextItems}

## Video to Analyze
Please analyze the video at this URL: ${videoUrl}

Watch the entire video and extract all relevant technical information, code snippets, API endpoints, and actionable workflows.`;

  try {
    const result = await model.generateContent([
      { text: prompt },
      {
        fileData: {
          mimeType: "video/mp4",
          fileUri: videoUrl,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    // Parse JSON response
    const analysis = JSON.parse(text) as AgenticOutput;
    return analysis;
  } catch (error) {
    // If direct URL doesn't work, try with just text analysis request
    console.error("Video analysis error, trying text-based approach:", error);

    const textResult = await model.generateContent([
      {
        text: `${AGENTIC_PROMPT}

## Context Items to Extract
${contextItems}

## Video URL
${videoUrl}

Since I cannot directly access this video, please analyze based on the URL pattern and any context you can infer. If this is a YouTube URL, extract the video ID and provide analysis based on available information.

Note: For full video analysis, ensure the video is accessible and provides proper CORS headers, or use the GenAIScript CLI for YouTube videos.`,
      },
    ]);

    const fallbackText = textResult.response.text();
    return JSON.parse(fallbackText) as AgenticOutput;
  }
}

export function formatAgenticOutput(analysis: AgenticOutput): string {
  const sections: string[] = [];

  // Summary
  sections.push(`## 🎯 ${analysis.summary.title}`);
  sections.push(analysis.summary.description);
  sections.push(`**Primary Topic:** ${analysis.summary.primaryTopic}`);
  if (analysis.summary.duration) {
    sections.push(`**Duration:** ${analysis.summary.duration}`);
  }

  // Actionable Insights
  if (analysis.actionableInsights?.length) {
    sections.push("\n## ⚡ Actionable Insights");
    for (const insight of analysis.actionableInsights) {
      sections.push(`- **[${insight.priority.toUpperCase()}]** ${insight.insight}`);
      if (insight.implementation) {
        sections.push(`  → *Implementation:* ${insight.implementation}`);
      }
    }
  }

  // Extracted Endpoints
  if (analysis.extractedEndpoints?.length) {
    sections.push("\n## 🔗 Extracted Endpoints");
    for (const ep of analysis.extractedEndpoints) {
      sections.push(`- \`${ep.method || "GET"} ${ep.endpoint}\` - ${ep.purpose}`);
    }
  }

  // Generated Workflow
  if (analysis.generatedWorkflow?.steps?.length) {
    sections.push("\n## 🔧 Generated Workflow");
    sections.push(`**${analysis.generatedWorkflow.name}**`);
    if (analysis.generatedWorkflow.description) {
      sections.push(analysis.generatedWorkflow.description);
    }
    for (const step of analysis.generatedWorkflow.steps) {
      sections.push(`${step.stepNumber}. ${step.action}`);
      if (step.command) {
        sections.push(`   \`${step.command}\``);
      }
    }
  }

  // Perceived Learnings
  if (analysis.perceivedLearnings?.length) {
    sections.push("\n## 📚 Perceived Learnings");
    for (const learning of analysis.perceivedLearnings) {
      sections.push(`- **${learning.learning}**`);
      sections.push(`  Applicability: ${learning.applicability}`);
      if (learning.suggestedChange) {
        sections.push(`  Suggested Change: ${learning.suggestedChange}`);
      }
    }
  }

  return sections.join("\n");
}
