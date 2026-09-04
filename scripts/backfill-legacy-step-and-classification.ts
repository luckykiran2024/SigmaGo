import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error('FATAL: Database connection URL is missing. Set DATABASE_URL or DIRECT_URL in environment.');
}

export interface BackfillSummary {
  scannedRequests: number;
  backfilledRequests: number;
  alreadyClassifiedRequests: number;
  structuralCount: number;
  transactionalCount: number;
  exceptionCount: number;
  processCount: number;
}

export async function runBackfill(client?: any): Promise<BackfillSummary> {
  const shouldCloseClient = !client;
  const pgClient = client || new Client({ connectionString });
  if (shouldCloseClient) {
    await pgClient.connect();
  }

  const summary: BackfillSummary = {
    scannedRequests: 0,
    backfilledRequests: 0,
    alreadyClassifiedRequests: 0,
    structuralCount: 0,
    transactionalCount: 0,
    exceptionCount: 0,
    processCount: 0,
  };

  try {
    // 1. Query all approval requests
    const res = await pgClient.query(`
      SELECT 
        r.id, 
        r.tenant_id, 
        r.subject, 
        r.status, 
        r.workflow_id, 
        r.workflow_version_id, 
        r.category_id, 
        r.baseline_step_type, 
        r.resolved_step_type,
        w.base_step_type as wf_step_type,
        c.step_type as cat_step_type
      FROM approval_requests r
      LEFT JOIN workflows w ON w.id = r.workflow_id
      LEFT JOIN categories c ON c.id = r.category_id
      ORDER BY r.created_at ASC;
    `);

    summary.scannedRequests = res.rows.length;

    // Check for exception references
    const refRes = await pgClient.query(`
      SELECT source_id, target_id, relationship 
      FROM decision_references 
      WHERE relationship = 'EXCEPTION_TO';
    `);

    const exceptionRequestIds = new Set<string>();
    refRes.rows.forEach((row: any) => {
      if (row.source_id) exceptionRequestIds.add(row.source_id);
    });

    for (const row of res.rows) {
      if (row.resolved_step_type && row.baseline_step_type) {
        summary.alreadyClassifiedRequests++;
        continue;
      }

      // Determine step type
      let resolvedType: 'STRUCTURAL' | 'TRANSACTIONAL' | 'EXCEPTION' | 'PROCESS' = 'TRANSACTIONAL';

      if (exceptionRequestIds.has(row.id)) {
        resolvedType = 'EXCEPTION';
      } else if (row.wf_step_type && ['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS'].includes(row.wf_step_type)) {
        resolvedType = row.wf_step_type;
      } else if (row.cat_step_type && ['STRUCTURAL', 'TRANSACTIONAL', 'EXCEPTION', 'PROCESS'].includes(row.cat_step_type)) {
        resolvedType = row.cat_step_type;
      } else {
        const sub = (row.subject || '').toLowerCase();
        if (sub.includes('policy') || sub.includes('board') || sub.includes('strategic') || sub.includes('charter') || sub.includes('governance')) {
          resolvedType = 'STRUCTURAL';
        } else if (sub.includes('exception') || sub.includes('waiver') || sub.includes('deviation') || sub.includes('override')) {
          resolvedType = 'EXCEPTION';
        } else if (sub.includes('vendor') || sub.includes('onboarding') || sub.includes('access') || sub.includes('routine')) {
          resolvedType = 'PROCESS';
        } else {
          resolvedType = 'TRANSACTIONAL';
        }
      }

      const baselineType = row.baseline_step_type || resolvedType;

      // Idempotently update only the unclassified record
      await pgClient.query(
        `
        UPDATE approval_requests
        SET 
          resolved_step_type = COALESCE(resolved_step_type, $1),
          baseline_step_type = COALESCE(baseline_step_type, $2),
          classification_source = COALESCE(classification_source, 'BACKFILL_HEURISTIC')
        WHERE id = $3;
      `,
        [resolvedType, baselineType, row.id]
      );

      summary.backfilledRequests++;
      if (resolvedType === 'STRUCTURAL') summary.structuralCount++;
      else if (resolvedType === 'TRANSACTIONAL') summary.transactionalCount++;
      else if (resolvedType === 'EXCEPTION') summary.exceptionCount++;
      else if (resolvedType === 'PROCESS') summary.processCount++;
    }

    return summary;
  } finally {
    if (shouldCloseClient) {
      await pgClient.end();
    }
  }
}

// Execute directly if run via CLI
if (process.argv[1] && process.argv[1].includes('backfill-legacy-step-and-classification')) {
  console.log('Running Idempotent STEP Classification Backfill...');
  runBackfill()
    .then((summary) => {
      console.log('Backfill complete:');
      console.table(summary);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backfill failed:', err);
      process.exit(1);
    });
}
