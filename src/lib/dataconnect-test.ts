/**
 * Firebase Data Connect Integration Test
 *
 * This script inserts REAL data into the Cloud SQL database
 * and queries it back to prove Firebase Data Connect is working.
 *
 * Run with: npx tsx src/lib/dataconnect-test.ts
 */

import { initializeApp } from "firebase/app";
import { getDataConnect, connectDataConnectEmulator } from "firebase/data-connect";
import {
  createVideoJob,
  listJobs,
  getJob,
  updateJobStatus,
  completeJob,
  recordJobEvent,
  getJobEvents,
  connectorConfig,
} from "../dataconnect-generated";

// Firebase config for uvai-730bb
const firebaseConfig = {
  projectId: "uvai-730bb",
  appId: "1:688578214833:web:placeholder",
};

async function testDataConnect() {
  console.log("🔥 Firebase Data Connect Integration Test");
  console.log("=".repeat(60));
  console.log(`Project: uvai-730bb`);
  console.log(`Service: uvai-730bb-service`);
  console.log(`Database: uvai-730bb-database (Cloud SQL PostgreSQL)`);
  console.log("");

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const dc = getDataConnect(app, connectorConfig);

  console.log("📝 Test 1: Insert a new video job");
  const startTime = Date.now();

  try {
    const createResult = await createVideoJob({
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      source: "youtube",
      taskType: "full_analysis",
    });

    console.log(`   ✅ Job created in ${Date.now() - startTime}ms`);
    console.log(`   Job ID: ${createResult.data.videoJob_insert.id}`);

    const jobId = createResult.data.videoJob_insert.id;

    console.log("\n📋 Test 2: List all jobs");
    const listStart = Date.now();
    const listResult = await listJobs({ limit: 10 });
    console.log(`   ✅ Listed ${listResult.data.videoJobs.length} jobs in ${Date.now() - listStart}ms`);

    for (const job of listResult.data.videoJobs.slice(0, 3)) {
      console.log(`   - ${job.id.substring(0, 8)}... | ${job.status} | ${job.videoUrl.substring(0, 40)}...`);
    }

    console.log("\n🔄 Test 3: Update job status");
    const updateStart = Date.now();
    await updateJobStatus({
      id: jobId,
      status: "ANALYZING",
      executedAgents: ["VTTA"],
    });
    console.log(`   ✅ Status updated in ${Date.now() - updateStart}ms`);

    console.log("\n📊 Test 4: Record job event");
    const eventStart = Date.now();
    await recordJobEvent({
      jobId: jobId,
      eventType: "AGENT_START",
      agent: "VTTA",
      details: "Starting Video-to-Text-to-Action analysis",
    });
    console.log(`   ✅ Event recorded in ${Date.now() - eventStart}ms`);

    console.log("\n🔍 Test 5: Get job by ID");
    const getStart = Date.now();
    const getResult = await getJob({ id: jobId });
    console.log(`   ✅ Retrieved in ${Date.now() - getStart}ms`);
    console.log(`   Status: ${getResult.data.videoJob?.status}`);
    console.log(`   Agents: ${getResult.data.videoJob?.executedAgents?.join(", ") || "none"}`);

    console.log("\n📜 Test 6: Get job events");
    const eventsStart = Date.now();
    const eventsResult = await getJobEvents({ jobId });
    console.log(`   ✅ Got ${eventsResult.data.jobEvents.length} events in ${Date.now() - eventsStart}ms`);

    console.log("\n✅ Test 7: Complete the job");
    const completeStart = Date.now();
    await completeJob({
      id: jobId,
      resultJson: JSON.stringify({
        summary: { title: "Test Video", description: "Integration test" },
        timestamp: new Date().toISOString(),
      }),
      title: "Test Video Analysis",
    });
    console.log(`   ✅ Job completed in ${Date.now() - completeStart}ms`);

    // Final verification
    console.log("\n" + "=".repeat(60));
    console.log("📊 VERIFICATION - Query final state from Cloud SQL:");
    const finalResult = await getJob({ id: jobId });
    console.log(`   Job ID: ${finalResult.data.videoJob?.id}`);
    console.log(`   Status: ${finalResult.data.videoJob?.status}`);
    console.log(`   Title: ${finalResult.data.videoJob?.title}`);
    console.log(`   Agents: ${finalResult.data.videoJob?.executedAgents?.join(" → ")}`);
    console.log(`   Has Result: ${!!finalResult.data.videoJob?.resultJson}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ ALL FIREBASE DATA CONNECT TESTS PASSED");
    console.log("\n🔗 View data in Firebase Console:");
    console.log("   https://console.firebase.google.com/project/uvai-730bb/dataconnect");
    console.log("\n🔗 Or directly in Cloud SQL:");
    console.log("   https://console.cloud.google.com/sql/instances/uvai-vector-db/databases/uvai-730bb-database?project=uvai-730bb");

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    process.exit(1);
  }
}

testDataConnect().catch(console.error);
