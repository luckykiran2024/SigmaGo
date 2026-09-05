import crypto from 'crypto';

export interface WebhookAuthOptions {
  storedSecret: string;
  headerSecret?: string | null;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  rawBody: string;
  toleranceSeconds?: number; // default 300 (5 minutes)
}

export interface WebhookAuthResult {
  authenticated: boolean;
  reason?: string;
}

/**
 * Validates inbound webhook requests with:
 * 1. Constant-time equality comparison (mitigating timing side-channel attacks)
 * 2. Optional HMAC-SHA256 signature verification over (timestamp + '.' + rawBody)
 * 3. 5-minute replay attack tolerance window
 */
export function verifyWebhookAuthentication(options: WebhookAuthOptions): WebhookAuthResult {
  const {
    storedSecret,
    headerSecret,
    signatureHeader,
    timestampHeader,
    rawBody,
    toleranceSeconds = 300,
  } = options;

  if (!storedSecret) {
    return { authenticated: false, reason: 'Stored secret is missing' };
  }

  // 1. Check Replay Attack Tolerance Window if timestamp is provided
  if (timestampHeader) {
    const timestampSec = Number(timestampHeader);
    if (isNaN(timestampSec)) {
      return { authenticated: false, reason: 'Invalid timestamp header format' };
    }
    const currentSec = Math.floor(Date.now() / 1000);
    if (Math.abs(currentSec - timestampSec) > toleranceSeconds) {
      return { authenticated: false, reason: 'Timestamp exceeds 5-minute tolerance window (replay attack detected)' };
    }
  }

  // 2. If HMAC signature header is provided (e.g. 'sha256=abc...'), verify HMAC over (timestamp + '.' + rawBody)
  if (signatureHeader) {
    const expectedPrefix = 'sha256=';
    const providedSig = signatureHeader.startsWith(expectedPrefix)
      ? signatureHeader.slice(expectedPrefix.length)
      : signatureHeader;

    const payloadToSign = timestampHeader ? `${timestampHeader}.${rawBody}` : rawBody;
    const computedHmac = crypto
      .createHmac('sha256', storedSecret)
      .update(payloadToSign, 'utf8')
      .digest('hex');

    if (
      providedSig.length !== computedHmac.length ||
      !crypto.timingSafeEqual(Buffer.from(providedSig, 'hex'), Buffer.from(computedHmac, 'hex'))
    ) {
      return { authenticated: false, reason: 'HMAC-SHA256 signature mismatch' };
    }

    return { authenticated: true };
  }

  // 3. Constant-time comparison on shared secret
  if (!headerSecret) {
    return { authenticated: false, reason: 'Missing authorization secret or signature' };
  }

  // Hash both storedSecret and headerSecret with SHA-256 to ensure identical fixed buffer lengths
  const hashStored = crypto.createHash('sha256').update(storedSecret).digest();
  const hashHeader = crypto.createHash('sha256').update(headerSecret).digest();

  if (!crypto.timingSafeEqual(hashStored, hashHeader)) {
    return { authenticated: false, reason: 'Invalid sync secret' };
  }

  return { authenticated: true };
}
