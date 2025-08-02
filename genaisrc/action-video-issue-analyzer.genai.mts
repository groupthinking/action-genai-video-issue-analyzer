script({
  title: "Analyzes videos upload as assets",
  accept: "none",
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
  },
});

const { dbg, output, vars } = env;
const { instructions, videoUrl } = vars as { instructions?: string; videoUrl?: string };

// Use default instructions if not provided
const finalInstructions = instructions || 
  "Analyze the video and provide a summary of its content. Extract list of followup subissues if any. The transcript is your primary source of text information, ignore text in images.";

// Process direct video URL if provided
if (videoUrl) {
  dbg(`Processing direct video URL: ${videoUrl}`);
  await processDirectVideoUrl(videoUrl);
} else {
  // Fallback to extracting from issue body
  const issue = await github.getIssue();
  if (!issue)
    throw new Error(
      "No issue found in the context and no videoUrl provided. This action requires either an issue to be present or a videoUrl parameter.",
    );

  const RX = /^https:\/\/github.com\/user-attachments\/assets\/.+$/gim;
  const assetLinks = Array.from(
    new Set(Array.from(issue.body.matchAll(RX), (m) => m[0])),
  );
  if (assetLinks.length === 0)
    cancel("No video assets found in the issue body, nothing to do.");

  dbg(`issue: %s`, issue.title);

  for (const assetLink of assetLinks) await processAssetLink(assetLink);
}

async function processAssetLink(assetLink: string) {
  output.heading(3, assetLink);
  dbg(assetLink);
  const downloadUrl = await github.resolveAssetUrl(assetLink);
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
  const transcript = await transcribe(filename, {
    model: "whisperasr:default",
    cache: true,
  });
  if (!transcript) {
    output.error(`no transcript found for video ${filename}.`);
  }
  const frames = await ffmpeg.extractFrames(filename, {
    transcript,
  });
  const { text, error } = await runPrompt(
    (ctx) => {
      ctx.def("TRANSCRIPT", transcript?.srt, { ignoreEmpty: true }); // ignore silent videos
      ctx.defImages(frames, { detail: "low", sliceSample: 40 }); // low detail for better performance
      ctx.$`${finalInstructions}
## Output format
- Use GitHub Flavored Markdown (GFM) for markdown syntax formatting.
- If you need to list tasks, use the format \`- [ ] task description\`.
- Do not generate links.
- When possible, include a pointer to the \`[minute:second]\` location in the video using YouTube format.
- The video is included as a set of <FRAMES> images and the <TRANSCRIPT>.`.role(
        "system",
      );
    },
    {
      systemSafety: true,
      model: "vision",
      responseType: "markdown",
      label: `analyze video ${filename}`,
    },
  );

  if (error) {
    output.error(error?.message);
  } else {
    output.appendContent(text);
  }
}

async function processDirectVideoUrl(videoUrl: string) {
  output.heading(3, `Direct Video: ${videoUrl}`);
  dbg(`Processing direct video URL: ${videoUrl}`);
  
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
