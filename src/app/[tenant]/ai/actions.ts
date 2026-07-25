'use server';

import { createClient } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { getProfileForAuthUser } from '@/lib/db/users';
import { resolveUserIntent } from '@/lib/ai/intentResolver';
import { executeTemplateQuery, AiQueryResult } from '@/lib/ai/templates';

export async function askAiAssistantAction(
  tenantSubdomain: string,
  question: string
): Promise<{ intent: any; result: AiQueryResult }> {
  if (!question || !question.trim()) {
    throw new Error('Please enter a question');
  }

  // 1. Authenticate user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const profile = await getProfileForAuthUser(user.id, user.email || '');
  if (!profile) throw new Error('User profile not found');

  // 2. Resolve tenant ID securely from session
  const { data: tenantData } = await adminClient
    .from('tenants')
    .select('id')
    .eq('subdomain', tenantSubdomain)
    .single();

  if (!tenantData) throw new Error('Tenant not found');

  // 3. Resolve Intent & Extract Parameters
  const intent = await resolveUserIntent(question, tenantData.id);

  // 4. Execute Parameterized Query Template
  const result = await executeTemplateQuery(
    intent.templateId,
    tenantData.id,
    tenantSubdomain,
    intent.params
  );

  // 5. Log Audit Entry for AI Query Analytics
  await adminClient.from('audit_log').insert({
    tenant_id: tenantData.id,
    actor_id: profile.id,
    action_type: 'ai_query',
    metadata: {
      question: question.trim(),
      template_id: intent.templateId,
      confidence: intent.confidence,
      result_count: result.count
    }
  });

  return { intent, result };
}
