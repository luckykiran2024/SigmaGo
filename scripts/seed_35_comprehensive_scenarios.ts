import { Client } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const scenariosData = [
  { ref: 'REQ-2026-101', subject: 'Q4 AWS Cloud GPU Compute Expansion', catName: 'Capex Exception', status: 'pending', amount: '₹14,50,000' },
  { ref: 'REQ-2026-102', subject: 'Executive Promotion — VP Data Platform', catName: 'Executive Compensation', status: 'approved', amount: '₹35,00,000' },
  { ref: 'REQ-2026-103', subject: 'Enterprise Datadog APM License Extension', catName: 'General Procurement', status: 'approved', amount: '₹6,80,000' },
  { ref: 'REQ-2026-104', subject: 'Off-cycle Retention Bonus for Staff Engineers', catName: 'Executive Compensation', status: 'pending', amount: '₹18,00,000' },
  { ref: 'REQ-2026-105', subject: 'Emergency Database Disaster Recovery Node', catName: 'Capex Exception', status: 'approved', amount: '₹12,20,000' },
  { ref: 'REQ-2026-106', subject: 'Global Security Information & Event Management (SIEM)', catName: 'General Procurement', status: 'pending', amount: '₹22,00,000' },
  { ref: 'REQ-2026-107', subject: 'Sales Enablement Offsite in Singapore', catName: 'Capex Exception', status: 'rejected', amount: '₹9,50,000' },
  { ref: 'REQ-2026-108', subject: 'Kubernetes Multi-Region Cluster Provisioning', catName: 'General Procurement', status: 'approved', amount: '₹15,00,000' },
  { ref: 'REQ-2026-109', subject: 'Vendor Contract Exemption — Deloitte Advisory', catName: 'Capex Exception', status: 'pending', amount: '₹28,00,000' },
  { ref: 'REQ-2026-110', subject: 'Principal Architect Relocation Allowance', catName: 'Executive Compensation', status: 'approved', amount: '₹8,00,000' },
  { ref: 'REQ-2026-111', subject: 'Office Acoustic Pods for Engineering Hub', catName: 'General Procurement', status: 'approved', amount: '₹4,50,000' },
  { ref: 'REQ-2026-112', subject: 'Customer Success AI Agent Platform Pilot', catName: 'Capex Exception', status: 'pending', amount: '₹11,00,000' },
  { ref: 'REQ-2026-113', subject: 'Legal Retainer Settlement with IP Counsel', catName: 'General Procurement', status: 'approved', amount: '₹7,50,000' },
  { ref: 'REQ-2026-114', subject: 'Director of Security Hiring Package', catName: 'Executive Compensation', status: 'approved', amount: '₹42,00,000' },
  { ref: 'REQ-2026-115', subject: 'Zero-Day Threat Defense Subscription', catName: 'General Procurement', status: 'pending', amount: '₹13,20,000' },
  { ref: 'REQ-2026-116', subject: 'Core Banking API Gateway Modernization', catName: 'Capex Exception', status: 'approved', amount: '₹31,00,000' },
  { ref: 'REQ-2026-117', subject: 'Marketing Brand Refresh Sponsorship', catName: 'General Procurement', status: 'rejected', amount: '₹6,00,000' },
  { ref: 'REQ-2026-118', subject: 'Quarterly Executive Bonus Pool Reallocation', catName: 'Executive Compensation', status: 'approved', amount: '₹25,00,000' },
  { ref: 'REQ-2026-119', subject: 'Hardware Security Module (HSM) Procurement', catName: 'Capex Exception', status: 'pending', amount: '₹16,40,000' },
  { ref: 'REQ-2026-120', subject: 'Figma Organization Tier License Upgrade', catName: 'General Procurement', status: 'approved', amount: '₹3,20,000' },
  { ref: 'REQ-2026-121', subject: 'Annual Penetration Testing & Red Teaming SOW', catName: 'General Procurement', status: 'pending', amount: '₹9,80,000' },
  { ref: 'REQ-2026-122', subject: 'Head of Legal Equity Grant Restructuring', catName: 'Executive Compensation', status: 'approved', amount: '₹38,00,000' },
  { ref: 'REQ-2026-123', subject: 'Secondary Data Center Fiber Link Redundancy', catName: 'Capex Exception', status: 'approved', amount: '₹19,50,000' },
  { ref: 'REQ-2026-124', subject: 'Customer Support Workforce Augmentation Contract', catName: 'General Procurement', status: 'pending', amount: '₹17,00,000' },
  { ref: 'REQ-2026-125', subject: 'Executive Health Assessment Program', catName: 'Executive Compensation', status: 'approved', amount: '₹5,50,000' },
  { ref: 'REQ-2026-126', subject: 'SOC2 Type II Audit Compliance SOW', catName: 'General Procurement', status: 'approved', amount: '₹12,00,000' },
  { ref: 'REQ-2026-127', subject: 'High-Density Rack Power Cooling Upgrade', catName: 'Capex Exception', status: 'pending', amount: '₹24,00,000' },
  { ref: 'REQ-2026-128', subject: 'Machine Learning Model Fine-tuning Cluster', catName: 'Capex Exception', status: 'approved', amount: '₹29,00,000' },
  { ref: 'REQ-2026-129', subject: 'GitHub Enterprise EMU Cloud Migration', catName: 'General Procurement', status: 'approved', amount: '₹8,40,000' },
  { ref: 'REQ-2026-130', subject: 'Chief Revenue Officer Incentive Plan FY27', catName: 'Executive Compensation', status: 'pending', amount: '₹50,00,000' },
  { ref: 'REQ-2026-131', subject: 'Enterprise Password Manager Enterprise Vault', catName: 'General Procurement', status: 'approved', amount: '₹4,10,000' },
  { ref: 'REQ-2026-132', subject: 'Unbudgeted Microservices Tracing Infrastructure', catName: 'Capex Exception', status: 'pending', amount: '₹13,80,000' },
  { ref: 'REQ-2026-133', subject: 'Special Performance Equity Acceleration', catName: 'Executive Compensation', status: 'approved', amount: '₹21,00,000' },
  { ref: 'REQ-2026-134', subject: 'Office Security Badge Biometric Scanner Retrofit', catName: 'General Procurement', status: 'approved', amount: '₹6,90,000' },
  { ref: 'REQ-2026-135', subject: 'Automated Compliance Policy Engine License', catName: 'Capex Exception', status: 'approved', amount: '₹18,50,000' },
];

