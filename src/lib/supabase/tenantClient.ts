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
 * Creates a tenant-scoped Supabase client that guarantees tenant isolation in application space.
 * Prevents unintentional cross-tenant leakage even when service-role credentials are used.
 */
export function getTenantClient(
  targetTenantId: string,
  userContext?: UserTenantContext
): SupabaseClient {
  if (!targetTenantId || typeof targetTenantId !== 'string') {
    throw new Error('getTenantClient requires a valid non-empty targetTenantId');
  }

  if (userContext) {
    validateTenantAccess(userContext.tenantId, targetTenantId);
  }

  // Wrap adminClient with a Proxy intercepting .from(tableName)
  return new Proxy(adminClient, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (tableName: string) => {
          const queryBuilder = (target as any).from(tableName);
          const isMultiTenant = MULTI_TENANT_TABLES.has(tableName);

          if (!isMultiTenant) {
            return queryBuilder;
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

              if (qbProp === 'update') {
                return (values: any, ...options: any[]) => {
                  const updateResult = qbTarget.update(values, ...options);
                  return updateResult.eq('tenant_id', targetTenantId);
                };
              }

              if (qbProp === 'delete') {
                return (...options: any[]) => {
                  const deleteResult = qbTarget.delete(...options);
                  return deleteResult.eq('tenant_id', targetTenantId);
                };
              }

              const orig = qbTarget[qbProp];
              if (typeof orig === 'function') {
                return orig.bind(qbTarget);
              }
              return orig;
            },
          });
        };
      }

      const value = (target as any)[prop];
      if (typeof value === 'function') {
        return value.bind(target);
      }
      return value;
    },
  });
}

/**
 * Returns an elevated tenant-scoped admin client for workspace administrators.
 * Requires caller identity verification with admin or owner role.
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
