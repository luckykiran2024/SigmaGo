import { Worker, Job } from 'bullmq';
import { getRedisConfig, getRedisClient } from '@/lib/redis/client';
import { processApprovalNudgeJob, NudgeJobPayload } from './processors/nudgeProcessor';
import { processWebhookDeliveryJob, WebhookJobPayload } from './processors/webhookProcessor';
import { logger } from '@/lib/observability/logger';
import { recordWorkerHeartbeat } from '@/lib/observability/telemetry';

const WORKER_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 5;
const HEARTBEAT_INTERVAL_MS = 15000;

export class SigmaGoWorkerService {
  private nudgeWorker: Worker | null = null;
  private webhookWorker: Worker | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private outboxTimer: NodeJS.Timeout | null = null;
  private isStopping = false;

  async start(): Promise<void> {
    logger.info('[Worker] Initializing SigmaGo background worker topology...');

    const { options } = getRedisConfig();

    // 1. BullMQ Worker for Approval Reminders
    this.nudgeWorker = new Worker(
      'approval-nudges',
      async (job: Job<NudgeJobPayload>) => {
        logger.info(`[Worker:Nudge] Processing job #${job.id} (${job.name})`, {
          jobId: job.id,
          requestId: job.data.requestId,
        });
        await processApprovalNudgeJob(job.data);
      },
      {
        connection: options as any,
        concurrency: WORKER_CONCURRENCY,
      }
    );

    this.nudgeWorker.on('completed', (job) => {
      logger.info(`[Worker:Nudge] Job #${job.id} completed successfully`);
    });

    this.nudgeWorker.on('failed', (job, err) => {
      logger.error(`[Worker:Nudge] Job #${job?.id} failed:`, err);
    });

    // 2. BullMQ Worker for Webhook Deliveries
    this.webhookWorker = new Worker(
      'webhook-deliveries',
      async (job: Job<WebhookJobPayload>) => {
        logger.info(`[Worker:Webhook] Processing job #${job.id} (${job.name})`, {
          jobId: job.id,
          deliveryId: job.data.deliveryId,
        });
        await processWebhookDeliveryJob(job.data);
      },
      {
        connection: options as any,
        concurrency: WORKER_CONCURRENCY,
      }
    );

    this.webhookWorker.on('completed', (job) => {
      logger.info(`[Worker:Webhook] Job #${job.id} completed successfully`);
    });

    this.webhookWorker.on('failed', (job, err) => {
      logger.error(`[Worker:Webhook] Job #${job?.id} failed:`, err);
    });

    // 3. Start Heartbeat Timer
    this.startHeartbeat();

    // 4. Optional Transactional Outbox Worker Loop
    if (process.env.ENABLE_OUTBOX_WORKER === 'true') {
      this.startOutboxLoop();
    } else {
      logger.info('[Worker] Transactional Outbox loop disabled (set ENABLE_OUTBOX_WORKER=true to enable)');
    }

    logger.info('[Worker] SigmaGo background worker topology successfully started');
  }

  private startHeartbeat(): void {
    const publishHeartbeat = async () => {
      try {
        const redis = getRedisClient();
        const payload = JSON.stringify({
          worker: 'sigmago-worker',
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
        });
        await redis.set('sigmago:worker:heartbeat', payload, 'EX', 30);
        recordWorkerHeartbeat('sigmago-worker', 'healthy');
      } catch (err: any) {
        logger.warn('[Worker] Failed to emit worker heartbeat to Redis:', { error: err.message });
      }
    };

    publishHeartbeat();
    this.heartbeatTimer = setInterval(publishHeartbeat, HEARTBEAT_INTERVAL_MS);
  }

  private startOutboxLoop(): void {
    logger.info('[Worker] Starting Transactional Outbox processing loop...');
    this.outboxTimer = setInterval(async () => {
      if (this.isStopping) return;
      try {
        const { runOutboxWorkerCycle } = await import('@/lib/events/outbox');
        // Simple noop / dispatch handler for outbox events
        await runOutboxWorkerCycle(async (record) => {
          logger.info(`[OutboxLoop] Claimed event ${record.id} (${record.event_type})`, {
            eventId: record.id,
            eventType: record.event_type,
          });
        });
      } catch (err: any) {
        logger.error('[Worker] Outbox loop cycle error:', err);
      }
    }, 5000);
  }

  async stop(): Promise<void> {
    if (this.isStopping) return;
    this.isStopping = true;

    logger.info('[Worker] Graceful shutdown initiated. Closing queues and timers...');

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    if (this.outboxTimer) {
      clearInterval(this.outboxTimer);
    }

    const promises: Promise<void>[] = [];
    if (this.nudgeWorker) {
      promises.push(this.nudgeWorker.close());
    }
    if (this.webhookWorker) {
      promises.push(this.webhookWorker.close());
    }

    await Promise.all(promises);

    try {
      const redis = getRedisClient();
      await redis.quit();
    } catch {
      // Ignore disconnect error on exit
    }

    logger.info('[Worker] Background worker shut down cleanly.');
  }
}

// Direct execution entrypoint when invoked via `node src/workers/workerRunner.js`
if (require.main === module) {
  const worker = new SigmaGoWorkerService();

  const shutdown = async (signal: string) => {
    logger.info(`[Worker] Received ${signal}, exiting gracefully...`);
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  worker.start().catch((err) => {
    logger.error('[Worker] Fatal error starting background worker:', err);
    process.exit(1);
  });
}
