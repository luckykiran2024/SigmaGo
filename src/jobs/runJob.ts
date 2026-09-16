import { acquireDistributedLock } from '@/lib/redis/client';
import { logger } from '@/lib/observability/logger';
import { recordJobMetric } from '@/lib/observability/telemetry';
import { runDigestJob } from './digestJob';
import { runNudgeJob } from './nudgeJob';
import { runValidityNudgeJob } from './validityNudgeJob';
import { runPlatformMonitorJob } from './platformMonitorJob';

type JobHandler = () => Promise<{ success: boolean; affectedCount: number; durationMs: number; error?: string }>;

const JOB_REGISTRY: Record<string, JobHandler> = {
  digest: runDigestJob,
  nudge: runNudgeJob,
  'validity-nudge': runValidityNudgeJob,
  'platform-monitor': runPlatformMonitorJob,
};

/**
 * Universal CLI runner for scheduled jobs.
 * Handles distributed Redis overlap locks, OTel metrics, structured logs, and non-zero exit codes.
 */
async function main() {
  const jobName = process.argv[2];

  if (!jobName || !JOB_REGISTRY[jobName]) {
    console.error(`Usage: tsx src/jobs/runJob.ts <${Object.keys(JOB_REGISTRY).join('|')}>`);
    process.exit(1);
  }

  const handler = JOB_REGISTRY[jobName];
  const lockKey = `sigmago:job:${jobName}`;
  const ttlSeconds = 300; // 5 minute lock timeout to avoid duplicate concurrent executions

  logger.info(`[ScheduledRunner] Attempting to run scheduled job "${jobName}"...`);
  recordJobMetric(jobName, 'started');

  // Attempt distributed overlap lock via Redis
  const { acquired, release } = await acquireDistributedLock(lockKey, ttlSeconds);

  if (!acquired) {
    logger.warn(`[ScheduledRunner] Overlap lock active for "${jobName}". Another instance is currently executing this job. Skipping.`);
    process.exit(0);
  }

  try {
    const result = await handler();
    recordJobMetric(jobName, result.success ? 'success' : 'failed', result.durationMs);

    if (!result.success) {
      logger.error(`[ScheduledRunner] Job "${jobName}" exited with failure:`, new Error(result.error));
      await release();
      process.exit(1);
    }

    logger.info(`[ScheduledRunner] Job "${jobName}" successfully completed.`, {
      affectedCount: result.affectedCount,
      durationMs: result.durationMs,
    });
    await release();
    process.exit(0);
  } catch (err: any) {
    logger.error(`[ScheduledRunner] Unhandled fatal error in job "${jobName}":`, err);
    await release();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
