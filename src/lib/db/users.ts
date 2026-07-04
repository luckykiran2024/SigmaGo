import { createClient } from '../supabase/server'
import { adminClient } from '../supabase/admin'

export async function getProfileForAuthUser(authUserId: string, email: string) {
  // 1. FIRST, try to find the profile already linked to this authUserId with one SELECT (eq auth_user_id).
  // If found, return it immediately — do NO other work. This is the common case and must be fast.
  const { data: existingProfile } = await adminClient
    .from('users')
    .select('id, tenant_id, name, email, role, status, avatar_url')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (existingProfile) {
    return existingProfile;
  }

  // 2. ONLY if no linked profile exists, fall through to the linking logic
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    return null;
  }

  // Find the unlinked CSV row by email
  const { data: csvProfile } = await adminClient
    .from('users')
    .select('id, tenant_id, name, email, role, status, avatar_url')
    .ilike('email', normalizedEmail)
    .is('auth_user_id', null)
    .maybeSingle();

  if (csvProfile) {
    // 3. ONLY run the heavy foreign-key migration if a genuine duplicate is detected
    // (both a CSV row AND a separate auth-linked row exist for the same email).
    const { data: dupProfile } = await adminClient
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .not('auth_user_id', 'is', null) // has auth_user_id set
      .neq('id', csvProfile.id)        // and is a different row from csvProfile
      .maybeSingle();

    if (dupProfile) {
      const oldId = dupProfile.id;
      const newId = csvProfile.id;

      console.log(`Genuine duplicate detected for email ${normalizedEmail}. Merging ${oldId} into CSV profile ${newId}...`);

      // Delete dupProfile's org_node to prevent duplicates/foreign key violations
      await adminClient
        .from('org_nodes')
        .delete()
        .eq('user_id', oldId);

      // Update references in other tables to point to the CSV-imported profile
      await adminClient.from('approval_requests').update({ owner_id: newId }).eq('owner_id', oldId);
      await adminClient.from('approval_steps').update({ approver_id: newId }).eq('approver_id', oldId);
      await adminClient.from('approval_steps').update({ acted_by_id: newId }).eq('acted_by_id', oldId);
      await adminClient.from('delegations').update({ delegator_id: newId }).eq('delegator_id', oldId);
      await adminClient.from('delegations').update({ delegate_id: newId }).eq('delegate_id', oldId);
      await adminClient.from('audit_log').update({ actor_id: newId }).eq('actor_id', oldId);
      await adminClient.from('view_grants').update({ grantee_id: newId }).eq('grantee_id', oldId);
      await adminClient.from('view_grants').update({ granted_by_id: newId }).eq('granted_by_id', oldId);

      // Delete the duplicate auth-only profile
      await adminClient
        .from('users')
        .delete()
        .eq('id', oldId);
    }

    // Link the auth user to the existing CSV imported record
    const { data: updatedProfile, error: linkError } = await adminClient
      .from('users')
      .update({ auth_user_id: authUserId })
      .eq('id', csvProfile.id)
      .select('id, tenant_id, name, email, role, status, avatar_url')
      .single();

    if (!linkError && updatedProfile) {
      return updatedProfile;
    }
  }

  return null;
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Unauthenticated')

  const profile = await getProfileForAuthUser(user.id, user.email || '')

  if (!profile) throw new Error('User profile not found')
  if (profile.status === 'inactive') throw new Error('Account inactive')

  return profile
}
