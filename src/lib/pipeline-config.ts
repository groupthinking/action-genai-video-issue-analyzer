/**
 * Video Analysis Pipeline Configuration
 *
 * Enforces standardized routing through VTTA → CSDAA → OFSA agent chain.
 * Based on: docs/video-prompts-catalog.md
 *
 * NO AD-HOC CONFIGURATION ALLOWED - all processing must use these patterns.
 */

/**
 * Agent types in the pipeline
 */
export type AgentType = "VTTA" | "CSDAA" | "OFSA";

/**
 * Analysis task types determine which agents are invoked
 */
export type AnalysisTaskType =
  | "transcription"      // VTTA only
  | "code_extraction"    // VTTA → CSDAA
  | "full_analysis";     // VTTA → CSDAA → OFSA

/**
 * Agent configuration from the catalog
 */
export interface AgentConfig {
  name: string;
  fullName: string;
  role: string;
  tools: string[];
  outputFormat: string;
}

/**
 * Frozen agent configurations - DO NOT MODIFY
 * Source: docs/video-prompts-catalog.md Section 2
 */
export const AGENT_CONFIGS: Readonly<Record<AgentType, AgentConfig>> = Object.freeze({
  VTTA: {
    name: "VTTA",
    fullName: "Video Transcription & Timing Agent",
    role: "Capture all dialogue and timestamp key events",
    tools: ["Transcript Generation"],
    outputFormat: "Timestamped transcript with topic markers",
  },
  CSDAA: {
    name: "CSDAA",
    fullName: "Code Structure & Diff Analysis Agent",
    role: "Extract terminal commands, errors, and code changes",
    tools: ["Terminal Output Capture", "Diff Analysis"],
    outputFormat: "Command logs, code blocks, error-fix pairs",
  },
  OFSA: {
    name: "OFSA",
    fullName: "Output Formatting & Synthesis Agent",
    role: "Synthesize and structure output into actionable format",
    tools: ["Markdown Engine", "Mirrored Version Output"],
    outputFormat: "AgenticOutput JSON schema",
  },
});

/**
 * Pipeline routing table - maps task types to required agent chains
 * This is the SINGLE SOURCE OF TRUTH for video processing routes
 */
export const PIPELINE_ROUTES: Readonly<Record<AnalysisTaskType, readonly AgentType[]>> = Object.freeze({
  transcription: ["VTTA"] as const,
  code_extraction: ["VTTA", "CSDAA"] as const,
  full_analysis: ["VTTA", "CSDAA", "OFSA"] as const,
});

/**
 * Video source detection patterns
 */
export const SOURCE_PATTERNS = Object.freeze({
  youtube: /(?:youtube\.com|youtu\.be)/i,
  github_asset: /github\.com\/user-attachments\/assets/i,
  loom: /loom\.com/i,
  vimeo: /vimeo\.com/i,
});

/**
 * Prompt templates for each agent
 * Source: docs/video-prompts-catalog.md Sections 5-7
 */
export const AGENT_PROMPTS: Readonly<Record<AgentType, string>> = Object.freeze({
  VTTA: `You are VTTA (Video Transcription & Timing Agent).

Your role: Capture all dialogue and timestamp key events.

Instructions:
1. Transcribe ALL spoken content with timestamps [MM:SS]
2. Note major topic transitions with markers
3. Capture key terminology and proper nouns exactly as spoken
4. Flag any code demonstrations or terminal usage with [CODE_DEMO] markers
5. Note visual cues that provide context [VISUAL: description]

Output format:
\`\`\`
[00:00] Opening content...
[00:30] [TOPIC: Main Subject] ...
[01:15] [CODE_DEMO] Terminal command shown...
[02:00] [VISUAL: Diagram of architecture]
\`\`\`

Do NOT summarize. Capture EVERYTHING chronologically.`,

  CSDAA: `You are CSDAA (Code Structure & Diff Analysis Agent).

Your role: Extract and document all technical content.

Using the VTTA transcript provided, extract:
1. All terminal commands executed (with full command text)
2. All code snippets shown or typed
3. File paths and directory structures mentioned
4. Error messages and their resolutions
5. Dependencies, packages, and version numbers
6. Configuration values and environment variables

Output format:
\`\`\`
## Commands
\`\`\`bash
# [MM:SS] Context: what was being done
$ command --flags arguments
# Output: (if shown)
\`\`\`

## Code Artifacts
\`\`\`typescript
// File: path/to/file.ts
// [MM:SS] Purpose: what this code does
code here
\`\`\`

## Error → Fix Pairs
- [MM:SS] Error: "error message"
  Fix: What was done to resolve
\`\`\`

Be EXHAUSTIVE. Extract EVERY technical detail.`,

  OFSA: `You are OFSA (Output Formatting & Synthesis Agent).

Your role: Synthesize VTTA + CSDAA outputs into actionable AgenticOutput.

Instructions:
1. Maintain STRICT chronological order
2. Interleave transcript with technical operations
3. Generate replication guide (step-by-step instructions to recreate)
4. List ALL required tools and dependencies
5. Document pitfalls and edge cases observed
6. Extract business/product insights if present

Output MUST conform to AgenticOutput schema:
{
  "summary": {
    "title": "string",
    "description": "string (2-3 sentences)",
    "keyInsights": ["insight1", "insight2", ...]
  },
  "generatedWorkflow": {
    "steps": [
      {
        "order": 1,
        "action": "string",
        "details": "string",
        "codeSnippet": "optional string"
      }
    ]
  },
  "codeArtifacts": [
    {
      "filename": "string",
      "language": "string",
      "content": "string",
      "purpose": "string"
    }
  ],
  "dependencies": ["dep1", "dep2"],
  "pitfalls": ["pitfall1", "pitfall2"]
}

This is the FINAL deliverable. Make it comprehensive and actionable.`,
});

/**
 * Get the required agent chain for a task type
 */
export function getAgentChain(taskType: AnalysisTaskType): readonly AgentType[] {
  return PIPELINE_ROUTES[taskType];
}

/**
 * Get prompt for a specific agent
 */
export function getAgentPrompt(agent: AgentType): string {
  return AGENT_PROMPTS[agent];
}

/**
 * Build the complete prompt sequence for a pipeline
 */
export function buildPipelinePrompts(taskType: AnalysisTaskType): string[] {
  const chain = getAgentChain(taskType);
  return chain.map(agent => getAgentPrompt(agent));
}

/**
 * Detect video source from URL
 */
export function detectVideoSource(url: string): string {
  for (const [source, pattern] of Object.entries(SOURCE_PATTERNS)) {
    if (pattern.test(url)) {
      return source;
    }
  }
  return "direct";
}

/**
 * Validate that a pipeline execution followed the correct route
 */
export function validatePipelineExecution(
  taskType: AnalysisTaskType,
  executedAgents: AgentType[]
): { valid: boolean; error?: string } {
  const expectedChain = getAgentChain(taskType);

  if (executedAgents.length !== expectedChain.length) {
    return {
      valid: false,
      error: `Expected ${expectedChain.length} agents, got ${executedAgents.length}`,
    };
  }

  for (let i = 0; i < expectedChain.length; i++) {
    if (executedAgents[i] !== expectedChain[i]) {
      return {
        valid: false,
        error: `Agent ${i + 1} should be ${expectedChain[i]}, got ${executedAgents[i]}`,
      };
    }
  }

  return { valid: true };
}
