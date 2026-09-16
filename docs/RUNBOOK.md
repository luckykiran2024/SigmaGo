# SigmaGo Operations & Incident Runbook

This runbook guides operators through common alerts, incident mitigation, and operational diagnostics for SigmaGo in Coolify.

---

## 1. Alert Triage Matrix

### Severity 1: Critical Alerts

#### Alert: `SEAL_VERIFICATION_FAILURE`
- **Symptom**: `sigmago.seal.verification_failures` metric > 0.
- **Meaning**: A decision record in the ledger has a canonical hash that does not match its recorded SHA-256 seal. This indicates potential data tampering or an altered canonical payload.
- **Actions**:
  1. Identify the affected decision using correlation logs (`requestId`).
  2. Inspect `approval_requests.checksum_sha256` and the raw signed payload in `decision_events`.
  3. Verify whether private signing keys or canonicalization schemas were recently modified without key rotation.
  4. Do not mutate the database record manually. Follow the forensic investigation procedure in `docs/FORENSICS.md`.

#### Alert: `CROSS_TENANT_VIOLATION`
- **Symptom**: `sigmago.cross_tenant_violations` metric > 0.
- **Meaning**: An authenticated user attempted to read or mutate a request belonging to a different tenant subdomain.
- **Actions**:
  1. Inspect the correlation log to identify the `actorId` and source IP.
  2. Confirm whether the attempt was blocked (SigmaGo Application-Path RLS should reject with 403 Forbidden).
  3. If repeated, check for compromised session credentials or misconfigured proxy headers in Coolify Traefik.

#### Alert: `WORKER_HEARTBEAT_MISSING`
- **Symptom**: Redis key `sigmago:worker:heartbeat` is missing or older than 45 seconds.
- **Meaning**: The `sigmago-worker` container has crashed, hung, or lost connection to Redis.
- **Actions**:
  1. Check `sigmago-worker` container logs in Coolify.
  2. Verify Redis status in Coolify: `sigmago-redis`.
  3. Restart worker container: `docker restart sigmago-worker`.

---

## 2. Common Maintenance Procedures

### Restarting the Application
- **Order of Restart**:
  1. `sigmago-redis`
  2. `sigmago-worker`
  3. `sigmago-web`

### Checking Database Readiness
```bash
curl -f https://app.sigmago.tech/api/health/ready
```
Returns 200 with latency if reachable, or 503 if Supabase cannot be reached.
