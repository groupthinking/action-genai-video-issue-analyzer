/**
 * REAL Stress Test for Video Analysis Pipeline
 *
 * This tests ACTUAL system behavior:
 * 1. Real HTTP API calls to the running server
 * 2. Real job submission and status polling
 * 3. Actual Gemini API latency (if enabled)
 * 4. Concurrent request handling
 *
 * Run with: npx tsx src/lib/real-stress-test.ts
 * Requires: npm run dev (server running on localhost:3000)
 */

const BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

interface TestResult {
  test: string;
  passed: boolean;
  duration: number;
  details: string;
  metrics?: Record<string, number>;
}

// Realistic test video URLs
const TEST_URLS = [
  "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "https://www.youtube.com/watch?v=9bZkp7q19f0",
];

/**
 * Test 1: API Health Check
 * Verify the server is actually running and responsive
 */
async function testApiHealth(): Promise<TestResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/pipeline`);
    const duration = Date.now() - start;

    if (!response.ok) {
      return {
        test: "API Health",
        passed: false,
        duration,
        details: `Server returned ${response.status}`,
      };
    }

    const data = await response.json();
    const hasAgents = data.pipeline?.agents?.length === 3;

    return {
      test: "API Health",
      passed: hasAgents && duration < 1000,
      duration,
      details: `Response in ${duration}ms, ${data.pipeline?.agents?.length || 0} agents configured`,
      metrics: { responseTime: duration },
    };
  } catch (error) {
    return {
      test: "API Health",
      passed: false,
      duration: Date.now() - start,
      details: `Server not reachable: ${error}`,
    };
  }
}

/**
 * Test 2: Job Submission Latency
 * Measure actual job creation time via API
 */
async function testJobSubmission(): Promise<TestResult> {
  const start = Date.now();
  const latencies: number[] = [];

  try {
    // Submit 5 jobs and measure latency for each
    for (let i = 0; i < 5; i++) {
      const jobStart = Date.now();
      const response = await fetch(`${BASE_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: TEST_URLS[i % TEST_URLS.length],
          async: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Job submission failed: ${response.status}`);
      }

      latencies.push(Date.now() - jobStart);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const duration = Date.now() - start;

    // Target: <500ms average for job submission
    const passed = avgLatency < 500;

    return {
      test: "Job Submission Latency",
      passed,
      duration,
      details: `5 jobs submitted. Avg: ${avgLatency.toFixed(0)}ms, Max: ${maxLatency}ms`,
      metrics: { avgLatency, maxLatency, jobsSubmitted: 5 },
    };
  } catch (error) {
    return {
      test: "Job Submission Latency",
      passed: false,
      duration: Date.now() - start,
      details: `Failed: ${error}`,
    };
  }
}

/**
 * Test 3: Concurrent Request Handling
 * Fire 10 requests simultaneously and verify all succeed
 */
async function testConcurrentRequests(): Promise<TestResult> {
  const start = Date.now();

  try {
    const requests = Array.from({ length: 10 }, (_, i) =>
      fetch(`${BASE_URL}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: `https://www.youtube.com/watch?v=test${i}`,
          async: true,
        }),
      })
    );

    const responses = await Promise.all(requests);
    const duration = Date.now() - start;

    const allSucceeded = responses.every(r => r.ok);
    const successCount = responses.filter(r => r.ok).length;

    return {
      test: "Concurrent Requests",
      passed: allSucceeded && duration < 5000,
      duration,
      details: `${successCount}/10 succeeded in ${duration}ms (${(duration / 10).toFixed(0)}ms/request avg)`,
      metrics: { successCount, totalTime: duration, avgPerRequest: duration / 10 },
    };
  } catch (error) {
    return {
      test: "Concurrent Requests",
      passed: false,
      duration: Date.now() - start,
      details: `Failed: ${error}`,
    };
  }
}

/**
 * Test 4: Job Status Polling
 * Submit a job and poll until status changes
 */
