import { adminClient } from '@/lib/supabase/admin';
import { syncOrganization } from '@/lib/db/orgSync';
import { decryptSecret } from '@/lib/crypto/secrets';
import { verifyWebhookAuthentication } from '@/lib/security/webhook';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const resolvedParams = await params;
    const syncSecretHeader = req.headers.get('x-sync-secret');
    const signatureHeader = req.headers.get('x-sync-signature') || req.headers.get('x-signature');
    const timestampHeader = req.headers.get('x-sync-timestamp') || req.headers.get('x-timestamp');

    // 1. Read Raw Body
    const rawBody = await req.text();

    // 2. Resolve tenant ID & Secret
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('id, hrms_sync_secret')
      .eq('subdomain', resolvedParams.tenant)
      .single();

    if (tenantError || !tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // 3. Authenticate secret (decrypt stored secret and verify with timing-safe HMAC/equality)
    const storedSecret = tenant.hrms_sync_secret ? decryptSecret(tenant.hrms_sync_secret) : null;
    if (!storedSecret) {
      return Response.json({ error: 'Tenant has not configured an HRMS sync secret' }, { status: 401 });
    }

    const authResult = verifyWebhookAuthentication({
      storedSecret,
      headerSecret: syncSecretHeader,
      signatureHeader,
      timestampHeader,
      rawBody,
    });

    if (!authResult.authenticated) {
      return Response.json({ error: `Unauthorized: ${authResult.reason || 'Authentication failed'}` }, { status: 401 });
    }

    // 4. Parse JSON Body
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    const employees = body.employees || [];

    if (!Array.isArray(employees)) {
      return Response.json({ error: 'Invalid payload - employees must be an array' }, { status: 400 });
    }

    // 4. Trigger Shared syncOrganization Function (appliedByUserId is null since it is an automated sync)
    const result = await syncOrganization(tenant.id, employees);

    return Response.json(result);
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
