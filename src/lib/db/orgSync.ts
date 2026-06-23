'use server';

import { adminClient } from '../supabase/admin';

export interface EmployeeRow {
  employee_id: string;
  name: string;
  email: string;
  designation: string;
  career_level: string;
  department: string;
  manager_employee_id: string;
  status: string;
}

export async function syncOrganization(
  tenantId: string,
  employees: EmployeeRow[],
  appliedByUserId?: string
) {
  const created: string[] = [];
  const updated: string[] = [];
  const deactivated: string[] = [];
  const errors: string[] = [];

  const parsedRows: EmployeeRow[] = [];
  const seenEmployeeIds = new Set<string>();
  const seenEmails = new Set<string>();

  for (let idx = 0; idx < employees.length; idx++) {
    const r = employees[idx];
    const empId = (r.employee_id || '').trim();
    const name = (r.name || '').trim();
    const email = (r.email || '').trim().toLowerCase();
    const designation = (r.designation || '').trim();
    const careerLevel = (r.career_level || '').trim();
    const department = (r.department || '').trim();
    const managerId = (r.manager_employee_id || '').trim();
    const status = (r.status || '').trim().toLowerCase();

    if (!empId) {
      errors.push(`Row ${idx + 1}: Missing employee_id`);
      continue;
    }
    if (!email) {
      errors.push(`Row ${idx + 1} (Emp ID: ${empId}): Missing email`);
      continue;
    }
    if (!name) {
      errors.push(`Row ${idx + 1} (Emp ID: ${empId}): Missing name`);
      continue;
    }
    if (seenEmployeeIds.has(empId)) {
      errors.push(`Row ${idx + 1}: Duplicate employee_id ${empId}`);
      continue;
    }
    if (seenEmails.has(email)) {
      errors.push(`Row ${idx + 1}: Duplicate email ${email}`);
      continue;
    }

    seenEmployeeIds.add(empId);
    seenEmails.add(email);

    parsedRows.push({
      employee_id: empId,
      name,
      email,
      designation,
      career_level: careerLevel,
      department,
      manager_employee_id: managerId,
      status: status === 'inactive' ? 'INACTIVE' : 'ACTIVE',
    });
  }

  const { data: existingUsers, error: fetchUsersError } = await adminClient
    .from('users')
    .select('id, employee_id, email, status')
    .eq('tenant_id', tenantId);

  if (fetchUsersError) throw fetchUsersError;

  const usersByEmpId = new Map<string, any>();
  const usersByEmail = new Map<string, any>();
  for (const u of existingUsers || []) {
    if (u.employee_id) usersByEmpId.set(u.employee_id, u);
    if (u.email) usersByEmail.set(u.email.toLowerCase(), u);
  }

  for (const row of parsedRows) {
    let existingUser = usersByEmpId.get(row.employee_id);
    if (!existingUser) {
      existingUser = usersByEmail.get(row.email);
    }

    const isDeactivating = row.status === 'INACTIVE' && (!existingUser || existingUser.status === 'active' || existingUser.status === 'ACTIVE');

    if (existingUser) {
      const { error: updateError } = await adminClient
        .from('users')
        .update({
          name: row.name,
          email: row.email,
          designation: row.designation,
          career_level: row.career_level,
          department: row.department,
          manager_employee_id: row.manager_employee_id || null,
          employee_id: row.employee_id,
          status: row.status.toLowerCase(),
          hrms_employee_id: row.employee_id
        })
        .eq('id', existingUser.id);

      if (updateError) {
        errors.push(`Emp ID ${row.employee_id}: Update failed - ${updateError.message}`);
        continue;
      }

      updated.push(row.employee_id);
      if (isDeactivating) {
        deactivated.push(existingUser.id);
      }
    } else {
      const { data: newUser, error: insertError } = await adminClient
        .from('users')
        .insert({
          tenant_id: tenantId,
          email: row.email,
          name: row.name,
          designation: row.designation,
          career_level: row.career_level,
          department: row.department,
          manager_employee_id: row.manager_employee_id || null,
          employee_id: row.employee_id,
          status: row.status.toLowerCase(),
          hrms_employee_id: row.employee_id,
          role: 'member'
        })
        .select()
        .single();

      if (insertError) {
        errors.push(`Emp ID ${row.employee_id}: Insert failed - ${insertError.message}`);
        continue;
      }

      created.push(row.employee_id);
      if (isDeactivating) {
        deactivated.push(newUser.id);
      }
    }
  }

  for (const userId of deactivated) {
    // Archive requests raised by the user who is deactivating
    await adminClient
      .from('approval_requests')
      .update({ archived: true })
      .eq('owner_id', userId);

    await adminClient
      .from('delegations')
      .update({ status: 'revoked' })
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .or(`delegator_id.eq.${userId},delegate_id.eq.${userId}`);

    const { data: pendingSteps } = await adminClient
      .from('approval_steps')
      .select('id, request_id, approval_requests(id, owner_id)')
      .eq('approver_id', userId)
      .eq('status', 'pending');

    for (const step of pendingSteps || []) {
      const requestId = step.request_id;

      await adminClient
        .from('approval_requests')
        .update({ status: 'blocked' })
        .eq('id', requestId);

      await adminClient.from('audit_log').insert({
        tenant_id: tenantId,
        request_id: requestId,
        actor_id: appliedByUserId || userId,
        action_type: 'request_blocked',
        metadata: {
          reason: 'Approver became inactive',
          inactive_approver_id: userId,
          step_id: step.id
        }
      });
    }
  }

  const { data: allUsers } = await adminClient
    .from('users')
    .select('id, employee_id, manager_employee_id, designation, status')
    .eq('tenant_id', tenantId);

  const { data: existingNodes } = await adminClient
    .from('org_nodes')
    .select('id, user_id')
    .eq('tenant_id', tenantId);

  const nodeMap = new Map<string, string>();
  for (const node of existingNodes || []) {
    nodeMap.set(node.user_id, node.id);
  }

  for (const user of allUsers || []) {
    if (!nodeMap.has(user.id)) {
      const { data: newNode, error: nodeInsertError } = await adminClient
        .from('org_nodes')
        .insert({
          tenant_id: tenantId,
          user_id: user.id,
          title: user.designation || 'Staff',
          sort_order: 0
        })
        .select()
        .single();

      if (!nodeInsertError && newNode) {
        nodeMap.set(user.id, newNode.id);
      }
    }
  }

  const empIdToNodeId = new Map<string, string>();
  for (const user of allUsers || []) {
    const nodeId = nodeMap.get(user.id);
    if (nodeId && user.employee_id) {
      empIdToNodeId.set(user.employee_id, nodeId);
    }
  }

  for (const user of allUsers || []) {
    const nodeId = nodeMap.get(user.id);
    if (!nodeId) continue;

    let parentNodeId: string | null = null;
    if (user.manager_employee_id) {
      parentNodeId = empIdToNodeId.get(user.manager_employee_id) || null;
    }

    await adminClient
      .from('org_nodes')
      .update({
        parent_id: parentNodeId,
        title: user.designation || 'Staff'
      })
      .eq('id', nodeId);
  }

  const syncSummary = {
    created_count: created.length,
    updated_count: updated.length,
    deactivated_count: deactivated.length,
    errors_count: errors.length,
    errors: errors.slice(0, 100)
  };

  await adminClient.from('hrms_sync_log').insert({
    tenant_id: tenantId,
    source: appliedByUserId ? 'csv' : 'json',
    changes: syncSummary,
    applied_by: appliedByUserId || null
  });

  return {
    success: errors.length === 0 || created.length + updated.length > 0,
    created: created.length,
    updated: updated.length,
    deactivated: deactivated.length,
    errors
  };
}
