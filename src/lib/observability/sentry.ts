export interface SentryEvent {
  event_id?: string;
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  message?: string;
  [key: string]: any;
}

import { redactSensitiveData } from './redaction';

/**
 * Deeply scrubs sensitive fields from Sentry event payloads before dispatching.
 */
export function scrubSentryPayload(obj: any): any {
  return redactSensitiveData(obj);
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
