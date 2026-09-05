import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import {
  signDecisionSeal,
  verifyDecisionSignature,
  getPublicJwks,
  registerHistoricalPublicKey,
  resetSigningKeyCache,
  getSigningKeys,
} from '../lib/crypto/pki';

describe('Asymmetric PKI Digital Signatures & JWKS Suite (src/lib/crypto/pki.ts)', () => {
  const TEST_CHECKSUM = '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';

  beforeEach(() => {
    resetSigningKeyCache();
  });

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

  it('5. Successfully verifies signatures from historical rotated keys via the key registry', () => {
    // Generate a historical keypair representing an older rotated institutional key
    const historicalKeypair = crypto.generateKeyPairSync('ed25519');
    const historicalKeyId = 'sigmago-root-ed25519-v0-legacy';

    // Sign a decision with the historical key
    const data = Buffer.from(TEST_CHECKSUM, 'utf8');
    const historicalSig = crypto.sign(null, data, historicalKeypair.privateKey).toString('base64url');

    // Before registration, verification fails closed
    const beforeRegistration = verifyDecisionSignature(TEST_CHECKSUM, historicalSig, historicalKeyId);
    expect(beforeRegistration).toBe(false);

    // Register historical public key in the registry
    registerHistoricalPublicKey(historicalKeyId, historicalKeypair.publicKey);

    // After registration, historical signature is successfully verified
    const afterRegistration = verifyDecisionSignature(TEST_CHECKSUM, historicalSig, historicalKeyId);
    expect(afterRegistration).toBe(true);

    // JWKS endpoint now includes both active and historical keys
    const jwks = getPublicJwks();
    const foundHistorical = jwks.keys.find((k) => k.kid === historicalKeyId);
    expect(foundHistorical).toBeDefined();
    expect(foundHistorical?.crv).toBe('Ed25519');
  });

  it('6. Fails closed when an unknown keyId is supplied', () => {
    const seal = signDecisionSeal(TEST_CHECKSUM);
    const result = verifyDecisionSignature(TEST_CHECKSUM, seal.signatureB64, 'completely-unknown-key-id');
    expect(result).toBe(false);
  });

  it('7. Production fail-closed guard throws fatal error when private key PEM is missing', () => {
    const origEnv = process.env.NODE_ENV;
    const origPem = process.env.PLATFORM_SIGNING_PRIVATE_KEY_PEM;

    try {
      (process.env as any).NODE_ENV = 'production';
      delete process.env.PLATFORM_SIGNING_PRIVATE_KEY_PEM;
      resetSigningKeyCache();

      expect(() => getSigningKeys()).toThrowError(/PLATFORM_SIGNING_PRIVATE_KEY_PEM is required in production/);
    } finally {
      (process.env as any).NODE_ENV = origEnv;
      if (origPem) process.env.PLATFORM_SIGNING_PRIVATE_KEY_PEM = origPem;
      resetSigningKeyCache();
    }
  });
});
