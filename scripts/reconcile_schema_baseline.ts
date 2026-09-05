import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function runReconciliation() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('🔍 Performing Schema Baseline Inspection & Reconciliation (Sprint 3.0)...');

  // 1. Fetch all user tables in public schema
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const dbTables = tablesRes.rows.map(r => r.table_name);

  // 2. Fetch all columns per table
  const colsRes = await client.query(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  const dbColsByTable: Record<string, any[]> = {};
  for (const c of colsRes.rows) {
    if (!dbColsByTable[c.table_name]) dbColsByTable[c.table_name] = [];
    dbColsByTable[c.table_name].push(c);
  }

  // 3. Fetch RLS status on tables
  const rlsRes = await client.query(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  const rlsStatus: Record<string, boolean> = {};
  for (const r of rlsRes.rows) {
    rlsStatus[r.tablename] = r.rowsecurity;
  }

  // 4. Fetch existing policies
  const polRes = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `);
  const policiesByTable: Record<string, any[]> = {};
  for (const p of polRes.rows) {
    if (!policiesByTable[p.tablename]) policiesByTable[p.tablename] = [];
    policiesByTable[p.tablename].push(p);
  }

  // 5. Parse Prisma schema models
  const prismaSchemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
  const prismaContent = fs.readFileSync(prismaSchemaPath, 'utf8');
  const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)\}/g;
  const prismaModels: Record<string, string[]> = {};
  let match;
  while ((match = modelRegex.exec(prismaContent)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields = body.split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('//') && !l.startsWith('@@'))
      .map(l => l.split(/\s+/)[0]);
    prismaModels[modelName] = fields;
  }

  // 6. Build Reconciliation Report
  let md = `# Database Schema Reconciliation & Baseline Report (Sprint 3.0)\n\n`;
  md += `**Generated At**: ${new Date().toISOString()}\n`;
  md += `**Environment**: Supabase PostgreSQL Live Database\n\n`;
  md += `## 1. Summary of Database Tables & RLS Status\n\n`;
  md += `| Table Name | RLS Enabled | Policies Count | Prisma Model Synced | Column Count |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;

  for (const t of dbTables) {
    const isRls = rlsStatus[t] ? '✅ YES' : '❌ NO';
    const polCount = policiesByTable[t]?.length || 0;
    const isPrisma = (prismaModels[t] || prismaModels[t.toLowerCase()]) ? '✅ Synced' : '⚠️ Missing in Prisma';
    const colCount = dbColsByTable[t]?.length || 0;
    md += `| \`${t}\` | ${isRls} | ${polCount} | ${isPrisma} | ${colCount} |\n`;
  }

  md += `\n## 2. Table-by-Table Field Reconciliation\n\n`;

  for (const t of dbTables) {
    md += `### Table: \`${t}\`\n\n`;
    md += `- **RLS Enabled**: ${rlsStatus[t] ? 'Yes' : 'No'}\n`;
    md += `- **Existing Policies**: ${policiesByTable[t]?.map(p => `\`${p.policyname}\` (${p.cmd})`).join(', ') || 'None'}\n\n`;
    md += `| Column | Data Type | Nullable | Default |\n`;
    md += `| :--- | :--- | :---: | :--- |\n`;
    for (const col of dbColsByTable[t] || []) {
      md += `| \`${col.column_name}\` | \`${col.data_type}\` | ${col.is_nullable} | \`${col.column_default || 'none'}\` |\n`;
    }
    md += `\n`;
  }

  const outPath = path.resolve(__dirname, '../docs/schema-baseline-reconciliation.md');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, 'utf8');

  console.log(`✅ Reconciliation completed! Document saved to: ${outPath}`);
  await client.end();
}

runReconciliation().catch(console.error);
