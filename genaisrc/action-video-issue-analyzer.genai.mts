script({
  title: "Analyzes videos upload as assets",
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
    }
  },
});

const { dbg, output, vars, files } = env;
const { instructions, videoUrl } = vars as { instructions?: string; videoUrl?: string };

// Use default instructions if not provided
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

async function processVideo(filename: string) {
  // Default to cloud transcription (OpenAI) if Docker is not available
  const transcript = await transcribe(filename, {
    model: "openai:whisper-1",
    cache: true,
  });
  if (!transcript) {
    output.error(`no transcript found for video ${filename}.`);
  }
  const frames = await ffmpeg.extractFrames(filename, {
    transcript,
  });

  // Determine model and options based on environment or default to Gemini 3 for video
  const modelId = vars.model || "gemini-3-pro-preview";
  const isGemini3 = modelId.includes("gemini");

  const modelOptions: any = {
      systemSafety: true,
      model: modelId,
      responseType: "json", // Request JSON as per instructions
      label: `analyze video ${filename}`,
  };

  if (isGemini3) {
      // Gemini 3 specific optimizations for video
      modelOptions.thinking = true; // Enable thinking
      modelOptions.thinkingLevel = (vars.thinkingLevel as string) || "high";
      modelOptions.mediaResolution = (vars.mediaResolution as string) || "high";
  }

  const { text, error } = await runPrompt(
    (ctx) => {
      const srt = transcript?.srt || "";
      ctx.def("TRANSCRIPT", srt, { ignoreEmpty: true }); // ignore silent videos
      ctx.defImages(frames, { detail: "high", sliceSample: 40 }); // High detail for OCR

      // Load Architectural Context from user prompts
      ctx.def("ARCHITECTURAL_CONTEXT", env.files.find(f => f.filename.endsWith("architectural_context.md")), { ignoreEmpty: true });

      ctx.$`${finalInstructions}

      Analyze the video specifically through the lens of the ARCHITECTURAL_CONTEXT provided.
      Identify alignment with the "Principles of Structure and State" and "Agent Deployment Protocol".

      Context Items to lookout for:
      ${vars.items || "API endpoints, model capabilities"}

      `.role("system");
    },
    modelOptions,
  );

  if (error) {
    output.error(error?.message);
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

          // Download using yt-dlp with explicit output path
          await host.exec(`yt-dlp -f "best" -o "${tempTemplate}" "${videoUrl}" --no-playlist`);

          // Find the downloaded file using workspace.findFiles with glob pattern
          const allFiles = await workspace.findFiles(`${cacheDir}/${tempBase}.*`);
          const downloadedFile = allFiles.find(f =>
              !f.filename.endsWith(".ytdl") &&
              !f.filename.endsWith(".part")
          );

          if (!downloadedFile) {
              const foundNames = allFiles.map(f => f.filename).join(", ");
              throw new Error(`Download missing. Found: ${foundNames || "nothing"}`);
          }

          const fullPath = downloadedFile.filename;
          output.p(`Processing: ${fullPath}`);
          await processVideo(fullPath);

          // Clean up
          try {
              await host.exec(`rm -f "${fullPath}"`);
          } catch (e) {
              dbg(`Cleanup warning: ${e}`);
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