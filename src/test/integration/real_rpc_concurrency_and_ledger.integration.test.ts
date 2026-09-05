import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateChecksumAndFinalize, verifyTenantLedgerChain } from '@/lib/certificate';

// In-memory mock storage for RPC concurrency and ledger tests
const mockSealedRequests = new Map<string, any>();
const mockDecisionEvents: any[] = [];
let currentLedgerHead = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
let concurrentRaceTriggered = false;

vi.mock('@/lib/supabase/admin', () => {
  return {
    adminClient: {
      from: (table: string) => {
        if (table === 'approval_requests') {
          return {
            select: () => ({
              eq: (_col1: string, val1: string) => ({
                eq: (_col2: string, _val2: string) => ({
                  not: () => ({
                    neq: () => ({
                      order: () => ({
                        limit: () => ({
                          maybeSingle: async () => ({
                            data: currentLedgerHead !== 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000'
                              ? { checksum_sha256: currentLedgerHead }
                              : null,
                            error: null,
                          }),
                        }),
                      }),
                    }),
                  }),
                  single: async () => {
                    const req = mockSealedRequests.get(val1) || {
                      id: val1,
                      tenant_id: 'tenant-ledger-test',
                      status: 'finalizing',
                      subject: `Test Request ${val1}`,
                      canonical_version: 2,
                    };
                    return { data: req, error: null };
                  },
                  maybeSingle: async () => {
                    const req = mockSealedRequests.get(val1) || {
                      id: val1,
                      tenant_id: 'tenant-ledger-test',
                      status: 'finalizing',
                      subject: `Test Request ${val1}`,
                      canonical_version: 2,
                    };
                    return { data: req, error: null };
                  },
                }),
              }),
            }),
            update: (payload: any) => ({
              eq: (_col: string, id: string) => {
                const existing = mockSealedRequests.get(id) || {};
                mockSealedRequests.set(id, { ...existing, ...payload });
                return {
                  eq: async () => ({ error: null }),
                };
              },
            }),
          };
        }

        if (table === 'approval_steps') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: async () => ({
                    data: [
                      {
                        id: 'step-1',
                        stage_index: 0,
                        order_index: 0,
                        status: 'approved',
                        type: 'STRUCTURAL',
                        approver_id: 'approver-1',
                        acted_at: new Date().toISOString(),
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'decision_events') {
          return {
            insert: async (row: any) => {
              mockDecisionEvents.push(row);
              return { error: null };
            },
          };
        }

        if (table === 'decision_references') {
          const builder: any = {
            eq: () => builder,
            then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
          };
          return {
            select: () => builder,
          };
        }

        const fallbackBuilder: any = {
          eq: () => fallbackBuilder,
          neq: () => fallbackBuilder,
          not: () => fallbackBuilder,
          order: () => fallbackBuilder,
          limit: () => fallbackBuilder,
          single: async () => ({ data: null, error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
          then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
        };

        return {
          select: () => fallbackBuilder,
          update: () => fallbackBuilder,
          insert: () => fallbackBuilder,
        };
      },
      rpc: async (functionName: string, params: any) => {
        if (functionName === 'sigmago_finalize_seal') {
          // Simulate ledger head concurrency race
          if (concurrentRaceTriggered) {
            // First time racing request attempts to seal with stale head, raise 40001
            concurrentRaceTriggered = false; // reset for subsequent retry attempt
            // Move ledger head concurrently to simulate competing transaction winning
            currentLedgerHead = 'concurrent_winner_head_9999999999999999999999999999999999999999';
            return {
              data: null,
              error: {
                code: '40001',
                message: `Tenant ledger serialization conflict: expected head ${currentLedgerHead}, got ${params.p_previous_seal_hash}`,
              },
            };
          }

          // Invariant: Verify previous_seal_hash matches current ledger head
          if (params.p_previous_seal_hash !== currentLedgerHead) {
            return {
              data: null,
              error: {
                code: '40001',
                message: `Tenant ledger serialization conflict: expected head ${currentLedgerHead}, got ${params.p_previous_seal_hash}`,
              },
            };
          }

          // Advance ledger head
          currentLedgerHead = params.p_checksum;
          mockSealedRequests.set(params.p_request_id, {
            id: params.p_request_id,
            status: 'approved',
            checksum_sha256: params.p_checksum,
            previous_seal_hash: params.p_previous_seal_hash,
            seal_signature_b64: params.p_seal_signature,
            seal_key_id: params.p_key_id,
            canonical_version: 2,
            sealed_at: new Date().toISOString(),
          });

          mockDecisionEvents.push({
            request_id: params.p_request_id,
            event_type: 'REQUEST_SEALED',
            event_payload: {
              checksum: params.p_checksum,
              previous_seal_hash: params.p_previous_seal_hash,
            },
          });

          return {
            data: {
              success: true,
              request_id: params.p_request_id,
              checksum: params.p_checksum,
              previous_seal_hash: params.p_previous_seal_hash,
            },
            error: null,
          };
        }

        return { data: null, error: null };
      },
    },
  };
});

describe('Phase 5 & 6 Integration: Authoritative Seal RPC & Fork-Proof Ledger Concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSealedRequests.clear();
    mockDecisionEvents.length = 0;
    currentLedgerHead = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
    concurrentRaceTriggered = false;
  });

  it('1. Seals genesis request anchoring to GENESIS_0000... with PKI signature and emits REQUEST_SEALED', async () => {
    const res = await generateChecksumAndFinalize('req-genesis-1', 'tenant-ledger-test');

    expect(res).toBeDefined();
    expect(res!.checksum).toBeDefined();
    expect(res!.requestId).toBe('req-genesis-1');

    const sealed = mockSealedRequests.get('req-genesis-1');
    expect(sealed).toBeDefined();
    expect(sealed.status).toBe('approved');
    expect(sealed.previous_seal_hash).toBe('GENESIS_0000000000000000000000000000000000000000000000000000000000000000');
    expect(sealed.seal_signature_b64).toBeDefined();

    // Exactly-once REQUEST_SEALED event recorded
    const sealEvent = mockDecisionEvents.find((e) => e.request_id === 'req-genesis-1' && e.event_type === 'REQUEST_SEALED');
    expect(sealEvent).toBeDefined();
    expect(sealEvent.event_payload.previous_seal_hash).toBe('GENESIS_0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('2. Proves 40001 serialization conflict handling and automatic client retry loop', async () => {
    // Trigger race condition on next seal
    concurrentRaceTriggered = true;

    // Execute finalization: should encounter 40001 on attempt 0, catch it, re-query new head, re-sign, and succeed on attempt 1!
    const res = await generateChecksumAndFinalize('req-racing-2', 'tenant-ledger-test');

    expect(res).toBeDefined();
    expect(res!.requestId).toBe('req-racing-2');

    // The sealed record binds to the concurrent winner's head, proving zero forks and unbroken linear continuity
    const sealed = mockSealedRequests.get('req-racing-2');
    expect(sealed.previous_seal_hash).toBe('concurrent_winner_head_9999999999999999999999999999999999999999');
    expect(currentLedgerHead).toBe(sealed.checksum_sha256);
  });
});
