script({
  title: "GenAI Video Issue Analyzer",
  description: "Analyzes videos uploaded as assets in GitHub issues or provided via direct URL.",
  accept: ".mp4",
  parameters: {
    instructions: {
      type: "string",
      description: "Custom prompting instructions for each video.",
      default:
        "Analyze the video and provide a summary of its content. Extract list of followup subissues if any. The transcript is your primary source of text information, ignore text in images.",
    },
    videoUrl: {
      type: "string",
      description: "Direct video URL to analyze (alternative to extracting from issue body)",
    },
    items: {
      type: "string",
      description: "List of specific items to extract from the video",
      default: "API endpoints, model capabilities",
    },
    thinkingLevel: {
      type: "string",
      description: "Gemini 3 thinking level (high, low)",
      default: "high",
    },
    mediaResolution: {
      type: "string",
      description: "Gemini 3 media resolution (high, low)",
      default: "high",
    },
    outputMode: {
      type: "string",
      description: "Output mode: 'summary' for text summary, 'agentic' for executable workflow output",
      default: "agentic",
    }
  },
});

// AgenticOutput Schema - Defines the structure for executable, market-ready output
const AgenticOutputSchema: JSONSchema = {
  type: "object",
  required: ["summary", "actionableInsights", "generatedWorkflow"],
  properties: {
    summary: {
      type: "object",
      description: "High-level analysis of the video content",
      properties: {
        title: { type: "string", description: "Title derived from video content" },
        description: { type: "string", description: "Brief description of what the video demonstrates" },
        duration: { type: "string", description: "Estimated duration of key content" },
        primaryTopic: { type: "string", description: "Main technical topic covered" },
      },
      required: ["title", "description", "primaryTopic"]
    },
    extractedEndpoints: {
      type: "array",
      description: "API endpoints mentioned or demonstrated",
      items: {
        type: "object",
        properties: {
          endpoint: { type: "string", description: "API endpoint URL or path" },
          method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE", "PATCH"] },
          purpose: { type: "string", description: "What this endpoint does" },
          timestamp: { type: "string", description: "When it appears in video" }
        },
        required: ["endpoint", "purpose"]
      }
    },
    extractedCapabilities: {
      type: "array",
      description: "Model or system capabilities demonstrated",
      items: {
        type: "object",
        properties: {
          capability: { type: "string", description: "Name of the capability" },
          description: { type: "string", description: "How it works" },
          useCase: { type: "string", description: "Practical application" },
          timestamp: { type: "string", description: "When demonstrated" }
        },
        required: ["capability", "description"]
      }
    },
    actionableInsights: {
      type: "array",
      description: "Key takeaways that can be immediately acted upon",
      items: {
        type: "object",
        properties: {
          insight: { type: "string", description: "The actionable insight" },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          implementation: { type: "string", description: "How to implement this" }
        },
        required: ["insight", "priority"]
      }
    },
    generatedWorkflow: {
      type: "object",
      description: "Executable workflow that mirrors the video content",
      properties: {
        name: { type: "string", description: "Workflow name" },
        description: { type: "string", description: "What this workflow accomplishes" },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              stepNumber: { type: "number" },
              action: { type: "string", description: "Action to take" },
              command: { type: "string", description: "CLI command if applicable" },
              code: { type: "string", description: "Code snippet if applicable" },
              expectedOutput: { type: "string", description: "What should happen" }
            },
            required: ["stepNumber", "action"]
          }
        },
        prerequisites: {
          type: "array",
          items: { type: "string" },
          description: "What needs to be set up before running"
        },
        estimatedTime: { type: "string", description: "Time to complete" }
      },
      required: ["name", "steps"]
    },
    codeArtifacts: {
      type: "array",
      description: "Executable code extracted from the video",
      items: {
        type: "object",
        properties: {
          filename: { type: "string", description: "Suggested filename" },
          language: { type: "string", description: "Programming language" },
          code: { type: "string", description: "The actual code" },
          purpose: { type: "string", description: "What this code does" }
        },
        required: ["filename", "language", "code", "purpose"]
      }
    },
    deploymentInstructions: {
      type: "object",
      description: "How to deploy the solution demonstrated",
      properties: {
        platform: { type: "string", description: "Target platform (e.g., Cloudflare, Vercel, GCP)" },
        steps: {
          type: "array",
          items: { type: "string" },
          description: "Step-by-step deployment instructions"
        },
        configFiles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filename: { type: "string" },
              content: { type: "string" }
            },
            required: ["filename", "content"]
          }
        },
        environmentVariables: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              required: { type: "boolean" }
            },
            required: ["name", "description"]
          }
        }
      }
    }
  }
};


