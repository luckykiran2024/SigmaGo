import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyWebhookAuthentication } from '../lib/security/webhook';

describe('Zero-Trust Webhook Security Suite (src/lib/security/webhook.ts)', () => {
  const SECRET = 'hrms_super_secure_webhook_secret_987654';
  const RAW_BODY = JSON.stringify({ employees: [{ email: 'alice@example.com', name: 'Alice' }] });

  it('1. Constant-time secret comparison succeeds for matching secret', () => {
    const result = verifyWebhookAuthentication({
      storedSecret: SECRET,
      headerSecret: SECRET,
      rawBody: RAW_BODY,
    });

    expect(result.authenticated).toBe(true);
  });

  it('2. Constant-time secret comparison fails for mismatched or missing secret', () => {
    const mismatch = verifyWebhookAuthentication({
      storedSecret: SECRET,
      headerSecret: 'wrong_secret',
      rawBody: RAW_BODY,
    });
    expect(mismatch.authenticated).toBe(false);
    expect(mismatch.reason).toContain('Invalid sync secret');

    const missing = verifyWebhookAuthentication({
      storedSecret: SECRET,
      headerSecret: null,
      rawBody: RAW_BODY,
    });
    expect(missing.authenticated).toBe(false);
    expect(missing.reason).toContain('Missing authorization');
  });

  it('3. HMAC-SHA256 signature succeeds with valid timestamp and payload signature', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(`${nowSec}.${RAW_BODY}`)
      .digest('hex');

    const result = verifyWebhookAuthentication({
      storedSecret: SECRET,
      signatureHeader: `sha256=${signature}`,
      timestampHeader: String(nowSec),
      rawBody: RAW_BODY,
    });

    expect(result.authenticated).toBe(true);
  });

  it('4. HMAC-SHA256 signature fails when payload is tampered', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(`${nowSec}.${RAW_BODY}`)
      .digest('hex');

    const tamperedBody = JSON.stringify({ employees: [{ email: 'attacker@example.com', name: 'Mallory' }] });

    const result = verifyWebhookAuthentication({
      storedSecret: SECRET,
      signatureHeader: `sha256=${signature}`,
      timestampHeader: String(nowSec),
      rawBody: tamperedBody,
    });

    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain('HMAC-SHA256 signature mismatch');
  });

  it('5. Replay Attack Prevention: Rejects request with timestamp older than 300 seconds', () => {
    const staleTimeSec = Math.floor(Date.now() / 1000) - 305; // 5 min 5 sec ago
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(`${staleTimeSec}.${RAW_BODY}`)
      .digest('hex');

    const result = verifyWebhookAuthentication({
      storedSecret: SECRET,
      signatureHeader: `sha256=${signature}`,
      timestampHeader: String(staleTimeSec),
      rawBody: RAW_BODY,
    });

    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain('replay attack detected');
  });

  it('6. Replay Attack Prevention: Rejects request with timestamp in the future beyond tolerance', () => {
    const futureTimeSec = Math.floor(Date.now() / 1000) + 400; // 6 min in future
    const signature = crypto
      .createHmac('sha256', SECRET)
      .update(`${futureTimeSec}.${RAW_BODY}`)
      .digest('hex');

    const result = verifyWebhookAuthentication({
      storedSecret: SECRET,
      signatureHeader: `sha256=${signature}`,
      timestampHeader: String(futureTimeSec),
      rawBody: RAW_BODY,
    });

    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain('replay attack detected');
  });
});
