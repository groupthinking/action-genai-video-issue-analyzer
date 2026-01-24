/**
 * FAST Transcript-Based Analysis
 *
 * This is the RIGHT way to analyze videos:
 * 1. Fetch transcript/captions directly (~1s)
 * 2. Send text to Gemini (~3s)
 *
 * vs the SLOW way:
 * 1. Download video (~30s+)
 * 2. Upload to GCS (~30s+)
 * 3. Send video to Gemini (~30s+)
 */

import * as fs from "fs";
import { execSync } from "child_process";
import { VertexAI } from "@google-cloud/vertexai";

const VIDEO_ID = process.argv[2] || "bUycTrxNas0";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("⚡ FAST ANALYSIS (Transcript-based)");
  console.log("=".repeat(60));
  console.log("Video:", VIDEO_URL);
  console.log("");

  const totalStart = Date.now();

  // Step 1: Fetch transcript (~1-2s)
  console.log("[1/2] 📝 Fetching transcript...");
  const transcriptStart = Date.now();

  const transcriptPath = `/tmp/transcript-${VIDEO_ID}.en.vtt`;

  try {
    execSync(
      `yt-dlp --skip-download --write-auto-sub --sub-format vtt --sub-lang en -o "/tmp/transcript-${VIDEO_ID}" "${VIDEO_URL}" 2>/dev/null`,
      { encoding: "utf8" }
    );
  } catch (e) {
    // Might already exist, continue
  }

  const vtt = fs.readFileSync(transcriptPath, "utf8");

  // Clean VTT to plain text
  const lines = vtt.split("\n")
    .filter(line => !line.includes("-->") && !line.includes("WEBVTT") && !line.includes("Kind:") && !line.includes("Language:") && !line.includes("align:"))
    .map(line => line.replace(/<[^>]+>/g, "").trim())
    .filter(line => line.length > 0);

  const uniqueLines: string[] = [];
  for (const line of lines) {
    if (!uniqueLines.includes(line)) {
      uniqueLines.push(line);
    }
  }
  const transcript = uniqueLines.join(" ");

  const transcriptTime = ((Date.now() - transcriptStart) / 1000).toFixed(1);
  console.log(`✅ Transcript fetched in ${transcriptTime}s (${transcript.length} chars)`);

  // Step 2: Analyze with Gemini (~2-4s)
  console.log("\n[2/2] 🧠 Analyzing with Gemini...");
  const analysisStart = Date.now();

  const vertexAI = new VertexAI({ project: "uvai-730bb", location: "us-central1" });
  const model = vertexAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });

  const result = await model.generateContent({
    contents: [{
      role: "user",
      parts: [{
        text: `Analyze this video transcript and extract:

1. SUMMARY (2-3 paragraphs): What is this video about?
2. TECH_STACK (list): Every tool, service, framework mentioned
3. IMPLEMENTATION_STEPS (numbered list): How to replicate what's shown
4. KEY_INSIGHTS (bullet points): Most actionable takeaways

TRANSCRIPT:
${transcript.substring(0, 20000)}

Respond in JSON format.`
      }]
    }]
  });

  const analysisTime = ((Date.now() - analysisStart) / 1000).toFixed(1);
  const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1);

  console.log(`✅ Analysis complete in ${analysisTime}s`);
  console.log("");
  console.log("=".repeat(60));
  console.log("📊 RESULTS");
  console.log("=".repeat(60));

  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log(responseText);

  console.log("\n" + "=".repeat(60));
  console.log("⏱️ TIMING COMPARISON");
  console.log("=".repeat(60));
  console.log(`Transcript fetch: ${transcriptTime}s`);
  console.log(`Gemini analysis:  ${analysisTime}s`);
  console.log(`TOTAL:            ${totalTime}s`);
  console.log("");
  console.log(`vs Video file method: ~30-60s (6-10x slower)`);
}

main().catch(console.error);
