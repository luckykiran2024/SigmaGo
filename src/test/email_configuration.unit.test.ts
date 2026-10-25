import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ adminClient: {} }));
import { sendOutboundEmail } from '@/lib/email/outbound';

describe('outbound email configuration', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('does not log email content or claim delivery when the key is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'test');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(await sendOutboundEmail('person@example.com', 'Subject', 'secret-action-token')).toBe(false);
      expect(log).not.toHaveBeenCalled();
      expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-action-token');
    } finally {
      log.mockRestore();
      warn.mockRestore();
    }
  });

  it('fails closed in production when the key is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    await expect(sendOutboundEmail('person@example.com', 'Subject', 'secret-action-token'))
      .rejects.toThrow('RESEND_API_KEY is required');
  });
});
