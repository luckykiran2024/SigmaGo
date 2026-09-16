import { getDigestPayload } from '@/lib/db/digest';
import { logger } from '@/lib/observability/logger';

export interface JobExecutionResult {
  jobName: string;
  success: boolean;
  affectedCount: number;
  durationMs: number;
  error?: string;
}

/**
 * Scheduled Job: Organization Decision Digest
 * Generates and distributes consolidated periodic decision intelligence digests.
 */
export async function runDigestJob(): Promise<JobExecutionResult> {
  const startTime = performance.now();
  const jobName = 'digest';

  try {
    logger.info(`[Job:${jobName}] Starting periodic decision digest job...`);
    const payload = await getDigestPayload();
    const count = payload?.length || 0;

    const durationMs = Math.round(performance.now() - startTime);
    logger.info(`[Job:${jobName}] Completed successfully`, {
      jobName,
      affectedCount: count,
      durationMs,
    });

    return {
      jobName,
      success: true,
      affectedCount: count,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    logger.error(`[Job:${jobName}] Failed during execution`, err, {
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
