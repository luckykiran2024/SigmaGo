import { adminClient } from '@/lib/supabase/admin';
import CategoryManager from './CategoryManager';

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  
  // Resolve tenant info
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name, tenant_settings')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) return <div className="p-8 text-center text-red-600 font-bold">Tenant not found.</div>;

  // Fetch categories
  const { data: categories } = await adminClient
    .from('categories')
    .select('id, name, default_sla_hours')
    .eq('tenant_id', tenant.id);

  const tenantSettings = tenant.tenant_settings || {};
  const prefilledSla = tenantSettings.default_sla_hours || 48;

  return (
    <div className="space-y-6 font-body">
      <div className="border-b border-gray-100 pb-6">
        <h1 className="text-3xl font-display font-extrabold tracking-tight text-ink">
          Request Categories
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Manage request categories, defining routing chains, and tracking SLAs.
        </p>
      </div>

      <CategoryManager
        categories={categories || []}
        tenantId={tenant.id}
        prefilledSla={prefilledSla}
      />
    </div>
  );
}
