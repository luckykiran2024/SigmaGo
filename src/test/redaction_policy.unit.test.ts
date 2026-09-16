import { describe, it, expect, vi } from 'vitest';
import { redactSensitiveData, redactStringContent } from '@/lib/observability/redaction';

describe('Centralized Privacy Redaction Policy (src/lib/observability/redaction.ts)', () => {
  it('1. Redacts sensitive decision fields recursively', () => {
    const rawData = {
      id: 'req-123',
      tenantId: 'tenant-456',
      subject: 'Confidential Executive Bonus Request',
      reasoning: 'Detailed reasoning containing high business sensitivity',
      comment: 'I approve this under exceptional circumstances',
      statement: 'Policy statement regarding salary brackets',
      note: 'Private notes for HR eyes only',
      body_json: { text: 'Unpublished strategic restructuring proposal' },
      custom_fields: { comp_tier: 'E5', base_salary: 250000 },
      safe_field: 'public-reference-code-789',
    };

    const sanitized = redactSensitiveData(rawData);

    expect(sanitized.id).toBe('req-123');
    expect(sanitized.tenantId).toBe('tenant-456');
    expect(sanitized.safe_field).toBe('public-reference-code-789');

    expect(sanitized.subject).toBe('[REDACTED]');
    expect(sanitized.reasoning).toBe('[REDACTED]');
    expect(sanitized.comment).toBe('[REDACTED]');
    expect(sanitized.statement).toBe('[REDACTED]');
    expect(sanitized.note).toBe('[REDACTED]');
    expect(sanitized.body_json).toBe('[REDACTED]');
    expect(sanitized.custom_fields).toBe('[REDACTED]');
  });

  it('2. Redacts authentication credentials, secrets, tokens, and cookies', () => {
    const rawPayload = {
      authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz',
      cookie: 'sb-access-token=super_secret_session_token',
      api_key: 're_secret_resend_api_key_123',
      cron_secret: 'cron_super_secure_key',
      hrms_sync_secret: 'sync_secret_value',
      nested: {
        signing_key: 'private_key_pem_value',
        token: 'action_token_uuid_789',
      },
    };

    const sanitized = redactSensitiveData(rawPayload);

    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.cookie).toBe('[REDACTED]');
    expect(sanitized.api_key).toBe('[REDACTED]');
    expect(sanitized.cron_secret).toBe('[REDACTED]');
    expect(sanitized.hrms_sync_secret).toBe('[REDACTED]');
    expect(sanitized.nested.signing_key).toBe('[REDACTED]');
    expect(sanitized.nested.token).toBe('[REDACTED]');
  });

  it('3. Redacts email addresses and bearer tokens from raw string messages', () => {
    const logMessage = 'User alice@company.com failed authentication using Bearer secret_token_xyz99';
    const cleaned = redactStringContent(logMessage);

    expect(cleaned).not.toContain('alice@company.com');
    expect(cleaned).not.toContain('secret_token_xyz99');
    expect(cleaned).toContain('[EMAIL_REDACTED]');
    expect(cleaned).toContain('Bearer [REDACTED]');
  });

  it('4. Handles circular references gracefully without stack overflow', () => {
    const circularObj: any = { name: 'Root Object' };
    circularObj.self = circularObj;

    const sanitized = redactSensitiveData(circularObj);
    expect(sanitized.self).toBe('[CIRCULAR]');
  });
});
