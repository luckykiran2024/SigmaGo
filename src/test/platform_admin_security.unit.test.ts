import { describe, it, expect, vi, beforeEach } from 'vitest';
import { assertPlatformAdmin } from '../lib/platform/auth';

const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  adminClient: {},
}));

describe('Workstream 1: Platform-Admin Role Boundary & Authorization Unit Tests', () => {
  beforeEach(() => {
    mockGetUser.mockReset();
  });

  it('1. Rejects unauthenticated callers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Auth session missing') });
    await expect(assertPlatformAdmin()).rejects.toThrow('Unauthorized: Authentication required');
  });

  it('2. Rejects standard tenant administrators who lack platform credentials', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-tenant-admin-1',
          email: 'admin@acmecorp.com',
          user_metadata: { role: 'admin' },
          app_metadata: {},
        },
      },
      error: null,
    });

    await expect(assertPlatformAdmin()).rejects.toThrow(
      'Forbidden: Platform Administrator privileges required. Standard tenant administrators are not authorized.'
    );
  });

  it('3. Authorizes configured platform super-admin email', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-platform-super-1',
          email: 'superadmin@sigmago.com',
          app_metadata: {},
        },
      },
      error: null,
    });

    const identity = await assertPlatformAdmin();
    expect(identity).toBeDefined();
    expect(identity.email).toBe('superadmin@sigmago.com');
    expect(identity.isPlatformAdmin).toBe(true);
  });

  it('4. Authorizes user with verified is_platform_admin app_metadata flag', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-platform-flagged-1',
          email: 'platform.auditor@external.com',
          app_metadata: { is_platform_admin: true },
        },
      },
      error: null,
    });

    const identity = await assertPlatformAdmin();
    expect(identity).toBeDefined();
    expect(identity.isPlatformAdmin).toBe(true);
  });
});