const { dbg, output, vars, files } = env;
const { instructions, videoUrl } = vars as { instructions?: string; videoUrl?: string };

// Use default instructions if not provided
const finalInstructions = instructions ||
  `Watch this video carefully. I need a technical breakdown.
1. Extract every API endpoint mentioned or shown on screen.
2. List every specific model capability discussed.
3. Provide exact timestamps for when each feature is demonstrated.
Output this as a structured JSON list.`;

// process direct video URL if provided
if (videoUrl) {
  dbg(`Processing direct video URL: ${videoUrl}`);
  await processDirectVideoUrl(videoUrl);
}

// inspect issue
const issue = await github.getIssue();
if (issue) {
  const RX = /^https:\/\/github.com\/user-attachments\/assets\/.+$/gim;
  const body = issue.body || ""; // Handle undefined body
  const assetLinks = Array.from(
    new Set(Array.from(body.matchAll(RX), (m) => m[0])),
  );
  if (assetLinks.length === 0)
    cancel("No video assets found in the issue body, nothing to do.");

  dbg(`issue: %s`, issue.title);

  for (const assetLink of assetLinks) await processAssetLink(assetLink);
}

// process files
for (const file of files) {
  await processVideoFile(file);
}

async function processAssetLink(assetLink: string) {
  output.heading(4, assetLink);
  dbg(assetLink);
  const downloadUrl = await github.resolveAssetUrl(assetLink);
  if (!downloadUrl) {
      output.error(`Could not resolve asset url for ${assetLink}`);
      return;
  }
  const res = await fetch(downloadUrl, { method: "GET" });
  const contentType = res.headers.get("content-type") || "";
  dbg(`download url: %s`, downloadUrl);
  dbg(`headers: %O`, res.headers);
  if (!res.ok)
    throw new Error(
      `Failed to download asset from ${downloadUrl}: ${res.status} ${res.statusText}`,
    );
  if (!/^video\//.test(contentType)) {
    output.p(`Asset is not a video file, skipping`);
    return;
  }

  // save and cache
  const buffer = await res.arrayBuffer();
  dbg(`size`, `${(buffer.byteLength / 1e6) | 0}Mb`);
  const filename = await workspace.writeCached(buffer, { scope: "run" });
  dbg(`filename`, filename);

  await processVideo(filename);
}

