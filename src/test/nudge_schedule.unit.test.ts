import { describe, expect, it } from 'vitest';
import { isApprovalReminderDue } from '../jobs/nudgeSchedule';

describe('approval reminder schedule', () => {
  const now = new Date('2026-10-25T10:30:00.000Z');

  it('does not send before the configured first-reminder delay', () => {
    expect(isApprovalReminderDue({ hoursPending: 47, delayHours: 48, intervalHours: 24, now })).toBe(false);
  });

  it('sends the first reminder once the delay has elapsed', () => {
    expect(isApprovalReminderDue({ hoursPending: 48, delayHours: 48, intervalHours: 24, now })).toBe(true);
  });

  it('waits for the configured interval since the last successful send', () => {
    expect(isApprovalReminderDue({
      hoursPending: 96,
      delayHours: 48,
      intervalHours: 24,
      lastSentAt: '2026-10-24T11:00:00.000Z',
      now,
    })).toBe(false);
    expect(isApprovalReminderDue({
      hoursPending: 96,
      delayHours: 48,
      intervalHours: 24,
      lastSentAt: '2026-10-24T10:30:00.000Z',
      now,
    })).toBe(true);
  });

  it('handles delayed daily scans without missing a reminder window', () => {
    expect(isApprovalReminderDue({
      hoursPending: 72,
      delayHours: 48,
      intervalHours: 24,
      lastSentAt: '2026-10-24T08:00:00.000Z',
      now,
    })).toBe(true);
  });

  it('does not treat invalid or non-positive timing settings as due', () => {
    expect(isApprovalReminderDue({ hoursPending: 72, delayHours: 0, intervalHours: 24, now })).toBe(false);
    expect(isApprovalReminderDue({ hoursPending: 72, delayHours: 48, intervalHours: Number.NaN, now })).toBe(false);
  });
});
