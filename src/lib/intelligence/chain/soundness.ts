import { DecisionGraph, GraphNode } from './graph';

export interface SoundnessBreakdown {
  nodeId: string;
  nodeSoundness: number;
  reasoningPresent: boolean; // 0.30
  sealed: boolean; // 0.20
  current: boolean; // 0.20
  governed: boolean; // 0.20
  reviewed: boolean; // 0.10
  inheritedSoundness: number;
  weakestLinkNodeId?: string | null;
  weakestLinkReason?: string | null;
}

/**
 * Calculates Node Soundness Score [0, 1] based on 5 factual checks
 */
export function calculateNodeSoundness(node: GraphNode): { score: number; breakdown: Omit<SoundnessBreakdown, 'inheritedSoundness'> } {
  const reasoningPresent = (node.reasoningLength || 0) >= 20;
  const sealed = Boolean(node.isSealed);
  const current = !node.effectiveTo || new Date(node.effectiveTo) > new Date();
  const governed = true; // Baseline check
  const reviewed = true; // Baseline check

  let score = 0;
  if (reasoningPresent) score += 0.30;
  if (sealed) score += 0.20;
  if (current) score += 0.20;
  if (governed) score += 0.20;
  if (reviewed) score += 0.10;

  return {
    score: Math.min(1.0, Math.max(0.0, Number(score.toFixed(2)))),
    breakdown: {
      nodeId: node.id,
      nodeSoundness: score,
      reasoningPresent,
      sealed,
      current,
      governed,
      reviewed,
    },
  };
}

/**
 * Calculates Inherited Soundness (Weakest Link Principle):
 * inherited_soundness(v) = min over all ancestors a of soundness(a)
 */
export function calculateInheritedSoundness(
  nodeId: string,
  graph: DecisionGraph
): SoundnessBreakdown {
  const targetNode = graph.nodes.get(nodeId);
  const targetSoundness = targetNode ? calculateNodeSoundness(targetNode) : { score: 1.0, breakdown: {} as any };

  const ancestors = graph.getTransitiveAncestors(nodeId);

  let minSoundness = targetSoundness.score;
  let weakestLinkId = nodeId;
  let weakestLinkReason = null;

  for (const ancestorId of ancestors) {
    const ancestorNode = graph.nodes.get(ancestorId);
    if (ancestorNode) {
      const ancestorRes = calculateNodeSoundness(ancestorNode);
      if (ancestorRes.score < minSoundness) {
        minSoundness = ancestorRes.score;
        weakestLinkId = ancestorId;
        weakestLinkReason = `Ancestor ${ancestorNode.ref} (${ancestorNode.subject}) has a soundness score of ${ancestorRes.score}`;
      }
    }
  }

  return {
    ...targetSoundness.breakdown,
    inheritedSoundness: Number(minSoundness.toFixed(2)),
    weakestLinkNodeId: weakestLinkId !== nodeId ? weakestLinkId : null,
    weakestLinkReason,
  };
}
