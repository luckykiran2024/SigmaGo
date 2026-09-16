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
      description,
      is_locked,
      base_step_type,
      governing_policy_id,
      default_sla_hours,
      current_version_number,
      classification_rules_json,
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
  baseStepType?: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';
  governingPolicyId?: string | null;
  defaultSlaHours?: number | null;
  classificationRulesJson?: Record<string, any>;
  createdBy?: string | null;
}) {
  const baseStepType = payload.baseStepType || 'TRANSACTIONAL';
  
  const { data: res, error } = await adminClient.rpc('sigmago_save_workflow_atomic', {
    p_workflow_id: null,
    p_tenant_id: payload.tenantId,
    p_category_id: payload.categoryId || null,
    p_name: payload.name,
    p_is_locked: payload.isLocked,
    p_steps: payload.steps,
    p_base_step_type: baseStepType,
    p_governing_policy_id: payload.governingPolicyId || null,
    p_default_sla_hours: payload.defaultSlaHours || null,
    p_classification_rules_json: payload.classificationRulesJson || {},
    p_user_id: payload.createdBy || null,
  });

  if (error) {
    console.error('Failed to create workflow atomically via RPC:', error);
    throw new Error(`Failed to create workflow: ${error.message}`);
  }

  return res?.workflow || res;
}

export async function updateWorkflow(
  workflowId: string,
  tenantId: string,
  payload: {
    categoryId: string | null;
    name: string;
    isLocked: boolean;
    steps: WorkflowStep[];
    baseStepType?: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS';
    governingPolicyId?: string | null;
    defaultSlaHours?: number | null;
    classificationRulesJson?: Record<string, any>;
    updatedBy?: string | null;
  }
) {
  const { data: res, error } = await adminClient.rpc('sigmago_save_workflow_atomic', {
    p_workflow_id: workflowId,
    p_tenant_id: tenantId,
    p_category_id: payload.categoryId || null,
    p_name: payload.name,
    p_is_locked: payload.isLocked,
    p_steps: payload.steps,
    p_base_step_type: payload.baseStepType || null,
    p_governing_policy_id: payload.governingPolicyId || null,
    p_default_sla_hours: payload.defaultSlaHours !== undefined ? payload.defaultSlaHours : null,
    p_classification_rules_json: payload.classificationRulesJson || null,
    p_user_id: payload.updatedBy || null,
  });

  if (error) {
    console.error('Failed to update workflow atomically via RPC:', error);
    throw new Error(`Failed to update workflow: ${error.message}`);
  }

  return res?.workflow || res;
}

export async function getActiveWorkflowVersion(workflowId: string, tenantId: string) {
  const { data, error } = await adminClient
    .from('workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('tenant_id', tenantId)
    .is('effective_to', null)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getWorkflowVersions(workflowId: string, tenantId: string) {
  const { data, error } = await adminClient
    .from('workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('tenant_id', tenantId)
    .order('version_number', { ascending: false });

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
    .select('id, name, is_locked, steps, base_step_type, governing_policy_id, default_sla_hours, current_version_number, classification_rules_json')
    .eq('category_id', categoryId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
