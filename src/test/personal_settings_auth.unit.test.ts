import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCurrentUser, from } = vi.hoisted(() => ({ getCurrentUser: vi.fn(), from: vi.fn() }));

vi.mock('@/lib/db/users', () => ({ getCurrentUser }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: { from } }));
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { removeUserAvatarAction, updateProfileAndSettingsAction, uploadUserAvatarAction } from '@/app/[tenant]/settings/actions';

describe('personal settings authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an unauthenticated profile update before any service-role write', async () => {
    getCurrentUser.mockRejectedValue(new Error('Unauthenticated'));
    await expect(updateProfileAndSettingsAction('Changed', {})).rejects.toThrow('Unauthenticated');
    expect(from).not.toHaveBeenCalled();
  });

  it('scopes a profile update to the authenticated user and tenant', async () => {
    getCurrentUser.mockResolvedValue({ id: 'self', tenant_id: 'tenant-a' });
    const eq = vi.fn();
    const query = { eq };
    eq.mockReturnValueOnce(query).mockReturnValueOnce({ error: null });
    const update = vi.fn().mockReturnValue(query);
    from.mockReturnValue({ update });

    await updateProfileAndSettingsAction('Changed', { theme: 'dark' });

    expect(from).toHaveBeenCalledWith('users');
    expect(eq).toHaveBeenNthCalledWith(1, 'id', 'self');
    expect(eq).toHaveBeenNthCalledWith(2, 'tenant_id', 'tenant-a');
  });

  it('rejects an unauthenticated avatar removal before any service-role write', async () => {
    getCurrentUser.mockRejectedValue(new Error('Unauthenticated'));
    await expect(removeUserAvatarAction()).rejects.toThrow('Unauthenticated');
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated avatar upload before any service-role write', async () => {
    getCurrentUser.mockRejectedValue(new Error('Unauthenticated'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(uploadUserAvatarAction('aGVsbG8=', 'image/png'))
        .resolves.toMatchObject({ success: false });
      expect(from).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});
