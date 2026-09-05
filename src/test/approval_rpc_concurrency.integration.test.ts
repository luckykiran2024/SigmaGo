import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

describe('Workstream 5: Real PostgreSQL Approval RPC Concurrency & Validation', () => {
  let client1: pg.Client;
  let client2: pg.Client;
  let testTenantId: string;
  let testAdminId: string;
  let approver1Id: string;
  let approver2Id: string;
  let categoryId: string;

  beforeAll(async () => {
    expect(connectionString).toBeDefined();

    client1 = new Client({ connectionString });
    client2 = new Client({ connectionString });

    await client1.connect();
    await client2.connect();

    // Setup a clean test tenant
    const tRes = await client1.query(`
      INSERT INTO tenants (name, subdomain) 
      VALUES ('Concurrency Test Org ' || gen_random_uuid(), 'concurr-' || substring(gen_random_uuid()::text, 1, 8))
      RETURNING id;
    `);
    testTenantId = tRes.rows[0].id;

    const u1 = await client1.query(`
      INSERT INTO users (tenant_id, email, name, role)
      VALUES ($1, 'admin-' || gen_random_uuid() || '@test.com', 'Admin User', 'admin')
      RETURNING id;
    `, [testTenantId]);
    testAdminId = u1.rows[0].id;

    const u2 = await client1.query(`
      INSERT INTO users (tenant_id, email, name, role)
      VALUES ($1, 'appr1-' || gen_random_uuid() || '@test.com', 'Approver One', 'member')
      RETURNING id;
    `, [testTenantId]);
    approver1Id = u2.rows[0].id;

    const u3 = await client1.query(`
      INSERT INTO users (tenant_id, email, name, role)
      VALUES ($1, 'appr2-' || gen_random_uuid() || '@test.com', 'Approver Two', 'member')
      RETURNING id;
    `, [testTenantId]);
    approver2Id = u3.rows[0].id;

    const cRes = await client1.query(`
      INSERT INTO categories (tenant_id, name)
      VALUES ($1, 'Concurrency Budget')
      RETURNING id;
    `, [testTenantId]);
    categoryId = cRes.rows[0].id;
  });

  afterAll(async () => {
    if (client1) {
      if (testTenantId) {
        await client1.query('DELETE FROM tenants WHERE id = $1', [testTenantId]).catch(() => {});
      }
      await client1.end();
    }
    if (client2) {
      await client2.end();
    }
  });

  it('Strict Action Validation: Unsupported action must fail, never fall through to approval', async () => {
    // Create a request with one pending step
    const rRes = await client1.query(`
      INSERT INTO approval_requests (tenant_id, owner_id, category_id, subject, status, ref)
      VALUES ($1, $2, $3, 'Validation Test Request', 'pending', 'TEST-VAL-' || gen_random_uuid())
      RETURNING id;
    `, [testTenantId, testAdminId, categoryId]);
    const reqId = rRes.rows[0].id;

    const sRes = await client1.query(`
      INSERT INTO approval_steps (request_id, approver_id, stage_index, order_index, status, type)
      VALUES ($1, $2, 0, 0, 'pending', 'GENERAL')
      RETURNING id;
    `, [reqId, approver1Id]);
    const stepId = sRes.rows[0].id;

    // Test unsupported action 'hacked_bypass'
    await expect(
      client1.query(`
        SELECT sigmago_act_on_step(
          $1::uuid, $2::uuid, $3::uuid,
          'hacked_bypass', 'ENDORSED', 'APPROVED', true, NULL, 'Exploit attempt', NULL, 'ui', NULL, NULL
        );
      `, [stepId, approver1Id, testTenantId])
    ).rejects.toThrow(/Invalid approval action/i);

    // Test typo 'approv'
    await expect(
      client1.query(`
        SELECT sigmago_act_on_step(
          $1::uuid, $2::uuid, $3::uuid,
          'approv', 'ENDORSED', 'APPROVED', true, NULL, 'Typo attempt', NULL, 'ui', NULL, NULL
        );
      `, [stepId, approver1Id, testTenantId])
    ).rejects.toThrow(/Invalid approval action/i);

    // Verify step status remains 'pending' and was NOT approved
    const check = await client1.query('SELECT status FROM approval_steps WHERE id = $1', [stepId]);
    expect(check.rows[0].status).toBe('pending');
  });

  it('Concurrent Step Race: Two independent PostgreSQL sessions racing on same step yield exactly one approval and zero duplicate transitions', async () => {
    // Run repeated trials to stress test race conditions
    const TRIALS = 5;

    for (let trial = 0; trial < TRIALS; trial++) {
      // 1. Create a 2-stage request:
      //    Stage 0: 1 pending step
      //    Stage 1: 1 waiting step
      const rRes = await client1.query(`
        INSERT INTO approval_requests (tenant_id, owner_id, category_id, subject, status, ref)
        VALUES ($1, $2, $3, 'Race Trial ' || $4, 'pending', 'TEST-RACE-' || gen_random_uuid())
        RETURNING id;
      `, [testTenantId, testAdminId, categoryId, trial]);
      const reqId = rRes.rows[0].id;

      const s0Res = await client1.query(`
        INSERT INTO approval_steps (request_id, approver_id, stage_index, order_index, status, type)
        VALUES ($1, $2, 0, 0, 'pending', 'GENERAL')
        RETURNING id;
      `, [reqId, approver1Id]);
      const step0Id = s0Res.rows[0].id;

      await client1.query(`
        INSERT INTO approval_steps (request_id, approver_id, stage_index, order_index, status, type)
        VALUES ($1, $2, 1, 0, 'waiting', 'GENERAL')
        RETURNING id;
      `, [reqId, approver2Id]);

      const runNonce = Math.random().toString(36).substring(2, 10);
      // 2. Concurrently fire sigmago_act_on_step on session 1 and session 2 for step0
      const [res1, res2] = await Promise.all([
        client1.query(`
          SELECT sigmago_act_on_step(
            $1::uuid, $2::uuid, $3::uuid,
            'approved', 'ENDORSED', 'APPROVED', true, NULL, 'Concurrent approval from session 1', NULL, 'ui', NULL, $4
          ) as result;
        `, [step0Id, approver1Id, testTenantId, `trial-${runNonce}-${trial}-sess1`]),
        client2.query(`
          SELECT sigmago_act_on_step(
            $1::uuid, $2::uuid, $3::uuid,
            'approved', 'ENDORSED', 'APPROVED', true, NULL, 'Concurrent approval from session 2', NULL, 'ui', NULL, $4
          ) as result;
        `, [step0Id, approver1Id, testTenantId, `trial-${runNonce}-${trial}-sess2`])
      ]);

      const r1 = res1.rows[0].result;
      const r2 = res2.rows[0].result;

      // Exactly one session must execute the transition; the other must detect already_processed
      const advancedCount = (r1.stage_advanced ? 1 : 0) + (r2.stage_advanced ? 1 : 0);
      expect(advancedCount).toBe(1);

      const alreadyProcessedCount = (r1.already_processed ? 1 : 0) + (r2.already_processed ? 1 : 0);
      expect(alreadyProcessedCount).toBe(1);

      // Verify database state: Stage 1 must now have entered_at populated and status 'pending'
      const stage1Step = await client1.query(`
        SELECT status, entered_at FROM approval_steps 
        WHERE request_id = $1 AND stage_index = 1;
      `, [reqId]);
      expect(stage1Step.rows[0].status).toBe('pending');
      expect(stage1Step.rows[0].entered_at).not.toBeNull();

      // Verify event emission: exactly ONE STAGE_ENTERED event for stage 1
      const events = await client1.query(`
        SELECT event_type, event_payload FROM decision_events 
        WHERE request_id = $1 AND event_type = 'STAGE_ENTERED';
      `, [reqId]);
      expect(events.rows.length).toBe(1);
      expect(events.rows[0].event_payload.stage_index).toBe(1);
    }
  });

  it('Concurrent Parallel Step Approval: Parallel approvals in same stage correctly transition to FINALIZING exactly once', async () => {
    // 1. Create a 1-stage request with 2 parallel steps in Stage 0
    const rRes = await client1.query(`
      INSERT INTO approval_requests (tenant_id, owner_id, category_id, subject, status, ref)
      VALUES ($1, $2, $3, 'Parallel Finalization Test', 'pending', 'TEST-PAR-' || gen_random_uuid())
      RETURNING id;
    `, [testTenantId, testAdminId, categoryId]);
    const reqId = rRes.rows[0].id;

    const s1Res = await client1.query(`
      INSERT INTO approval_steps (request_id, approver_id, stage_index, order_index, status, type)
      VALUES ($1, $2, 0, 0, 'pending', 'GENERAL')
      RETURNING id;
    `, [reqId, approver1Id]);
    const step1Id = s1Res.rows[0].id;

    const s2Res = await client1.query(`
      INSERT INTO approval_steps (request_id, approver_id, stage_index, order_index, status, type)
      VALUES ($1, $2, 0, 1, 'pending', 'GENERAL')
      RETURNING id;
    `, [reqId, approver2Id]);
    const step2Id = s2Res.rows[0].id;

    const nonce3 = Math.random().toString(36).substring(2, 10);
    // Both approvers approve their respective steps at the exact same moment from different PostgreSQL sessions
    const [res1, res2] = await Promise.all([
      client1.query(`
        SELECT sigmago_act_on_step(
          $1::uuid, $2::uuid, $3::uuid,
          'approved', 'ENDORSED', 'APPROVED', true, NULL, 'Approver 1 parallel signoff', NULL, 'ui', NULL, $4
        ) as result;
      `, [step1Id, approver1Id, testTenantId, `parallel-${nonce3}-1`]),
      client2.query(`
        SELECT sigmago_act_on_step(
          $1::uuid, $2::uuid, $3::uuid,
          'approved', 'ENDORSED', 'APPROVED', true, NULL, 'Approver 2 parallel signoff', NULL, 'ui', NULL, $4
        ) as result;
      `, [step2Id, approver2Id, testTenantId, `parallel-${nonce3}-2`])
    ]);

    const r1 = res1.rows[0].result;
    const r2 = res2.rows[0].result;

    console.log('Test 3 RPC Results:', { r1, r2 });

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);

    // Exactly one of the two parallel steps completes the stage and triggers needs_seal / FINALIZING
    const needsSealCount = (r1.needs_seal ? 1 : 0) + (r2.needs_seal ? 1 : 0);
    expect(needsSealCount).toBe(1);

    // Verify request status is FINALIZING
    const reqCheck = await client1.query('SELECT status, finalized_at FROM approval_requests WHERE id = $1', [reqId]);
    expect(reqCheck.rows[0].status).toBe('FINALIZING');
    expect(reqCheck.rows[0].finalized_at).not.toBeNull();

    // Verify exactly one REQUEST_FINALIZING event
    const finalEvents = await client1.query(`
      SELECT count(*)::int as count FROM decision_events 
      WHERE request_id = $1 AND event_type = 'REQUEST_FINALIZING';
    `, [reqId]);
    expect(finalEvents.rows[0].count).toBe(1);

    // Execute atomic seal
    const sealRes = await client1.query(`
      SELECT sigmago_finalize_seal(
        $1::uuid, $2::uuid, 'f1a928e267074995bf4a1e3f650f44ad83d7ce7462537127', 2, 'SHA-256'
      ) as result;
    `, [reqId, testTenantId]);

    expect(sealRes.rows[0].result.success).toBe(true);
    expect(sealRes.rows[0].result.status).toBe('approved');
  });
});
