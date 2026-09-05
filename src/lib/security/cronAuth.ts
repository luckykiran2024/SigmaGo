import crypto from 'crypto';

export interface CronAuthResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Air-tight fail-closed cron authorization guard.
 * Strictly verifies the Bearer CRON_SECRET token using constant-time comparison.
 * Fails closed if CRON_SECRET is not configured.
 */
export function verifyCronAuthorization(request: Request): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim() === '') {
    return {
      authorized: false,
      reason: 'CRON_SECRET environment variable is missing or empty. Refusing unauthorized execution (Fail-closed).',
    };
  }

  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === 'true';

  if (authHeader) {
    const expected = `Bearer ${cronSecret.trim()}`;
    const hashExpected = crypto.createHash('sha256').update(expected).digest();
    const hashReceived = crypto.createHash('sha256').update(authHeader).digest();

    if (crypto.timingSafeEqual(hashExpected, hashReceived)) {
      return { authorized: true };
    }
  }

  if (isVercelCron && (!authHeader || authHeader.trim() === '')) {
    // Standard Vercel Cron invocation without custom authorization header
    return { authorized: true };
  }

  return {
    authorized: false,
    reason: 'Unauthorized: Invalid or missing Bearer token.',
  };
}
