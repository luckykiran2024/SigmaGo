import { Client } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { DecisionGraph } from '../src/lib/intelligence/chain/graph';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function runLiveReferenceTesting() {
  console.log('================================================================');
  console.log('LIVE TESTING: ADDING DECISION REFERENCES & FORMULA IMPACT');
  console.log('================================================================\n');

  const client = new Client({ connectionString });
  await client.connect();
  const tenantId = 'a636403d-55b6-4b33-b755-e4fa1d0c728c'; // Meridian Corp

  // 1. Fetch all requests in Meridian Corp
  const { rows: allReqs } = await client.query(`
    SELECT r.id, r.ref, r.subject, r.resolved_step_type, c.domain
    FROM approval_requests r
    JOIN categories c ON r.category_id = c.id
    WHERE r.tenant_id = $1
    ORDER BY r.ref ASC
  `, [tenantId]);

  console.log(`✓ Loaded ${allReqs.length} enterprise decisions for Meridian Corp.`);
  const reqMap = new Map<string, any>();
  allReqs.forEach(r => reqMap.set(r.ref, r));

  // Function to build DecisionGraph from database and compute live metrics for target
  async function computeLiveMetrics(targetRef: string) {
    const { rows: refRows } = await client.query(`
      SELECT source_id, target_id, relationship
      FROM decision_references
      WHERE tenant_id = $1 AND target_id IS NOT NULL
    `, [tenantId]);

    const graph = new DecisionGraph();
    allReqs.forEach(r => {
      graph.addNode({
        id: r.id,
        ref: r.ref,
        subject: r.subject,
        stepType: r.resolved_step_type || 'TRANSACTIONAL',
        reasoningLength: 100,
        isSealed: true,
        createdAt: new Date().toISOString(),
      });
    });

    refRows.forEach(edge => {
      graph.addEdge({
        sourceId: edge.source_id,
        targetId: edge.target_id,
        relationship: edge.relationship.toUpperCase(),
      });
    });

    const targetNode = reqMap.get(targetRef);
    if (!targetNode) throw new Error(`Target ${targetRef} not found`);

    // 1. Blast Radius: Unique transitive descendants
    const descendants = graph.getTransitiveDescendants(targetNode.id);
    const blastRadius = descendants.size;

    // 2. Impact Factor: Blast Radius ÷ eligible population × 100
    const eligiblePopulation = allReqs.length;
    const impactFactor = Math.round((blastRadius / eligiblePopulation) * 10000) / 100;

    // 3. Cross-Domain Reach: Affected domains ÷ relevant domains × 100
    const allDomains = new Set(allReqs.map(r => r.domain));
    const affectedDomainSet = new Set<string>();
    affectedDomainSet.add(targetNode.domain);
    descendants.forEach(dId => {
      const dReq = allReqs.find(r => r.id === dId);
      if (dReq) affectedDomainSet.add(dReq.domain);
    });
    const crossDomainReach = Math.round((affectedDomainSet.size / allDomains.size) * 10000) / 100;

    // 4. Reuse Rate: Decisions referencing precedent ÷ eligible decisions × 100
    const uniqueReferencingSources = new Set(refRows.map(r => r.source_id)).size;
    const reuseRate = Math.round((uniqueReferencingSources / eligiblePopulation) * 10000) / 100;

    // 5. Governance Rate: BASED_ON ÷ (BASED_ON + EXCEPTION_TO)
    const basedOnCount = refRows.filter(r => r.relationship.toUpperCase() === 'BASED_ON').length;
    const exceptionCount = refRows.filter(r => r.relationship.toUpperCase() === 'EXCEPTION_TO').length;
    const totalLinked = basedOnCount + exceptionCount;
    const governanceRate = totalLinked > 0 ? Math.round((basedOnCount / totalLinked) * 10000) / 100 : 100.0;

    return {
      targetRef,
      targetSubject: targetNode.subject,
      blastRadius,
      descendantRefs: Array.from(descendants).map(dId => allReqs.find(r => r.id === dId)?.ref).filter(Boolean),
      impactFactor: `${impactFactor}%`,
      affectedDomains: Array.from(affectedDomainSet),
      crossDomainReach: `${crossDomainReach}%`,
      reuseRate: `${reuseRate}%`,
      governanceRate: `${governanceRate}%`,
      totalActiveReferenceEdges: refRows.length
    };
  }

  // TARGET: STR-2026-003: Board Reconstitution & Independent Director Appointment
  const targetRef = 'STR-2026-003';
  console.log(`TARGET DECISION UNDER TEST: ${targetRef} (${reqMap.get(targetRef)?.subject})`);
  console.log('----------------------------------------------------------------');

  // STEP 1: INITIAL STATE (BEFORE ADDING ANY REFERENCES)
  console.log('--- 1. INITIAL STATE (No references attached to STR-2026-003) ---');
  // Clean any existing references pointing to STR-2026-003 for pure test
  const targetId = reqMap.get(targetRef).id;
  await client.query(`DELETE FROM decision_references WHERE target_id = $1 OR source_id = $1`, [targetId]);
  
  const metrics0 = await computeLiveMetrics(targetRef);
  console.table([{
    State: 'Initial Baseline',
    'Blast Radius': metrics0.blastRadius,
    'Impact Factor': metrics0.impactFactor,
    'Cross-Domain Reach': metrics0.crossDomainReach,
    'Reuse Rate': metrics0.reuseRate,
    'Governance Rate': metrics0.governanceRate,
    'Descendants Count': metrics0.descendantRefs.length
  }]);

  // STEP 2: ADD SINGLE REFERENCE (PRC-2026-021 is BASED_ON STR-2026-003)
  console.log('\n--- 2. ADDING SINGLE REFERENCE: PRC-2026-021 BASED_ON STR-2026-003 ---');
  const prc21 = reqMap.get('PRC-2026-021'); // SOC2 Audit Protocol
  const ref1Id = crypto.randomUUID();
  await client.query(`
    INSERT INTO decision_references (id, tenant_id, source_id, target_id, relationship, note, created_at)
    VALUES ($1, $2, $3, $4, 'based_on', 'Governance compliance: SOC2 audit mandated by Board Reconstitution resolution.', NOW())
  `, [ref1Id, tenantId, prc21.id, targetId]);
  console.log(`✓ Inserted single reference: [${prc21.ref}] --(BASED_ON)--> [${targetRef}]`);

  const metrics1 = await computeLiveMetrics(targetRef);
  console.table([{
    State: 'After Single Reference',
    'Blast Radius': `${metrics0.blastRadius} -> ${metrics1.blastRadius} (+${metrics1.blastRadius - metrics0.blastRadius})`,
    'Impact Factor': `${metrics0.impactFactor} -> ${metrics1.impactFactor}`,
    'Cross-Domain Reach': `${metrics0.crossDomainReach} -> ${metrics1.crossDomainReach}`,
    'Reuse Rate': `${metrics0.reuseRate} -> ${metrics1.reuseRate}`,
    'Governance Rate': `${metrics0.governanceRate} -> ${metrics1.governanceRate}`,
    'New Descendants': metrics1.descendantRefs.join(', ')
  }]);

  // STEP 3: ADD MULTIPLE REFERENCES (TRANSITIVE HIERARCHICAL EXPANSION)
  // Let's add multiple downstream decisions:
  // - EXP-2026-042 (Off-cycle Retention Equity Allocation) EXCEPTION_TO STR-2026-003
  // - PRC-2026-031 (Anti-Bribery and FCPA Compliance Training) BASED_ON PRC-2026-021 (Transitive 2nd-hop!)
  // - TRX-2026-074 (Enterprise Cloud Threat Intel Subscription) BASED_ON PRC-2026-031 (Transitive 3rd-hop!)
  console.log('\n--- 3. ADDING MULTIPLE TRANSITIVE REFERENCES ---');
  const exp42 = reqMap.get('EXP-2026-042');
  const prc31 = reqMap.get('PRC-2026-031');
  const trx74 = reqMap.get('TRX-2026-074');

  await client.query(`
    INSERT INTO decision_references (id, tenant_id, source_id, target_id, relationship, note, created_at)
    VALUES 
      ($1, $2, $3, $4, 'exception_to', 'Off-cycle equity exception deviating from Board compensation schedule.', NOW()),
      ($5, $2, $6, $7, 'based_on', 'Anti-bribery attestation directly operationalizing SOC2 audit requirements.', NOW()),
      ($8, $2, $9, $6, 'based_on', 'Subscription contract implementing threat monitoring controls.', NOW())
  `, [
    crypto.randomUUID(), tenantId, exp42.id, targetId,
    crypto.randomUUID(), prc31.id, prc21.id,
    crypto.randomUUID(), trx74.id
  ]);

  console.log(`✓ Inserted 3 multiple hierarchical references:`);
  console.log(`  1. [${exp42.ref}] --(EXCEPTION_TO)--> [${targetRef}] (Direct Exception Branch)`);
  console.log(`  2. [${prc31.ref}] --(BASED_ON)--> [${prc21.ref}] (2nd-Hop Transitive Process Branch)`);
  console.log(`  3. [${trx74.ref}] --(BASED_ON)--> [${prc31.ref}] (3rd-Hop Transitive Transactional Leaf)`);

  const metrics2 = await computeLiveMetrics(targetRef);
  console.table([{
    State: 'After Multiple References',
    'Blast Radius': `${metrics1.blastRadius} -> ${metrics2.blastRadius} (+${metrics2.blastRadius - metrics1.blastRadius})`,
    'Impact Factor': `${metrics1.impactFactor} -> ${metrics2.impactFactor}`,
    'Cross-Domain Reach': `${metrics1.crossDomainReach} -> ${metrics2.crossDomainReach}`,
    'Reuse Rate': `${metrics1.reuseRate} -> ${metrics2.reuseRate}`,
    'Governance Rate': `${metrics1.governanceRate} -> ${metrics2.governanceRate}`,
    'All Transitive Descendants': metrics2.descendantRefs.join(', ')
  }]);

  // Update blast_at_seal on STR-2026-003 to reflect its live blast radius
  await client.query(`UPDATE approval_requests SET blast_at_seal = $1 WHERE id = $2`, [metrics2.blastRadius, targetId]);

  console.log('\n================================================================');
  console.log('MATHEMATICAL FORMULA IMPACT SUMMARY:');
  console.log('================================================================');
  console.log(`1. BLAST RADIUS: Grew from 0 -> 1 -> ${metrics2.blastRadius} unique transitive descendants.`);
  console.log(`   Demonstrates: BFS graph traversal reaches across multi-hop dependencies (${metrics2.descendantRefs.join(' -> ')}).`);
  console.log(`2. IMPACT FACTOR: Increased proportionally (${metrics0.impactFactor} -> ${metrics1.impactFactor} -> ${metrics2.impactFactor}).`);
  console.log(`   Formula: Blast Radius (${metrics2.blastRadius}) ÷ Eligible Population (${allReqs.length}) × 100.`);
  console.log(`3. CROSS-DOMAIN REACH: Expanded from ${metrics0.crossDomainReach} -> ${metrics2.crossDomainReach}.`);
  console.log(`   Domains touched: ${metrics2.affectedDomains.join(', ')}.`);
  console.log(`4. REUSE RATE: Increased as institutional precedent memory was cited by downstream teams.`);
  console.log(`5. GOVERNANCE RATE: Adjusted dynamically reflecting based_on compliance vs exception_to branches.`);

  await client.end();
}

runLiveReferenceTesting().catch(console.error);
