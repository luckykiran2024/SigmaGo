import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import crypto from 'crypto';
import { actOnStep } from '../../lib/db/steps';
import {
  loadCanonicalDecisionInputs,
  verifyDecisionCertificate,
  verifyTenantLedgerChain,
  generateChecksumAndFinalize,
} from '../../lib/certificate';
import { verifyDecisionSignature } from '../../lib/crypto/pki';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

describe('Multi-Persona End-to-End Decision Lifecycle & Ledger Chain Suite', () => {
  let client: pg.Client;
  const tenantId = '00000000-0000-0000-0000-000000000099';
  const requesterId = '00000000-0000-0000-0000-000000000101';
  const approver1Id = '00000000-0000-0000-0000-000000000102';
  const approver2Id = '00000000-0000-0000-0000-000000000103';
  const categoryId = '00000000-0000-0000-0000-000000000104';

  const cleanup = async () => {
    if (!client) return;
    try {
      await client.query('DELETE FROM audit_log WHERE tenant_id = $1;', [tenantId]);
      await client.query('DELETE FROM approval_steps WHERE request_id IN (SELECT id FROM approval_requests WHERE tenant_id = $1);', [tenantId]);
      await client.query('DELETE FROM approval_requests WHERE tenant_id = $1;', [tenantId]);
      await client.query('DELETE FROM categories WHERE tenant_id = $1;', [tenantId]);
      await client.query('DELETE FROM users WHERE tenant_id = $1;', [tenantId]);
      await client.query('DELETE FROM tenants WHERE id = $1;', [tenantId]);
    } catch (err) {
      // Ignored during cleanup
    }
  };

  beforeAll(async () => {
    client = new Client({ connectionString });
    await client.connect();

    await cleanup();

    // 1. Seed tenant and users
    await client.query(`
      INSERT INTO tenants (id, name, subdomain)
      VALUES ($1, 'Ledger Test Org', 'ledgertest')
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId]);

    await client.query(`
      INSERT INTO users (id, tenant_id, email, name, role)
      VALUES 
        ($2, $1, 'requester@ledgertest.com', 'Alice Requester', 'member'),
        ($3, $1, 'approver1@ledgertest.com', 'Bob Stage1 Approver', 'member'),
        ($4, $1, 'approver2@ledgertest.com', 'Carol Stage2 Approver', 'member')
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId, requesterId, approver1Id, approver2Id]);

    await client.query(`
      INSERT INTO categories (id, tenant_id, name)
      VALUES ($2, $1, 'Capital Allocations')
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId, categoryId]);
  });

  afterAll(async () => {
    if (client) {
      await cleanup();
      await client.end();
    }
  });

  it('Executes full 3-persona lifecycle: Submission -> Multi-stage approval with reservations -> Two-Phase PKI Finalization -> Cryptographic Ledger Hash-Chain Verification', async () => {
    // ----------------------------------------------------
    // DECISION 1: Genesis Decision
    // ----------------------------------------------------
    const req1Id = '11111111-1111-1111-1111-111111111111';
    const step1Id = '11111111-1111-1111-1111-111111111112';

    await client.query(`
      INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject, status)
      VALUES ($1, $2, $3, $4, 'Genesis Decision 1', 'pending');
    `, [req1Id, tenantId, requesterId, categoryId]);

    await client.query(`
      INSERT INTO approval_steps (id, request_id, approver_id, stage_index, order_index, status, type)
      VALUES ($1, $2, $3, 0, 0, 'pending', 'GENERAL');
    `, [step1Id, req1Id, approver1Id]);

    // Approver 1 approves Decision 1
    const res1 = await actOnStep({
      stepId: step1Id,
      actorId: approver1Id,
      tenantId: tenantId,
      action: 'approved',
      actionSource: 'web',
      stance: 'ENDORSED',
      comment: 'Approved genesis',
    });

    expect(res1.success).toBe(true);

    // Verify Decision 1 is sealed
    const cert1 = await verifyDecisionCertificate(req1Id, tenantId);
    expect(cert1.isValid).toBe(true);
    expect(cert1.isSignatureValid).toBe(true);
    expect(cert1.storedChecksum).toBeDefined();
    expect(cert1.sealSignatureB64).toBeDefined();
    expect(cert1.previousSealHash).toBe('GENESIS_0000000000000000000000000000000000000000000000000000000000000000');

    // ----------------------------------------------------
    // DECISION 2: Multi-Stage Decision chained to Decision 1
    // ----------------------------------------------------
    const req2Id = '22222222-2222-2222-2222-222222222221';
    const step2AId = '22222222-2222-2222-2222-222222222222'; // Stage 0
    const step2BId = '22222222-2222-2222-2222-222222222223'; // Stage 1

    await client.query(`
      INSERT INTO approval_requests (id, tenant_id, owner_id, category_id, subject, status)
      VALUES ($1, $2, $3, $4, 'Expansion Capital Decision 2', 'pending');
    `, [req2Id, tenantId, requesterId, categoryId]);

    await client.query(`
      INSERT INTO approval_steps (id, request_id, approver_id, stage_index, order_index, status, type)
      VALUES ($1, $2, $3, 0, 0, 'pending', 'GENERAL');
    `, [step2AId, req2Id, approver1Id]);

    await client.query(`
      INSERT INTO approval_steps (id, request_id, approver_id, stage_index, order_index, status, type)
      VALUES ($1, $2, $3, 1, 0, 'waiting', 'GENERAL');
    `, [step2BId, req2Id, approver2Id]);

    // Persona 2 (Approver 1: Bob) approves Stage 0 with Reservation Note
    const res2A = await actOnStep({
      stepId: step2AId,
      actorId: approver1Id,
      tenantId: tenantId,
      action: 'approved',
      actionSource: 'web',
      stance: 'APPROVED_WITH_RESERVATION',
      reservationNote: 'Approved on condition of monthly audit reviews.',
      comment: 'Proceed with reservation.',
    });

    expect(res2A.success).toBe(true);
    expect(res2A.stage_advanced).toBe(true);

    // Verify Stage 1 step is now active/pending
    const step2BCheck = await client.query('SELECT status FROM approval_steps WHERE id = $1;', [step2BId]);
    expect(step2BCheck.rows[0].status).toBe('pending');

    // Persona 3 (Approver 2: Carol) endorses Stage 1
    const res2B = await actOnStep({
      stepId: step2BId,
      actorId: approver2Id,
      tenantId: tenantId,
      action: 'approved',
      actionSource: 'web',
      stance: 'ENDORSED',
      comment: 'Final endorsement granted.',
    });

    expect(res2B.success).toBe(true);

    // Verify Decision 2 Certificate
    const cert2 = await verifyDecisionCertificate(req2Id, tenantId);
    expect(cert2.isValid).toBe(true);
    expect(cert2.isSignatureValid).toBe(true);
    expect(cert2.storedChecksum).toBeDefined();
    expect(cert2.sealSignatureB64).toBeDefined();

    // Cryptographic Hash-Chain check: Decision 2 binds to Decision 1's checksum!
    expect(cert2.previousSealHash).toBe(cert1.storedChecksum);

    // ----------------------------------------------------
    // LEDGER INTEGRITY AUDIT: Verify unbroken tenant chain
    // ----------------------------------------------------
    const ledgerAudit = await verifyTenantLedgerChain(tenantId);
    expect(ledgerAudit.isChainValid).toBe(true);
    expect(ledgerAudit.totalDecisions).toBe(2);
  });
});