async function processVideo(filename: string, externalTranscript?: string) {
  // Gemini handles video+audio together natively
  // Use Gemini 1.5 Flash for transcription as it is stable for the transcription tool
  let transcript: Awaited<ReturnType<typeof transcribe>> | undefined;

  if (externalTranscript) {
    dbg(`Using external transcript provided.`);
    // Construct a minimal transcript-like object that matches the expected structure
    // We only really need .srt or .text for the prompt
    transcript = { srt: externalTranscript } as any;
  } else {
    try {
      transcript = await transcribe(filename, {
        model: "google:gemini-1.5-flash",
        cache: true,
      });
      output.p(`✅ Transcription completed with Gemini.`);
    } catch (transcribeError: any) {
      dbg(`Transcription failed: ${transcribeError.message}`);
      output.p(`📹 Proceeding with video analysis (Gemini will analyze audio directly).`);
      // This is fine - Gemini will analyze the video with audio in the main prompt
    }
  }

  if (!transcript) {
    output.p(`Note: Using direct video+audio analysis mode.`);
  }
  const frames = await ffmpeg.extractFrames(filename, {
    transcript,
  });

  // Determine model and options based on environment or default to Gemini 2.0 Flash for video
  const modelId = vars.model || "google:gemini-2.0-flash-thinking-exp";
  const isGemini = modelId.includes("gemini");
  const isAgenticMode = (vars.outputMode as string) !== "summary";

  const modelOptions: any = {
      systemSafety: true,
      model: modelId,
      label: `analyze video ${filename}`,
  };

  // Use structured JSON schema for agentic output
  if (isAgenticMode) {
      modelOptions.responseType = "json_schema";
      modelOptions.responseSchema = AgenticOutputSchema;
  } else {
      modelOptions.responseType = "json";
  }

  if (isGemini) {
      // Gemini 3 specific optimizations for video
      modelOptions.thinking = true; // Enable thinking
      modelOptions.thinkingLevel = (vars.thinkingLevel as string) || "high";
      modelOptions.mediaResolution = (vars.mediaResolution as string) || "high";
  }

  const agenticPrompt = `You are a Video-to-Agentic Action Agent. Your goal is to transform video content into executable, deployable business systems.

## Your Mission
Analyze this video through the lens of "Functional Workflow Mirroring" - extract not just what is shown, but create executable code and workflows that replicate the demonstrated functionality.

## Output Requirements
1. **Summary**: Provide a clear title, description, and identify the primary technical topic
2. **Extracted Endpoints**: List every API endpoint or URL mentioned with method and purpose
3. **Extracted Capabilities**: Document all model/system capabilities demonstrated
4. **Actionable Insights**: Provide prioritized takeaways with implementation guidance
5. **Generated Workflow**: Create a step-by-step executable workflow with CLI commands and code snippets
6. **Code Artifacts**: Extract or generate any code shown or implied in the video
7. **Deployment Instructions**: Provide platform-specific deployment steps with config files

## Context Items to Extract
${vars.items || "API endpoints, model capabilities, technical implementations"}

## Analysis Lens
Analyze through the ARCHITECTURAL_CONTEXT principles:
- Align with "Principles of Structure and State"
- Follow "Agent Deployment Protocol"
- Target UVAI.IO deployment where applicable`;

  const summaryPrompt = `${finalInstructions}

Analyze the video specifically through the lens of the ARCHITECTURAL_CONTEXT provided.
Identify alignment with the "Principles of Structure and State" and "Agent Deployment Protocol".

Context Items to lookout for:
${vars.items || "API endpoints, model capabilities"}`;

  const { text, error, json } = await runPrompt(
    (ctx) => {
      const srt = transcript?.srt || "";
      ctx.def("TRANSCRIPT", srt, { ignoreEmpty: true }); // ignore silent videos
      ctx.defImages(frames, { detail: "high", sliceSample: 40 }); // High detail for OCR

      // Load Architectural Context from user prompts
      // Load Architectural Context from user prompts with null guard
      const archContextFile = env.files.find(f => f.filename.endsWith("architectural_context.md"));
      if (archContextFile) {
        ctx.def("ARCHITECTURAL_CONTEXT", archContextFile, { ignoreEmpty: true });
      }

      ctx.$`${isAgenticMode ? agenticPrompt : summaryPrompt}`.role("system");
    },
    modelOptions,
  );

  if (error) {
    output.error(error?.message || "Unknown error occurred");
  } else if (isAgenticMode && json) {
    // Format agentic output beautifully
    output.heading(3, "🎯 Agentic Analysis Results");

    if (json.summary) {
      output.heading(4, json.summary.title || "Video Analysis");
      output.p(json.summary.description || "");
      output.p(`**Primary Topic:** ${json.summary.primaryTopic || "N/A"}`);
    }

    if (json.actionableInsights?.length) {
      output.heading(4, "⚡ Actionable Insights");
      for (const insight of json.actionableInsights) {
        output.p(`- **[${insight.priority?.toUpperCase()}]** ${insight.insight}`);
        if (insight.implementation) output.p(`  → *Implementation:* ${insight.implementation}`);
      }
    }

    if (json.generatedWorkflow?.steps?.length) {
      output.heading(4, "🔧 Generated Workflow");
      output.p(`**${json.generatedWorkflow.name}**`);
      if (json.generatedWorkflow.description) output.p(json.generatedWorkflow.description);
      for (const step of json.generatedWorkflow.steps) {
        output.p(`${step.stepNumber}. ${step.action}`);
        if (step.command) output.p(`   \`${step.command}\``);
        if (step.code) output.appendContent(`\n\`\`\`\n${step.code}\n\`\`\`\n`);
      }
    }

    if (json.codeArtifacts?.length) {
      output.heading(4, "📄 Code Artifacts");
      for (const artifact of json.codeArtifacts) {
        output.p(`**${artifact.filename}** (${artifact.language})`);
        output.p(`*Purpose:* ${artifact.purpose}`);
        output.appendContent(`\n\`\`\`${artifact.language}\n${artifact.code}\n\`\`\`\n`);
      }
    }

    // Also output the raw JSON for programmatic use
    output.heading(4, "📊 Raw JSON Output");
    output.appendContent(`\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n`);
  } else {
    output.appendContent(text);
  }
}

