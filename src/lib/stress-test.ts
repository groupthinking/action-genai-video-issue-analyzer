/**
 * Stress Test for Video Analysis Pipeline
 *
 * Run with: npx tsx src/lib/stress-test.ts
 *
 * Tests:
 * 1. Concurrent job creation throughput
 * 2. State store read/write performance
 * 3. Pipeline routing validation
 * 4. Memory usage under load
 */

import {
  saveJob,
  getJobFromDb,
  listJobsFromDb,
  recordJobEvent,
  getDbStats,
  clearAllData,
  type DbVideoJob,
} from "./state-store";

import {
  getAgentChain,
  validatePipelineExecution,
  PIPELINE_ROUTES,
  type AnalysisTaskType,
} from "./pipeline-config";

// Test configuration
const TEST_CONFIG = {
  concurrentJobs: 100,
  jobsPerBatch: 20,
  targetWriteLatencyMs: 50,
  targetReadLatencyMs: 10,
};

// Test utilities
function generateJobId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function generateTestJob(taskType: AnalysisTaskType = "full_analysis"): DbVideoJob {
  return {
    id: generateJobId(),
    video_url: `https://youtube.com/watch?v=${Math.random().toString(36).substring(7)}`,
    source: "youtube",
    task_type: taskType,
    status: "QUEUED",
    executed_agents: [],
    result_json: null,
    error: null,
    title: null,
    duration: null,
    file_size: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

// Test 1: Concurrent Write Performance
async function testConcurrentWrites(): Promise<{ passed: boolean; details: string }> {
  console.log("\n📝 Test 1: Concurrent Write Performance");

  const jobs = Array.from({ length: TEST_CONFIG.concurrentJobs }, () => generateTestJob());

  const startTime = Date.now();
  await Promise.all(jobs.map(job => saveJob(job)));
  const elapsed = Date.now() - startTime;

  const avgLatency = elapsed / TEST_CONFIG.concurrentJobs;
  const passed = avgLatency < TEST_CONFIG.targetWriteLatencyMs;

  const details = `${TEST_CONFIG.concurrentJobs} writes in ${elapsed}ms (avg: ${avgLatency.toFixed(2)}ms/write)`;
  console.log(`   ${passed ? "✅" : "❌"} ${details}`);

  return { passed, details };
}

// Test 2: Read Performance
async function testReadPerformance(): Promise<{ passed: boolean; details: string }> {
  console.log("\n📖 Test 2: Read Performance");

  // Create some jobs first
  const testJobs = Array.from({ length: 50 }, () => generateTestJob());
  await Promise.all(testJobs.map(job => saveJob(job)));

  // Measure read times
  const readTimes: number[] = [];

  for (const job of testJobs.slice(0, 20)) {
    const start = Date.now();
    await getJobFromDb(job.id);
    readTimes.push(Date.now() - start);
  }

  const avgReadTime = readTimes.reduce((a, b) => a + b, 0) / readTimes.length;
  const maxReadTime = Math.max(...readTimes);
  const passed = avgReadTime < TEST_CONFIG.targetReadLatencyMs;

  const details = `avg: ${avgReadTime.toFixed(2)}ms, max: ${maxReadTime}ms`;
  console.log(`   ${passed ? "✅" : "❌"} ${details}`);

  return { passed, details };
}

// Test 3: Pipeline Routing Validation
async function testPipelineRouting(): Promise<{ passed: boolean; details: string }> {
  console.log("\n🔀 Test 3: Pipeline Routing Validation");

  const taskTypes: AnalysisTaskType[] = ["transcription", "code_extraction", "full_analysis"];
  let allPassed = true;
  const results: string[] = [];

  for (const taskType of taskTypes) {
    const chain = getAgentChain(taskType);
    const validation = validatePipelineExecution(taskType, [...chain]);

    if (!validation.valid) {
      allPassed = false;
      results.push(`${taskType}: FAILED - ${validation.error}`);
    } else {
      results.push(`${taskType}: ${chain.join(" → ")}`);
    }
  }

  const details = results.join("; ");
  console.log(`   ${allPassed ? "✅" : "❌"} ${details}`);

  return { passed: allPassed, details };
}

// Test 4: Event Recording Throughput
async function testEventRecording(): Promise<{ passed: boolean; details: string }> {
  console.log("\n📊 Test 4: Event Recording Throughput");

  const jobId = generateJobId();
  const eventCount = 1000;

  const startTime = Date.now();
  const eventPromises = Array.from({ length: eventCount }, (_, i) =>
    recordJobEvent(jobId, `TEST_EVENT_${i}`, "VTTA", `Detail ${i}`)
  );
  await Promise.all(eventPromises);
  const elapsed = Date.now() - startTime;

  const eventsPerSecond = (eventCount / elapsed) * 1000;
  const passed = eventsPerSecond > 5000; // Target: 5k events/sec

  const details = `${eventCount} events in ${elapsed}ms (${eventsPerSecond.toFixed(0)} events/sec)`;
  console.log(`   ${passed ? "✅" : "❌"} ${details}`);

  return { passed, details };
}

// Test 5: Memory Usage Under Load
async function testMemoryUsage(): Promise<{ passed: boolean; details: string }> {
  console.log("\n🧠 Test 5: Memory Usage Under Load");

  const initialMemory = process.memoryUsage().heapUsed;

  // Create many jobs with large result payloads
  const jobs = Array.from({ length: 500 }, () => {
    const job = generateTestJob();
    job.result_json = JSON.stringify({
      summary: { title: "Test", description: "x".repeat(1000) },
      generatedWorkflow: { steps: Array(50).fill({ action: "test" }) },
    });
    return job;
  });

  await Promise.all(jobs.map(job => saveJob(job)));

  const finalMemory = process.memoryUsage().heapUsed;
  const memoryIncreaseMB = (finalMemory - initialMemory) / (1024 * 1024);

  const passed = memoryIncreaseMB < 100; // Target: <100MB for 500 jobs

  const details = `Memory increase: ${memoryIncreaseMB.toFixed(2)}MB for 500 jobs`;
  console.log(`   ${passed ? "✅" : "❌"} ${details}`);

  return { passed, details };
}

// Main test runner
export async function runStressTests(): Promise<{
  passed: boolean;
  results: Array<{ test: string; passed: boolean; details: string }>;
}> {
  console.log("🚀 Starting Video Analysis Pipeline Stress Tests");
  console.log("=".repeat(60));

  // Clear any existing test data
  await clearAllData();

  const results: Array<{ test: string; passed: boolean; details: string }> = [];

  // Run tests sequentially
  const test1 = await testConcurrentWrites();
  results.push({ test: "Concurrent Writes", ...test1 });

  const test2 = await testReadPerformance();
  results.push({ test: "Read Performance", ...test2 });

  const test3 = await testPipelineRouting();
  results.push({ test: "Pipeline Routing", ...test3 });

  const test4 = await testEventRecording();
  results.push({ test: "Event Recording", ...test4 });

  const test5 = await testMemoryUsage();
  results.push({ test: "Memory Usage", ...test5 });

  // Get final stats
  const stats = await getDbStats();

  console.log("\n" + "=".repeat(60));
  console.log("📈 Final Statistics:");
  console.log(`   Total Jobs: ${stats.totalJobs}`);
  console.log(`   Status Distribution: ${JSON.stringify(stats.byStatus)}`);
  console.log(`   Memory Usage: ${(stats.memoryUsage / (1024 * 1024)).toFixed(2)}MB`);

  const allPassed = results.every(r => r.passed);

  console.log("\n" + "=".repeat(60));
  console.log(`\n${allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);

  // Cleanup
  await clearAllData();

  return { passed: allPassed, results };
}

// Run if executed directly
if (require.main === module) {
  runStressTests()
    .then(result => {
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error("Stress test error:", error);
      process.exit(1);
    });
}
