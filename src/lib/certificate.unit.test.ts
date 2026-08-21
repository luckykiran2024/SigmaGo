import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';

describe('Cryptographic Seal & Checksum Verification', () => {
  it('should compute a valid 64-character hex SHA-256 digest', () => {
    const payload = JSON.stringify({
      id: 'req-123',
      tenantId: 'tenant-456',
      subject: 'Q3 Marketing Budget Increase',
      body: { text: 'Request details' },
      conditions: [],
      customFields: {},
      beneficiaryId: 'user-789',
      ownerId: 'user-000',
      version: 1,
      steps: [
        { id: 'step-1', order: 1, approver: 'user-mgr', status: 'approved', actedAt: '2026-08-04T00:00:00Z' }
      ]
    });

    const checksum = createHash('sha256').update(payload, 'utf8').digest('hex');

    expect(checksum).toBeTypeOf('string');
    expect(checksum.length).toBe(64);
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should detect payload tampering when content is modified', () => {
    const originalPayload = JSON.stringify({ subject: 'Approved Budget $50,000' });
    const tamperedPayload = JSON.stringify({ subject: 'Approved Budget $500,000' });

    const originalHash = createHash('sha256').update(originalPayload, 'utf8').digest('hex');
    const tamperedHash = createHash('sha256').update(tamperedPayload, 'utf8').digest('hex');

    expect(originalHash).not.toEqual(tamperedHash);
  });
});
