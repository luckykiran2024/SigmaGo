'use server';

import { adminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export interface ReferenceSkipData {
  tenantId: string;
  requestId?: string | null;
  categoryId: string;
  stepType: 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS' | 'STRUCTURAL';
  skippedBy: string;
  reason: 'UNRECORDED_RULE' | 'NOT_SURE' | 'NO_RULE';
  describedRule?: string | null;
}

export async function recordReferenceSkipAction(data: ReferenceSkipData) {
  try {
    const { error } = await adminClient
      .from('reference_skips')
      .insert({
        tenant_id: data.tenantId,
        request_id: data.requestId || null,
        category_id: data.categoryId,
        step_type: data.stepType,
        skipped_by: data.skippedBy,
        reason: data.reason,
        described_rule: data.describedRule || null
      });

    if (error) {
      console.error("Error inserting reference_skip:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("recordReferenceSkipAction exception:", err);
    return { success: false, error: err.message };
  }
}

export async function getUnrecordedRulesSkips(tenantId: string) {
  try {
    const { data: skips, error } = await adminClient
      .from('reference_skips')
      .select(`
        id,
        tenant_id,
        request_id,
        category_id,
        step_type,
        skipped_by,
        skipped_at,
        reason,
        described_rule,
        categories ( id, name, domain ),
        users ( id, name, email )
      `)
      .eq('tenant_id', tenantId)
      .order('skipped_at', { ascending: false });

    if (error) {
      console.error("Error fetching unrecorded rules skips:", error);
      return [];
    }

    return skips || [];
  } catch (err) {
    console.error("getUnrecordedRulesSkips exception:", err);
    return [];
  }
}
