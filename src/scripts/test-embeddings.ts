/**
 * Full Pipeline Test with Embeddings
 *
 * Tests: ENHANCE → ACTION (with embeddings)
 *
 * Run: npx tsx src/scripts/test-embeddings.ts
 */

import { analyzeVideoFromGCS } from "../services/gemini";
import { generateEmbeddings as generateEmbeddingsVec, generateEmbedding } from "../services/embedding";
import { executeAction, type AnalysisForAction } from "../services/action";

const GCS_URI = "gs://uvai-videos-prod/raw/T1BTyo1A4Ww.mp4";
const JOB_ID = "test-embedding-" + Date.now();

async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 UVAI EMBEDDING PIPELINE TEST");
  console.log("=".repeat(60));
  console.log("Job ID:", JOB_ID);
  console.log("GCS URI:", GCS_URI);
  console.log("Timestamp:", new Date().toISOString());

  // Step 1: Test Vertex AI Embedding API
  console.log("\n" + "-".repeat(40));
  console.log("[1/3] 🔢 Testing Vertex AI Embeddings...");

  const startEmbed = Date.now();
  const testEmbedding = await generateEmbedding("How to set up Gemini API for video analysis");
  const embedTime = ((Date.now() - startEmbed) / 1000).toFixed(2);

  console.log(`✅ Embedding generated in ${embedTime}s`);
  console.log(`   Dimensions: ${testEmbedding.length}`);
  console.log(`   Sample: [${testEmbedding.slice(0, 3).map(v => v.toFixed(4)).join(", ")}, ...]`);

  // Step 2: ENHANCE - Analyze video
  console.log("\n" + "-".repeat(40));
  console.log("[2/3] 🧠 ENHANCE Stage - Analyzing video...");

  const startAnalysis = Date.now();
  const analysis = await analyzeVideoFromGCS(GCS_URI);
  const analysisTime = ((Date.now() - startAnalysis) / 1000).toFixed(2);

  console.log(`✅ Analysis complete in ${analysisTime}s`);
  console.log(`   Summary: ${analysis.summary.substring(0, 80)}...`);
  console.log(`   Tech Stack: ${analysis.techStack.length} items`);
  console.log(`   Steps: ${analysis.implementationSteps.length} steps`);
  console.log(`   Key Moments: ${analysis.keyMoments.length} moments`);

  // Step 3: ACTION - Generate embeddings and store
  console.log("\n" + "-".repeat(40));
  console.log("[3/3] ⚡ ACTION Stage - Generating embeddings...");

  // Convert to action format
  const analysisForAction: AnalysisForAction = {
    title: "Get started developing with Gemini API",
    summary: analysis.summary,
    techStack: analysis.techStack.map(t => t.name),
    implementationSteps: analysis.implementationSteps.map(s => s.action),
    codeBlocks: analysis.codeBlocks.map(c => ({
      language: c.language,
      code: c.code,
      description: c.description,
    })),
    dependencies: {},
    keyMoments: analysis.keyMoments.map(m => ({
      timestamp: m.timestamp,
      description: m.description,
    })),
  };

  const startAction = Date.now();
  const actionResult = await executeAction(JOB_ID, analysisForAction, {
    generateVectors: true,
    // Enable GitHub issue if token is set
    createGitHubIssue: process.env.ACTION_CREATE_GITHUB_ISSUE === "true"
      ? {
          owner: process.env.ACTION_GITHUB_OWNER || "groupthinking",
          repo: process.env.ACTION_GITHUB_REPO || "action-genai-video-issue-analyzer",
        }
      : undefined,
  });
  const actionTime = ((Date.now() - startAction) / 1000).toFixed(2);

  console.log(`✅ ACTION complete in ${actionTime}s`);
  console.log(`   Embeddings: ${actionResult.embeddings?.vectorCount || 0} vectors`);
  console.log(`   Segment IDs: ${actionResult.embeddings?.segmentIds.slice(0, 3).join(", ")}...`);

  if (actionResult.githubIssue) {
    if (actionResult.githubIssue.created) {
      console.log(`   GitHub Issue: ${actionResult.githubIssue.issueUrl}`);
    } else {
      console.log(`   GitHub Issue: skipped (${actionResult.githubIssue.error || "not configured"})`);
    }
  }

  // Summary
  const totalTime = (parseFloat(embedTime) + parseFloat(analysisTime) + parseFloat(actionTime)).toFixed(2);

  console.log("\n" + "=".repeat(60));
  console.log("✅ EMBEDDING PIPELINE TEST COMPLETE");
  console.log("=".repeat(60));
  console.log(`Total time: ${totalTime}s`);
  console.log(`  Embedding API test: ${embedTime}s`);
  console.log(`  ENHANCE (Gemini): ${analysisTime}s`);
  console.log(`  ACTION (embeddings): ${actionTime}s`);
  console.log("");
  console.log("Vectors generated:", actionResult.embeddings?.vectorCount || 0);

  if (!process.env.CLOUDSQL_PASSWORD && !process.env.K_SERVICE) {
    console.log("");
    console.log("⚠️  Note: Running without Cloud SQL connection.");
    console.log("   Set CLOUDSQL_PASSWORD or deploy to Cloud Run for real storage.");
    console.log("   Embeddings were generated but not persisted to pgvector.");
  }
}

main().catch(console.error);
