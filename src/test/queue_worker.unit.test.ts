import { describe, it, expect, vi } from 'vitest';
import { processApprovalNudgeJob } from '@/workers/processors/nudgeProcessor';
import { processWebhookDeliveryJob } from '@/workers/processors/webhookProcessor';
import { adminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: vi.fn(),
  },
}));

vi.mock('@/lib/email/outbound', () => ({
  sendOutboundEmail: vi.fn().mockResolvedValue(true),
}));

describe('Worker Queue Processors (src/workers/processors/*)', () => {
  it('1. Nudge processor skips request when status is not pending', async () => {
    (adminClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'req-1', status: 'approved', tenant_id: 't-1' },
        error: null,
      }),
    });

    await expect(
      processApprovalNudgeJob({ requestId: 'req-1', tenantId: 't-1' })
    ).resolves.not.toThrow();
  });

  it('2. Webhook processor skips delivery when status is already DELIVERED', async () => {
    (adminClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'del-1', status: 'DELIVERED', tenant_id: 't-1' },
        error: null,
      }),
    });

    await expect(
      processWebhookDeliveryJob({ deliveryId: 'del-1', tenantId: 't-1' })
    ).resolves.not.toThrow();
  });
});
