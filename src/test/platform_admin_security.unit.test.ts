import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  const originalEnv = process.env.PLATFORM_ADMIN_EMAILS;

  beforeEach(() => {
    mockGetUser.mockReset();
    // Configure explicit admin emails for testing
    process.env.PLATFORM_ADMIN_EMAILS = 'superadmin@sigmago.com,admin@sigmago.com';
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.PLATFORM_ADMIN_EMAILS = originalEnv;
    } else {
      delete process.env.PLATFORM_ADMIN_EMAILS;
    }
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

  it('3. Rejects user_metadata-based admin claims (user-writable, untrusted)', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-spoof-attempt-1',
          email: 'attacker@evil.com',
          user_metadata: { is_platform_admin: true }, // User-writable, MUST NOT be trusted
          app_metadata: {},
        },
      },
      error: null,
    });

    await expect(assertPlatformAdmin()).rejects.toThrow(
      'Forbidden: Platform Administrator privileges required.'
    );
  });

  it('4. Authorizes configured platform super-admin email from PLATFORM_ADMIN_EMAILS', async () => {
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

  it('5. Authorizes user with verified is_platform_admin app_metadata flag', async () => {
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

  it('6. Rejects when PLATFORM_ADMIN_EMAILS is empty and no app_metadata flag', async () => {
    delete process.env.PLATFORM_ADMIN_EMAILS;

    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-no-config-1',
          email: 'superadmin@sigmago.com',
          app_metadata: {},
        },
      },
      error: null,
    });

    // Without PLATFORM_ADMIN_EMAILS configured, even @sigmago.com emails are rejected
    await expect(assertPlatformAdmin()).rejects.toThrow(
      'Forbidden: Platform Administrator privileges required.'
    );
  });
});
