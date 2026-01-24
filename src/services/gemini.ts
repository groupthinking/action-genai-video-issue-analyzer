/**
 * Gemini Service - ENHANCE Stage Implementation
 *
 * This service handles the multimodal video analysis using Vertex AI Gemini.
 * It accepts GCS URIs from the INGEST stage and returns structured analysis.
 *
 * Architecture: Part of the "Digital Refinery" workflow
 * Stage: ENHANCE (after INGEST → SEGMENT)
 *
 * SDK: Uses @google-cloud/vertexai for native GCS support
 * Model: gemini-2.0-flash for native multimodal video understanding
 *
 * CRITICAL: NO DOWNLOADING. Vertex AI can read gs:// URIs directly.
 * This is the zero-disk architecture - we pass the GCS URI directly to Gemini.
 */

import { VertexAI, type Part, type Content } from "@google-cloud/vertexai";

// =============================================================================
// Configuration
// =============================================================================

const PROJECT_ID = process.env.GCP_PROJECT_ID || "uvai-730bb";
const LOCATION = process.env.GCP_LOCATION || "us-central1";

// Model selection - Gemini 2.0 Flash for native video understanding
const DEFAULT_MODEL = "gemini-2.0-flash-001";

// =============================================================================
// Types
// =============================================================================

export interface VideoAnalysisResult {
  /** High-level summary of the video content */
  summary: string;

  /** Identified technology stack */
  techStack: string[];

  /** Extracted dependencies (e.g., from package.json shown in video) */
  dependencies: Record<string, string>;

  /** Step-by-step implementation guide */
  implementationSteps: string[];

  /** Code snippets extracted from the video */
  codeBlocks: Array<{
    language: string;
    code: string;
    context: string;
  }>;

  /** Terminal commands shown in the video */
  commands: string[];

  /** Timestamps of key moments */
  keyMoments: Array<{
    timestamp: string;
    description: string;
  }>;

  /** Raw response for debugging */
  rawResponse?: string;
}

// =============================================================================
// Prompts
// =============================================================================

const VIDEO_ANALYSIS_SYSTEM_PROMPT = `You are a specialized Video-to-Software analysis agent.
Your task is to extract actionable technical information from developer tutorial videos.

Focus on:
1. Technology stack identification (frameworks, languages, tools)
2. Package dependencies (from package.json, requirements.txt, etc.)
3. Step-by-step implementation instructions
4. Code snippets shown on screen
5. Terminal commands demonstrated
6. Key timestamps for important concepts

Output your analysis in a structured JSON format.`;

const VIDEO_ANALYSIS_USER_PROMPT = `Analyze this video in detail:

1. **Summary**: Provide a concise summary of what the video demonstrates.

2. **Tech Stack**: List all technologies, frameworks, and tools shown.

3. **Dependencies**: Extract any package dependencies shown (e.g., from package.json).

4. **Implementation Steps**: Create a numbered list of steps to replicate what's shown.

5. **Code Blocks**: Extract any code snippets shown, with their language and context.

6. **Commands**: List terminal/CLI commands demonstrated.

7. **Key Moments**: Identify timestamps of important concepts or transitions.

Return your response as valid JSON matching this schema:
{
  "summary": "string",
  "techStack": ["string"],
  "dependencies": {"package": "version"},
  "implementationSteps": ["string"],
  "codeBlocks": [{"language": "string", "code": "string", "context": "string"}],
  "commands": ["string"],
  "keyMoments": [{"timestamp": "string", "description": "string"}]
}`;

// =============================================================================
// Client Initialization
// =============================================================================

let vertexClient: VertexAI | null = null;

function getClient(): VertexAI {
  if (!vertexClient) {
    vertexClient = new VertexAI({
      project: PROJECT_ID,
      location: LOCATION,
    });
  }
  return vertexClient;
}

// =============================================================================
// Core Analysis Functions
// =============================================================================

/**
 * Analyze a video stored in GCS using Vertex AI Gemini
 *
 * ZERO-DISK ARCHITECTURE: This function passes the GCS URI directly to Gemini.
 * Vertex AI (with ADC/service account) can read gs:// URIs natively.
 * NO DOWNLOADING. NO TEMP FILES.
 *
 * @param gcsUri - The GCS URI (e.g., gs://bucket/raw/videoId.mp4)
 * @param options - Optional configuration for the analysis
 * @returns Structured analysis result
 */
