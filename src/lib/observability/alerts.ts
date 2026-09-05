/**
 * Enterprise Production Observability & Alerting Subsystem (Sprint 7)
 *
 * Provides structured logging and alerts for critical platform invariants:
 * - Approval RPC failures
 * - Seal computation & verification failures
 * - Cross-tenant authorization violations
 * - Outbox backlog & lag monitoring
 * - Aggregate worker processing failures
 * - Stale 'FINALIZING' requests threshold breaches (> 5 minutes)
 */

import { adminClient } from '@/lib/supabase/admin';
import { alertSealFailure, beforeSend, SentryEvent } from './sentry';

export interface AlertContext {
  tenantId?: string;
  requestId?: string;
  actorId?: string;
  [key: string]: any;
}

export function emitPlatformAlert(
  severity: 'fatal' | 'error' | 'warning' | 'info',
  category:
    | 'APPROVAL_RPC_FAILURE'
    | 'SEAL_FAILURE'
    | 'SEAL_VERIFICATION_FAILURE'
    | 'CROSS_TENANT_VIOLATION'
    | 'OUTBOX_BACKLOG'
    | 'AGGREGATE_WORKER_FAILURE'
    | 'STALE_FINALIZING_REQUEST',
  message: string,
  context?: AlertContext
): SentryEvent {
  const event: SentryEvent = {
    event_id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    level: severity,
    message: `[${category}] ${message}`,
    tags: {
      alert_category: category,
      alert_severity: severity,
      tenant_id: context?.tenantId || 'platform',
      request_id: context?.requestId || 'none',
    },
    extra: context || {},
  };

  const scrubbed = beforeSend(event);
  const jsonOutput = JSON.stringify(scrubbed);

  if (severity === 'fatal' || severity === 'error') {
    console.error(`🚨 ALERT ${category}:`, jsonOutput);
  } else {
    console.warn(`⚠️ ALERT ${category}:`, jsonOutput);
  }

  return scrubbed || event;
}

/**
 * 1. Alert: Approval RPC failure
 */
export function alertApprovalRpcFailure(requestId: string, tenantId: string, error: string) {
  return emitPlatformAlert('error', 'APPROVAL_RPC_FAILURE', `Atomic approval RPC failed: ${error}`, {
    requestId,
    tenantId,
    error,
  });
}

/**
 * 2. Alert: Seal generation failure
 */
export function alertSealGenerationFailure(requestId: string, tenantId: string, error: string) {
  alertSealFailure(`Seal generation failure: ${error}`, { requestId, tenantId });
  return emitPlatformAlert('fatal', 'SEAL_FAILURE', `Cryptographic seal generation failed: ${error}`, {
    requestId,
    tenantId,
    error,
  });
}

/**
 * 3. Alert: Seal verification failure
 */
export function alertSealVerificationMismatch(requestId: string, tenantId: string, calculatedHash: string, recordedHash: string) {
  return emitPlatformAlert('fatal', 'SEAL_VERIFICATION_FAILURE', 'Cryptographic decision seal mismatch detected on verification.', {
    requestId,
    tenantId,
    calculatedHash,
    recordedHash,
  });
}

/**
 * 4. Alert: Cross-tenant authorization violation
 */
export function alertCrossTenantViolation(actorId: string, attemptedTenantId: string, actualTenantId: string) {
  return emitPlatformAlert(
    'error',
    'CROSS_TENANT_VIOLATION',
    `User ${actorId} belonging to ${actualTenantId} attempted unauthorized access to tenant ${attemptedTenantId}`,
    {
      actorId,
      attemptedTenantId,
      actualTenantId,
    }
  );
}

/**
 * 5. Monitor: Outbox backlog and oldest pending event age
 */
export async function monitorOutboxBacklog(thresholdCount = 100, thresholdAgeMinutes = 10) {
  try {
    const { count: pendingCount } = await adminClient
      .from('transactional_outbox')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING');

    const { data: oldestEvent } = await adminClient
      .from('transactional_outbox')
      .select('created_at')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let oldestAgeMinutes = 0;
    if (oldestEvent?.created_at) {
      oldestAgeMinutes = (Date.now() - new Date(oldestEvent.created_at).getTime()) / (1000 * 60);
    }

    if ((pendingCount || 0) > thresholdCount || oldestAgeMinutes > thresholdAgeMinutes) {
      emitPlatformAlert(
        'warning',
        'OUTBOX_BACKLOG',
        `Transactional outbox backlog exceeded threshold: ${pendingCount} pending events, oldest is ${Math.round(oldestAgeMinutes)} minutes old.`,
        {
          pendingCount,
          oldestAgeMinutes: Math.round(oldestAgeMinutes),
        }
      );
    }

    return { pendingCount: pendingCount || 0, oldestAgeMinutes };
  } catch (err: any) {
    console.error('Error monitoring outbox backlog:', err.message);
    return { pendingCount: 0, oldestAgeMinutes: 0 };
  }
}

/**
 * 6. Alert: Aggregate worker failure
 */
export function alertAggregateWorkerFailure(workerName: string, error: string, tenantId?: string) {
  return emitPlatformAlert('error', 'AGGREGATE_WORKER_FAILURE', `Background worker ${workerName} failed: ${error}`, {
    workerName,
    tenantId,
    error,
  });
}

/**
 * 7. Monitor: Stale requests in 'FINALIZING' status (> 5 minutes)
 */
export async function checkStaleFinalizingRequests(thresholdMinutes = 5) {
  try {
    const cutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

    const { data: staleRequests } = await adminClient
      .from('approval_requests')
      .select('id, tenant_id, created_at, status')
      .eq('status', 'FINALIZING')
      .lt('created_at', cutoffTime);

    if (staleRequests && staleRequests.length > 0) {
      for (const req of staleRequests) {
        emitPlatformAlert(
          'fatal',
          'STALE_FINALIZING_REQUEST',
          `Request ${req.id} in tenant ${req.tenant_id} has been in 'FINALIZING' state for > ${thresholdMinutes} minutes without completing cryptographic seal.`,
          {
            requestId: req.id,
            tenantId: req.tenant_id,
            status: req.status,
            createdAt: req.created_at,
          }
        );
      }
    }

    return staleRequests || [];
  } catch (err: any) {
    console.error('Error inspecting stale finalizing requests:', err.message);
    return [];
  }
}
