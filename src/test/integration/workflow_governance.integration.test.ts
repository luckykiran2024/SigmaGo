import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server Supabase client
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock users helper
const mockGetProfile = vi.fn();
vi.mock('@/lib/db/users', () => ({
  getProfileForAuthUser: mockGetProfile,
}));

// In-memory mock store for admin client
const mockDecisionEvents: any[] = [];
const mockCreatedRequests: any[] = [];
const mockCreatedSteps: any[] = [];

vi.mock('@/lib/supabase/admin', () => {
  return {
    adminClient: {
      from: (table: string) => {
        if (table === 'tenants') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: '00000000-0000-0000-0000-000000000001', subdomain: 'acme' },
                  error: null,
                }),
              }),
            }),
          };
        }

        if (table === 'categories') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: 'cat-001',
                      name: 'Capex Request',
                      validity_mode: 'NONE',
                      tenant_id: '00000000-0000-0000-0000-000000000001',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  in: async (_col: string, ids: string[]) => ({
                    data: ids.map((id) => ({ id, status: 'active' })),
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }

        if (table === 'policies') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }),
          };
        }

        if (table === 'workflows') {
          return {
            select: () => ({
              eq: (_col: string, _val: string) => ({
                eq: (_col2: string, wfId: string) => ({
                  maybeSingle: async () => {
                    if (wfId === 'wf-locked') {
                      return {
                        data: {
                          id: 'wf-locked',
                          name: 'Locked Governance Workflow',
                          category_id: 'cat-001',
                          is_locked: true,
                          steps: [
                            { userId: 'user-approver-1', role: 'GENERAL' },
                            { userId: 'user-approver-2', role: 'GENERAL' },
                          ],
                          base_step_type: 'STRUCTURAL',
                          default_sla_hours: 48,
                          current_version_number: 1,
                          classification_rules_json: {},
                        },
                        error: null,
                      };
                    }
                    if (wfId === 'wf-unlocked') {
                      return {
                        data: {
                          id: 'wf-unlocked',
                          name: 'Editable Standard Workflow',
                          category_id: 'cat-001',
                          is_locked: false,
                          steps: [
                            { userId: 'user-approver-1', role: 'GENERAL' },
                            { userId: 'user-approver-2', role: 'GENERAL' },
                          ],
                          base_step_type: 'TRANSACTIONAL',
                          default_sla_hours: 24,
                          current_version_number: 1,
                          classification_rules_json: {},
                        },
                        error: null,
                      };
                    }
                    return { data: null, error: null };
                  },
                }),
              }),
            }),
          };
        }

        if (table === 'workflow_versions') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    order: () => ({
                      limit: () => ({
                        maybeSingle: async () => ({
                          data: {
                            id: 'wf-ver-001',
                            version_number: 1,
                            base_step_type: 'STRUCTURAL',
                            steps_json: [
                              { userId: 'user-approver-1', role: 'GENERAL' },
                              { userId: 'user-approver-2', role: 'GENERAL' },
                            ],
                          },
                          error: null,
                        }),
                      }),
                    }),
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

        if (table === 'approval_requests') {
          return {
            insert: (row: any) => ({
              select: () => ({
                single: async () => {
                  const created = { id: `req-${Date.now()}`, ...row };
                  mockCreatedRequests.push(created);
                  return { data: created, error: null };
                },
              }),
            }),
            update: () => {
              const builder: any = {
                eq: () => builder,
                then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
              };
              return builder;
            },
            select: () => {
              const builder: any = {
                eq: () => builder,
                single: async () => ({ data: mockCreatedRequests[0] || null, error: null }),
                maybeSingle: async () => ({ data: mockCreatedRequests[0] || null, error: null }),
              };
              return builder;
            },
          };
        }

        if (table === 'approval_steps') {
          return {
            insert: async (rows: any[]) => {
              mockCreatedSteps.push(...rows);
              return { error: null };
            },
            update: () => {
              const builder: any = {
                eq: () => builder,
                then: (resolve: any) => Promise.resolve({ error: null }).then(resolve),
              };
              return builder;
            },
            select: () => {
              const builder: any = {
                eq: () => builder,
                then: (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve),
              };
              return builder;
            },
          };
        }

        if (table === 'audit_log') {
          return {
            insert: async () => ({ error: null }),
          };
        }

        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        };
      },
      rpc: async () => ({ data: { success: true }, error: null }),
    },
  };
});

