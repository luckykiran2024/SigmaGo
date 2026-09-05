import { describe, it, expect } from 'vitest';
import { DecisionGraph } from '@/lib/intelligence/chain/graph';

describe('Workstream 9: OI Contributor Allocation & Graph Reach Correctness', () => {
  it('Strict Single-Bucket Contributor Allocation Rule', () => {
    // Setup workflows:
    // Category C1 has 2 workflows: W1, W2
    // Category C2 has 1 workflow: W3
    // Category C3 has 0 workflows
    const workflows = [
      { id: 'w1', name: 'Cloud Spend Approvals', category_id: 'c1', base_step_type: 'TRANSACTIONAL' },
      { id: 'w2', name: 'Cloud Architecture Approvals', category_id: 'c1', base_step_type: 'TRANSACTIONAL' },
      { id: 'w3', name: 'Software Licensing', category_id: 'c2', base_step_type: 'TRANSACTIONAL' },
    ];

    const workflowsByCategory: Record<string, any[]> = {};
    workflows.forEach((w) => {
      if (w.category_id) {
        if (!workflowsByCategory[w.category_id]) workflowsByCategory[w.category_id] = [];
        workflowsByCategory[w.category_id].push(w);
      }
    });

    const resolveRequestWorkflowId = (r: { workflow_id?: string | null; category_id?: string | null }): string | null => {
      // 1. workflow_id exists -> allocate only to that workflow
      if (r.workflow_id) {
        return r.workflow_id;
      }
      // 2. workflow_id absent + category maps to exactly one workflow -> legacy category fallback
      if (r.category_id && workflowsByCategory[r.category_id]?.length === 1) {
        return workflowsByCategory[r.category_id][0].id;
      }
      // 3. Otherwise -> unallocated
      return null;
    };

    // Case 1: Request has explicit workflow_id 'w1', category 'c1' (which has both w1 and w2)
    const reqExplicitW1 = { id: 'r1', workflow_id: 'w1', category_id: 'c1' };
    expect(resolveRequestWorkflowId(reqExplicitW1)).toBe('w1');

    // Case 2: Request has explicit workflow_id 'w2', category 'c1'
    const reqExplicitW2 = { id: 'r2', workflow_id: 'w2', category_id: 'c1' };
    expect(resolveRequestWorkflowId(reqExplicitW2)).toBe('w2');

    // Case 3: Request has NO workflow_id, but category 'c2' (which maps to exactly one workflow 'w3')
    const reqLegacyUnique = { id: 'r3', workflow_id: null, category_id: 'c2' };
    expect(resolveRequestWorkflowId(reqLegacyUnique)).toBe('w3');

    // Case 4: Request has NO workflow_id, and category 'c1' (which has 2 workflows)
    // MUST NOT fall into multiple workflows! Must be null (unallocated).
    const reqLegacyAmbiguous = { id: 'r4', workflow_id: null, category_id: 'c1' };
    expect(resolveRequestWorkflowId(reqLegacyAmbiguous)).toBeNull();

    // Case 5: Request has NO workflow_id and unmapped category
    const reqUnmapped = { id: 'r5', workflow_id: null, category_id: 'c3' };
    expect(resolveRequestWorkflowId(reqUnmapped)).toBeNull();
  });

  it('Coverage metrics: Strict verification of workflow_version_id and true policy linkage', () => {
    const requests = [
      // r1: Has workflow, has version pinned, linked to category with governing policy
      { id: 'r1', workflow_id: 'w1', workflow_version_id: 'wv1', category_id: 'c1', categories: { governing_policy_id: 'pol1' } },
      // r2: Has workflow, but NO version pinned, has direct policy reference
      { id: 'r2', workflow_id: 'w1', workflow_version_id: null, category_id: 'c2', categories: { governing_policy_id: null } },
      // r3: Legacy request without workflow, no policy
      { id: 'r3', workflow_id: null, workflow_version_id: null, category_id: 'c3', categories: { governing_policy_id: null } },
    ];

    const policyRefRequestIds = new Set(['r2']); // r2 has direct decision reference to a policy

    const total = requests.length; // 3

    // Workflow Version Coverage must check workflow_version_id, NOT workflow_id
    const workflowVersionCoverage = requests.filter(r => r.workflow_version_id !== null).length / total;
    expect(workflowVersionCoverage).toBeCloseTo(1 / 3);

    // Policy Linkage Coverage must check actual governing policy (NOT plain category presence)
    const policyLinkageCoverage = requests.filter(r => !!(r.categories?.governing_policy_id || policyRefRequestIds.has(r.id))).length / total;
    expect(policyLinkageCoverage).toBeCloseTo(2 / 3);
  });

  it('DecisionGraph: Multi-Hop BFS Transitive Descendant Reach', () => {
    const graph = new DecisionGraph();

    // Root decision A (e.g. strategic board decision)
    // Downstream B and C branch from A
    // Downstream D branches from B
    // Downstream E branches from D
    // A <- B <- D <- E
    // A <- C

    graph.addNode({ id: 'A', ref: 'REQ-A', subject: 'Strategic Cloud Transition', stepType: 'STRUCTURAL', reasoningLength: 50, isSealed: true, createdAt: '2026-01-01' });
    graph.addNode({ id: 'B', ref: 'REQ-B', subject: 'Kubernetes Cluster Architecture', stepType: 'STRUCTURAL', reasoningLength: 40, isSealed: true, createdAt: '2026-01-02' });
    graph.addNode({ id: 'C', ref: 'REQ-C', subject: 'Cloud Security Baseline', stepType: 'STRUCTURAL', reasoningLength: 30, isSealed: true, createdAt: '2026-01-03' });
    graph.addNode({ id: 'D', ref: 'REQ-D', subject: 'Production Node Pool Sizing', stepType: 'TRANSACTIONAL', reasoningLength: 20, isSealed: true, createdAt: '2026-01-04' });
    graph.addNode({ id: 'E', ref: 'REQ-E', subject: 'Spot Instance Configuration', stepType: 'TRANSACTIONAL', reasoningLength: 10, isSealed: true, createdAt: '2026-01-05' });

    // In DecisionGraph: sourceId is descendant, targetId is ancestor (B is based on A)
    graph.addEdge({ sourceId: 'B', targetId: 'A', relationship: 'BASED_ON' });
    graph.addEdge({ sourceId: 'C', targetId: 'A', relationship: 'BASED_ON' });
    graph.addEdge({ sourceId: 'D', targetId: 'B', relationship: 'BASED_ON' });
    graph.addEdge({ sourceId: 'E', targetId: 'D', relationship: 'BASED_ON' });

    // Multi-hop transitive reach for A (Root):
    // Direct children: B, C (2)
    // Transitive children: B, C, D, E (4)
    const descendantsOfA = graph.getTransitiveDescendants('A');
    expect(descendantsOfA.size).toBe(4);
    expect(Array.from(descendantsOfA).sort()).toEqual(['B', 'C', 'D', 'E']);

    // Multi-hop transitive reach for B:
    // Direct children: D (1)
    // Transitive children: D, E (2)
    const descendantsOfB = graph.getTransitiveDescendants('B');
    expect(descendantsOfB.size).toBe(2);
    expect(Array.from(descendantsOfB).sort()).toEqual(['D', 'E']);

    // Leaf node E has 0 descendants
    const descendantsOfE = graph.getTransitiveDescendants('E');
    expect(descendantsOfE.size).toBe(0);
  });
});
