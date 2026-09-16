/**
 * Centralized Privacy Redaction & Telemetry Scrubbing Policy
 *
 * Ensures no customer decision content, reasoning, comments, email bodies,
 * credentials, action tokens, or authorization headers leak into logs, traces, or metrics.
 */

export const REDACTED_KEYWORDS = new Set([
  // Decision Content & Reasoning
  'reasoning',
  'comment',
  'statement',
  'note',
  'subject',
  'body',
  'body_json',
  'justification',
  'discussion',
  'discussion_comment',
  'reservation',
  'amend_reason',
  'html',
  'text',
  'content',
  'custom_fields',
  'payload',
  'raw_body',
  'employees',

  // Authentication & Secrets
  'authorization',
  'cookie',
  'set-cookie',
  'token',
  'action_token',
  'secret',
  'password',
  'apikey',
  'api_key',
  'resend_api_key',
  'cron_secret',
  'hrms_sync_secret',
  'hmac_secret',
  'sync_secret',
  'private_key',
  'signing_key',
  'encryption_key',
  'secret_key',
  'platform_signing_private_key_pem',
  'secret_encryption_key',
  'jwt',
  'access_token',
  'refresh_token',

  // PII
  'email',
  'phone',
  'phonenumber',
  'name',
  'display_name',
  'salary',
  'compensation',
]);

const REDACTION_PLACEHOLDER = '[REDACTED]';

/**
 * Deeply and recursively redacts sensitive fields in any object, array, or error structure.
 * Safe against circular references.
 */
export function redactSensitiveData<T = any>(input: T, seen = new WeakSet()): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input !== 'object') {
    return input;
  }

  // Handle Error instances specially
  if (input instanceof Error) {
    const errorObj: Record<string, any> = {
      name: input.name,
      message: redactStringContent(input.message),
      stack: input.stack ? redactStringContent(input.stack) : undefined,
    };
    for (const key of Object.keys(input)) {
      if (!['name', 'message', 'stack'].includes(key)) {
        errorObj[key] = redactSensitiveData((input as any)[key], seen);
      }
    }
    return errorObj as unknown as T;
  }

  // Circular reference guard
  if (seen.has(input as object)) {
    return '[CIRCULAR]' as unknown as T;
  }
  seen.add(input as object);

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item, seen)) as unknown as T;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();

    if (REDACTED_KEYWORDS.has(lowerKey)) {
      sanitized[key] = REDACTION_PLACEHOLDER;
      continue;
    }

    // Check if key contains sensitive substring
    if (
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('password') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('cookie')
    ) {
      sanitized[key] = REDACTION_PLACEHOLDER;
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value, seen);
    } else if (typeof value === 'string') {
      sanitized[key] = redactStringContent(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as unknown as T;
}

/**
 * Redacts email patterns or bearer tokens embedded in arbitrary text strings.
 */
export function redactStringContent(str: string): string {
  if (!str || typeof str !== 'string') return str;

  // Redact Bearer tokens
  let cleaned = str.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');

  // Redact email addresses
  cleaned = cleaned.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/gi, '[EMAIL_REDACTED]');

  return cleaned;
}
