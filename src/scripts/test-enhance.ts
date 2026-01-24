/**
 * Test ENHANCE stage directly against existing GCS video
 * No INGEST - tests Vertex AI's direct GCS access
 */

import { analyzeVideoFromGCS, checkGeminiHealth } from "../services/gemini";

async function testEnhanceOnly() {
  console.log("=".repeat(60));
  console.log("🧪 ENHANCE STAGE TEST - Direct GCS Analysis");
  console.log("=".repeat(60));
  console.log("");

  // The video that's already in GCS from previous test
  const gcsUri = "gs://uvai-videos-prod/raw/test-sample.mp4";
  console.log(`Target: ${gcsUri}`);
  console.log("");

  try {
    // Health check
    console.log("[1/2] Health Check...");
    const health = await checkGeminiHealth();
    console.log(`  healthy: ${health.healthy}`);
    console.log(`  model: ${health.model}`);
    console.log(`  project: ${health.project}`);

    if (!health.healthy) {
      console.error(`  ERROR: ${health.error}`);
      process.exit(1);
    }
    console.log("");

    // Analyze
    console.log("[2/2] Analyzing video from GCS (zero-disk)...");
    console.log("  ⏳ This may take 30-60 seconds...");
    console.log("");

    const startTime = Date.now();
    const result = await analyzeVideoFromGCS(gcsUri);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("");
    console.log("=".repeat(60));
    console.log("✅ ANALYSIS COMPLETE");
    console.log("=".repeat(60));
    console.log(`Duration: ${duration}s`);
    console.log("");

    console.log("📝 Summary:");
    console.log(result.summary.substring(0, 500));
    console.log("");

    console.log(`🛠️ Tech Stack (${result.techStack.length}):`);
    result.techStack.forEach((t) => console.log(`  • ${t}`));
    console.log("");

    console.log(`📋 Steps (${result.implementationSteps.length}):`);
    result.implementationSteps.slice(0, 5).forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.substring(0, 80)}`);
    });
    console.log("");

    console.log(`⏱️ Key Moments (${result.keyMoments.length}):`);
    result.keyMoments.slice(0, 5).forEach((m) => {
      console.log(`  ${m.timestamp}: ${m.description}`);
    });

  } catch (error) {
    console.error("");
    console.error("❌ FAILED:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testEnhanceOnly();
