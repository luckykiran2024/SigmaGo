import crypto from 'crypto';

// TODO: Replace environment key with GCP KMS key retrieval in production.
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit Auth Tag

function getMasterKey(): Buffer {
  const envKey = process.env.SECRET_ENCRYPTION_KEY;
  if (!envKey) {
    // Development fallback key — MUST be overridden in production
    return crypto.scryptSync('default_sigmago_development_secret_key_change_me', 'sigmago_salt', 32);
  }
  if (envKey.length === 64) {
    // Hex-encoded 32-byte key
    return Buffer.from(envKey, 'hex');
  }
  return crypto.scryptSync(envKey, 'sigmago_salt', 32);
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 * Never logs or exposes the plaintext.
 */
export function encryptSecret(plaintext: string, version: number = 1): string {
  if (!plaintext) return '';

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  // Format: v<version>:<iv>:<tag>:<ciphertext>
  return `v${version}:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a formatted AES-256-GCM ciphertext string.
 * Returns empty string if decryption fails or input is invalid.
 */
export function decryptSecret(encryptedString: string): string {
  if (!encryptedString) return '';

  // If plaintext format (legacy), return as is (for migration verification)
  if (!encryptedString.startsWith('v')) {
    return encryptedString;
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted secret format.');
  }

  const [, ivHex, tagHex, ciphertextHex] = parts;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Utility to check if a secret string is already encrypted.
 */
export function isEncryptedSecret(value: string): boolean {
  if (!value) return false;
  return /^v\d+:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}