describe('Phase 2 Integration: Server-Authoritative Workflow Governance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecisionEvents.length = 0;
    mockCreatedRequests.length = 0;
    mockCreatedSteps.length = 0;

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'auth-user-001',
          email: 'requester@acme.com',
        },
      },
    });

    mockGetProfile.mockResolvedValue({
      id: 'profile-user-001',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      name: 'Test Requester',
    });
  });

  it('1. Locked Workflow strictly overrides client route tampering with workflow_version.steps_json', async () => {
    const { submitNewRequest } = await import('@/app/[tenant]/requests/new/actions');

    const formData = new FormData();
    formData.append('subject', 'Server Purchase');
    formData.append('category', 'cat-001');
    formData.append('workflow_id', 'wf-locked');

    // Tampered client path: client attempts to self-approve with only 1 rogue approver
    const tamperedClientPath = [
      { userId: 'user-rogue-attacker', role: 'GENERAL' },
    ];

    const result = await submitNewRequest(
      formData,
      { text: 'Urgent server purchase' },
      'acme',
      tamperedClientPath
    );

    expect(result.success).toBe(true);

    // Assert: The created steps strictly match the authoritative workflow steps, NOT the tampered client path!
    expect(mockCreatedSteps.length).toBe(2);
    expect(mockCreatedSteps[0].approver_id).toBe('user-approver-1');
    expect(mockCreatedSteps[1].approver_id).toBe('user-approver-2');

    // Assert: Rogue attacker was completely overridden and discarded
    const rogueFound = mockCreatedSteps.some((s) => s.approver_id === 'user-rogue-attacker');
    expect(rogueFound).toBe(false);

    // Assert: WORKFLOW_RESOLVED was emitted
    const resolvedEvent = mockDecisionEvents.find((e) => e.event_type === 'WORKFLOW_RESOLVED');
    expect(resolvedEvent).toBeDefined();
    expect(resolvedEvent.workflow_id).toBe('wf-locked');

    // Assert: No PATH_CHANGED event on locked workflow because client route was rejected
    const pathChangedEvent = mockDecisionEvents.find((e) => e.event_type === 'PATH_CHANGED');
    expect(pathChangedEvent).toBeUndefined();
  });

  it('2. Unlocked Workflow allows route customization, stores expected vs observed path, and emits PATH_CHANGED', async () => {
    const { submitNewRequest } = await import('@/app/[tenant]/requests/new/actions');

    const formData = new FormData();
    formData.append('subject', 'Consulting Services');
    formData.append('category', 'cat-001');
    formData.append('workflow_id', 'wf-unlocked');

    // Customized client path: requester added a third peer reviewer
    const customizedClientPath = [
      { userId: 'user-approver-1', role: 'GENERAL' },
      { userId: 'user-approver-2', role: 'GENERAL' },
      { userId: 'user-approver-3', role: 'PARALLEL' },
    ];

    const result = await submitNewRequest(
      formData,
      { text: 'Contract for external advisory' },
      'acme',
      customizedClientPath
    );

    expect(result.success).toBe(true);

    // Assert: The created request preserved the client's customized steps
    expect(mockCreatedSteps.length).toBe(3);
    expect(mockCreatedSteps[2].approver_id).toBe('user-approver-3');

    // Assert: The request's workflow_snapshot stores both expected_path_json and observed_path_json
    const createdReq = mockCreatedRequests[0];
    expect(createdReq.workflow_snapshot.expected_path_json).toBeDefined();
    expect(createdReq.workflow_snapshot.expected_path_json.length).toBe(2);
    expect(createdReq.workflow_snapshot.observed_path_json).toBeDefined();
    expect(createdReq.workflow_snapshot.observed_path_json.length).toBe(3);

    // Assert: PATH_CHANGED event was emitted with exact deviation metadata
    const pathChangedEvent = mockDecisionEvents.find((e) => e.event_type === 'PATH_CHANGED');
    expect(pathChangedEvent).toBeDefined();
    expect(pathChangedEvent.workflow_id).toBe('wf-unlocked');
    expect(pathChangedEvent.event_payload.deviation.addedSteps).toEqual(['user-approver-3']);
    expect(pathChangedEvent.event_payload.deviation.removedSteps).toEqual([]);
  });

  it('3. Unlocked Workflow with identical route does NOT emit PATH_CHANGED', async () => {
    const { submitNewRequest } = await import('@/app/[tenant]/requests/new/actions');

    const formData = new FormData();
    formData.append('subject', 'Standard Equipment');
    formData.append('category', 'cat-001');
    formData.append('workflow_id', 'wf-unlocked');

    // Exact match with workflow steps
    const identicalPath = [
      { userId: 'user-approver-1', role: 'GENERAL' },
      { userId: 'user-approver-2', role: 'GENERAL' },
    ];

    const result = await submitNewRequest(
      formData,
      { text: 'Monitor replacement' },
      'acme',
      identicalPath
    );

    expect(result.success).toBe(true);

    // Assert: No PATH_CHANGED event when path matches authoritative workflow
    const pathChangedEvent = mockDecisionEvents.find((e) => e.event_type === 'PATH_CHANGED');
    expect(pathChangedEvent).toBeUndefined();
  });
});
