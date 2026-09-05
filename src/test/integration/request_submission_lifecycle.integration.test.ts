import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { createRequest, submitRequest } from '../../lib/db/requests';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

describe('P0-1: Request Submission Lifecycle & Schema Invariant Suite', () => {
  let client: pg.Client;
  const tenantId = '00000000-0000-0000-0000-000000000701';
  const requesterId = '00000000-0000-0000-0000-000000000702';
  const directApproverId = '00000000-0000-0000-0000-000000000703';
  const referenceApproverId = '00000000-0000-0000-0000-000000000704';
  const categoryId = '00000000-0000-0000-0000-000000000705';

  const cleanup = async () => {
    if (!client) return;
    try {
      await client.query('DELETE FROM audit_log WHERE tenant_id = $1;', [tenantId]);
      await client.query('DELETE FROM approval_steps WHERE request_id IN (SELECT id FROM approval_requests WHERE tenant_id = $1);', [tenantId]);
      await client.query('DELETE FROM approval_requests WHERE tenant_id = $1;', [tenantId]);
      await client.query('DELETE FROM categories WHERE tenant_id = $1;', [tenantId]);
      await client.query('DELETE FROM users WHERE tenant_id = $1;', [tenantId]);
      await client.query('DELETE FROM tenants WHERE id = $1;', [tenantId]);
    } catch {
      // ignore during cleanup
    }
  };

  beforeAll(async () => {
    expect(connectionString).toBeDefined();
    client = new Client({ connectionString });
    await client.connect();

    await cleanup();

    // 1. Seed tenant, users, and category
    await client.query(`
      INSERT INTO tenants (id, name, subdomain)
      VALUES ($1, 'Submission Lifecycle Org', 'submit-test')
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId]);

    await client.query(`
      INSERT INTO users (id, tenant_id, email, name, role)
      VALUES 
        ($2, $1, 'requester-p01@submittest.com', 'Req Alice', 'member'),
        ($3, $1, 'approver-p01@submittest.com', 'App Bob', 'member'),
        ($4, $1, 'reference-p01@submittest.com', 'Ref Carol', 'member')
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId, requesterId, directApproverId, referenceApproverId]);

    await client.query(`
      INSERT INTO categories (id, tenant_id, name)
      VALUES ($2, $1, 'Core Governance')
      ON CONFLICT (id) DO NOTHING;
    `, [tenantId, categoryId]);
  });

  afterAll(async () => {
    if (client) {
      await cleanup();
      await client.end();
    }
  });

  it('Creates request in draft, executes submitRequest(), transitions request to pending and activates stage 0 & reference steps without schema error', async () => {
    // 1. Create request with 1 direct stage 0 step, 1 direct stage 1 step, and 1 REFERENCE step
    const createdReq = await createRequest({
      tenantId,
      ownerId: requesterId,
      categoryId,
      subject: 'Critical Capital Expenditure P0-1',
      bodyJson: { amount: 50000, justification: 'Server cluster upgrade' },
      visibility: 'public',
      steps: [
        {
          approverId: directApproverId,
          type: 'GENERAL',
          orderIndex: 0,
          stageIndex: 0,
        },
        {
          approverId: referenceApproverId,
          type: 'REFERENCE',
          orderIndex: 1,
          stageIndex: 0,
        },
      ],
    });

    expect(createdReq).toBeDefined();
    expect(createdReq.id).toBeDefined();
    expect(createdReq.status).toBe('draft');

    // Verify initial step statuses are 'waiting'
    const initialStepsRes = await client.query(`
      SELECT id, type, status, entered_at FROM approval_steps
      WHERE request_id = $1
      ORDER BY order_index ASC;
    `, [createdReq.id]);

    expect(initialStepsRes.rows).toHaveLength(2);
    expect(initialStepsRes.rows[0].status).toBe('waiting');
    expect(initialStepsRes.rows[1].status).toBe('waiting');

    // 2. Submit the request through production submitRequest()
    await submitRequest(createdReq.id, requesterId, tenantId);

    // 3. Verify request is now 'pending'
    const reqCheck = await client.query(`
      SELECT status FROM approval_requests WHERE id = $1;
    `, [createdReq.id]);
    expect(reqCheck.rows[0].status).toBe('pending');

    // 4. Verify steps after submission:
    // - Direct Approver in Stage 0 MUST be 'pending' with entered_at
    // - Reference Approver MUST be 'pending' with entered_at
    const postSubmitStepsRes = await client.query(`
      SELECT id, type, status, entered_at FROM approval_steps
      WHERE request_id = $1
      ORDER BY order_index ASC;
    `, [createdReq.id]);

    const directStep = postSubmitStepsRes.rows.find((s) => s.type === 'GENERAL');
    const refStep = postSubmitStepsRes.rows.find((s) => s.type === 'REFERENCE');

    expect(directStep.status).toBe('pending');
    expect(directStep.entered_at).not.toBeNull();

    expect(refStep.status).toBe('pending');
    expect(refStep.entered_at).not.toBeNull();
  });
});
