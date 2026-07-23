import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { getProfileForAuthUser } from '@/lib/db/users'
import { getCustomFieldDefinitions } from '@/lib/db/customFields'
import { redirect } from 'next/navigation'
import CustomFieldsManager from './CustomFieldsManager'

export default async function CustomFieldsPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfileForAuthUser(user.id, user.email || '')
  const role = (profile?.role || '').toLowerCase()
  if (role !== 'admin' && role !== 'super_admin') {
    redirect(`/${tenant}`)
  }

  const { data: tenantData } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenant)
    .single()

  if (!tenantData) redirect(`/${tenant}`)

  const fields = await getCustomFieldDefinitions(tenantData.id)

  const { data: categories } = await adminClient
    .from('categories')
    .select('id, name')
    .eq('tenant_id', tenantData.id)
    .order('name')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold tracking-tight text-ink">
          Custom Fields
        </h1>
        <p className="text-sm text-muted font-medium mt-1">
          Define additional fields that appear on approval request forms. Fields can be scoped to specific categories or apply globally.
        </p>
      </div>

      <CustomFieldsManager
        tenant={tenant}
        fields={fields}
        categories={categories || []}
      />
    </div>
  )
}
