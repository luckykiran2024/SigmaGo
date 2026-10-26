import { DecisionGraph } from './graph';

export interface StructureMetrics {
  totalDecisions: number;
  transactionalCount: number;
  orphanCount: number;
  orphanRate: number; // percentage of transactional decisions with no Process/Structural ancestor
  orphanScore?: number; // percentage of decisions without reference (0 - 100)
  articulationPointIds: string[];
  depthDistribution: Record<number, number>; // hop depth -> count of decisions
}

export interface OrphanMetrics {
  totalDecisions: number;
  connectedCount: number;
  connectedRate: number; // e.g. 94.0 (%)
  orphanCount: number;
  orphanScore: number; // e.g. 6.0 (%) = (orphanCount / totalDecisions) * 100
  orphanIds: string[];
  status: 'HEALTHY' | 'WATCH' | 'CRITICAL';
}

/**
 * Calculates Orphan Metrics across all approvals/decisions.
 * Approvals without an incoming, outgoing, or policy reference are defined as Orphans.
 * Orphan Score = (Orphan Decisions / Total Decisions) * 100
 */
export function calculateOrphanMetrics(
  nodes: Array<{ id: string }>,
  edges: Array<{ sourceId: string; targetId?: string | null; toPolicyId?: string | null }>
): OrphanMetrics {
  const totalDecisions = nodes.length;
  if (totalDecisions === 0) {
    return {
      totalDecisions: 0,
      connectedCount: 0,
      connectedRate: 100,
      orphanCount: 0,
      orphanScore: 0,
      orphanIds: [],
      status: 'HEALTHY',
    };
  }

  const connectedIds = new Set<string>();
  edges.forEach((edge) => {
    if (edge.sourceId) connectedIds.add(edge.sourceId);
    if (edge.targetId) connectedIds.add(edge.targetId);
  });

  const orphanIds: string[] = [];
  nodes.forEach((node) => {
    if (!connectedIds.has(node.id)) {
      orphanIds.push(node.id);
    }
  });

  const orphanCount = orphanIds.length;
  const connectedCount = totalDecisions - orphanCount;
  const orphanScore = Math.round((orphanCount / totalDecisions) * 1000) / 10;
  const connectedRate = Math.round((connectedCount / totalDecisions) * 1000) / 10;

  const status: 'HEALTHY' | 'WATCH' | 'CRITICAL' =
    orphanScore <= 10 ? 'HEALTHY' : orphanScore <= 25 ? 'WATCH' : 'CRITICAL';

  return {
    totalDecisions,
    connectedCount,
    connectedRate,
    orphanCount,
    orphanScore,
    orphanIds,
    status,
  };
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
  const orphanScore = totalDecisions > 0 ? Number(((orphanCount / totalDecisions) * 100).toFixed(1)) : 0;

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
    orphanScore,
    articulationPointIds,
    depthDistribution,
  };
}
