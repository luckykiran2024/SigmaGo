import crypto from 'crypto';

const DEFAULT_KEY_ID = process.env.PLATFORM_SIGNING_KEY_ID || 'sigmago-root-ed25519-v1';

// In-memory cache for deterministic/active keys
let activePrivateKey: crypto.KeyObject | null = null;
let activePublicKey: crypto.KeyObject | null = null;
let activeKeyId: string = DEFAULT_KEY_ID;

/**
 * Initializes or resolves the active Ed25519 signing keypair.
 */
export function getSigningKeys(): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject; keyId: string } {
  if (activePrivateKey && activePublicKey) {
    return { privateKey: activePrivateKey, publicKey: activePublicKey, keyId: activeKeyId };
  }

  // 1. Try loading from environment PEM
  if (process.env.PLATFORM_SIGNING_PRIVATE_KEY_PEM) {
    try {
      activePrivateKey = crypto.createPrivateKey(process.env.PLATFORM_SIGNING_PRIVATE_KEY_PEM);
      activePublicKey = crypto.createPublicKey(activePrivateKey);
      activeKeyId = process.env.PLATFORM_SIGNING_KEY_ID || DEFAULT_KEY_ID;
      return { privateKey: activePrivateKey, publicKey: activePublicKey, keyId: activeKeyId };
    } catch (e: any) {
      console.warn('Failed to parse PLATFORM_SIGNING_PRIVATE_KEY_PEM:', e.message);
    }
  }

  // 2. Fallback: Deterministic generation or test keypair
  const keypair = crypto.generateKeyPairSync('ed25519');
  activePrivateKey = keypair.privateKey;
  activePublicKey = keypair.publicKey;
  activeKeyId = DEFAULT_KEY_ID;

  return { privateKey: activePrivateKey, publicKey: activePublicKey, keyId: activeKeyId };
}

/**
 * Digitally signs a canonical decision checksum using Ed25519 asymmetric cryptography.
 */
export function signDecisionSeal(checksumHex: string): { signatureB64: string; keyId: string; algorithm: 'Ed25519' } {
  if (!checksumHex || checksumHex.trim() === '') {
    throw new Error('FATAL: Cannot sign null or empty checksum.');
  }

  const { privateKey, keyId } = getSigningKeys();
  const data = Buffer.from(checksumHex, 'utf8');
  const signature = crypto.sign(null, data, privateKey);

  return {
    signatureB64: signature.toString('base64url'),
    keyId,
    algorithm: 'Ed25519',
  };
}

/**
 * Cryptographically verifies an Ed25519 digital signature against the canonical decision checksum.
 */
export function verifyDecisionSignature(checksumHex: string, signatureB64: string, keyId?: string): boolean {
  if (!checksumHex || !signatureB64) return false;

  try {
    const { publicKey } = getSigningKeys();
    const data = Buffer.from(checksumHex, 'utf8');
    const signature = Buffer.from(signatureB64, 'base64url');

    return crypto.verify(null, data, publicKey, signature);
  } catch (err) {
    return false;
  }
}

/**
 * Returns the public keys formatted as an RFC 7517 / RFC 8037 JSON Web Key Set (JWKS).
 * Can be fetched by external auditors, counterparties, or regulators at /.well-known/jwks.json.
 */
export function getPublicJwks(): { keys: Array<{ kty: string; crv: string; x: string; kid: string; use: string; alg: string }> } {
  const { publicKey, keyId } = getSigningKeys();
  const jwk = publicKey.export({ format: 'jwk' });

  return {
    keys: [
      {
        kty: jwk.kty || 'OKP',
        crv: jwk.crv || 'Ed25519',
        x: jwk.x || '',
        kid: keyId,
        use: 'sig',
        alg: 'EdDSA',
      },
    ],
  };
}

/**
 * Resets the in-memory key cache (for testing key rotation).
 */
export function resetSigningKeyCache(): void {
  activePrivateKey = null;
  activePublicKey = null;
}