export async function analyzeVideoFromGCS(
  gcsUri: string,
  options?: {
    model?: string;
    customPrompt?: string;
    temperature?: number;
  }
): Promise<VideoAnalysisResult> {
  const client = getClient();
  const modelId = options?.model || DEFAULT_MODEL;

  console.log(`[ENHANCE] Analyzing video from GCS: ${gcsUri}`);
  console.log(`[ENHANCE] Using model: ${modelId}`);
  console.log(`[ENHANCE] Project: ${PROJECT_ID}, Location: ${LOCATION}`);

  if (!gcsUri.startsWith("gs://")) {
    throw new Error(`Expected GCS URI (gs://...), got: ${gcsUri}`);
  }

  // Get the generative model
  const generativeModel = client.getGenerativeModel({
    model: modelId,
    generationConfig: {
      temperature: options?.temperature ?? 0.2,
      maxOutputTokens: 8192,
    },
    systemInstruction: VIDEO_ANALYSIS_SYSTEM_PROMPT,
  });

  // Build the multimodal request with GCS file reference
  // Vertex AI CAN read gs:// URIs directly - this is the key difference
  const videoPart: Part = {
    fileData: {
      fileUri: gcsUri,
      mimeType: "video/mp4",
    },
  };

  const textPart: Part = {
    text: options?.customPrompt || VIDEO_ANALYSIS_USER_PROMPT,
  };

  const contents: Content[] = [
    {
      role: "user",
      parts: [videoPart, textPart],
    },
  ];

  try {
    console.log(`[ENHANCE] Sending request to Vertex AI Gemini...`);
    const response = await generativeModel.generateContent({
      contents: contents,
    });

    const result = response.response;
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log(`[ENHANCE] Received response (${rawText.length} chars)`);

    // Parse the JSON response
    const analysisResult = parseAnalysisResponse(rawText);
    analysisResult.rawResponse = rawText;

    return analysisResult;
  } catch (error) {
    console.error(`[ENHANCE] Error analyzing video:`, error);
    throw new Error(
      `Failed to analyze video: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// =============================================================================
// Response Parsing
// =============================================================================

function parseAnalysisResponse(rawText: string): VideoAnalysisResult {
  const emptyResult: VideoAnalysisResult = {
    summary: "",
    techStack: [],
    dependencies: {},
    implementationSteps: [],
    codeBlocks: [],
    commands: [],
    keyMoments: [],
  };

  try {
    let jsonText = rawText;

    // Check for markdown code block
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    } else {
      // Try to find raw JSON object
      const objectMatch = rawText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonText = objectMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);

    return {
      summary: parsed.summary || "",
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
      dependencies:
        typeof parsed.dependencies === "object" ? parsed.dependencies : {},
      implementationSteps: Array.isArray(parsed.implementationSteps)
        ? parsed.implementationSteps
        : [],
      codeBlocks: Array.isArray(parsed.codeBlocks) ? parsed.codeBlocks : [],
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
      keyMoments: Array.isArray(parsed.keyMoments) ? parsed.keyMoments : [],
    };
  } catch {
    console.warn("[ENHANCE] Failed to parse JSON response, using raw text");
    return {
      ...emptyResult,
      summary: rawText,
    };
  }
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Verify the Vertex AI Gemini service is properly configured
 */
export async function checkGeminiHealth(): Promise<{
  healthy: boolean;
  model: string;
  project: string;
  error?: string;
}> {
  try {
    const client = getClient();
    const model = client.getGenerativeModel({ model: DEFAULT_MODEL });

    // Simple test call
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }],
    });

    const text = response.response.candidates?.[0]?.content?.parts?.[0]?.text;

    return {
      healthy: text?.includes("OK") || false,
      model: DEFAULT_MODEL,
      project: PROJECT_ID,
    };
  } catch (error) {
    return {
      healthy: false,
      model: DEFAULT_MODEL,
      project: PROJECT_ID,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// =============================================================================
// Exports
// =============================================================================

export default {
  analyzeVideoFromGCS,
  checkGeminiHealth,
};
