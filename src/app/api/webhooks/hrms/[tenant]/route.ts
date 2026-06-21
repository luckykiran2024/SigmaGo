import { adminClient } from '@/lib/supabase/admin';
import { syncOrganization } from '@/lib/db/orgSync';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tenant: string }> }
) {
  try {
    const resolvedParams = await params;
    const syncSecret = req.headers.get('x-sync-secret');

    // 1. Resolve tenant ID & Secret
    const { data: tenant, error: tenantError } = await adminClient
      .from('tenants')
      .select('id, hrms_sync_secret')
      .eq('subdomain', resolvedParams.tenant)
      .single();

    if (tenantError || !tenant) {
      return Response.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // 2. Authenticate secret
    if (!tenant.hrms_sync_secret || tenant.hrms_sync_secret !== syncSecret) {
      return Response.json({ error: 'Unauthorized - invalid sync secret' }, { status: 401 });
    }

    // 3. Parse JSON Body
    const body = await req.json();
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
