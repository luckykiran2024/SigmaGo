import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;

const connectionOptions = redisUrl
  ? { url: redisUrl }
  : {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: Number(process.env.REDIS_PORT) || 6379,
    };

// Lazy-initialized queues
let nudgeQueue: Queue | null = null;
let webhookQueue: Queue | null = null;

function getNudgeQueue(): Queue {
  if (!nudgeQueue) {
    nudgeQueue = new Queue('approval-nudges', {
      connection: connectionOptions as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    });
    nudgeQueue.on('error', (err) => {
      console.warn('BullMQ approval-nudges Queue Redis Connection Warning:', err.message);
    });
  }
  return nudgeQueue;
}

function getWebhookQueue(): Queue {
  if (!webhookQueue) {
    webhookQueue = new Queue('webhook-deliveries', {
      connection: connectionOptions as any,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      },
    });
    webhookQueue.on('error', (err) => {
      console.warn('BullMQ webhook-deliveries Queue Redis Connection Warning:', err.message);
    });
  }
  return webhookQueue;
}

export interface NudgeJobData {
  requestId: string;
  tenantId: string;
  approverId?: string;
  nudgeReason?: string;
  requestedBy?: string;
}

export interface WebhookJobData {
  deliveryId: string;
  tenantId: string;
  endpointUrl: string;
  event: string;
  payload: Record<string, any>;
  secret?: string;
}

/**
 * Enqueues an approval reminder nudge job into the BullMQ background queue.
 */
export const enqueueApprovalNudge = async (data: NudgeJobData): Promise<boolean> => {
  try {
    const queue = getNudgeQueue();
    const job = await queue.add('send-nudge', data, {
      jobId: `nudge:${data.requestId}:${data.approverId || 'all'}:${Date.now()}`,
    });
    console.log(`[Queue] Enqueued approval nudge job #${job.id} for request ${data.requestId}`);
    return true;
  } catch (err: any) {
    console.warn(`[Queue] Fallback: Could not enqueue nudge job for request ${data.requestId}:`, err.message);
    return false;
  }
};

/**
 * Enqueues a webhook delivery payload job into the BullMQ background queue.
 */
export const enqueueWebhookDelivery = async (data: WebhookJobData): Promise<boolean> => {
  try {
    const queue = getWebhookQueue();
    const job = await queue.add('deliver-webhook', data, {
      jobId: `webhook:${data.deliveryId}`,
    });
    console.log(`[Queue] Enqueued webhook delivery job #${job.id} to ${data.endpointUrl}`);
    return true;
  } catch (err: any) {
    console.warn(`[Queue] Fallback: Could not enqueue webhook job ${data.deliveryId}:`, err.message);
    return false;
  }
};

