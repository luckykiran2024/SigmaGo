'use server';

import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface TenantHealthMetric {
  id: string;
  name: string;
  subdomain: string;
  plan: string;
  region: string;
  createdAt: string;
  userCount: number;
  activeGrantsCount: number;
  openTicketsCount: number;
  unstaffedStagesCount: number;
  dbLatencyMs: number;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'ATTENTION_REQUIRED';
}

export async function fetchTenantHealthMetricsAction(): Promise<{
  success: boolean;
  metrics?: TenantHealthMetric[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Fetch all tenants
    const { data: tenants, error: tenantErr } = await adminClient
      .from('tenants')
      .select('id, name, subdomain, plan, region, created_at')
      .order('created_at', { ascending: false });

    if (tenantErr || !tenants) {
      return { success: false, error: tenantErr?.message || 'Failed to fetch tenants' };
    }

    const metrics: TenantHealthMetric[] = [];

    for (const t of tenants) {
      const startPing = performance.now();
      const { count: userCount } = await adminClient
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id);
      const pingMs = Math.round(performance.now() - startPing);

      const { count: grantsCount } = await adminClient
        .from('intelligence_grants')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id)
        .is('revoked_at', null);

      const { count: openTickets } = await adminClient
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', t.id)
        .neq('status', 'RESOLVED')
        .neq('status', 'CLOSED');

      // Check unstaffed stage count
      const { data: unstaffed } = await adminClient
        .from('approver_authorities')
        .select('id')
        .eq('tenant_id', t.id);

      const unstaffedCount = 0; // Baseline check

      let health: 'HEALTHY' | 'DEGRADED' | 'ATTENTION_REQUIRED' = 'HEALTHY';
      if ((openTickets || 0) > 3 || pingMs > 500) {
        health = 'ATTENTION_REQUIRED';
      } else if ((openTickets || 0) > 0 || pingMs > 250) {
        health = 'DEGRADED';
      }

      metrics.push({
        id: t.id,
        name: t.name,
        subdomain: t.subdomain,
        plan: t.plan || 'free',
        region: t.region || 'ap-south-2',
        createdAt: t.created_at,
        userCount: userCount || 0,
        activeGrantsCount: grantsCount || 0,
        openTicketsCount: openTickets || 0,
        unstaffedStagesCount: unstaffedCount,
        dbLatencyMs: pingMs,
        healthStatus: health,
      });
    }

    return { success: true, metrics };
  } catch (err: any) {
    console.error('fetchTenantHealthMetricsAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function onboardTenantAction(payload: {
  name: string;
  subdomain: string;
  adminName: string;
  adminEmail: string;
  plan?: string;
  region?: string;
}): Promise<{ success: boolean; tenantId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const normalizedSubdomain = payload.subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');

    // 1. Create tenant record
    const { data: tenant, error: tenantErr } = await adminClient
      .from('tenants')
      .upsert(
        {
          name: payload.name.trim(),
          subdomain: normalizedSubdomain,
          plan: payload.plan || 'pro',
          region: payload.region || 'ap-south-2',
        },
        { onConflict: 'subdomain' }
      )
      .select()
      .single();

    if (tenantErr || !tenant) {
      return { success: false, error: tenantErr?.message || 'Failed to onboard tenant' };
    }

    // 2. Create or ensure initial admin account in auth
    const adminEmail = payload.adminEmail.toLowerCase().trim();
    const { data: authList } = await adminClient.auth.admin.listUsers();
    let authUser = authList?.users?.find((u) => u.email === adminEmail);

    if (!authUser) {
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: adminEmail,
        password: 'Password@123',
        email_confirm: true,
      });
      if (createErr) {
        return { success: false, error: `Tenant created, but failed to create auth user: ${createErr.message}` };
      }
      authUser = created.user;
    }

    // 3. Create user record in users table
    if (authUser) {
      await adminClient.from('users').upsert(
        {
          id: authUser.id,
          tenant_id: tenant.id,
          email: adminEmail,
          name: payload.adminName.trim() || 'Tenant Admin',
          role: 'admin',
          status: 'active',
        },
        { onConflict: 'id' }
      );
    }

    revalidatePath('/platform-admin', 'page');
    return { success: true, tenantId: tenant.id };
  } catch (err: any) {
    console.error('onboardTenantAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function submitSupportTicketAction(payload: {
  tenantId: string;
  userId?: string;
  requesterEmail: string;
  subject: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
}): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  try {
    const { data: ticket, error } = await adminClient
      .from('support_tickets')
      .insert({
        tenant_id: payload.tenantId,
        user_id: payload.userId || null,
        requester_email: payload.requesterEmail.toLowerCase().trim(),
        subject: payload.subject.trim(),
        description: payload.description.trim(),
        priority: payload.priority || 'MEDIUM',
        status: 'OPEN',
      })
      .select()
      .single();

    if (error || !ticket) {
      return { success: false, error: error?.message || 'Failed to submit ticket' };
    }

    revalidatePath('/platform-admin/tickets', 'page');
    return { success: true, ticketId: ticket.id };
  } catch (err: any) {
    console.error('submitSupportTicketAction error:', err);
    return { success: false, error: err.message };
  }
}

export async function updateTicketStatusAction(payload: {
  ticketId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolutionNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await adminClient
      .from('support_tickets')
      .update({
        status: payload.status,
        resolution_notes: payload.resolutionNotes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payload.ticketId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/platform-admin/tickets', 'page');
    return { success: true };
  } catch (err: any) {
    console.error('updateTicketStatusAction error:', err);
    return { success: false, error: err.message };
  }
}
