import { describe, it, expect } from 'vitest';
import { signDecisionSeal, verifyDecisionSignature, getPublicJwks } from '../lib/crypto/pki';

describe('Asymmetric PKI Digital Signatures & JWKS Suite (src/lib/crypto/pki.ts)', () => {
  const TEST_CHECKSUM = '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';

  it('1. Digitally signs a canonical decision checksum and returns base64url Ed25519 signature', () => {
    const seal = signDecisionSeal(TEST_CHECKSUM);

    expect(seal).toBeDefined();
    expect(seal.signatureB64).toBeDefined();
    expect(seal.signatureB64.length).toBeGreaterThan(30);
    expect(seal.algorithm).toBe('Ed25519');
    expect(seal.keyId).toBeDefined();
  });

  it('2. Cryptographically verifies signature against the checksum using public key', () => {
    const seal = signDecisionSeal(TEST_CHECKSUM);
    const isValid = verifyDecisionSignature(TEST_CHECKSUM, seal.signatureB64, seal.keyId);

    expect(isValid).toBe(true);
  });

  it('3. Strictly fails verification if checksum or signature is altered', () => {
    const seal = signDecisionSeal(TEST_CHECKSUM);
    const tamperedChecksum = '0000000000000000000000000000000000000000000000000000000000000000';

    const isValidWithTamperedData = verifyDecisionSignature(tamperedChecksum, seal.signatureB64, seal.keyId);
    expect(isValidWithTamperedData).toBe(false);

    // Tamper with signature
    const tamperedSig = 'A' + seal.signatureB64.substring(1);
    const isValidWithTamperedSig = verifyDecisionSignature(TEST_CHECKSUM, tamperedSig, seal.keyId);
    expect(isValidWithTamperedSig).toBe(false);
  });

  it('4. Generates RFC 7517 / RFC 8037 compliant public JWKS format', () => {
    const jwks = getPublicJwks();

    expect(jwks).toBeDefined();
    expect(Array.isArray(jwks.keys)).toBe(true);
    expect(jwks.keys.length).toBeGreaterThan(0);

    const key = jwks.keys[0];
    expect(key.kty).toBe('OKP');
    expect(key.crv).toBe('Ed25519');
    expect(key.kid).toBeDefined();
    expect(key.x).toBeDefined();
    expect(key.use).toBe('sig');
    expect(key.alg).toBe('EdDSA');
  });
});
