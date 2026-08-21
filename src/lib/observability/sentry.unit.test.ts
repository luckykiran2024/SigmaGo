import { describe, it, expect } from 'vitest';
import { beforeSend, alertSealFailure, scrubSentryPayload } from './sentry';

describe('Sentry Scrubber & Seal Failure Alerts Unit Tests (src/lib/observability/sentry.unit.test.ts)', () => {
  it('1. beforeSend scrubber removes all specified sensitive fields', () => {
    const rawEvent = {
      message: 'Test error event',
      tags: { tenant_id: 'tenant-123', request_id: 'req-456' },
      extra: {
        subject: 'Confidential Salary Increase Request',
        reasoning: 'Employee performed exceptionally well in Q3',
        comment: 'Approver approves subject to budget availability',
        statement: 'Policy 42 statement details',
        note: 'Internal private note',
        body_json: { text: 'Detailed body payload' },
        custom_fields: { comp_band: 'L6' },
        safe_field: 'public_id_789',
      },
    };

    const scrubbed = beforeSend(rawEvent);

    expect(scrubbed.extra.safe_field).toBe('public_id_789');
    expect(scrubbed.extra.subject).toBe('[REDACTED]');
    expect(scrubbed.extra.reasoning).toBe('[REDACTED]');
    expect(scrubbed.extra.comment).toBe('[REDACTED]');
    expect(scrubbed.extra.statement).toBe('[REDACTED]');
    expect(scrubbed.extra.note).toBe('[REDACTED]');
    expect(scrubbed.extra.body_json).toBe('[REDACTED]');
    expect(scrubbed.extra.custom_fields).toBe('[REDACTED]');
  });

  it('2. alertSealFailure emits event with level fatal and tag seal_failure=true', () => {
    const alert = alertSealFailure('Seal signature verification mismatch', {
      tenantId: 'tenant-abc',
      requestId: 'req-xyz',
      comment: 'Secret comment that must be scrubbed',
    });

    expect(alert?.level).toBe('fatal');
    expect(alert?.tags?.seal_failure).toBe('true');
    expect(alert?.tags?.tenant_id).toBe('tenant-abc');
    expect(alert?.tags?.request_id).toBe('req-xyz');
    expect(alert?.extra?.comment).toBe('[REDACTED]');
  });
});
