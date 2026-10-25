import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from './admin';

export class CrossTenantAccessError extends Error {
  constructor(message = 'Cross-tenant access forbidden: User tenant does not match requested tenant boundary') {
    super(message);
    this.name = 'CrossTenantAccessError';
  }
}

export interface UserTenantContext {
  id: string;
  tenantId: string;
  email?: string;
  role?: string;
}

/**
 * List of multi-tenant tables requiring mandatory tenant_id isolation
 */
const MULTI_TENANT_TABLES = new Set([
  'approval_requests',
  'categories',
  'workflows',
  'workflow_versions',
  'policies',
  'policy_versions',
  'audit_log',
  'decision_events',
  'decision_references',
  'delegations',
  'intelligence_grants',
  'users',
  'attachments',
  'reference_skips',
  'custom_fields',
  'transactional_outbox',
]);

/**
 * Validates that an authenticated user context belongs strictly to the target tenant.
 * Throws CrossTenantAccessError if the user tenant does not match the target tenant.
 */
export function validateTenantAccess(userTenantId: string | null | undefined, targetTenantId: string): void {
  if (!userTenantId || !targetTenantId || userTenantId !== targetTenantId) {
    throw new CrossTenantAccessError(`Tenant boundary violation: User tenant [${userTenantId}] cannot access target tenant [${targetTenantId}]`);
  }
}

/**
 * Creates a restricted tenant-scoped data client for known tenant_id tables.
 * The caller context must come from a verified server session. This is an extra
 * application guard; database RLS and authorization remain authoritative.
 */
export function getTenantClient(
  targetTenantId: string,
  userContext: UserTenantContext
): SupabaseClient {
  if (!targetTenantId || typeof targetTenantId !== 'string') {
    throw new Error('getTenantClient requires a valid non-empty targetTenantId');
  }

  if (!userContext?.id) throw new CrossTenantAccessError('Verified user context is required');
  validateTenantAccess(userContext.tenantId, targetTenantId);

  // Wrap adminClient with a Proxy intercepting .from(tableName)
  return new Proxy(adminClient, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (tableName: string) => {
          const queryBuilder = (target as any).from(tableName);
          if (!MULTI_TENANT_TABLES.has(tableName)) {
            throw new CrossTenantAccessError(`Table ${tableName} is not available through the tenant client`);
          }

          // Proxy the query builder to automatically scope selects, updates, deletes, and inserts
          return new Proxy(queryBuilder, {
            get(qbTarget, qbProp, qbReceiver) {
              if (qbProp === 'select') {
                return (...args: any[]) => {
                  const selectResult = qbTarget.select(...args);
                  // Automatically enforce tenant constraint on select
                  return selectResult.eq('tenant_id', targetTenantId);
                };
              }

              if (qbProp === 'insert') {
                return (values: any, ...options: any[]) => {
                  if (Array.isArray(values)) {
                    const scopedValues = values.map((item) => ({
                      ...item,
                      tenant_id: targetTenantId,
                    }));
                    return qbTarget.insert(scopedValues, ...options);
                  } else if (values && typeof values === 'object') {
                    const scopedValue = {
                      ...values,
                      tenant_id: targetTenantId,
                    };
                    return qbTarget.insert(scopedValue, ...options);
                  }
                  return qbTarget.insert(values, ...options);
                };
              }

              if (qbProp === 'upsert') {
                throw new CrossTenantAccessError('Upsert requires a tenant-aware conflict key and is not available through the tenant client');
              }

              if (qbProp === 'update') {
                return (values: any, ...options: any[]) => {
                  const updateResult = qbTarget.update({ ...values, tenant_id: targetTenantId }, ...options);
                  return updateResult.eq('tenant_id', targetTenantId);
                };
              }

              if (qbProp === 'delete') {
                return (...options: any[]) => {
                  const deleteResult = qbTarget.delete(...options);
                  return deleteResult.eq('tenant_id', targetTenantId);
                };
              }

              throw new CrossTenantAccessError(`Unscoped query operation ${String(qbProp)} is not available`);
            },
          });
        };
      }

      throw new CrossTenantAccessError(`Unscoped service operation ${String(prop)} is not available`);
    },
  });
}

/**
 * Returns a restricted tenant client for a verified administrator context.
 * Callers must obtain actorContext from server-side authentication, not input.
 */
export function getTenantAdminClient(
  targetTenantId: string,
  actorContext: UserTenantContext
): SupabaseClient {
  validateTenantAccess(actorContext.tenantId, targetTenantId);

  const role = (actorContext.role || '').toLowerCase();
  const isAdminOrOwner = role === 'admin' || role === 'owner' || role === 'super_admin';

  if (!isAdminOrOwner) {
    throw new CrossTenantAccessError(`Forbidden: Actor [${actorContext.id}] lacks administrative privileges for tenant [${targetTenantId}]`);
  }

  return getTenantClient(targetTenantId, actorContext);
}