async function processDirectVideoUrl(videoUrl: string) {
  output.heading(4, videoUrl);
  dbg(`Processing direct video URL: ${videoUrl}`);

  // Handle YouTube URLs
  if (/(?:youtube\.com|youtu\.be)/.test(videoUrl)) {
      const tempBase = `yt_${Math.random().toString(36).substring(7)}`;

      try {
          // Download with permissive format to a workspace-managed cache location
          output.p(`Downloading ${videoUrl}...`);

          // Use workspace.writeCached to get a proper cache directory path
          // Write a placeholder to get the cache directory structure
          const placeholderPath = await workspace.writeCached(new Uint8Array([0]), { scope: "run" });
          const cacheDir = placeholderPath.substring(0, placeholderPath.lastIndexOf('/'));
          const tempTemplate = `${cacheDir}/${tempBase}.%(ext)s`;

          dbg(`Using cache dir: ${cacheDir}`);
          dbg(`Output template: ${tempTemplate}`);

          // Download using yt-dlp with --print filename to capture the actual output path
          // Also try to download auto-subtitles
          const downloadResult = await host.exec(`yt-dlp --js-runtimes node -f "best" --write-auto-subs --sub-lang "en" --sub-format "srt/vtt" -o "${tempTemplate}" "${videoUrl}" --no-playlist --print after_move:filepath`);

          // The printed filepath is in stdout
          const downloadedPath = (downloadResult.stdout || "")
              .split("\n")
              .map(line => line.trim())
              .filter(line => line && line.includes(tempBase))
              .pop();

          dbg(`yt-dlp reported path: ${downloadedPath}`);

          // Try to find the subtitle file
          let externalTranscript: string | undefined;
          try {
            const subPathSrt = downloadedPath ? downloadedPath.replace(/\.[^.]+$/, ".en.srt") : `${cacheDir}/${tempBase}.en.srt`;
            const subPathVtt = downloadedPath ? downloadedPath.replace(/\.[^.]+$/, ".en.vtt") : `${cacheDir}/${tempBase}.en.vtt`;

            const srtStat = await workspace.stat(subPathSrt);
            const vttStat = await workspace.stat(subPathVtt);

            if (srtStat) {
                externalTranscript = (await workspace.readText(subPathSrt))?.content;
                dbg(`Loaded external transcript from SRT: ${subPathSrt}`);
            } else if (vttStat) {
                externalTranscript = (await workspace.readText(subPathVtt))?.content;
                dbg(`Loaded external transcript from VTT: ${subPathVtt}`);
            }
          } catch (e) {
            dbg(`Failed to load external transcript: ${e}`);
          }

          if (!downloadedPath) {
              // Fallback: construct the likely path using .mp4 extension (most common)
              const likelyPath = `${cacheDir}/${tempBase}.mp4`;
              dbg(`Fallback to likely path: ${likelyPath}`);

              // Verify it exists using workspace.stat
              const stat = await workspace.stat(likelyPath);
              if (!stat) {
                  throw new Error(`Download failed. Expected file at: ${likelyPath}`);
              }
              output.p(`Processing: ${likelyPath}`);
              await processVideo(likelyPath, externalTranscript);

              // Clean up
              try { await host.exec(`rm -f "${likelyPath}"`); } catch (e) { dbg(`Cleanup warning: ${e}`); }
          } else {
              output.p(`Processing: ${downloadedPath}`);
              await processVideo(downloadedPath, externalTranscript);

              // Clean up
              try { await host.exec(`rm -f "${downloadedPath}"`); } catch (e) { dbg(`Cleanup warning: ${e}`); }
          }
      } catch (e: any) {
          // Log the full error to the debug output for visibility
          output.error(`yt-dlp failed: ${e.message}`);
          if (e.stdout) dbg(`stdout: ${e.stdout}`);
          if (e.stderr) dbg(`stderr: ${e.stderr}`);

          throw new Error(`Failed to download YouTube video: ${e.message}`);
      }
      return;
  }

  // Download video from direct URL
  const res = await fetch(videoUrl, { method: "GET" });
  const contentType = res.headers.get("content-type") || "";
  dbg(`download url: %s`, videoUrl);
  dbg(`headers: %O`, res.headers);

  if (!res.ok)
    throw new Error(
      `Failed to download video from ${videoUrl}: ${res.status} ${res.statusText}`,
    );

  if (!/^video\//.test(contentType)) {
    output.p(`URL does not point to a video file, skipping`);
    return;
  }

  // save and cache
  const buffer = await res.arrayBuffer();
  dbg(`size`, `${(buffer.byteLength / 1e6) | 0}Mb`);
  const filename = await workspace.writeCached(buffer, { scope: "run" });
  dbg(`filename`, filename);

  await processVideo(filename);
}

async function processVideoFile(file: WorkspaceFile) {
  output.heading(4, file.filename);

  // Read the file content
  let filename = file.filename
  if (file.encoding === "base64") {
    // Save and cache the video file
    filename = await workspace.writeCached(file, { scope: "run" });
    dbg(`filename`, filename);
  }
  await processVideo(filename);
}