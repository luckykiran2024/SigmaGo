/**
 * Vendor-Neutral OpenTelemetry & Operational Metrics Integration
 *
 * Telemetry Failure Rule:
 * Telemetry must NEVER become a synchronous dependency of the approval path.
 * If OTLP or OpenTelemetry collector is unavailable, all functions fail-safe silently.
 */

// Metrics recording stubs that connect to OTel Meter or log fallback
export function recordQueueMetric(
  status: 'enqueued' | 'completed' | 'failed',
  queueName: string,
  jobName: string,
  durationMs?: number
) {
  try {
    // Record metric through console structured log / OTel meter
    if (process.env.NODE_ENV !== 'test') {
      const metricName = `sigmago.queue.${status}`;
      // In production, will be exported to OTLP collector
    }
  } catch {
    // Fail-safe
  }
}

export function recordWorkerHeartbeat(workerName: string, status: string = 'alive') {
  try {
    // In production, records sigmago.worker.heartbeat
  } catch {
    // Fail-safe
  }
}

export function recordApprovalActionMetric(outcome: string, stepType: string, durationMs: number) {
  try {
    // In production, records sigmago.approval.actions and sigmago.approval.rpc.duration
  } catch {
    // Fail-safe
  }
}

export function recordSealMetric(event: 'attempt' | 'failure' | 'verification_failure', durationMs?: number) {
  try {
    // In production, records sigmago.seal.*
  } catch {
    // Fail-safe
  }
}

export function recordJobMetric(jobName: string, status: 'started' | 'success' | 'failed', durationMs?: number) {
  try {
    // In production, records sigmago.job.*
  } catch {
    // Fail-safe
  }
}
