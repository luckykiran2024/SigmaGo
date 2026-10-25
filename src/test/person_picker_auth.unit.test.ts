import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireTenantMember, from } = vi.hoisted(() => ({ requireTenantMember: vi.fn(), from: vi.fn() }));

vi.mock('@/lib/auth/guards', () => ({ requireTenantMember }));
vi.mock('@/lib/supabase/admin', () => ({ adminClient: { from } }));

import { getUserByIdAction, searchUsersAction } from '@/components/ui/personPickerActions';

describe('person picker tenant authorization', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects another tenant before searching users', async () => {
    requireTenantMember.mockRejectedValue(new Error('Forbidden'));
    await expect(searchUsersAction('alice', 'other-tenant')).rejects.toThrow('Forbidden');
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated lookup before reading a user', async () => {
    requireTenantMember.mockRejectedValue(new Error('Unauthorized'));
    await expect(getUserByIdAction('user-1', 'tenant-a')).rejects.toThrow('Unauthorized');
    expect(from).not.toHaveBeenCalled();
  });

  it('constrains lookup to the session tenant', async () => {
    requireTenantMember.mockResolvedValue({ tenantId: 'tenant-a' });
    const query = { eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    query.eq.mockReturnValue(query);
    from.mockReturnValue({ select: vi.fn().mockReturnValue(query) });

    await getUserByIdAction('user-1', 'tenant-a');

    expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(query.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a');
  });
});
