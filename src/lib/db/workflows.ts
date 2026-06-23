'use server';

import { adminClient } from '../supabase/admin';

export interface WorkflowStep {
  userId: string;
  role: 'GENERAL' | 'PARALLEL' | 'REFERENCE';
}

export interface Workflow {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  is_locked: boolean;
  steps: WorkflowStep[];
  created_at: string;
}

export async function getWorkflows(tenantId: string) {
  const { data, error } = await adminClient
    .from('workflows')
    .select(`
      id,
      tenant_id,
      category_id,
      name,
      is_locked,
      steps,
      created_at,
      categories:categories ( id, name )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createWorkflow(payload: {
  tenantId: string;
  categoryId: string | null;
  name: string;
  isLocked: boolean;
  steps: WorkflowStep[];
}) {
  const { data, error } = await adminClient
    .from('workflows')
    .insert({
      tenant_id: payload.tenantId,
      category_id: payload.categoryId,
      name: payload.name,
      is_locked: payload.isLocked,
      steps: payload.steps
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateWorkflow(
  workflowId: string,
  tenantId: string,
  payload: {
    categoryId: string | null;
    name: string;
    isLocked: boolean;
    steps: WorkflowStep[];
  }
) {
  const { data, error } = await adminClient
    .from('workflows')
    .update({
      category_id: payload.categoryId,
      name: payload.name,
      is_locked: payload.isLocked,
      steps: payload.steps
    })
    .eq('id', workflowId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteWorkflow(workflowId: string, tenantId: string) {
  const { error } = await adminClient
    .from('workflows')
    .delete()
    .eq('id', workflowId)
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return true;
}

export async function getWorkflowForCategory(categoryId: string, tenantId: string) {
  const { data, error } = await adminClient
    .from('workflows')
    .select('id, name, is_locked, steps')
    .eq('category_id', categoryId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
