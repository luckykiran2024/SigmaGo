/**
 * Centralized Microcopy Dictionary — Build Prompt #12
 * All user-facing strings live in this file (Acceptance Criterion #12).
 */

export const VOCABULARY = {
  // Tier 1 — Plain language (Unchanged)
  nav: {
    dashboard: 'Dashboard',
    approvals: 'Approvals',
    decisionRecord: 'Decision Record',
    policies: 'Policies',
    delegations: 'Delegations',
    admin: 'Admin',
  },

  // Tier 2 — Owned Vocabulary
  metrics: {
    needsYourApproval: 'Needs your approval', // Replaces "Action Required"
    raisedByMe: 'Raised by me', // Replaces "My Submissions"
    sealedThisMonth: 'Sealed this month',
    policiesDrifting: 'Policies drifting',
  },

  // Confirmations (§5 Microcopy)
  confirmations: {
    requestSent: (approverName: string) => `Recorded. Now with ${approverName}.`,
    midChainApproval: (nextApproverName: string) =>
      `Approved. Passed to ${nextApproverName}. Your reasoning is on the record.`,
    finalApproval: 'Sealed. This decision can now be proved to anyone, at any time.',
    rejected: 'Recorded as rejected. The reasoning is kept — a rejection is a decision.',
    precedentLinked: 'Linked. This decision will now surface when similar ones are raised.',
    policyPublished: 'Recorded with reasoning. The next person to read this policy will know why it exists.',
  },

  // Empty States (§5 Microcopy — Teaching empty states)
  emptyStates: {
    noDecisionsYet:
      'Nothing recorded yet. Every decision made here will be findable in seconds, provable to an outsider, and available as precedent for the next one.',
    noSearchResults:
      'No decision matches that. If it happened outside SigmaGo, it was never recorded — which is the problem this exists to solve.',
    noPrecedentLinked:
      'No precedent yet. When a similar decision is raised, this one will surface automatically.',
    nothingAwaitingYou: 'Nothing waiting on you. Your queue is clear.',
    noPoliciesDefined:
      'No policies recorded yet. A policy here carries its reasoning, so the next person to read it knows why it exists.',
    noExceptions: 'No exceptions. This policy is holding.',
  },

  // Search Results Footer (§5 Microcopy)
  searchFooter: (count: number, secondsText: string = '0.4s') =>
    `${count} ${count === 1 ? 'decision' : 'decisions'} retrieved in ${secondsText}`,

  // Errors — Never blame the user (§5 Microcopy)
  errors: {
    reasoningTooShort:
      'Reasoning needs at least 40 characters. It is the field that will matter most in two years.',
    unauthorizedCategory: (authorityName?: string) =>
      authorityName
        ? `You do not hold approval authority for this category. ${authorityName} does.`
        : 'You do not hold approval authority for this category.',
    requestNotFound:
      'No decision with that reference. It may have been raised in a different tenant.',
    policyRequired:
      'This category requires the policy being excepted. An exception with no rule attached cannot be counted.',
  },

  // Notification & Email Subjects (§6)
  emailSubjects: {
    waitingOnYou: (subject: string) => `Waiting on you: ${subject}`,
    agingPastTarget: (days: number, subject: string) =>
      `${days} days waiting: ${subject}`,
    sealed: (refCode: string) => `Sealed: ${refCode} — certificate attached`,
    referenceAdded: (refCode: string) => `Your view is being asked on ${refCode}`,
    exceptionThresholdReached: (policyName: string, count: number) =>
      `${policyName} has now been excepted ${count} times this year`,
  },
};
