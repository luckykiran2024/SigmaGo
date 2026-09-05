import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyCronAuthorization } from '../lib/security/cronAuth';

describe('Cron Pipeline Security & Fail-Closed Guard (src/lib/security/cronAuth.ts)', () => {
  const TEST_CRON_SECRET = 'cron_secure_token_secret_998877';
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = TEST_CRON_SECRET;
  });

  afterEach(() => {
    if (originalSecret) process.env.CRON_SECRET = originalSecret;
    else delete process.env.CRON_SECRET;
  });

  it('1. Strictly fails closed when CRON_SECRET is missing or empty in environment', () => {
    delete process.env.CRON_SECRET;

    const req = new Request('http://localhost:3000/api/cron/digest', {
      headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
    });

    const result = verifyCronAuthorization(req);
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain('Fail-closed');
  });

  it('2. Rejects request with missing or incorrect Bearer token', () => {
    const reqMissing = new Request('http://localhost:3000/api/cron/nudge');
    const resultMissing = verifyCronAuthorization(reqMissing);
    expect(resultMissing.authorized).toBe(false);

    const reqWrong = new Request('http://localhost:3000/api/cron/nudge', {
      headers: { authorization: 'Bearer wrong_token_123' },
    });
    const resultWrong = verifyCronAuthorization(reqWrong);
    expect(resultWrong.authorized).toBe(false);
  });

  it('3. Successfully authorizes request with matching Bearer token in constant time', () => {
    const req = new Request('http://localhost:3000/api/cron/digest', {
      headers: { authorization: `Bearer ${TEST_CRON_SECRET}` },
    });

    const result = verifyCronAuthorization(req);
    expect(result.authorized).toBe(true);
  });

  it('4. Successfully authorizes request with Vercel Cron header', () => {
    const req = new Request('http://localhost:3000/api/cron/validity-nudge', {
      headers: { 'x-vercel-cron': 'true' },
    });

    const result = verifyCronAuthorization(req);
    expect(result.authorized).toBe(true);
  });
});
