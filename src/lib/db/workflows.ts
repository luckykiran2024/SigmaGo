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
  const { data: workflow, error } = await adminClient
    .from('workflows')
    .insert({
      tenant_id: payload.tenantId,
      category_id: payload.categoryId,
      name: payload.name,
      is_locked: payload.isLocked,
      steps: payload.steps,
      base_step_type: baseStepType,
      governing_policy_id: payload.governingPolicyId || null,
      default_sla_hours: payload.defaultSlaHours || null,
      classification_rules_json: payload.classificationRulesJson || {},
      current_version_number: 1,
    })
    .select()
    .single();

  if (error) throw error;

  // Create immutable initial version (Version 1)
  const { error: verError } = await adminClient
    .from('workflow_versions')
    .insert({
      tenant_id: payload.tenantId,
      workflow_id: workflow.id,
      version_number: 1,
      name_snapshot: payload.name,
      category_id_snapshot: payload.categoryId,
      base_step_type: baseStepType,
      governing_policy_id_snapshot: payload.governingPolicyId || null,
      steps_json: payload.steps,
      classification_rules_json: payload.classificationRulesJson || {},
      default_sla_hours: payload.defaultSlaHours || null,
      created_by: payload.createdBy || null,
      effective_from: new Date().toISOString(),
    });

  if (verError) {
    console.error('Failed to create initial workflow_version:', verError);
  }

  return workflow;
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
  // 1. Fetch current workflow to determine current version number
  const { data: current, error: fetchErr } = await adminClient
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !current) throw new Error('Workflow not found');

  const currentVersion = current.current_version_number || 1;
  const nextVersionNumber = currentVersion + 1;
  const now = new Date().toISOString();
  const baseStepType = payload.baseStepType || current.base_step_type || 'TRANSACTIONAL';

  // 2. Expire the current active version snapshot
  await adminClient
    .from('workflow_versions')
    .update({ effective_to: now })
    .eq('workflow_id', workflowId)
    .eq('tenant_id', tenantId)
    .is('effective_to', null);

  // 3. Insert new immutable version snapshot (Version N+1)
  const { error: verErr } = await adminClient
    .from('workflow_versions')
    .insert({
      tenant_id: tenantId,
      workflow_id: workflowId,
      version_number: nextVersionNumber,
      name_snapshot: payload.name,
      category_id_snapshot: payload.categoryId,
      base_step_type: baseStepType,
      governing_policy_id_snapshot: payload.governingPolicyId || current.governing_policy_id || null,
      steps_json: payload.steps,
      classification_rules_json: payload.classificationRulesJson || current.classification_rules_json || {},
      default_sla_hours: payload.defaultSlaHours !== undefined ? payload.defaultSlaHours : current.default_sla_hours,
      created_by: payload.updatedBy || null,
      effective_from: now,
    });

  if (verErr) {
    console.error('Failed to create new workflow_version:', verErr);
  }

  // 4. Update the parent workflow record
  const { data, error } = await adminClient
    .from('workflows')
    .update({
      category_id: payload.categoryId,
      name: payload.name,
      is_locked: payload.isLocked,
      steps: payload.steps,
      base_step_type: baseStepType,
      governing_policy_id: payload.governingPolicyId !== undefined ? payload.governingPolicyId : current.governing_policy_id,
      default_sla_hours: payload.defaultSlaHours !== undefined ? payload.defaultSlaHours : current.default_sla_hours,
      classification_rules_json: payload.classificationRulesJson || current.classification_rules_json || {},
      current_version_number: nextVersionNumber,
      updated_at: now,
    })
    .eq('id', workflowId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
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
