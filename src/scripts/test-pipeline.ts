/**
 * UVAI Pipeline Integration Test
 *
 * Tests the critical INGEST → ENHANCE flow:
 * 1. Stream video to GCS (yt-dlp pipe)
 * 2. Analyze with Gemini 2.0 Flash
 *
 * This validates the "Digital Refinery" zero-disk architecture.
 *
 * Usage: npm run test:pipeline
 */

import * as dotenv from "dotenv";
dotenv.config();

import { streamToGCS, fetchYouTubeMetadata, validateVideoForProcessing } from "../lib/ingest-worker";
import { analyzeVideoFromGCS, checkGeminiHealth, type VideoAnalysisResult } from "../services/gemini";

// =============================================================================
// Test Configuration
// =============================================================================

// Short technical video for testing (under 5 minutes to save time/tokens)
// "Get started developing with Gemini API" - Google for Developers (~1:23)
const TEST_VIDEO_ID = "T1BTyo1A4Ww";

// Alternative test videos if needed:
// - "Get Your Gemini API Key" (short): "RVGbLSVFtIk"
// - "How to Get FREE Google Gemini API Access": "-yzjAoWtOxA"

// =============================================================================
// Test Runner
// =============================================================================

async function runPipelineTest() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 UVAI PIPELINE INTEGRATION TEST");
  console.log("=".repeat(60));
  console.log(`Test Video ID: ${TEST_VIDEO_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  // Check environment
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const gcsBucket = process.env.GCS_BUCKET_NAME;

  if (!apiKey) {
    console.error("❌ ERROR: GOOGLE_API_KEY or GEMINI_API_KEY not set");
    process.exit(1);
  }

  console.log("✅ API Key configured");
  console.log(`📦 GCS Bucket: ${gcsBucket || "uvai-videos (default)"}`);
  console.log("");

  try {
    // =========================================================================
    // Phase 0: Health Check
    // =========================================================================
    console.log("─".repeat(40));
    console.log("[0/3] 🏥 Gemini Health Check...");

    const health = await checkGeminiHealth();
    if (health.healthy) {
      console.log(`✅ Gemini service healthy (model: ${health.model})`);
    } else {
      console.error(`❌ Gemini service unhealthy: ${health.error}`);
      process.exit(1);
    }
    console.log("");

    // =========================================================================
    // Phase 1: Fetch Metadata & Validate
    // =========================================================================
    console.log("─".repeat(40));
    console.log("[1/3] 📋 Fetching YouTube Metadata...");

    const metadata = await fetchYouTubeMetadata(TEST_VIDEO_ID);
    console.log(`   Title: ${metadata.title}`);
    console.log(`   Channel: ${metadata.channelTitle}`);
    console.log(`   Duration: ${metadata.duration}`);
    console.log(`   Actionable: ${metadata.isActionable}`);

    const validation = validateVideoForProcessing(metadata);
    if (validation.valid) {
      console.log("✅ Video passed validation");
    } else {
      console.warn(`⚠️ Validation warning: ${validation.reason}`);
    }
    console.log("");

    // =========================================================================
    // Phase 2: Stream to GCS (INGEST)
    // =========================================================================
    console.log("─".repeat(40));
    console.log("[2/3] 📤 Streaming to GCS (INGEST stage)...");
    console.log("   ⏳ This may take 1-3 minutes depending on video size...");

    const startIngest = Date.now();
    const gcsUri = await streamToGCS(TEST_VIDEO_ID);
    const ingestDuration = ((Date.now() - startIngest) / 1000).toFixed(1);

    console.log(`✅ INGEST complete in ${ingestDuration}s`);
    console.log(`   GCS URI: ${gcsUri}`);
    console.log("");

    // =========================================================================
    // Phase 3: Analyze with Gemini (ENHANCE)
    // =========================================================================
    console.log("─".repeat(40));
    console.log("[3/3] 🧠 Analyzing with Gemini 2.0 Flash (ENHANCE stage)...");
    console.log("   ⏳ Processing video content...");

    const startEnhance = Date.now();
    const analysis = await analyzeVideoFromGCS(gcsUri);
    const enhanceDuration = ((Date.now() - startEnhance) / 1000).toFixed(1);

    console.log(`✅ ENHANCE complete in ${enhanceDuration}s`);
    console.log("");

    // =========================================================================
    // Results Summary
    // =========================================================================
    console.log("=".repeat(60));
    console.log("🎯 ANALYSIS RESULTS");
    console.log("=".repeat(60));
    console.log("");

    console.log(`📝 Summary: ${analysis.summary.substring(0, 200)}...`);
    console.log("");

    console.log(`🛠️ Tech Stack (${analysis.techStack.length} items):`);
    analysis.techStack.forEach((tech) => console.log(`   • ${tech}`));
    console.log("");

    console.log(`📦 Dependencies (${Object.keys(analysis.dependencies).length} items):`);
    Object.entries(analysis.dependencies).slice(0, 5).forEach(([pkg, ver]) => {
      console.log(`   • ${pkg}: ${ver}`);
    });
    if (Object.keys(analysis.dependencies).length > 5) {
      console.log(`   ... and ${Object.keys(analysis.dependencies).length - 5} more`);
    }
    console.log("");

    console.log(`📋 Implementation Steps (${analysis.implementationSteps.length} steps):`);
    analysis.implementationSteps.slice(0, 5).forEach((step, i) => {
      console.log(`   ${i + 1}. ${step.substring(0, 80)}${step.length > 80 ? "..." : ""}`);
    });
    if (analysis.implementationSteps.length > 5) {
      console.log(`   ... and ${analysis.implementationSteps.length - 5} more steps`);
    }
    console.log("");

    console.log(`💻 Code Blocks: ${analysis.codeBlocks.length}`);
    console.log(`⌨️ Commands: ${analysis.commands.length}`);
    console.log(`⏱️ Key Moments: ${analysis.keyMoments.length}`);
    console.log("");

    // Check for one-shot efficiency
    if (analysis.keyMoments.length > 0) {
      console.log("✨ SUCCESS: Key moments (segments) extracted in single pass!");
      console.log("   → Distinct SEGMENT stage may be skippable (latency win!)");
    }

    // =========================================================================
    // Final Summary
    // =========================================================================
    console.log("");
    console.log("=".repeat(60));
    console.log("✅ PIPELINE TEST PASSED");
    console.log("=".repeat(60));
    console.log(`Total time: ${((Date.now() - startIngest) / 1000).toFixed(1)}s`);
    console.log(`   INGEST: ${ingestDuration}s`);
    console.log(`   ENHANCE: ${enhanceDuration}s`);
    console.log("");

  } catch (error) {
    console.error("");
    console.error("=".repeat(60));
    console.error("❌ PIPELINE TEST FAILED");
    console.error("=".repeat(60));
    console.error("");
    console.error("Error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error("");
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run the test
runPipelineTest();
