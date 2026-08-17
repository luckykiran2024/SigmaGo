/**
 * RRRR Decision Lifecycle State Engine — Build Prompt #12
 * Computed dynamically at runtime from existing request data (§1 Invariant).
 * NEVER stored in the database.
 */

export interface RequestLifecycleInput {
  id: string;
  refCode: string;
  reasoning?: string | null;
  sealed?: boolean;
  finalizedAt?: string | Date | null;
  referenceCount?: number;
}

export interface LifecycleState {
  state: 'full' | 'partial' | 'none';
  label: string;
  copy: string;
  tooltip: string;
}

export function decisionLifecycle(req: RequestLifecycleInput): {
  recorded: LifecycleState;
  retrievable: LifecycleState;
  provable: LifecycleState;
  reusable: LifecycleState;
} {
  const hasReasoning = Boolean(req.reasoning && req.reasoning.trim().length > 0);
  const isSealed = Boolean(req.sealed || req.finalizedAt);
  const refCount = req.referenceCount || 0;

  return {
    recorded: {
      state: hasReasoning ? 'full' : 'partial',
      label: 'RECORDED',
      copy: hasReasoning ? 'Reasoning attached at approval' : 'Approved without reasoning',
      tooltip: 'What was weighed, recorded at the time of decision.',
    },
    retrievable: {
      state: 'full',
      label: 'RETRIEVABLE',
      copy: `Permanent address · ${req.refCode}`,
      tooltip: 'Every decision here has a permanent address. That is not true of an inbox.',
    },
    provable: {
      state: isSealed ? 'full' : 'none',
      label: 'PROVABLE',
      copy: isSealed ? 'Sealed · SHA-256 · unaltered' : 'Not yet sealed — pending finalisation',
      tooltip: 'Authority, sequence, reasoning and integrity, verifiable by someone who was not present.',
    },
    reusable: {
      state: refCount > 0 ? 'full' : 'none',
      label: 'REUSABLE',
      copy: refCount > 0 ? `Cited by ${refCount} later ${refCount === 1 ? 'decision' : 'decisions'}` : 'No precedent linked yet',
      tooltip: 'When a similar decision is raised, this one will be surfaced as precedent.',
    },
  };
}
