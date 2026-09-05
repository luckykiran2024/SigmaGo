import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit Auth Tag

function deriveKey(rawKey: string): Buffer {
  if (!rawKey || rawKey.trim() === '') {
    throw new Error('FATAL: Encryption key value is missing or empty.');
  }
  if (rawKey.length === 64) {
    // Hex-encoded 32-byte key
    return Buffer.from(rawKey, 'hex');
  }
  return crypto.scryptSync(rawKey, 'sigmago_salt', 32);
}

/**
 * Resolves the Key Ring from environment.
 * Supports SECRET_KEY_RING='{"1": "key1...", "2": "key2..."}'
 * Falls back to SECRET_ENCRYPTION_KEY mapped to version 1.
 */
export function getKeyRing(): Map<number, Buffer> {
  const ring = new Map<number, Buffer>();

  if (process.env.SECRET_KEY_RING) {
    try {
      const parsed = JSON.parse(process.env.SECRET_KEY_RING);
      for (const [vStr, keyVal] of Object.entries(parsed)) {
        const vNum = parseInt(vStr, 10);
        if (!isNaN(vNum) && typeof keyVal === 'string') {
          ring.set(vNum, deriveKey(keyVal));
        }
      }
    } catch (e: any) {
      throw new Error(`FATAL: Failed to parse SECRET_KEY_RING configuration: ${e.message}`);
    }
  }

  // Fallback or override from single key if ring is empty
  if (ring.size === 0) {
    const defaultKey = process.env.SECRET_ENCRYPTION_KEY;
    if (!defaultKey || defaultKey.trim() === '') {
      throw new Error(
        'FATAL: SECRET_ENCRYPTION_KEY environment variable is missing. Refusing to operate without an explicit encryption key.'
      );
    }
    ring.set(1, deriveKey(defaultKey));
  }

  return ring;
}

/**
 * Returns the key and active version for new encryptions.
 */
export function getActiveKey(): { key: Buffer; version: number } {
  const ring = getKeyRing();
  if (process.env.SECRET_ACTIVE_KEY_VERSION) {
    const reqVersion = parseInt(process.env.SECRET_ACTIVE_KEY_VERSION, 10);
    const key = ring.get(reqVersion);
    if (!key) {
      throw new Error(`FATAL: Configured active key version v${reqVersion} is not present in SECRET_KEY_RING.`);
    }
    return { key, version: reqVersion };
  }

  // Default to highest version available in ring
  let maxVersion = 1;
  for (const v of ring.keys()) {
    if (v > maxVersion) maxVersion = v;
  }
  const key = ring.get(maxVersion)!;
  return { key, version: maxVersion };
}

/**
 * Retrieves the specific key for a given version.
 */
export function getKeyForVersion(version: number): Buffer {
  const ring = getKeyRing();
  const key = ring.get(version);
  if (!key) {
    throw new Error(`FATAL: Key version v${version} not found in key ring for decryption.`);
  }
  return key;
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
export function encryptSecret(plaintext: string, requestedVersion?: number): string {
  if (!plaintext) return '';

  let key: Buffer;
  let version: number;

  if (requestedVersion !== undefined) {
    key = getKeyForVersion(requestedVersion);
    version = requestedVersion;
  } else {
    const active = getActiveKey();
    key = active.key;
    version = active.version;
  }

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
 * Strictly fails closed on any invalid, missing, or plaintext strings.
 */
export function decryptSecret(encryptedString: string): string {
  if (!encryptedString) return '';

  // Zero-trust fail-closed: reject any plaintext secret without version prefix
  if (!encryptedString.startsWith('v')) {
    throw new Error('FATAL: Plaintext secret fallback is forbidden. All stored secrets must be encrypted.');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 4) {
    throw new Error('FATAL: Invalid encrypted secret format. Expected v<version>:<iv>:<tag>:<ciphertext>.');
  }

  const version = parseInt(parts[0].substring(1), 10);
  if (isNaN(version)) {
    throw new Error(`FATAL: Invalid secret version identifier: ${parts[0]}`);
  }

  const [, ivHex, tagHex, ciphertextHex] = parts;
  const key = getKeyForVersion(version);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    throw new Error(`FATAL: Failed to decrypt secret payload: ${err.message}`);
  }
}

/**
 * Re-encrypts an existing secret with the target version (or active version).
 * Enables seamless, zero-downtime key rotation.
 */
export function rotateSecret(encryptedString: string, targetVersion?: number): string {
  if (!encryptedString) return '';
  const plaintext = decryptSecret(encryptedString);
  return encryptSecret(plaintext, targetVersion);
}

/**
 * Utility to check if a secret string is already encrypted and matches the format.
 */
export function isEncryptedSecret(value: string): boolean {
  if (!value) return false;
  return /^v\d+:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}
