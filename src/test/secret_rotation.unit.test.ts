import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encryptSecret, decryptSecret, rotateSecret, getKeyRing, getActiveKey } from '../lib/crypto/secrets';

describe('Secret Key Rotation & Zero-Trust Fail-Closed Suite', () => {
  const KEY_V1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const KEY_V2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
  const originalEnv = process.env.SECRET_ENCRYPTION_KEY;
  const originalRing = process.env.SECRET_KEY_RING;
  const originalActive = process.env.SECRET_ACTIVE_KEY_VERSION;

  beforeEach(() => {
    process.env.SECRET_KEY_RING = JSON.stringify({
      '1': KEY_V1,
      '2': KEY_V2,
    });
    process.env.SECRET_ACTIVE_KEY_VERSION = '2';
    delete process.env.SECRET_ENCRYPTION_KEY;
  });

  afterEach(() => {
    if (originalEnv) process.env.SECRET_ENCRYPTION_KEY = originalEnv;
    else delete process.env.SECRET_ENCRYPTION_KEY;

    if (originalRing) process.env.SECRET_KEY_RING = originalRing;
    else delete process.env.SECRET_KEY_RING;

    if (originalActive) process.env.SECRET_ACTIVE_KEY_VERSION = originalActive;
    else delete process.env.SECRET_ACTIVE_KEY_VERSION;
  });

  it('1. Key Ring correctly initializes multi-version keys and resolves active version', () => {
    const ring = getKeyRing();
    expect(ring.size).toBe(2);
    expect(ring.has(1)).toBe(true);
    expect(ring.has(2)).toBe(true);

    const active = getActiveKey();
    expect(active.version).toBe(2);
  });

  it('2. Encrypts using active version (v2) by default and supports explicit version (v1)', () => {
    const secret = 'stripe_webhook_secret_key_999';
    const encryptedV2 = encryptSecret(secret);
    expect(encryptedV2.startsWith('v2:')).toBe(true);

    const encryptedV1 = encryptSecret(secret, 1);
    expect(encryptedV1.startsWith('v1:')).toBe(true);

    // Both decrypt correctly using their respective keys
    expect(decryptSecret(encryptedV2)).toBe(secret);
    expect(decryptSecret(encryptedV1)).toBe(secret);
  });

  it('3. Re-encrypts / rotates a v1 secret to v2 seamlessly without data loss', () => {
    const secret = 'corporate_sso_client_secret_xyz';
    const encryptedV1 = encryptSecret(secret, 1);
    expect(encryptedV1.startsWith('v1:')).toBe(true);

    // Rotate to v2
    const rotatedToV2 = rotateSecret(encryptedV1, 2);
    expect(rotatedToV2.startsWith('v2:')).toBe(true);
    expect(rotatedToV2).not.toBe(encryptedV1);

    // Verify plaintext integrity after rotation
    expect(decryptSecret(rotatedToV2)).toBe(secret);
  });

  it('4. Zero-Trust: Strictly throws error on plaintext string (no fallback)', () => {
    const plaintext = 'unencrypted_raw_secret_value';
    expect(() => decryptSecret(plaintext)).toThrow(/Plaintext secret fallback is forbidden/);
  });

  it('5. Strictly fails when decrypting with a key version that is not in the ring', () => {
    process.env.SECRET_KEY_RING = JSON.stringify({ '1': KEY_V1 });
    delete process.env.SECRET_ACTIVE_KEY_VERSION;

    // Secret was encrypted with v2, but key ring only has v1
    const v2Ciphertext = 'v2:0123456789abcdef01234567:0123456789abcdef0123456789abcdef:1234';
    expect(() => decryptSecret(v2Ciphertext)).toThrow(/Key version v2 not found in key ring/);
  });
});
