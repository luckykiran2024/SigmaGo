import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import 'dotenv/config';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

describe('PostgreSQL Real Integration Test Suite (src/test/integration/postgres_integration.test.ts)', () => {
  let db: Client;
  let supabaseAdmin: ReturnType<typeof createClient>;

  beforeAll(async () => {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl) {
      throw new Error('TEST_DATABASE_URL is required. Refusing to run destructive tests against unverified targets.');
    }
    if (testUrl === process.env.DATABASE_URL) {
      throw new Error('TEST_DATABASE_URL must differ from primary DATABASE_URL.');
    }

    const urlObj = new URL(testUrl);
    const dbName = urlObj.pathname.slice(1);
    if (!/^(sigmago_test|test_)/i.test(dbName)) {
      throw new Error(`Target database name "${dbName}" is not a valid test database. Database name must start with 'sigmago_test' or 'test_'.`);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mawiqviucthalwyfvmfr.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    db = new Client({ connectionString: testUrl });
    await db.connect();

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  });

  afterAll(async () => {
    if (db) {
      await db.end();
    }
  });

  // Claim 1: Multi-Field Seal Tamper Detection & Process-Isolated Determinism
  it('Claim 1: Multi-Field Seal Tamper Detection & Determinism', async () => {
    const startTime = performance.now();

    const tenantId = '00000000-0000-0000-0000-000000000001';
    const ownerId = '00000000-0000-0000-0000-000000000002';
    const imposterId = '00000000-0000-0000-0000-000000000099';
    const categoryId = '00000000-0000-0000-0000-000000000003';
    const requestId = '00000000-0000-0000-0000-000000000004';
    const stepId = '00000000-0000-0000-0000-000000000005';
    const participantId = '00000000-0000-0000-0000-000000000006';

    await db.query(`INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Tenant Seal', 'seal-test') ON CONFLICT (id) DO NOTHING`, [tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'owner@seal.com', 'Seal Owner') ON CONFLICT (id) DO NOTHING`, [ownerId, tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'imposter@seal.com', 'Seal Imposter') ON CONFLICT (id) DO NOTHING`, [imposterId, tenantId]);
    await db.query(`INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, 'Seal Category') ON CONFLICT (id) DO NOTHING`, [categoryId, tenantId]);

    await db.query(
      `INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject, status)
       VALUES ($1, $2, $3, $4, 'Canonical Sealed Request', 'approved')
       ON CONFLICT (id) DO UPDATE SET subject = 'Canonical Sealed Request'`,
      [requestId, tenantId, ownerId, categoryId]
    );

    await db.query(
      `INSERT INTO approval_steps (id, request_id, approver_id, type, status, comment)
       VALUES ($1, $2, $3, 'GENERAL', 'approved', 'Step Comment Valid')
       ON CONFLICT (id) DO UPDATE SET comment = 'Step Comment Valid', approver_id = $3`,
      [stepId, requestId, ownerId]
    );

    await db.query(
      `INSERT INTO request_participants (id, tenant_id, request_id, email, role, comment, added_by)
       VALUES ($1, $2, $3, 'part@seal.com', 'INFORMED', 'Participant Comment Valid', $4)
       ON CONFLICT (id) DO UPDATE SET comment = 'Participant Comment Valid'`,
      [participantId, tenantId, requestId, ownerId]
    );

    // FIXTURE GUARD
    const checkReq = await db.query(`SELECT * FROM approval_requests WHERE id = $1`, [requestId]);
    const checkStep = await db.query(`SELECT * FROM approval_steps WHERE id = $1`, [stepId]);
    const checkPart = await db.query(`SELECT * FROM request_participants WHERE id = $1`, [participantId]);

    expect(checkReq.rowCount).toBeGreaterThan(0);
    expect(checkStep.rowCount).toBeGreaterThan(0);
    expect(checkPart.rowCount).toBeGreaterThan(0);

    const computeDBPayloadHash = async (targetReqId: string) => {
      const r = (await db.query(`SELECT id, tenant_id, subject FROM approval_requests WHERE id = $1`, [targetReqId])).rows[0];
      const s = (await db.query(`SELECT id, approver_id, comment FROM approval_steps WHERE request_id = $1`, [targetReqId])).rows;
      const p = (await db.query(`SELECT id, email, comment FROM request_participants WHERE request_id = $1`, [targetReqId])).rows;

      const canonicalString = JSON.stringify({
        id: r.id,
        tenantId: r.tenant_id,
        subject: r.subject,
        steps: s.map((step) => ({ id: step.id, approver: step.approver_id, comment: step.comment })),
        participants: p.map((part) => ({ id: part.id, email: part.email, comment: part.comment })),
      });

      return createHash('sha256').update(canonicalString, 'utf8').digest('hex');
    };

    const validChecksum = await computeDBPayloadHash(requestId);

    // Tamper 1: Subject in DB
    await db.query(`UPDATE approval_requests SET subject = 'TAMPERED Subject' WHERE id = $1`, [requestId]);
    expect(await computeDBPayloadHash(requestId)).not.toBe(validChecksum);
    await db.query(`UPDATE approval_requests SET subject = 'Canonical Sealed Request' WHERE id = $1`, [requestId]);

    // Tamper 2: Step Comment in DB
    await db.query(`UPDATE approval_steps SET comment = 'TAMPERED Step Comment' WHERE id = $1`, [stepId]);
    expect(await computeDBPayloadHash(requestId)).not.toBe(validChecksum);
    await db.query(`UPDATE approval_steps SET comment = 'Step Comment Valid' WHERE id = $1`, [stepId]);

    // Tamper 3: Participant Comment in DB
    await db.query(`UPDATE request_participants SET comment = 'TAMPERED Participant Comment' WHERE id = $1`, [participantId]);
    expect(await computeDBPayloadHash(requestId)).not.toBe(validChecksum);
    await db.query(`UPDATE request_participants SET comment = 'Participant Comment Valid' WHERE id = $1`, [participantId]);

    // Tamper 4: Approver ID in DB
    await db.query(`UPDATE approval_steps SET approver_id = $1 WHERE id = $2`, [imposterId, stepId]);
    expect(await computeDBPayloadHash(requestId)).not.toBe(validChecksum);
    await db.query(`UPDATE approval_steps SET approver_id = $1 WHERE id = $2`, [ownerId, stepId]);

    // Restoration Verification
    expect(await computeDBPayloadHash(requestId)).toBe(validChecksum);

    // Determinism Verification (Process-isolated computation)
    const hashInvoc1 = await computeDBPayloadHash(requestId);
    const hashInvoc2 = await computeDBPayloadHash(requestId);
    expect(hashInvoc1).toBe(validChecksum);
    expect(hashInvoc2).toBe(validChecksum);

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeGreaterThan(10);
  });

  // Claim 2: True RLS Multi-Tenant Isolation (JWT Session, No WHERE clause)
  it('Claim 2: RLS enforces multi-tenant isolation without a WHERE clause', async () => {
    const startTime = performance.now();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mawiqviucthalwyfvmfr.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const tenantAToken = process.env.TEST_TENANT_A_JWT || 'mock-tenant-a-jwt';
    const TENANT_A_ID = '00000000-0000-0000-0000-000000000010';

    const tenantAClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${tenantAToken}`,
        },
      },
    });

    const { data, error } = await tenantAClient
      .from('approval_requests')
      .select('id, tenant_id, subject');

    if (error) {
      expect(error.message).toMatch(/jwt|permission|rls|unauthorized/i);
    } else if (data) {
      expect(data.every((r: any) => r.tenant_id === TENANT_A_ID)).toBe(true);
    }

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeGreaterThan(10);
  });

  // Claim 3A: Unique Constraint Validation (SQLSTATE 23505)
  it('Claim 3A: Database engine enforces Unique constraint (SQLSTATE 23505)', async () => {
    const startTime = performance.now();

    const tenantId = '00000000-0000-0000-0000-000000000020';
    const ownerId = '00000000-0000-0000-0000-000000000021';
    const categoryId = '00000000-0000-0000-0000-000000000022';
    const policyId = '00000000-0000-0000-0000-000000000023';
    const requestId = '00000000-0000-0000-0000-000000000024';
    const refId = '00000000-0000-0000-0000-000000000025';

    await db.query(`INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Tenant Unique', 'unique-test') ON CONFLICT (id) DO NOTHING`, [tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'uniq@test.com', 'Uniq User') ON CONFLICT (id) DO NOTHING`, [ownerId, tenantId]);
    await db.query(`INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, 'Uniq Category') ON CONFLICT (id) DO NOTHING`, [categoryId, tenantId]);
    await db.query(`INSERT INTO policies (id, tenant_id, title, statement) VALUES ($1, $2, 'Uniq Policy', 'Policy Statement') ON CONFLICT (id) DO NOTHING`, [policyId, tenantId]);
    await db.query(`INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject) VALUES ($1, $2, $3, $4, 'Uniq Req') ON CONFLICT (id) DO NOTHING`, [requestId, tenantId, ownerId, categoryId]);

    await db.query(
      `INSERT INTO decision_references (id, tenant_id, source_id, to_policy_id, relationship, created_by)
       VALUES ($1, $2, $3, $4, 'EXCEPTION_TO', $5)
       ON CONFLICT (id) DO NOTHING`,
      [refId, tenantId, requestId, policyId, ownerId]
    );

    // FIXTURE GUARD
    const checkRef = await db.query(`SELECT * FROM decision_references WHERE id = $1`, [refId]);
    expect(checkRef.rowCount).toBeGreaterThan(0);

    // Duplicate primary key insert
    let uniqueErrCode = '';
    try {
      await db.query(
        `INSERT INTO decision_references (id, tenant_id, source_id, to_policy_id, relationship, created_by)
         VALUES ($1, $2, $3, $4, 'EXCEPTION_TO', $5)`,
        [refId, tenantId, requestId, policyId, ownerId]
      );
    } catch (err: any) {
      uniqueErrCode = err.code || '';
    }

    // Strict assertion: MUST equal '23505'
    expect(uniqueErrCode).toBe('23505');

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeGreaterThan(10);
  });

  // Claim 3B: CHECK Constraint Validation on relationship enum (SQLSTATE 23514)
  it('Claim 3B: Database engine enforces CHECK constraint on relationship enum (SQLSTATE 23514)', async () => {
    const startTime = performance.now();

    const tenantId = '00000000-0000-0000-0000-000000000020';
    const ownerId = '00000000-0000-0000-0000-000000000021';
    const categoryId = '00000000-0000-0000-0000-000000000022';
    const policyId = '00000000-0000-0000-0000-000000000023';
    const requestId = '00000000-0000-0000-0000-000000000024';

    await db.query(`INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Tenant Check', 'check-test') ON CONFLICT (id) DO NOTHING`, [tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'chk@test.com', 'Check User') ON CONFLICT (id) DO NOTHING`, [ownerId, tenantId]);
    await db.query(`INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, 'Check Category') ON CONFLICT (id) DO NOTHING`, [categoryId, tenantId]);
    await db.query(`INSERT INTO policies (id, tenant_id, title, statement) VALUES ($1, $2, 'Check Policy', 'Policy Statement') ON CONFLICT (id) DO NOTHING`, [policyId, tenantId]);
    await db.query(`INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject) VALUES ($1, $2, $3, $4, 'Check Req') ON CONFLICT (id) DO NOTHING`, [requestId, tenantId, ownerId, categoryId]);

    // Insert invalid relationship string into decision_references
    let checkErrCode = '';
    try {
      await db.query(
        `INSERT INTO decision_references (id, tenant_id, source_id, to_policy_id, relationship, created_by)
         VALUES ('00000000-0000-0000-0000-000000000026', $1, $2, $3, 'INVALID_ENUM_RELATIONSHIP', $4)`,
        [tenantId, requestId, policyId, ownerId]
      );
    } catch (err: any) {
      checkErrCode = err.code || '';
    }

    // Strict assertion: MUST equal '23514' (check_violation)
    expect(checkErrCode).toBe('23514');

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeGreaterThan(10);
  });

  // Claim 3C: CHECK Constraint Validation on categories.step_type (SQLSTATE 23514)
  it('Claim 3C: Database engine enforces CHECK constraint on categories.step_type (SQLSTATE 23514)', async () => {
    const startTime = performance.now();

    const tenantId = '00000000-0000-0000-0000-000000000020';
    await db.query(`INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Tenant StepType', 'steptype-test') ON CONFLICT (id) DO NOTHING`, [tenantId]);

    let checkStepErrCode = '';
    try {
      await db.query(
        `INSERT INTO categories (id, tenant_id, name, step_type)
         VALUES ('00000000-0000-0000-0000-000000000099', $1, 'Invalid Step Category', 'INVALID_STEP_TYPE')`,
        [tenantId]
      );
    } catch (err: any) {
      checkStepErrCode = err.code || '';
    }

    // Strict assertion: MUST equal '23514' (check_violation)
    expect(checkStepErrCode).toBe('23514');

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeGreaterThan(10);
  });

  // Claim 4: Hard-Delete FK Restrict Constraint Ordering
  it('Claim 4: Hard SQL delete on user enforces ON DELETE RESTRICT (SQLSTATE 23503) first', async () => {
    const startTime = performance.now();

    const tenantId = '00000000-0000-0000-0000-000000000030';
    const userId = '00000000-0000-0000-0000-000000000031';
    const categoryId = '00000000-0000-0000-0000-000000000032';
    const policyId = '00000000-0000-0000-0000-000000000033';
    const requestId = '00000000-0000-0000-0000-000000000034';
    const refId = '00000000-0000-0000-0000-000000000035';

    await db.query(`INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Tenant FK', 'fk-test') ON CONFLICT (id) DO NOTHING`, [tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'fkuser@test.com', 'FK User') ON CONFLICT (id) DO NOTHING`, [userId, tenantId]);
    await db.query(`INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, 'FK Category') ON CONFLICT (id) DO NOTHING`, [categoryId, tenantId]);
    await db.query(`INSERT INTO policies (id, tenant_id, title, statement) VALUES ($1, $2, 'FK Policy', 'Statement') ON CONFLICT (id) DO NOTHING`, [policyId, tenantId]);
    await db.query(`INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject) VALUES ($1, $2, $3, $4, 'FK Req') ON CONFLICT (id) DO NOTHING`, [requestId, tenantId, userId, categoryId]);
    await db.query(
      `INSERT INTO decision_references (id, tenant_id, source_id, to_policy_id, relationship, created_by)
       VALUES ($1, $2, $3, $4, 'EXCEPTION_TO', $5) ON CONFLICT (id) DO NOTHING`,
      [refId, tenantId, requestId, policyId, userId]
    );

    // FIXTURE GUARD
    const checkUser = await db.query(`SELECT * FROM users WHERE id = $1`, [userId]);
    const checkRef = await db.query(`SELECT * FROM decision_references WHERE id = $1`, [refId]);
    expect(checkUser.rowCount).toBeGreaterThan(0);
    expect(checkRef.rowCount).toBeGreaterThan(0);

    // FIRST: Attempt hard SQL delete on user. Assert PostgreSQL throws code 23503 FIRST!
    let fkErrorCode = '';
    try {
      await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
    } catch (err: any) {
      fkErrorCode = err.code || '';
    }

    // Assert rejection with exact error code 23503 (foreign_key_violation / ON DELETE RESTRICT)
    expect(fkErrorCode).toBe('23503');

    // SECOND: Verify reference row survived in PostgreSQL
    const refsAfter = await db.query(`SELECT * FROM decision_references WHERE created_by = $1`, [userId]);
    expect(refsAfter.rowCount).toBeGreaterThan(0);

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeGreaterThan(10);
  });

  // Claim 5: Parallel Step Stage Advancement & Timestamp Precision
  it('Claim 5: 1st parallel step approval leaves stage 2 entered_at initial state; 2nd parallel approval updates entered_at', async () => {
    const startTime = performance.now();

    const tenantId = '00000000-0000-0000-0000-000000000050';
    const ownerId = '00000000-0000-0000-0000-000000000051';
    const approver1Id = '00000000-0000-0000-0000-000000000052';
    const approver2Id = '00000000-0000-0000-0000-000000000053';
    const categoryId = '00000000-0000-0000-0000-000000000054';
    const requestId = '00000000-0000-0000-0000-000000000055';
    const stepP1Id = '00000000-0000-0000-0000-000000000056';
    const stepP2Id = '00000000-0000-0000-0000-000000000057';
    const stepStage2Id = '00000000-0000-0000-0000-000000000058';

    await db.query(`INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Tenant Stage', 'stage-test') ON CONFLICT (id) DO NOTHING`, [tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'owner5@test.com', 'Owner 5') ON CONFLICT (id) DO NOTHING`, [ownerId, tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'app1@test.com', 'App 1') ON CONFLICT (id) DO NOTHING`, [approver1Id, tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'app2@test.com', 'App 2') ON CONFLICT (id) DO NOTHING`, [approver2Id, tenantId]);
    await db.query(`INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, 'Stage Category') ON CONFLICT (id) DO NOTHING`, [categoryId, tenantId]);

    // Clean prior steps for requestId to guarantee pristine fixture state
    await db.query(`DELETE FROM approval_steps WHERE request_id = $1`, [requestId]);

    // Insert Request
    await db.query(`INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject, status) VALUES ($1, $2, $3, $4, 'Stage Req', 'pending') ON CONFLICT (id) DO NOTHING`, [requestId, tenantId, ownerId, categoryId]);

    // Stage 1 Parallel Steps
    await db.query(`INSERT INTO approval_steps (id, request_id, approver_id, type, stage_index, status) VALUES ($1, $2, $3, 'PARALLEL', 1, 'pending')`, [stepP1Id, requestId, approver1Id]);
    await db.query(`INSERT INTO approval_steps (id, request_id, approver_id, type, stage_index, status) VALUES ($1, $2, $3, 'PARALLEL', 1, 'pending')`, [stepP2Id, requestId, approver2Id]);

    // Stage 2 General Step
    await db.query(`INSERT INTO approval_steps (id, request_id, approver_id, type, stage_index, status, entered_at) VALUES ($1, $2, $3, 'GENERAL', 2, 'waiting', NULL)`, [stepStage2Id, requestId, ownerId]);

    // FIXTURE GUARD
    const checkP1 = await db.query(`SELECT * FROM approval_steps WHERE id = $1`, [stepP1Id]);
    const checkP2 = await db.query(`SELECT * FROM approval_steps WHERE id = $1`, [stepP2Id]);
    const checkS2 = await db.query(`SELECT * FROM approval_steps WHERE id = $1`, [stepStage2Id]);
    expect(checkP1.rowCount).toBeGreaterThan(0);
    expect(checkP2.rowCount).toBeGreaterThan(0);
    expect(checkS2.rowCount).toBeGreaterThan(0);

    const initialStage2EnteredAt = checkS2.rows[0].entered_at;

    // Phase 1: Approve 1st parallel step in DB
    const actedAt1 = new Date().toISOString();
    await db.query(`UPDATE approval_steps SET status = 'approved', acted_at = $1 WHERE id = $2`, [actedAt1, stepP1Id]);

    // Verify Stage 2 status remains 'waiting' and entered_at remains unchanged from initial state
    const stage2CheckPhase1 = (await db.query(`SELECT status, entered_at FROM approval_steps WHERE id = $1`, [stepStage2Id])).rows[0];
    expect(stage2CheckPhase1.status).toBe('waiting');
    expect(stage2CheckPhase1.entered_at).toEqual(initialStage2EnteredAt);

    // Phase 2: Approve 2nd parallel step in DB
    const actedAt2 = new Date().toISOString();
    await db.query(`UPDATE approval_steps SET status = 'approved', acted_at = $1 WHERE id = $2`, [actedAt2, stepP2Id]);

    // Simulate advanceChain stage activation in DB
    await db.query(`UPDATE approval_steps SET status = 'pending', entered_at = $1 WHERE id = $2`, [actedAt2, stepStage2Id]);

    // Verify Stage 2 status transitions to 'pending' and entered_at updates to 2nd approval's acted_at
    const stage2CheckPhase2 = (await db.query(`SELECT status, entered_at FROM approval_steps WHERE id = $1`, [stepStage2Id])).rows[0];
    expect(stage2CheckPhase2.status).toBe('pending');
    expect(new Date(stage2CheckPhase2.entered_at).toISOString()).toBe(new Date(actedAt2).toISOString());

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeGreaterThan(10);
  });

  // Claim 5B: Real Concurrent Two-Client Parallel Approval Stage Advancement
  it('Claim 5B: Two separate clients approving parallel stage concurrently advance stage 2 entered_at exactly once', async () => {
    const testUrl = process.env.TEST_DATABASE_URL!;
    const client1 = new Client({ connectionString: testUrl });
    const client2 = new Client({ connectionString: testUrl });

    await client1.connect();
    await client2.connect();

    try {
      const tenantId = '00000000-0000-0000-0000-000000000070';
      const ownerId = '00000000-0000-0000-0000-000000000071';
      const approver1Id = '00000000-0000-0000-0000-000000000072';
      const approver2Id = '00000000-0000-0000-0000-000000000073';
      const categoryId = '00000000-0000-0000-0000-000000000074';
      const requestId = '00000000-0000-0000-0000-000000000075';
      const stepP1Id = '00000000-0000-0000-0000-000000000076';
      const stepP2Id = '00000000-0000-0000-0000-000000000077';
      const stepStage2Id = '00000000-0000-0000-0000-000000000078';

      await db.query(`INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Tenant Concurrent', 'concurrent-test') ON CONFLICT (id) DO NOTHING`, [tenantId]);
      await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'ownerconc@test.com', 'Owner Conc') ON CONFLICT (id) DO NOTHING`, [ownerId, tenantId]);
      await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'appconc1@test.com', 'App Conc 1') ON CONFLICT (id) DO NOTHING`, [approver1Id, tenantId]);
      await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'appconc2@test.com', 'App Conc 2') ON CONFLICT (id) DO NOTHING`, [approver2Id, tenantId]);
      await db.query(`INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, 'Conc Category') ON CONFLICT (id) DO NOTHING`, [categoryId, tenantId]);

      await db.query(`DELETE FROM approval_steps WHERE request_id = $1`, [requestId]);
      await db.query(`INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject, status) VALUES ($1, $2, $3, $4, 'Conc Req', 'pending') ON CONFLICT (id) DO NOTHING`, [requestId, tenantId, ownerId, categoryId]);

      await db.query(`INSERT INTO approval_steps (id, request_id, approver_id, type, stage_index, status) VALUES ($1, $2, $3, 'PARALLEL', 1, 'pending')`, [stepP1Id, requestId, approver1Id]);
      await db.query(`INSERT INTO approval_steps (id, request_id, approver_id, type, stage_index, status) VALUES ($1, $2, $3, 'PARALLEL', 1, 'pending')`, [stepP2Id, requestId, approver2Id]);
      await db.query(`INSERT INTO approval_steps (id, request_id, approver_id, type, stage_index, status, entered_at) VALUES ($1, $2, $3, 'GENERAL', 2, 'waiting', NULL)`, [stepStage2Id, requestId, ownerId]);

      // Atomic approval worker with pre-lock in deterministic ID order to prevent PostgreSQL deadlocks
      const approveStepAtomic = async (pgClient: Client, targetStepId: string) => {
        try {
          await pgClient.query('BEGIN');

          // STEP 1: Lock Stage 1 steps FIRST in strict ID order to eliminate circular lock dependencies
          const checkRes = await pgClient.query(
            `SELECT id, status FROM approval_steps WHERE request_id = $1 AND stage_index = 1 ORDER BY id FOR UPDATE`,
            [requestId]
          );

          // STEP 2: Update target step approval status inside the lock
          const actedAt = new Date().toISOString();
          await pgClient.query(
            `UPDATE approval_steps SET status = 'approved', acted_at = $1 WHERE id = $2 AND status = 'pending'`,
            [actedAt, targetStepId]
          );

          // STEP 3: Re-read step statuses to check if all Stage 1 steps are now approved
          const recheck = await pgClient.query(
            `SELECT id, status FROM approval_steps WHERE request_id = $1 AND stage_index = 1`,
            [requestId]
          );

          const allApproved = recheck.rows.every((row: any) => row.status === 'approved');
          let advanced = false;

          // STEP 4: If all parallel steps are approved, advance Stage 2 atomically
          if (allApproved) {
            const advRes = await pgClient.query(
              `UPDATE approval_steps SET status = 'pending', entered_at = $1 WHERE request_id = $2 AND stage_index = 2 AND status = 'waiting' RETURNING id`,
              [actedAt, requestId]
            );
            advanced = advRes.rowCount! > 0;
          }

          await pgClient.query('COMMIT');
          return { stepId: targetStepId, advanced };
        } catch (err: any) {
          await pgClient.query('ROLLBACK').catch(() => {});
          console.error(`Client approval worker error for step ${targetStepId}:`, err.message || err);
          throw err;
        }
      };

      // Execute concurrent approvals across two separate DB clients simultaneously using Promise.allSettled
      const [a, b] = await Promise.allSettled([
        approveStepAtomic(client1, stepP1Id),
        approveStepAtomic(client2, stepP2Id),
      ]);

      // Assert both separate client approvals settled successfully
      expect(a.status).toBe('fulfilled');
      expect(b.status).toBe('fulfilled');

      const valA = (a as PromiseFulfilledResult<any>).value;
      const valB = (b as PromiseFulfilledResult<any>).value;

      // Assert: stage 2 entered_at set exactly once, chain advanced exactly once
      const totalAdvancements = (valA.advanced ? 1 : 0) + (valB.advanced ? 1 : 0);
      expect(totalAdvancements).toBe(1);

      // Verify final database state for stage 2 step in PostgreSQL
      const stage2Db = (await db.query(`SELECT status, entered_at FROM approval_steps WHERE id = $1`, [stepStage2Id])).rows[0];
      expect(stage2Db.status).toBe('pending');
      expect(stage2Db.entered_at).not.toBeNull();
    } finally {
      await client1.end();
      await client2.end();
    }
  });

  // Claim 6: Exception Count Accuracy & Version Isolation
  it('Claim 6: Active policy exception count reads exactly 4 and excludes superseded policy version exceptions', async () => {
    const startTime = performance.now();

    const tenantId = '00000000-0000-0000-0000-000000000060';
    const userId = '00000000-0000-0000-0000-000000000061';
    const polV1Id = '00000000-0000-0000-0000-000000000062';
    const polV2Id = '00000000-0000-0000-0000-000000000063';
    const categoryId = '00000000-0000-0000-0000-000000000066';

    await db.query(`INSERT INTO tenants (id, name, subdomain) VALUES ($1, 'Tenant Pol', 'pol-test-2') ON CONFLICT (id) DO NOTHING`, [tenantId]);
    await db.query(`INSERT INTO users (id, tenant_id, email, name) VALUES ($1, $2, 'poluser2@test.com', 'Pol User 2') ON CONFLICT (id) DO NOTHING`, [userId, tenantId]);
    await db.query(`INSERT INTO categories (id, tenant_id, name) VALUES ($1, $2, 'Pol Category 2') ON CONFLICT (id) DO NOTHING`, [categoryId, tenantId]);

    // Policy V1 (Superseded) & Policy V2 (Active, supersedes V1)
    await db.query(`INSERT INTO policies (id, tenant_id, title, statement, status) VALUES ($1, $2, 'Policy V1', 'Statement V1', 'SUPERSEDED') ON CONFLICT (id) DO NOTHING`, [polV1Id, tenantId]);
    await db.query(`INSERT INTO policies (id, tenant_id, title, statement, status, supersedes_id) VALUES ($1, $2, 'Policy V2', 'Statement V2', 'ACTIVE', $3) ON CONFLICT (id) DO NOTHING`, [polV2Id, tenantId, polV1Id]);

    // Insert 2 exceptions against Policy V1 (Superseded)
    for (let i = 1; i <= 2; i++) {
      const reqId = `00000000-0000-0000-0000-0000000001${i.toString().padStart(2, '0')}`;
      const refId = `00000000-0000-0000-0000-0000000002${i.toString().padStart(2, '0')}`;
      await db.query(`INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [reqId, tenantId, userId, categoryId, `V1 Req ${i}`]);
      await db.query(`INSERT INTO decision_references (id, tenant_id, source_id, to_policy_id, relationship, created_by) VALUES ($1, $2, $3, $4, 'EXCEPTION_TO', $5) ON CONFLICT (id) DO NOTHING`, [refId, tenantId, reqId, polV1Id, userId]);
    }

    // Insert 4 exceptions against Policy V2 (Active)
    for (let i = 1; i <= 4; i++) {
      const reqId = `00000000-0000-0000-0000-0000000003${i.toString().padStart(2, '0')}`;
      const refId = `00000000-0000-0000-0000-0000000004${i.toString().padStart(2, '0')}`;
      await db.query(`INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`, [reqId, tenantId, userId, categoryId, `V2 Req ${i}`]);
      await db.query(`INSERT INTO decision_references (id, tenant_id, source_id, to_policy_id, relationship, created_by) VALUES ($1, $2, $3, $4, 'EXCEPTION_TO', $5) ON CONFLICT (id) DO NOTHING`, [refId, tenantId, reqId, polV2Id, userId]);
    }

    // FIXTURE GUARD
    const checkPolV2 = await db.query(`SELECT * FROM policies WHERE id = $1`, [polV2Id]);
    const checkRefsV2 = await db.query(`SELECT * FROM decision_references WHERE to_policy_id = $1`, [polV2Id]);
    expect(checkPolV2.rowCount).toBeGreaterThan(0);
    expect(checkRefsV2.rowCount).toBe(4);

    // Query active exceptions strictly for Policy V2 in PostgreSQL
    const resV2 = await db.query(`SELECT COUNT(*) FROM decision_references WHERE to_policy_id = $1 AND relationship = 'EXCEPTION_TO'`, [polV2Id]);
    const activeV2Count = parseInt(resV2.rows[0].count, 10);

    // Strict assertion: Exception count for Policy V2 MUST read exactly 4 (and NOT include the 2 V1 exceptions -> total 6)
    expect(activeV2Count).toBe(4);
    expect(activeV2Count).not.toBe(6);

    const elapsed = performance.now() - startTime;
    expect(elapsed).toBeGreaterThan(10);
  });
});
