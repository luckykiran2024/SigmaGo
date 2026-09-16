import { checkStaleFinalizingRequests, monitorOutboxBacklog } from '@/lib/observability/alerts';
import { logger } from '@/lib/observability/logger';
import { JobExecutionResult } from './digestJob';

/**
 * Scheduled Job: Operational Platform Integrity Monitor
 * Inspects outbox backlogs, dead letters, and stale finalizing requests (> 5 min).
 */
export async function runPlatformMonitorJob(): Promise<JobExecutionResult> {
  const startTime = performance.now();
  const jobName = 'platform-monitor';

  try {
    logger.info(`[Job:${jobName}] Running operational platform monitors...`);

    const staleRequests = await checkStaleFinalizingRequests();
    const staleCount = staleRequests.length;

    // 2. Check outbox backlog
    const outboxLag = await monitorOutboxBacklog();

    const durationMs = Math.round(performance.now() - startTime);
    logger.info(`[Job:${jobName}] Platform health check completed`, {
      jobName,
      staleFinalizingCount: staleCount,
      outboxLag,
      durationMs,
    });

    return {
      jobName,
      success: true,
      affectedCount: staleCount + outboxLag.pendingCount,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    logger.error(`[Job:${jobName}] Platform monitor execution failed`, err, {
      jobName,
      durationMs,
    });
    return {
      jobName,
      success: false,
      affectedCount: 0,
      durationMs,
      error: err.message,
    };
  }
}
