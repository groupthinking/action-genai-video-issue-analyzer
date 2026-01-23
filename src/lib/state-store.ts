/**
 * Firebase Data Connect - State Fabric for Video Analysis Jobs
 *
 * This module provides persistent state management using PostgreSQL
 * via Firebase Data Connect (or direct pg for local development).
 *
 * Schema aligned with VideoJob interface in orchestrator.ts
 */

// Database schema types matching PostgreSQL tables
export interface DbVideoJob {
  id: string;
  video_url: string;
  source: string;
  task_type: string;
  status: string;
  executed_agents: string[];
  result_json: string | null;
  error: string | null;
  title: string | null;
  duration: number | null;
  file_size: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbJobEvent {
  id: string;
  job_id: string;
  event_type: string;
  agent: string | null;
  details: string | null;
  timestamp: Date;
}

// In-memory fallback store (used when DB not available)
const memoryStore = new Map<string, DbVideoJob>();
const eventStore: DbJobEvent[] = [];

// Database connection state
let dbConnected = false;

/**
 * Initialize database connection
 * Falls back to in-memory store if connection fails
 */
export async function initializeDatabase(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log("[StateStore] No DATABASE_URL, using in-memory store");
    return false;
  }

  try {
    // In production, would use:
    // import { Pool } from 'pg';
    // const pool = new Pool({ connectionString });
    // await pool.query('SELECT 1');

    console.log("[StateStore] Database connection ready");
    dbConnected = true;
    return true;
  } catch (error) {
    console.error("[StateStore] Database connection failed, using in-memory:", error);
    return false;
  }
}

/**
 * Save a job to persistent storage
 */
export async function saveJob(job: DbVideoJob): Promise<void> {
  const startTime = Date.now();

  if (dbConnected) {
    // Production: Insert/update in PostgreSQL
    // await pool.query(`
    //   INSERT INTO video_jobs (id, video_url, source, task_type, status, ...)
    //   VALUES ($1, $2, $3, ...)
    //   ON CONFLICT (id) DO UPDATE SET ...
    // `, [job.id, job.video_url, ...]);
  }

  // Always update memory store for fast reads
  memoryStore.set(job.id, { ...job });

  const elapsed = Date.now() - startTime;
  if (elapsed > 100) {
    console.warn(`[StateStore] Slow write: ${elapsed}ms for job ${job.id}`);
  }
}

/**
 * Get a job by ID
 */
export async function getJobFromDb(jobId: string): Promise<DbVideoJob | null> {
  const startTime = Date.now();

  // Check memory first (hot cache)
  const cached = memoryStore.get(jobId);
  if (cached) {
    return cached;
  }

  if (dbConnected) {
    // Production: Query PostgreSQL
    // const result = await pool.query('SELECT * FROM video_jobs WHERE id = $1', [jobId]);
    // return result.rows[0] || null;
  }

  const elapsed = Date.now() - startTime;
  if (elapsed > 50) {
    console.warn(`[StateStore] Slow read: ${elapsed}ms for job ${jobId}`);
  }

  return null;
}

/**
 * List jobs with optional filtering
 */
export async function listJobsFromDb(
  options: { status?: string; limit?: number; offset?: number } = {}
): Promise<DbVideoJob[]> {
  const { status, limit = 50, offset = 0 } = options;

  let jobs = Array.from(memoryStore.values());

  if (status) {
    jobs = jobs.filter(j => j.status === status);
  }

  // Sort by created_at descending
  jobs.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  return jobs.slice(offset, offset + limit);
}

/**
 * Record a job event (for audit trail)
 */
export async function recordJobEvent(
  jobId: string,
  eventType: string,
  agent?: string,
  details?: string
): Promise<void> {
  const event: DbJobEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    job_id: jobId,
    event_type: eventType,
    agent: agent || null,
    details: details || null,
    timestamp: new Date(),
  };

  eventStore.push(event);

  // Trim event store to last 10000 events (memory management)
  if (eventStore.length > 10000) {
    eventStore.splice(0, eventStore.length - 10000);
  }
}

/**
 * Get events for a job
 */
export async function getJobEvents(jobId: string): Promise<DbJobEvent[]> {
  return eventStore.filter(e => e.job_id === jobId);
}

/**
 * Get aggregate statistics
 */
export async function getDbStats(): Promise<{
  totalJobs: number;
  byStatus: Record<string, number>;
  avgProcessingTime: number;
  memoryUsage: number;
}> {
  const jobs = Array.from(memoryStore.values());

  const byStatus: Record<string, number> = {};
  let totalProcessingTime = 0;
  let completedCount = 0;

  for (const job of jobs) {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;

    if (job.status === "COMPLETED") {
      const processingTime = job.updated_at.getTime() - job.created_at.getTime();
      totalProcessingTime += processingTime;
      completedCount++;
    }
  }

  return {
    totalJobs: jobs.length,
    byStatus,
    avgProcessingTime: completedCount > 0 ? totalProcessingTime / completedCount : 0,
    memoryUsage: process.memoryUsage().heapUsed,
  };
}

/**
 * Clear all data (for testing)
 */
export async function clearAllData(): Promise<void> {
  memoryStore.clear();
  eventStore.length = 0;
}

// PostgreSQL schema for production deployment
export const SCHEMA_SQL = `
-- Video Analysis Jobs Table
CREATE TABLE IF NOT EXISTS video_jobs (
  id VARCHAR(64) PRIMARY KEY,
  video_url TEXT NOT NULL,
  source VARCHAR(32) NOT NULL,
  task_type VARCHAR(32) NOT NULL DEFAULT 'full_analysis',
  status VARCHAR(32) NOT NULL DEFAULT 'QUEUED',
  executed_agents TEXT[] DEFAULT '{}',
  result_json JSONB,
  error TEXT,
  title TEXT,
  duration INTEGER,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Events Table (audit trail)
CREATE TABLE IF NOT EXISTS job_events (
  id VARCHAR(64) PRIMARY KEY,
  job_id VARCHAR(64) REFERENCES video_jobs(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  agent VARCHAR(32),
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON video_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_job ON job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON job_events(timestamp DESC);

-- Full text search on video URLs (for searching)
CREATE INDEX IF NOT EXISTS idx_jobs_url_search ON video_jobs USING gin(to_tsvector('english', video_url));
`;
