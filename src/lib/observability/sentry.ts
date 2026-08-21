export interface SentryEvent {
  event_id?: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  message?: string;
  [key: string]: any;
}

const REDACTED_FIELDS = new Set([
  'reasoning',
  'comment',
  'statement',
  'note',
  'subject',
  'body_json',
  'custom_fields',
  'hrms_sync_secret',
  'hmac_secret',
  'secret',
  'token',
]);

/**
 * Deeply scrubs sensitive fields from Sentry event payloads before dispatching.
 */
export function scrubSentryPayload(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubSentryPayload(item));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(key.toLowerCase())) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = scrubSentryPayload(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Sentry beforeSend hook callback implementation.
 */
export function beforeSend(event: SentryEvent): SentryEvent | null {
  if (!event) return null;
  return scrubSentryPayload(event) as SentryEvent;
}

/**
 * Emits a seal failure fatal alert to Sentry.
 */
export function alertSealFailure(message: string, context?: { tenantId?: string; requestId?: string; [key: string]: any }) {
  const event: SentryEvent = {
    event_id: 'seal_err_' + Date.now(),
    level: 'fatal',
    message: `[SEAL FAILURE FATAL ALERT] ${message}`,
    tags: {
      seal_failure: 'true',
      tenant_id: context?.tenantId || 'unknown',
      request_id: context?.requestId || 'unknown',
    },
    extra: scrubSentryPayload(context || {}),
  };

  const scrubbedEvent = beforeSend(event);
  console.error(JSON.stringify(scrubbedEvent));
  return scrubbedEvent;
}
