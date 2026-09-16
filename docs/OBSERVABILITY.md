# SigmaGo Production Observability Architecture

This document describes the vendor-neutral observability architecture for SigmaGo, including OpenTelemetry tracing, operational metrics, privacy-safe structured logging, and alert routing.

---

## 1. Observability Principles

1. **Vendor-Neutrality**: Application code exports telemetry via standard OpenTelemetry OTLP (`http/protobuf` on `:4318` or `grpc` on `:4317`). No vendor lock-in to Datadog, New Relic, or Sentry.
2. **Failure Invariance**: Telemetry must **never** be on the critical transaction path. If the OTel Collector, Prometheus, or Tempo is offline or slow, all decision approvals, sealing, and workflows continue uninterrupted.
3. **Zero Decision Content Leaks**: Customer reasoning, justification, comments, decision subjects, email HTML, and personal credentials are never stored in traces or logs.
4. **Low Cardinality in Metrics**: Request IDs, User IDs, Employee IDs, and Tenant IDs are omitted from Prometheus/OTel metric dimensions to prevent timeseries explosion.

---

## 2. Telemetry Pipeline Architecture

```
SigmaGo Web & Worker Processes
         │
         │  (OTLP / HTTP Protobuf on :4318)
         ▼
OpenTelemetry Collector (:4318)
         │
         ├──────────────────────────┬──────────────────────────┐
         ▼                          ▼                          ▼
[ Prometheus (:8889) ]      [ Tempo (:4317) ]       [ Structured Logs ]
  Metrics Exporter            Traces Storage         JSON to stdout
         │                          │                          │
         └─────────────┬────────────┘                          ▼
                       ▼                              Coolify Log Drain
               [ Grafana UI ]                         (or external sink)
```

---

## 3. Operational Metrics Catalog

| Metric Name | Type | Dimensions | Description |
| :--- | :--- | :--- | :--- |
| `sigmago.approval.actions` | Counter | `outcome`, `step_type` | Total approval actions processed |
| `sigmago.approval.rpc.duration` | Histogram | `step_type` | Latency of atomic Postgres approval RPC |
| `sigmago.approval.rpc.failures` | Counter | None | Failures in approval RPC |
| `sigmago.seal.attempts` | Counter | None | Number of seal generation attempts |
| `sigmago.seal.duration` | Histogram | None | Time taken to compute SHA-256 canonical hash & sign |
| `sigmago.seal.failures` | Counter | None | Failures in seal generation |
| `sigmago.seal.verification_failures` | Counter | None | **Critical**: Decision cryptographic seal mismatches |
| `sigmago.queue.enqueued` | Counter | `queue_name` | Total jobs enqueued to BullMQ |
| `sigmago.queue.completed` | Counter | `queue_name` | Total BullMQ jobs completed |
| `sigmago.queue.failed` | Counter | `queue_name` | Total BullMQ jobs failed |
| `sigmago.worker.heartbeat` | Gauge | `worker` | Heartbeat emitted by background worker |
| `sigmago.job.runs` | Counter | `job_name` | Executions of scheduled CLI tasks |
| `sigmago.job.failures` | Counter | `job_name` | Failures in scheduled CLI tasks |
| `sigmago.job.duration` | Histogram | `job_name` | Duration of scheduled CLI tasks |
| `sigmago.cross_tenant_violations` | Counter | None | Cross-tenant access attempt alerts |

---

## 4. Structured Logging Specification

Logs are emitted to `stdout` as newline-delimited JSON with the following structure:

```json
{
  "timestamp": "2026-09-16T04:45:00.000Z",
  "level": "info",
  "service": "sigmago-web",
  "environment": "production",
  "message": "Processed approval action successfully",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "correlationId": "req-2026-0123",
  "durationMs": 42
}
```

Every log record is scrubbed through `src/lib/observability/redaction.ts` prior to serialization.
