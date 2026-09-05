import crypto from 'crypto';

const DEFAULT_KEY_ID = process.env.PLATFORM_SIGNING_KEY_ID || 'sigmago-root-ed25519-v1';

// In-memory cache for active keypair
let activePrivateKey: crypto.KeyObject | null = null;
let activePublicKey: crypto.KeyObject | null = null;
let activeKeyId: string = DEFAULT_KEY_ID;

// Key registry mapping keyId -> crypto.KeyObject (public key)
const publicKeyRegistry = new Map<string, crypto.KeyObject>();

/**
 * Initializes and registers historical public keys from environment configuration.
 * Format: JSON object mapping keyId -> PEM string or JWK object
 */
function loadHistoricalKeysFromEnv(): void {
  const envJson = process.env.PLATFORM_HISTORICAL_PUBLIC_KEYS_JSON;
  if (!envJson) return;

  try {
    const parsed = JSON.parse(envJson);
    if (typeof parsed === 'object' && parsed !== null) {
      for (const [kid, keyData] of Object.entries(parsed)) {
        if (!publicKeyRegistry.has(kid)) {
          if (typeof keyData === 'string') {
            const pubKey = crypto.createPublicKey(keyData);
            publicKeyRegistry.set(kid, pubKey);
          } else if (typeof keyData === 'object' && (keyData as any).x) {
            const pubKey = crypto.createPublicKey({ key: keyData as any, format: 'jwk' });
            publicKeyRegistry.set(kid, pubKey);
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Failed to parse PLATFORM_HISTORICAL_PUBLIC_KEYS_JSON:', err.message);
  }
}

/**
 * Registers a public key for a specific keyId in the institutional key registry.
 * Enables zero-downtime key rotation: signatures made by rotated keys remain fully verifiable.
 */
export function registerHistoricalPublicKey(keyId: string, keyInput: crypto.KeyObject | string | any): void {
  if (!keyId || !keyInput) return;

  if (typeof keyInput === 'string') {
    const pubKey = crypto.createPublicKey(keyInput);
    publicKeyRegistry.set(keyId, pubKey);
  } else if (keyInput instanceof crypto.KeyObject) {
    publicKeyRegistry.set(keyId, keyInput);
  } else if (typeof keyInput === 'object' && keyInput.x) {
    const pubKey = crypto.createPublicKey({ key: keyInput, format: 'jwk' });
    publicKeyRegistry.set(keyId, pubKey);
  }
}

/**
 * Initializes or resolves the active Ed25519 signing keypair.
 * Fails closed in production if PLATFORM_SIGNING_PRIVATE_KEY_PEM is unset.
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
      publicKeyRegistry.set(activeKeyId, activePublicKey);
      loadHistoricalKeysFromEnv();
      return { privateKey: activePrivateKey, publicKey: activePublicKey, keyId: activeKeyId };
    } catch (e: any) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`FATAL: Invalid PLATFORM_SIGNING_PRIVATE_KEY_PEM: ${e.message}`);
      }
      console.warn('Failed to parse PLATFORM_SIGNING_PRIVATE_KEY_PEM:', e.message);
    }
  }

  // 2. Production fail-closed guard
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'FATAL: PLATFORM_SIGNING_PRIVATE_KEY_PEM is required in production for durable asymmetric PKI sealing. Refusing ephemeral generation.'
    );
  }

  // 3. Fallback: Ephemeral keypair for non-production / tests
  const keypair = crypto.generateKeyPairSync('ed25519');
  activePrivateKey = keypair.privateKey;
  activePublicKey = keypair.publicKey;
  activeKeyId = process.env.PLATFORM_SIGNING_KEY_ID || DEFAULT_KEY_ID;
  publicKeyRegistry.set(activeKeyId, activePublicKey);
  loadHistoricalKeysFromEnv();

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
 * Rotation-aware: resolves the matching public key from the key registry using keyId.
 * Fails closed if keyId is not recognized in the registry.
 */
export function verifyDecisionSignature(checksumHex: string, signatureB64: string, keyId?: string): boolean {
  if (!checksumHex || !signatureB64) return false;

  try {
    // Ensure active keys and registry are initialized
    const active = getSigningKeys();
    const targetKeyId = keyId || active.keyId;

    let targetPublicKey = publicKeyRegistry.get(targetKeyId);

    // If not in registry but matches activeKeyId, use active public key
    if (!targetPublicKey && targetKeyId === active.keyId) {
      targetPublicKey = active.publicKey;
    }

    // Fail closed if keyId is unknown
    if (!targetPublicKey) {
      console.warn(`Signature verification failed: keyId "${targetKeyId}" is not in public key registry.`);
      return false;
    }

    const data = Buffer.from(checksumHex, 'utf8');
    const signature = Buffer.from(signatureB64, 'base64url');

    return crypto.verify(null, data, targetPublicKey, signature);
  } catch (err) {
    return false;
  }
}

/**
 * Returns all institutional public keys (active + historical rotated keys) formatted as an
 * RFC 7517 / RFC 8037 JSON Web Key Set (JWKS).
 * Can be fetched by external auditors, counterparties, or regulators at /.well-known/jwks.json.
 */
export function getPublicJwks(): { keys: Array<{ kty: string; crv: string; x: string; kid: string; use: string; alg: string }> } {
  // Ensure active keys are initialized and in registry
  const active = getSigningKeys();
  loadHistoricalKeysFromEnv();

  // Ensure active key is present
  if (!publicKeyRegistry.has(active.keyId)) {
    publicKeyRegistry.set(active.keyId, active.publicKey);
  }

  const keys: Array<{ kty: string; crv: string; x: string; kid: string; use: string; alg: string }> = [];

  for (const [kid, pubKey] of publicKeyRegistry.entries()) {
    const jwk = pubKey.export({ format: 'jwk' });
    keys.push({
      kty: jwk.kty || 'OKP',
      crv: jwk.crv || 'Ed25519',
      x: jwk.x || '',
      kid,
      use: 'sig',
      alg: 'EdDSA',
    });
  }

  return { keys };
}

/**
 * Resets the in-memory key cache and registry (for testing key rotation).
 */
export function resetSigningKeyCache(): void {
  activePrivateKey = null;
  activePublicKey = null;
  publicKeyRegistry.clear();
}
