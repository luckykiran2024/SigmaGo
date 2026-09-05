import { NextResponse } from 'next/server';
import { getPublicJwks } from '@/lib/crypto/pki';

export const dynamic = 'force-dynamic';

/**
 * Public RFC 7517 / RFC 8037 JSON Web Key Set (JWKS) endpoint.
 * Enables third-party auditors, regulators, and counterparties to verify
 * SigmaGo digital decision signatures offline without database credentials.
 */
export async function GET() {
  const jwks = getPublicJwks();
  return NextResponse.json(jwks, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'Content-Type': 'application/json',
    },
  });
}