async function seed() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Seeding 35 comprehensive end-to-end scenarios for Meridian Corp...');

  try {
    const { rows: tRows } = await client.query(`SELECT id FROM tenants WHERE subdomain = 'meridian'`);
    const tenantId = tRows[0].id;

    const { rows: uRows } = await client.query(`SELECT id, email FROM users WHERE tenant_id = $1`, [tenantId]);
    const vijay = uRows.find(u => u.email === 'vijay.reddy@meridian.com');
    const arjun = uRows.find(u => u.email === 'arjun.bose@meridian.com') || vijay;
    const krishna = uRows.find(u => u.email === 'krishna.pillai@meridian.com') || vijay;

    const { rows: cRows } = await client.query(`SELECT id, name FROM categories WHERE tenant_id = $1`, [tenantId]);
    const catMap = new Map(cRows.map(c => [c.name, c.id]));

    for (let i = 0; i < scenariosData.length; i++) {
      const s = scenariosData[i];
      const catId = catMap.get(s.catName) || cRows[0].id;
      const reqId = `e2e00000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      
      const checksum = s.status === 'approved' 
        ? crypto.createHash('sha256').update(`${s.ref}-${s.subject}-${tenantId}-sealed`).digest('hex')
        : null;

      const finalizedAt = s.status === 'approved' || s.status === 'rejected' ? 'now()' : null;

      await client.query(`
        INSERT INTO approval_requests (id, ref, tenant_id, owner_id, category_id, subject, status, checksum_sha256, finalized_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, ${finalizedAt ? 'NOW()' : 'NULL'})
        ON CONFLICT (id) DO UPDATE SET subject = EXCLUDED.subject, status = EXCLUDED.status, checksum_sha256 = EXCLUDED.checksum_sha256;
      `, [reqId, s.ref, tenantId, arjun.id, catId, `${s.subject} (${s.amount})`, s.status, checksum]);

      // Seed multi-stage approval steps
      const stepId1 = `e2e10000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      const stepStatus1 = s.status === 'approved' ? 'approved' : (s.status === 'rejected' ? 'rejected' : 'pending');

      await client.query(`
        INSERT INTO approval_steps (id, request_id, order_index, stage_index, approver_id, type, status, comment, entered_at, acted_at)
        VALUES ($1, $2, 1, 1, $3, 'GENERAL', $4, $5, NOW() - interval '2 days', ${stepStatus1 !== 'pending' ? 'NOW() - interval \'1 day\'' : 'NULL'})
        ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, comment = EXCLUDED.comment;
      `, [stepId1, reqId, vijay.id, stepStatus1, s.status === 'approved' ? 'Approved within budget authority.' : (s.status === 'rejected' ? 'Exceeds current quarterly cap.' : null)]);

      // For approved requests, add stage 2 signed by Krishna
      if (s.status === 'approved') {
        const stepId2 = `e2e20000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
        await client.query(`
          INSERT INTO approval_steps (id, request_id, order_index, stage_index, approver_id, type, status, comment, entered_at, acted_at)
          VALUES ($1, $2, 2, 2, $3, 'GENERAL', 'approved', 'Verified compliance and governance sign-off.', NOW() - interval '1 day', NOW())
          ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, comment = EXCLUDED.comment;
        `, [stepId2, reqId, krishna.id]);
      }
    }

    console.log(`✓ Successfully seeded 35 live end-to-end approval scenarios for Meridian Corp!`);
  } catch (err) {
    console.error('Error seeding scenarios:', err);
  } finally {
    await client.end();
  }
}

seed();
