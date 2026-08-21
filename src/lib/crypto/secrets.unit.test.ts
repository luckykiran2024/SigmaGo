import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, isEncryptedSecret } from './secrets';

describe('AES-256-GCM Secrets Encryption Unit Tests (src/lib/crypto/secrets.unit.test.ts)', () => {
  it('1. Encrypts plaintext secret and returns formatted ciphertext with IV and Auth Tag', () => {
    const secret = 'sk_test_super_secret_key_12345';
    const encrypted = encryptSecret(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(isEncryptedSecret(encrypted)).toBe(true);
  });

  it('2. Decrypts encrypted secret back to original plaintext', () => {
    const originalSecret = 'hmac_sha256_shared_secret_abcxyz';
    const encrypted = encryptSecret(originalSecret);
    const decrypted = decryptSecret(encrypted);

    expect(decrypted).toBe(originalSecret);
  });

  it('3. Throws or fails gracefully on tampered ciphertext or invalid auth tag', () => {
    const originalSecret = 'sensitive_hrms_token';
    const encrypted = encryptSecret(originalSecret);

    // Tamper with the ciphertext payload
    const parts = encrypted.split(':');
    const tamperedCiphertext = parts[3].slice(0, -2) + '00';
    const tamperedPayload = `${parts[0]}:${parts[1]}:${parts[2]}:${tamperedCiphertext}`;

    expect(() => decryptSecret(tamperedPayload)).toThrow();
  });

  it('4. Correctly identifies encrypted vs unencrypted secret strings', () => {
    expect(isEncryptedSecret('plaintext_secret_value')).toBe(false);
    const encrypted = encryptSecret('plaintext_secret_value');
    expect(isEncryptedSecret(encrypted)).toBe(true);
  });
});
