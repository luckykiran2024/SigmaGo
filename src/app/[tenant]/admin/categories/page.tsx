import { adminClient } from '@/lib/supabase/admin';

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const resolvedParams = await params;
  
  // Resolve tenant ID
  const { data: tenant } = await adminClient
    .from('tenants')
    .select('id, name')
    .eq('subdomain', resolvedParams.tenant)
    .single();

  if (!tenant) return null;

  // Fetch categories
  const { data: categories } = await adminClient
    .from('categories')
    .select('*')
    .eq('tenant_id', tenant.id);

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-6 font-body">
      <div>
        <h2 className="text-xl font-display font-black text-ink">Categories</h2>
        <p className="text-sm text-gray-500 font-medium">Manage request categories and routing keys.</p>
      </div>

      <div className="overflow-hidden border border-gray-100 rounded-xl">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Category Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {categories?.map((cat) => (
              <tr key={cat.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-ink">
                  {cat.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                  {cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100 uppercase tracking-wider">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
