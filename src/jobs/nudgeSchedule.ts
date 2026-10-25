export interface ApprovalReminderTiming {
  hoursPending: number;
  delayHours: number;
  intervalHours: number;
  lastSentAt?: string | Date | null;
  now?: Date;
}

/**
 * Returns whether an overdue approval should receive a reminder on this scan.
 * Scheduling is based on the last successful send rather than modulo windows,
 * so daily Hobby scans and delayed invocations do not miss reminder boundaries.
 */
export function isApprovalReminderDue({
  hoursPending,
  delayHours,
  intervalHours,
  lastSentAt,
  now = new Date(),
}: ApprovalReminderTiming): boolean {
  if (!Number.isFinite(hoursPending) || !Number.isFinite(delayHours) || !Number.isFinite(intervalHours)) {
    return false;
  }
  if (delayHours <= 0 || intervalHours <= 0 || hoursPending < delayHours) {
    return false;
  }

  if (!lastSentAt) return true;

  const lastSentTime = new Date(lastSentAt).getTime();
  if (!Number.isFinite(lastSentTime)) return true;

  return now.getTime() - lastSentTime >= intervalHours * 60 * 60 * 1000;
}
