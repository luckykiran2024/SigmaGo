import fs from 'fs';
import path from 'path';

export interface AdminClientCallSite {
  file: string;
  line: number;
  snippet: string;
  table: string;
  operation: string;
  tenantFilterPresent: boolean;
  primaryKeyConstrained: boolean;
  crossTenantPlatform: boolean;
  classification: 'TENANT_SCOPED' | 'PRIMARY_KEY_KEYED' | 'PLATFORM_PRIVILEGED' | 'UNSAFE_UNSCOPED' | 'UNKNOWN_REVIEW_REQUIRED';
  justification: string;
}

const SRC_DIR = path.resolve(__dirname, '../src');
const OUTPUT_MD = path.resolve(__dirname, 'admin-client-inventory.md');
const OUTPUT_JSON = path.resolve(__dirname, 'admin-client-inventory.json');

const MULTI_TENANT_TABLES = new Set([
  'action_tokens',
  'approval_requests',
  'approval_steps',
  'attachments',
  'audit_log',
  'categories',
  'custom_fields',
  'custom_field_values',
  'decision_events',
  'decision_references',
  'decision_period_metrics',
  'delegations',
  'directory_approvers',
  'intelligence_grants',
  'intelligence_signals',
  'org_nodes',
  'policies',
  'policy_versions',
  'reference_skips',
  'request_participants',
  'stage_transition_metrics',
  'support_tickets',
  'tenants',
  'transactional_outbox',
  'users',
  'view_grants',
  'approvers',
  'workflows',
  'workflow_versions',
]);

function getAllFiles(dir: string, extensions: string[] = ['.ts', '.tsx', '.js']): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, extensions));
    } else {
      const ext = path.extname(file);
      if (extensions.includes(ext)) {
        results.push(filePath);
      }
    }
  }
  return results;
}

export function auditAdminClientUsage(): AdminClientCallSite[] {
  const files = getAllFiles(SRC_DIR);
  const callSites: AdminClientCallSite[] = [];

  for (const filePath of files) {
    const relPath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');

    // Skip test files or self
    if (relPath.includes('.unit.test.') || relPath.includes('.spec.') || relPath.includes('src/test/')) {
      continue;
    }

    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      // Skip declarations, imports, comments, or proxy wraps
      if (
        lineText.includes('adminClient') &&
        !lineText.includes('//') &&
        !lineText.trim().startsWith('import') &&
        !lineText.includes('export const adminClient') &&
        !lineText.includes('Proxy(adminClient') &&
        !lineText.trim().startsWith('client = adminClient') &&
        !lineText.trim().startsWith('const client = options.client || adminClient')
      ) {
        // Collect block around call to inspect method chain forward from i
        const blockLines: string[] = [];
        for (let j = i; j < Math.min(lines.length, i + 15); j++) {
          blockLines.push(lines[j]);
          if (lines[j].includes(';')) {
            break;
          }
        }
        const block = blockLines.join('\n');

        // Extract table
        let table = 'unknown';
        const fromMatch = block.match(/\.from\(['"]([^'"]+)['"]\)/);
        const storageMatch = block.match(/\.storage(?:\.from\(['"]([^'"]+)['"]\))?/);
        if (fromMatch) {
          table = fromMatch[1];
        } else if (storageMatch && block.includes('.storage')) {
          const bucketMatch = block.match(/from\(['"]([^'"]+)['"]\)/);
          table = bucketMatch ? `storage:${bucketMatch[1]}` : 'storage';
        } else if (block.includes('.auth.admin')) {
          table = 'auth.users';
        } else if (block.includes('.rpc(')) {
          const rpcMatch = block.match(/\.rpc\(['"]([^'"]+)['"]\)/);
          table = rpcMatch ? `rpc:${rpcMatch[1]}` : 'rpc';
        }

        // Extract operation
        let operation = 'unknown';
        if (block.includes('.select(')) operation = 'SELECT';
        else if (block.includes('.insert(')) operation = 'INSERT';
        else if (block.includes('.update(')) operation = 'UPDATE';
        else if (block.includes('.delete(')) operation = 'DELETE';
        else if (block.includes('.upsert(')) operation = 'UPSERT';
        else if (block.includes('.rpc(')) operation = 'RPC';
        else if (block.includes('.auth.admin')) operation = 'AUTH_ADMIN';
        else if (table.startsWith('storage')) operation = 'STORAGE';

        // Check for tenant filtering
        const tenantFilterPresent =
          block.includes("'tenant_id'") ||
          block.includes('"tenant_id"') ||
          block.includes('tenantId') ||
          block.includes('.eq(\'tenant_id\'') ||
          block.includes('.eq("tenant_id"');

        // Check for primary key constraint
        const primaryKeyConstrained =
          block.includes(".eq('id'") ||
          block.includes('.eq("id"');

        // Check if platform privileged path
        const isPlatform =
          relPath.includes('platform-admin') ||
          relPath.includes('src/lib/platform') ||
          relPath.includes('/api/cron') ||
          relPath.includes('/api/webhooks') ||
          relPath.includes('/api/health') ||
          relPath.includes('src/app/auth/') ||
          relPath.includes('src/app/login/');

        // Classify
        let classification: AdminClientCallSite['classification'] = 'UNKNOWN_REVIEW_REQUIRED';
        let justification = '';

        if (isPlatform || operation === 'AUTH_ADMIN') {
          classification = 'PLATFORM_PRIVILEGED';
          justification = 'Executed within platform super-admin, auth admin identity, health check, or system webhook/cron context.';
        } else if (tenantFilterPresent) {
          classification = 'TENANT_SCOPED';
          justification = 'Query enforces explicit tenant_id filter constraint in chained call.';
        } else if (primaryKeyConstrained) {
          if (table === 'tenants') {
            classification = 'PRIMARY_KEY_KEYED';
            justification = 'Lookup on tenants table by unique primary key ID.';
          } else if (table === 'users' && (block.includes('.single()') || block.includes('.maybeSingle()'))) {
            classification = 'PRIMARY_KEY_KEYED';
            justification = 'Lookup user profile by primary key UUID.';
          } else {
            classification = 'PRIMARY_KEY_KEYED';
            justification = 'Keyed by primary key ID (requires verifying tenant ownership boundary in caller).';
          }
        } else if (table === 'tenants' && block.includes(".eq('subdomain'")) {
          classification = 'PLATFORM_PRIVILEGED';
          justification = 'Tenant resolution from subdomain slug for workspace routing.';
        } else if (table.startsWith('storage') || table === 'logos' || table === 'avatars') {
          classification = 'PLATFORM_PRIVILEGED';
          justification = 'Supabase storage bucket access via service-role.';
        } else if (MULTI_TENANT_TABLES.has(table) || table.startsWith('rpc:')) {
          classification = 'UNSAFE_UNSCOPED';
          justification = `Multi-tenant table or RPC '${table}' queried without explicit tenant_id filter or verified primary key. Scheduled for Sprint 3 remediation.`;
        } else {
          classification = 'UNKNOWN_REVIEW_REQUIRED';
          justification = 'Call site requires manual architectural verification.';
        }

        callSites.push({
          file: relPath,
          line: i + 1,
          snippet: lineText.trim(),
          table,
          operation,
          tenantFilterPresent,
          primaryKeyConstrained,
          crossTenantPlatform: isPlatform,
          classification,
          justification,
        });
      }
    }
  }

  return callSites;
}

