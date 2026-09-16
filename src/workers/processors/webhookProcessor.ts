import { adminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/observability/logger';
import { recordQueueMetric } from '@/lib/observability/telemetry';
import { decryptSecret } from '@/lib/crypto/secrets';
import crypto from 'crypto';

export interface WebhookJobPayload {
  deliveryId: string;
  tenantId: string;
}

/**
 * Processes an outbound webhook delivery.
 * Resolves endpoint, payload, and tenant secret server-side to avoid sending secrets over Redis.
 */
export async function processWebhookDeliveryJob(data: WebhookJobPayload): Promise<void> {
  const startTime = performance.now();
  const { deliveryId, tenantId } = data;

  try {
    // 1. Fetch delivery log entry from DB
    const { data: delivery, error: delErr } = await adminClient
      .from('webhook_deliveries')
      .select('*')
      .eq('id', deliveryId)
      .eq('tenant_id', tenantId)
      .single();

    if (delErr || !delivery) {
      logger.warn('[WebhookWorker] Delivery record not found, skipping', { deliveryId, tenantId });
      return;
    }

    if (delivery.status === 'DELIVERED') {
      logger.info('[WebhookWorker] Delivery already completed', { deliveryId });
      return;
    }

    // 2. Fetch tenant webhook secret
    const { data: tenant } = await adminClient
      .from('tenants')
      .select('id, hrms_sync_secret')
      .eq('id', tenantId)
      .single();

    const storedSecret = tenant?.hrms_sync_secret ? decryptSecret(tenant.hrms_sync_secret) : '';
    const timestamp = Date.now().toString();
    const rawBody = JSON.stringify(delivery.payload || {});

    // Compute HMAC signature if secret exists
    let signature = '';
    if (storedSecret) {
      signature = crypto
        .createHmac('sha256', storedSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');
    }

    // 3. Dispatch outbound HTTP webhook
    const response = await fetch(delivery.endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SigmaGo-Event': delivery.event_type || 'decision.event',
        'X-SigmaGo-Delivery': deliveryId,
        'X-SigmaGo-Timestamp': timestamp,
        ...(signature ? { 'X-SigmaGo-Signature': signature } : {}),
      },
      body: rawBody,
      signal: AbortSignal.timeout(10000), // 10s max HTTP timeout
    });

    const durationMs = Math.round(performance.now() - startTime);

    if (response.ok) {
      await adminClient
        .from('webhook_deliveries')
        .update({
          status: 'DELIVERED',
          response_code: response.status,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', deliveryId);

      recordQueueMetric('completed', 'webhook-deliveries', 'deliver-webhook', durationMs);
      logger.info('[WebhookWorker] Successfully delivered webhook', {
        deliveryId,
        tenantId,
        responseCode: response.status,
        durationMs,
      });
    } else {
      const errBody = await response.text().catch(() => 'No body');
      await adminClient
        .from('webhook_deliveries')
        .update({
          status: 'FAILED',
          response_code: response.status,
          error_message: `HTTP ${response.status}: ${errBody.slice(0, 200)}`,
        })
        .eq('id', deliveryId);

      recordQueueMetric('failed', 'webhook-deliveries', 'deliver-webhook', durationMs);
      throw new Error(`Webhook endpoint returned HTTP ${response.status}`);
    }
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    recordQueueMetric('failed', 'webhook-deliveries', 'deliver-webhook', durationMs);
    logger.error('[WebhookWorker] Error delivering webhook', err, {
      deliveryId,
      tenantId,
      durationMs,
    });
    throw err;
  }
}
