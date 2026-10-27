import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { SCENARIOS_100, ScenarioDefinition } from '@/lib/testing/scenarios100';
import { requireTenantAdmin } from '@/lib/auth/guards';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    if (process.env.VERCEL_ENV === 'production' || process.env.ENABLE_LIVE_TEST_RUNNER !== 'true') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { action, scenarioId, tenant, confirmation } = body;

    if (typeof tenant !== 'string' || !tenant.trim()) {
      return NextResponse.json({ error: 'Tenant is required' }, { status: 400 });
    }

    const allowedTenants = (process.env.LIVE_TEST_TENANT_ALLOWLIST || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    if (!allowedTenants.includes(tenant)) {
      return NextResponse.json({ error: 'Live testing is not enabled for this tenant' }, { status: 403 });
    }

    const guard = await requireTenantAdmin(tenant);

    const tenantId = guard.tenantId;

    // 1. Reset Action
    if (action === 'reset') {
      if (confirmation !== 'PURGE_SYNTHETIC_QA_DATA') {
        return NextResponse.json({ error: 'Explicit reset confirmation is required' }, { status: 400 });
      }

      const { data: existingReqs } = await adminClient
        .from('approval_requests')
        .select('id')
        .eq('tenant_id', tenantId)
        .like('ref', 'QA-LIVE-%');

      const reqIds = (existingReqs || []).map(r => r.id);
      if (reqIds.length > 0) {
        const deletions = [
          adminClient.from('decision_references').delete().eq('tenant_id', tenantId).in('source_id', reqIds),
          adminClient.from('decision_references').delete().eq('tenant_id', tenantId).in('target_id', reqIds),
          adminClient.from('audit_log').delete().in('request_id', reqIds),
          adminClient.from('comments').delete().in('request_id', reqIds),
          adminClient.from('custom_field_values').delete().in('request_id', reqIds),
          adminClient.from('action_tokens').delete().in('request_id', reqIds),
          adminClient.from('approval_steps').delete().in('request_id', reqIds),
        ];
        for (const deletion of deletions) {
          const { error } = await deletion;
          if (error) throw new Error('Synthetic QA cleanup failed');
        }
        const { error: requestDeleteError } = await adminClient
          .from('approval_requests')
          .delete()
          .eq('tenant_id', tenantId)
          .in('id', reqIds);
        if (requestDeleteError) throw new Error('Synthetic QA cleanup failed');
      }

      return NextResponse.json({ success: true, message: 'Synthetic QA fixtures purged.', deleted: reqIds.length });
    }

    // 2. Execute a single scenario or batch
    const { data: categories } = await adminClient
      .from('categories')
      .select('id, name, step_type')
      .eq('tenant_id', tenantId);

    const { data: users } = await adminClient
      .from('users')
      .select('id, email, name, role')
      .eq('tenant_id', tenantId);

    const userMap = new Map((users || []).map(u => [u.email.toLowerCase(), u]));
    const defaultUser = users?.[0];

    const executeOneScenario = async (s: ScenarioDefinition) => {
      const startTime = Date.now();
      const matchedCat = (categories || []).find(c => c.step_type === s.type) || categories?.[0];
      const requester = userMap.get(s.requesterEmail.toLowerCase()) || defaultUser;
      const approver = userMap.get(s.approverEmail.toLowerCase()) || defaultUser;

      const reqId = crypto.randomUUID();
      const daysAgo = 10 + Math.floor((s.id / 100) * 80);
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

      // Insert Approval Request
      const { error: reqErr } = await adminClient
        .from('approval_requests')
        .insert({
          id: reqId,
          ref: `QA-LIVE-${s.ref}`,
          tenant_id: tenantId,
          owner_id: requester?.id,
          category_id: matchedCat?.id,
          subject: `${s.subject} (${s.amount})`,
          status: s.status,
          resolved_step_type: s.type,
          baseline_step_type: s.type,
          checksum_sha256: null,
          finalized_at: null,
          created_at: createdAt
        });

      if (reqErr) {
        throw new Error(`Failed to create request: ${reqErr.message}`);
      }

      // Stage 1 Step
      const step1Id = crypto.randomUUID();
      const step1Status = s.status === 'approved' ? 'approved' : (s.status === 'rejected' ? 'rejected' : 'pending');
      const step1EnteredAt = createdAt;
      const step1ActedAt = step1Status !== 'pending' ? new Date(Date.now() - (daysAgo - 1) * 86400000).toISOString() : null;

      const { error: step1Error } = await adminClient.from('approval_steps').insert({
        id: step1Id,
        request_id: reqId,
        order_index: 1,
        stage_index: 1,
        approver_id: approver?.id,
        type: 'GENERAL',
        status: step1Status,
        comment: s.comment,
        entered_at: step1EnteredAt,
        acted_at: step1ActedAt
      });
      if (step1Error) {
        await adminClient.from('approval_requests').delete().eq('id', reqId).eq('tenant_id', tenantId);
        throw new Error('Synthetic QA step creation failed');
      }

      // Stage 2 Step for Approved Decisions (Executive Authority Seal by CEO Vijay Reddy)
      if (s.status === 'approved') {
        const step2Id = crypto.randomUUID();
        const ceo = (users || []).find(u => u.email === 'vijay.reddy@meridian.com') || defaultUser;
        const step2EnteredAt = new Date(Date.now() - (daysAgo - 1) * 86400000).toISOString();
        const step2ActedAt = new Date(Date.now() - (daysAgo - 2) * 86400000).toISOString();

        const { error: step2Error } = await adminClient.from('approval_steps').insert({
          id: step2Id,
          request_id: reqId,
          order_index: 2,
          stage_index: 2,
          approver_id: ceo?.id,
          type: 'GENERAL',
          status: 'approved',
          comment: 'Executive Authority Seal: Strategic alignment and governance compliance confirmed. Cryptographic seal issued.',
          entered_at: step2EnteredAt,
          acted_at: step2ActedAt
        });
        if (step2Error) {
          await adminClient.from('approval_requests').delete().eq('id', reqId).eq('tenant_id', tenantId);
          throw new Error('Synthetic QA step creation failed');
        }
      }

      // Audit Log
      const { error: auditError } = await adminClient.from('audit_log').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        request_id: reqId,
        actor_id: requester?.id,
        action: 'REQUEST_CREATED',
        details: { ref: s.ref, subject: s.subject, step_type: s.type, amount: s.amount },
        created_at: createdAt
      });
      if (auditError) {
        await adminClient.from('approval_requests').delete().eq('id', reqId).eq('tenant_id', tenantId);
        throw new Error('Synthetic QA audit creation failed');
      }

      const durationMs = Date.now() - startTime;

      return {
        id: s.id,
        ref: s.ref,
        subject: s.subject,
        type: s.type,
        dept: s.dept,
        amount: s.amount,
        requesterEmail: s.requesterEmail,
        approverEmail: s.approverEmail,
        status: s.status,
        checksum: 'UNSEALED SYNTHETIC FIXTURE',
        fullChecksum: null,
        evidenceStatus: 'SYNTHETIC_NOT_CRYPTOGRAPHICALLY_VERIFIED',
        requestId: reqId,
        durationMs
      };
    };

    if (action === 'execute-scenario' && typeof scenarioId === 'number') {
      const s = SCENARIOS_100.find(item => item.id === scenarioId);
      if (!s) {
        return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
      }
      const result = await executeOneScenario(s);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'execute-all') {
      const results = [];
      for (const s of SCENARIOS_100) {
        const r = await executeOneScenario(s);
        results.push(r);
      }
      return NextResponse.json({ success: true, count: results.length, results });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Error in live-test-runner API:', err);
    const message = err instanceof Error ? err.message : '';
    if (message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Tenant administrator access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Live test operation failed' }, { status: 500 });
  }
}

