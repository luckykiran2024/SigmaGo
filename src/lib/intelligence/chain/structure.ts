import { DecisionGraph } from './graph';

export interface StructureMetrics {
  totalDecisions: number;
  transactionalCount: number;
  orphanCount: number;
  orphanRate: number; // percentage of transactional decisions with no Process/Structural ancestor
  articulationPointIds: string[];
  depthDistribution: Record<number, number>; // hop depth -> count of decisions
}

/**
 * Calculates Orphan Rate, Articulation Points, and Depth Distribution across the decision graph
 */
export function calculateStructureMetrics(graph: DecisionGraph): StructureMetrics {
  const allNodes = Array.from(graph.nodes.values());
  const totalDecisions = allNodes.length;

  const transactionalNodes = allNodes.filter((n) => n.stepType === 'TRANSACTIONAL' || n.stepType === 'EXCEPTION');
  const transactionalCount = transactionalNodes.length;

  let orphanCount = 0;
  const depthDistribution: Record<number, number> = {};

  for (const node of transactionalNodes) {
    const ancestors = graph.getTransitiveAncestors(node.id);
    let depth = 0;
    let hasValidRuleAncestor = false;

    for (const ancId of ancestors) {
      const anc = graph.nodes.get(ancId);
      if (anc) {
        depth++;
        if (anc.stepType === 'STRUCTURAL' || anc.stepType === 'PROCESS') {
          hasValidRuleAncestor = true;
        }
      }
    }

    depthDistribution[depth] = (depthDistribution[depth] || 0) + 1;

    if (!hasValidRuleAncestor) {
      orphanCount++;
    }
  }

  const orphanRate = transactionalCount > 0 ? Number((orphanCount / transactionalCount).toFixed(2)) : 0;

  // Articulation Points Detection (nodes whose removal disconnects the graph)
  const articulationPointIds: string[] = [];
  for (const node of allNodes) {
    if (node.stepType === 'STRUCTURAL' || node.stepType === 'PROCESS') {
      const descendants = graph.getTransitiveDescendants(node.id);
      if (descendants.size >= 3) {
        articulationPointIds.push(node.id);
      }
    }
  }

  return {
    totalDecisions,
    transactionalCount,
    orphanCount,
    orphanRate,
    articulationPointIds,
    depthDistribution,
  };
}
