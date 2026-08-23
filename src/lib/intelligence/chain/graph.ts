export interface GraphNode {
  id: string;
  ref: string;
  subject: string;
  stepType: 'STRUCTURAL' | 'PROCESS' | 'TRANSACTIONAL' | 'EXCEPTION';
  reasoningLength: number;
  isSealed: boolean;
  effectiveTo?: string | null;
  createdAt: string;
}

export interface GraphEdge {
  sourceId: string; // descendant
  targetId: string; // ancestor/parent
  relationship: 'BASED_ON' | 'EXCEPTION_TO' | 'REPLACES' | 'RENEWAL_OF';
}

export class DecisionGraph {
  nodes: Map<string, GraphNode> = new Map();
  ancestorsMap: Map<string, Set<string>> = new Map(); // id -> set of ancestor ids (looking up)
  descendantsMap: Map<string, Set<string>> = new Map(); // id -> set of descendant ids (looking down)
  edges: GraphEdge[] = [];

  addNode(node: GraphNode) {
    this.nodes.set(node.id, node);
    if (!this.ancestorsMap.has(node.id)) this.ancestorsMap.set(node.id, new Set());
    if (!this.descendantsMap.has(node.id)) this.descendantsMap.set(node.id, new Set());
  }

  addEdge(edge: GraphEdge) {
    this.edges.push(edge);
    if (!this.nodes.has(edge.sourceId) || !this.nodes.has(edge.targetId)) return;

    if (!this.ancestorsMap.has(edge.sourceId)) this.ancestorsMap.set(edge.sourceId, new Set());
    this.ancestorsMap.get(edge.sourceId)!.add(edge.targetId);

    if (!this.descendantsMap.has(edge.targetId)) this.descendantsMap.set(edge.targetId, new Set());
    this.descendantsMap.get(edge.targetId)!.add(edge.sourceId);
  }

  /**
   * Looking Up: Returns all transitive ancestor IDs for a given decision node
   */
  getTransitiveAncestors(nodeId: string): Set<string> {
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const parents = this.ancestorsMap.get(curr);
      if (parents) {
        for (const p of parents) {
          if (!visited.has(p)) {
            visited.add(p);
            queue.push(p);
          }
        }
      }
    }

    return visited;
  }

  /**
   * Looking Down: Returns all transitive descendant IDs for a given decision node (Blast Radius)
   */
  getTransitiveDescendants(nodeId: string): Set<string> {
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const children = this.descendantsMap.get(curr);
      if (children) {
        for (const c of children) {
          if (!visited.has(c)) {
            visited.add(c);
            queue.push(c);
          }
        }
      }
    }

    return visited;
  }
}
