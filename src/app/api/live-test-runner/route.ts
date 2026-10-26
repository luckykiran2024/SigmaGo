import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/supabase/admin';
import { SCENARIOS_100, ScenarioDefinition } from '@/lib/testing/scenarios100';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, scenarioId, tenant = 'meridian' } = body;

    // Resolve tenant
    const { data: tenantData } = await adminClient
      .from('tenants')
      .select('id')
      .eq('subdomain', tenant)
      .single();

    if (!tenantData) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantId = tenantData.id;

    // 1. Reset Action
    if (action === 'reset') {
      await adminClient.from('decision_references').delete().eq('tenant_id', tenantId);
      
      const { data: existingReqs } = await adminClient
        .from('approval_requests')
        .select('id')
        .eq('tenant_id', tenantId);

      const reqIds = (existingReqs || []).map(r => r.id);
      if (reqIds.length > 0) {
        await adminClient.from('audit_log').delete().in('request_id', reqIds);
        await adminClient.from('comments').delete().in('request_id', reqIds);
        await adminClient.from('custom_field_values').delete().in('request_id', reqIds);
        await adminClient.from('action_tokens').delete().in('request_id', reqIds);
        await adminClient.from('approval_steps').delete().in('request_id', reqIds);
        await adminClient.from('approval_requests').delete().eq('tenant_id', tenantId);
      }

      return NextResponse.json({ success: true, message: 'All test data purged cleanly.' });
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
      const checksum = s.status === 'approved'
        ? crypto.createHash('sha256').update(`${s.ref}-${s.subject}-${tenantId}-canonical-sealed-2026-v2`).digest('hex')
        : null;

      const isFinalized = s.status === 'approved' || s.status === 'rejected';
      const daysAgo = 10 + Math.floor((s.id / 100) * 80);
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
      const finalizedAt = isFinalized ? new Date(Date.now() - (daysAgo - 2) * 86400000).toISOString() : null;

      // Insert Approval Request
      const { error: reqErr } = await adminClient
        .from('approval_requests')
        .insert({
          id: reqId,
          ref: s.ref,
          tenant_id: tenantId,
          owner_id: requester?.id,
          category_id: matchedCat?.id,
          subject: `${s.subject} (${s.amount})`,
          status: s.status,
          resolved_step_type: s.type,
          baseline_step_type: s.type,
          checksum_sha256: checksum,
          finalized_at: finalizedAt,
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

      await adminClient.from('approval_steps').insert({
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

      // Stage 2 Step for Approved Decisions (Executive Authority Seal by CEO Vijay Reddy)
      if (s.status === 'approved') {
        const step2Id = crypto.randomUUID();
        const ceo = (users || []).find(u => u.email === 'vijay.reddy@meridian.com') || defaultUser;
        const step2EnteredAt = new Date(Date.now() - (daysAgo - 1) * 86400000).toISOString();
        const step2ActedAt = finalizedAt;

        await adminClient.from('approval_steps').insert({
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
      }

      // Audit Log
      await adminClient.from('audit_log').insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        request_id: reqId,
        actor_id: requester?.id,
        action: 'REQUEST_CREATED',
        details: { ref: s.ref, subject: s.subject, step_type: s.type, amount: s.amount },
        created_at: createdAt
      });

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
        checksum: checksum ? checksum.substring(0, 16) + '...' : 'N/A',
        fullChecksum: checksum,
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
  } catch (err: any) {
    console.error('Error in live-test-runner API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