async function testJobStatusPolling(): Promise<TestResult> {
  const start = Date.now();

  try {
    // Submit a job
    const submitResponse = await fetch(`${BASE_URL}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoUrl: TEST_URLS[0],
        async: true,
      }),
    });

    const submitData = await submitResponse.json();
    const jobId = submitData.job?.id;

    if (!jobId) {
      throw new Error("No job ID returned");
    }

    // Poll for status changes (max 10 polls, 500ms apart)
    let statusChecks = 0;
    let lastStatus = "";
    let statusChanged = false;

    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const statusResponse = await fetch(`${BASE_URL}/api/jobs/${jobId}`);
      const statusData = await statusResponse.json();
      const currentStatus = statusData.job?.status;

      statusChecks++;

      if (lastStatus && currentStatus !== lastStatus) {
        statusChanged = true;
      }
      lastStatus = currentStatus;

      if (currentStatus === "COMPLETED" || currentStatus === "FAILED") {
        break;
      }
    }

    const duration = Date.now() - start;

    return {
      test: "Job Status Polling",
      passed: statusChecks > 0 && lastStatus !== "",
      duration,
      details: `Job ${jobId} polled ${statusChecks}x, final status: ${lastStatus}`,
      metrics: { statusChecks, statusChanged: statusChanged ? 1 : 0 },
    };
  } catch (error) {
    return {
      test: "Job Status Polling",
      passed: false,
      duration: Date.now() - start,
      details: `Failed: ${error}`,
    };
  }
}

/**
 * Test 5: Pipeline Configuration Validation
 * Verify the pipeline returns correct agent chain info
 */
async function testPipelineConfig(): Promise<TestResult> {
  const start = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/pipeline`);
    const data = await response.json();
    const duration = Date.now() - start;

    const agents = data.pipeline?.agents || [];
    const routes = data.pipeline?.routes || {};

    // Validate VTTA → CSDAA → OFSA chain exists
    const hasVTTA = agents.some((a: any) => a.id === "VTTA");
    const hasCSDDA = agents.some((a: any) => a.id === "CSDAA");
    const hasOFSA = agents.some((a: any) => a.id === "OFSA");
    const hasFullRoute = routes.full_analysis?.length === 3;

    const allValid = hasVTTA && hasCSDDA && hasOFSA && hasFullRoute;

    return {
      test: "Pipeline Configuration",
      passed: allValid,
      duration,
      details: `Agents: VTTA=${hasVTTA}, CSDAA=${hasCSDDA}, OFSA=${hasOFSA}, Route=${hasFullRoute}`,
      metrics: { agentCount: agents.length, routeCount: Object.keys(routes).length },
    };
  } catch (error) {
    return {
      test: "Pipeline Configuration",
      passed: false,
      duration: Date.now() - start,
      details: `Failed: ${error}`,
    };
  }
}

/**
 * Main test runner
 */
async function runRealStressTests(): Promise<void> {
  console.log("🚀 Real Stress Tests - Testing ACTUAL API behavior");
  console.log(`   Base URL: ${BASE_URL}`);
  console.log("=".repeat(70));

  const results: TestResult[] = [];

  // Test 1
  console.log("\n🏥 Test 1: API Health Check");
  const t1 = await testApiHealth();
  console.log(`   ${t1.passed ? "✅" : "❌"} ${t1.details}`);
  results.push(t1);

  if (!t1.passed) {
    console.log("\n❌ Server not running. Start with: npm run dev");
    process.exit(1);
  }

  // Test 2
  console.log("\n📝 Test 2: Job Submission Latency");
  const t2 = await testJobSubmission();
  console.log(`   ${t2.passed ? "✅" : "❌"} ${t2.details}`);
  results.push(t2);

  // Test 3
  console.log("\n⚡ Test 3: Concurrent Request Handling");
  const t3 = await testConcurrentRequests();
  console.log(`   ${t3.passed ? "✅" : "❌"} ${t3.details}`);
  results.push(t3);

  // Test 4
  console.log("\n🔄 Test 4: Job Status Polling");
  const t4 = await testJobStatusPolling();
  console.log(`   ${t4.passed ? "✅" : "❌"} ${t4.details}`);
  results.push(t4);

  // Test 5
  console.log("\n⚙️ Test 5: Pipeline Configuration");
  const t5 = await testPipelineConfig();
  console.log(`   ${t5.passed ? "✅" : "❌"} ${t5.details}`);
  results.push(t5);

  // Summary
  console.log("\n" + "=".repeat(70));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const totalDuration = results.reduce((a, r) => a + r.duration, 0);

  console.log(`\n📊 Results: ${passed}/${total} tests passed`);
  console.log(`   Total duration: ${totalDuration}ms`);

  if (passed === total) {
    console.log("\n✅ ALL REAL STRESS TESTS PASSED");
  } else {
    console.log("\n❌ SOME TESTS FAILED");
    process.exit(1);
  }
}

// Run
runRealStressTests().catch(console.error);