function run() {
  console.log('🔍 Auditing service-role (adminClient) access across src/ ...');
  const inventory = auditAdminClientUsage();

  const summary = {
    total: inventory.length,
    tenantScoped: inventory.filter((c) => c.classification === 'TENANT_SCOPED').length,
    primaryKeyKeyed: inventory.filter((c) => c.classification === 'PRIMARY_KEY_KEYED').length,
    platformPrivileged: inventory.filter((c) => c.classification === 'PLATFORM_PRIVILEGED').length,
    unsafeUnscoped: inventory.filter((c) => c.classification === 'UNSAFE_UNSCOPED').length,
    unknownReview: inventory.filter((c) => c.classification === 'UNKNOWN_REVIEW_REQUIRED').length,
  };

  console.log('\n======================================================');
  console.log('   ADMIN CLIENT PRIVILEGED ACCESS INVENTORY REPORT    ');
  console.log('======================================================');
  console.log(`Total Privileged Calls:      ${summary.total}`);
  console.log(`TENANT_SCOPED:               ${summary.tenantScoped}`);
  console.log(`PRIMARY_KEY_KEYED:           ${summary.primaryKeyKeyed}`);
  console.log(`PLATFORM_PRIVILEGED:         ${summary.platformPrivileged}`);
  console.log(`UNSAFE_UNSCOPED:             ${summary.unsafeUnscoped}`);
  console.log(`UNKNOWN_REVIEW_REQUIRED:     ${summary.unknownReview}`);
  console.log('======================================================\n');

  // Write JSON
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ summary, inventory }, null, 2), 'utf8');

  // Write Markdown Report
  let md = `# Admin Client Privileged Access Inventory\n\n`;
  md += `**Audit Date**: ${new Date().toISOString()}\n\n`;
  md += `## Executive Summary\n\n`;
  md += `| Category | Count | Percentage |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Total Privileged Calls** | **${summary.total}** | 100% |\n`;
  md += `| TENANT_SCOPED | ${summary.tenantScoped} | ${((summary.tenantScoped / summary.total) * 100).toFixed(1)}% |\n`;
  md += `| PRIMARY_KEY_KEYED | ${summary.primaryKeyKeyed} | ${((summary.primaryKeyKeyed / summary.total) * 100).toFixed(1)}% |\n`;
  md += `| PLATFORM_PRIVILEGED | ${summary.platformPrivileged} | ${((summary.platformPrivileged / summary.total) * 100).toFixed(1)}% |\n`;
  md += `| UNSAFE_UNSCOPED | ${summary.unsafeUnscoped} | ${((summary.unsafeUnscoped / summary.total) * 100).toFixed(1)}% |\n`;
  md += `| UNKNOWN_REVIEW_REQUIRED | ${summary.unknownReview} | ${((summary.unknownReview / summary.total) * 100).toFixed(1)}% |\n\n`;

  md += `## Detailed Call-Site Inventory\n\n`;
  md += `| File:Line | Table | Operation | Classification | Justification |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;
  for (const c of inventory) {
    md += `| \`${c.file}:${c.line}\` | \`${c.table}\` | \`${c.operation}\` | **${c.classification}** | ${c.justification} |\n`;
  }

  fs.writeFileSync(OUTPUT_MD, md, 'utf8');
  console.log(`✅ Saved inventory reports to:\n- ${OUTPUT_JSON}\n- ${OUTPUT_MD}`);
}

if (require.main === module || process.argv[1]?.includes('audit-admin-client-usage')) {
  run();
}
