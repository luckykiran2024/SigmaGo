import { Client } from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

// 100 Enterprise Scenarios categorized by the 4 Fundamental Step Types:
// STRUCTURAL (20), PROCESS (20), EXCEPTION (30), TRANSACTIONAL (30)
export const scenarioCatalogue = [
  // ==========================================
  // SECTION 1: STRUCTURAL DECISIONS (20 Scenarios)
  // Re-architecting governance, entities, capital pools & corporate strategy
  // ==========================================
  { id: 1, type: 'STRUCTURAL', ref: 'STR-2026-001', subject: 'Acquisition of FinTech Cloud Ledger Target Alpha ($12.5M)', dept: 'Executive', status: 'approved', amount: '₹10,50,00,000' },
  { id: 2, type: 'STRUCTURAL', ref: 'STR-2026-002', subject: 'Establishment of Singapore Subsidiary for APAC Treasury', dept: 'Executive', status: 'approved', amount: '₹4,20,00,000' },
  { id: 3, type: 'STRUCTURAL', ref: 'STR-2026-003', subject: 'Board Reconstitution & Independent Director Appointment', dept: 'Executive', status: 'approved', amount: '₹75,00,000' },
  { id: 4, type: 'STRUCTURAL', ref: 'STR-2026-004', subject: 'Employee Stock Option Pool Expansion (Series D Prep)', dept: 'People', status: 'approved', amount: '₹18,00,00,000' },
  { id: 5, type: 'STRUCTURAL', ref: 'STR-2026-005', subject: 'Spin-off of Edge Robotics Business Unit into Standalone Entity', dept: 'Executive', status: 'approved', amount: '₹6,50,00,000' },
  { id: 6, type: 'STRUCTURAL', ref: 'STR-2026-006', subject: 'European Data Sovereign Cloud Operating Entity Formation (Frankfurt)', dept: 'Legal', status: 'approved', amount: '₹3,80,00,000' },
  { id: 7, type: 'STRUCTURAL', ref: 'STR-2026-007', subject: 'Joint Venture Capital Allocation — Southeast Asia Telecom Alliance', dept: 'Commercial', status: 'pending', amount: '₹8,20,00,000' },
  { id: 8, type: 'STRUCTURAL', ref: 'STR-2026-008', subject: 'Syndicated Banking Facility Debt Restructuring Protocol', dept: 'Finance', status: 'approved', amount: '₹25,00,00,000' },
  { id: 9, type: 'STRUCTURAL', ref: 'STR-2026-009', subject: 'Core Intellectual Property Portfolio Holding Transfer to Trust', dept: 'Legal', status: 'approved', amount: '₹5,00,00,000' },
  { id: 10, type: 'STRUCTURAL', ref: 'STR-2026-010', subject: 'C-Suite Operating Model Realignment & Dual Reporting Governance', dept: 'People', status: 'approved', amount: '₹1,50,00,000' },
  { id: 11, type: 'STRUCTURAL', ref: 'STR-2026-011', subject: 'Strategic Divestiture of Legacy On-Premise Hosting Assets', dept: 'Finance', status: 'approved', amount: '₹2,90,00,000' },
  { id: 12, type: 'STRUCTURAL', ref: 'STR-2026-012', subject: 'Class A to Class B Voting Share Conversion Authorization', dept: 'Legal', status: 'approved', amount: '₹0' },
  { id: 13, type: 'STRUCTURAL', ref: 'STR-2026-013', subject: 'Merger Integration Governance Committee Charter Ratification', dept: 'Executive', status: 'approved', amount: '₹45,00,000' },
  { id: 14, type: 'STRUCTURAL', ref: 'STR-2026-014', subject: 'Cross-Border Intercompany Licensing Framework Restructuring', dept: 'Finance', status: 'pending', amount: '₹3,40,00,000' },
  { id: 15, type: 'STRUCTURAL', ref: 'STR-2026-015', subject: 'Executive Equity Clawback & Governance Bylaw Amendment', dept: 'People', status: 'approved', amount: '₹0' },
  { id: 16, type: 'STRUCTURAL', ref: 'STR-2026-016', subject: 'Global Corporate Tax Holding Nexus Reorganization (Mauritius/Dubai)', dept: 'Finance', status: 'approved', amount: '₹1,80,00,000' },
  { id: 17, type: 'STRUCTURAL', ref: 'STR-2026-017', subject: 'Chief Sustainability Officer Board Advisory Seat Establishment', dept: 'Executive', status: 'approved', amount: '₹60,00,000' },
  { id: 18, type: 'STRUCTURAL', ref: 'STR-2026-018', subject: 'Commercial Real Estate Sale-and-Leaseback Authorization', dept: 'Operations', status: 'approved', amount: '₹14,00,00,000' },
  { id: 19, type: 'STRUCTURAL', ref: 'STR-2026-019', subject: 'Acquisition Earnout Milestone Revision — CyberSec Labs', dept: 'Executive', status: 'rejected', amount: '₹4,50,00,000' },
  { id: 20, type: 'STRUCTURAL', ref: 'STR-2026-020', subject: 'Public Listing (IPO) Readiness Advisory Council Mandate', dept: 'Executive', status: 'approved', amount: '₹2,20,00,000' },

  // ==========================================
  // SECTION 2: PROCESS DECISIONS (20 Scenarios)
  // Procedural compliance, standard operating procedures, audits & quality gates
  // ==========================================
  { id: 21, type: 'PROCESS', ref: 'PRC-2026-021', subject: 'SOC2 Type II Annual Security Audit Certification Protocol', dept: 'Security', status: 'approved', amount: '₹28,00,000' },
  { id: 22, type: 'PROCESS', ref: 'PRC-2026-022', subject: 'ISO 27001 Information Security Management System Recertification', dept: 'Security', status: 'approved', amount: '₹22,50,000' },
  { id: 23, type: 'PROCESS', ref: 'PRC-2026-023', subject: 'Annual Multi-Region Disaster Recovery Failover Simulation Drill', dept: 'Engineering', status: 'approved', amount: '₹16,00,000' },
  { id: 24, type: 'PROCESS', ref: 'PRC-2026-024', subject: 'SOX 404 Financial Internal Control Assessment & Testing Cycle', dept: 'Finance', status: 'approved', amount: '₹34,00,000' },
  { id: 25, type: 'PROCESS', ref: 'PRC-2026-025', subject: 'Vendor Risk Tiering & Security Scorecard Evaluation Workflow', dept: 'Operations', status: 'approved', amount: '₹12,00,000' },
  { id: 26, type: 'PROCESS', ref: 'PRC-2026-026', subject: 'GDPR / DPDP Global Data Retention & Deletion Workflow Verification', dept: 'Legal', status: 'approved', amount: '₹19,00,000' },
  { id: 27, type: 'PROCESS', ref: 'PRC-2026-027', subject: 'Enterprise Incident Response Runbook & Severity Escalate SLA Review', dept: 'Engineering', status: 'approved', amount: '₹8,50,000' },
  { id: 28, type: 'PROCESS', ref: 'PRC-2026-028', subject: 'Statutory Financial Statement Half-Year Sign-off Protocol', dept: 'Audit', status: 'approved', amount: '₹45,00,000' },
  { id: 29, type: 'PROCESS', ref: 'PRC-2026-029', subject: 'Engineering Software Release Gate & Semantic Versioning Standard', dept: 'Engineering', status: 'approved', amount: '₹0' },
  { id: 30, type: 'PROCESS', ref: 'PRC-2026-030', subject: 'Workplace Health & Occupational Safety Statutory Compliance Review', dept: 'Operations', status: 'approved', amount: '₹9,80,000' },
  { id: 31, type: 'PROCESS', ref: 'PRC-2026-031', subject: 'Anti-Bribery and FCPA Compliance Training & Attestation Cycle', dept: 'Legal', status: 'approved', amount: '₹14,00,000' },
  { id: 32, type: 'PROCESS', ref: 'PRC-2026-032', subject: 'Quarterly Cloud Cost Allocation & FinOps Tagging Enforcement', dept: 'Engineering', status: 'approved', amount: '₹0' },
  { id: 33, type: 'PROCESS', ref: 'PRC-2026-033', subject: 'Customer Support Escalation Tier 3 Handover Protocol', dept: 'Commercial', status: 'approved', amount: '₹6,40,000' },
  { id: 34, type: 'PROCESS', ref: 'PRC-2026-034', subject: 'ESG Environmental Carbon Footprint Audit Methodology Approval', dept: 'Executive', status: 'pending', amount: '₹18,00,000' },
  { id: 35, type: 'PROCESS', ref: 'PRC-2026-035', subject: 'Cryptographic HSM Key Lifecycle & Backup Procedure Verification', dept: 'Security', status: 'approved', amount: '₹15,00,000' },
  { id: 36, type: 'PROCESS', ref: 'PRC-2026-036', subject: 'Global Procurement Anti-Modern-Slavery Due Diligence Gate', dept: 'Operations', status: 'approved', amount: '₹11,50,000' },
  { id: 37, type: 'PROCESS', ref: 'PRC-2026-037', subject: 'Continuous Integration / Continuous Deployment Pipeline Security Gate', dept: 'Engineering', status: 'approved', amount: '₹0' },
  { id: 38, type: 'PROCESS', ref: 'PRC-2026-038', subject: 'Corporate Governance Whistleblower Escalation Pathway Review', dept: 'Legal', status: 'approved', amount: '₹7,20,000' },
  { id: 39, type: 'PROCESS', ref: 'PRC-2026-039', subject: 'Vendor Contract Auto-Renewal Review Window Enforcement (60-day)', dept: 'Operations', status: 'rejected', amount: '₹0' },
  { id: 40, type: 'PROCESS', ref: 'PRC-2026-040', subject: 'AI Ethics & Model Fairness Verification Standard Operating Procedure', dept: 'Product', status: 'approved', amount: '₹21,00,000' },

  // ==========================================
  // SECTION 3: EXCEPTION DECISIONS (30 Scenarios)
  // Overrides, threshold variances, emergency bypasses & policy drift signals
  // ==========================================
  { id: 41, type: 'EXCEPTION', ref: 'EXP-2026-041', subject: 'Emergency High-Capacity Cloud GPU Cluster Provisioning ($180k/yr)', dept: 'Engineering', status: 'approved', amount: '₹1,50,00,000' },
  { id: 42, type: 'EXCEPTION', ref: 'EXP-2026-042', subject: 'Off-cycle Retention Equity Allocation for Staff AI Scientist', dept: 'People', status: 'approved', amount: '₹48,00,000' },
  { id: 43, type: 'EXCEPTION', ref: 'EXP-2026-043', subject: 'Single-Source Exemption — Specialized Threat Intelligence Feed', dept: 'Security', status: 'approved', amount: '₹35,00,000' },
  { id: 44, type: 'EXCEPTION', ref: 'EXP-2026-044', subject: 'Executive Travel Policy Exemption — International Jet Charter for Deal Close', dept: 'Commercial', status: 'rejected', amount: '₹28,50,000' },
  { id: 45, type: 'EXCEPTION', ref: 'EXP-2026-045', subject: 'Capex Increment Above 12% — Tier-4 Datacenter Power Backup', dept: 'Finance', status: 'approved', amount: '₹65,00,000' },
  { id: 46, type: 'EXCEPTION', ref: 'EXP-2026-046', subject: 'Production DB Direct Access Policy Exemption (Post-Incident Hotfix)', dept: 'Security', status: 'approved', amount: '₹0' },
  { id: 47, type: 'EXCEPTION', ref: 'EXP-2026-047', subject: 'Off-policy Severance Package for Senior Executive Departure', dept: 'People', status: 'approved', amount: '₹55,00,000' },
  { id: 48, type: 'EXCEPTION', ref: 'EXP-2026-048', subject: 'Unbudgeted Office Acoustic Enclosure Installation (Exec Suite)', dept: 'Operations', status: 'rejected', amount: '₹14,00,000' },
  { id: 49, type: 'EXCEPTION', ref: 'EXP-2026-049', subject: 'Supplier Late Delivery Penalty Waiver — Global Telecom Carrier', dept: 'Commercial', status: 'approved', amount: '₹18,50,000' },
  { id: 50, type: 'EXCEPTION', ref: 'EXP-2026-050', subject: 'Cryptographic Key Expiry Rotation Window 30-Day Grace Period', dept: 'Security', status: 'approved', amount: '₹0' },
  { id: 51, type: 'EXCEPTION', ref: 'EXP-2026-051', subject: 'Exceeding Commercial Discount Authority Ceiling (32% vs 20% limit)', dept: 'Commercial', status: 'approved', amount: '₹85,00,000' },
  { id: 52, type: 'EXCEPTION', ref: 'EXP-2026-052', subject: 'Rapid Hire Sign-on Compensation Cap Waiver — Principal Architect', dept: 'People', status: 'approved', amount: '₹32,00,000' },
  { id: 53, type: 'EXCEPTION', ref: 'EXP-2026-053', subject: 'Emergency Datacenter Cooling Plant Overhaul outside Annual Budget', dept: 'Operations', status: 'approved', amount: '₹42,00,000' },
  { id: 54, type: 'EXCEPTION', ref: 'EXP-2026-054', subject: 'Bypass of RFP Mandate for Deloitte Strategic Tax Restructuring', dept: 'Finance', status: 'approved', amount: '₹38,00,000' },
  { id: 55, type: 'EXCEPTION', ref: 'EXP-2026-055', subject: 'Customer SLA Refund Claim Authorization Above Manager Threshold', dept: 'Commercial', status: 'approved', amount: '₹24,00,000' },
  { id: 56, type: 'EXCEPTION', ref: 'EXP-2026-056', subject: 'Hardware Depreciation Lifecycle Acceleration Exemption', dept: 'Finance', status: 'approved', amount: '₹19,00,000' },
  { id: 57, type: 'EXCEPTION', ref: 'EXP-2026-057', subject: 'Relocation Tax Gross-Up Exception for VP Infrastructure Transfer', dept: 'People', status: 'approved', amount: '₹22,00,000' },
  { id: 58, type: 'EXCEPTION', ref: 'EXP-2026-058', subject: 'Unplanned Penetration Test Remediation Tools Procurement', dept: 'Security', status: 'pending', amount: '₹16,50,000' },
  { id: 59, type: 'EXCEPTION', ref: 'EXP-2026-059', subject: 'Expedited Patent Application Fast-Track Fee Override', dept: 'Legal', status: 'approved', amount: '₹11,00,000' },
  { id: 60, type: 'EXCEPTION', ref: 'EXP-2026-060', subject: 'Remote Work Cross-Jurisdiction Tax Presence Exemption', dept: 'People', status: 'rejected', amount: '₹9,00,000' },
  { id: 61, type: 'EXCEPTION', ref: 'EXP-2026-061', subject: 'Sales Commission Accelerator Plan Exception for Top Tier Closer', dept: 'Commercial', status: 'approved', amount: '₹36,00,000' },
  { id: 62, type: 'EXCEPTION', ref: 'EXP-2026-062', subject: 'Out-of-Cycle Software License True-Up Overages (Oracle/SAP)', dept: 'Engineering', status: 'approved', amount: '₹44,00,000' },
  { id: 63, type: 'EXCEPTION', ref: 'EXP-2026-063', subject: 'Executive Life Insurance Coverage Upgrade Beyond Standard Policy', dept: 'Executive', status: 'approved', amount: '₹25,00,000' },
  { id: 64, type: 'EXCEPTION', ref: 'EXP-2026-064', subject: 'Sole Source Procurement for Specialist Cryptographic Silicon Chipset', dept: 'Security', status: 'pending', amount: '₹58,00,000' },
  { id: 65, type: 'EXCEPTION', ref: 'EXP-2026-065', subject: 'Emergency Core Router Replacement following Firmware Vulnerability', dept: 'Engineering', status: 'approved', amount: '₹27,00,000' },
  { id: 66, type: 'EXCEPTION', ref: 'EXP-2026-066', subject: 'Vendor Contract Term Extension without Mandatory Security Re-Audit', dept: 'Operations', status: 'rejected', amount: '₹15,00,000' },
  { id: 67, type: 'EXCEPTION', ref: 'EXP-2026-067', subject: 'Unscheduled Shareholder Briefing Meeting Venue Capitalization', dept: 'Executive', status: 'approved', amount: '₹13,50,000' },
  { id: 68, type: 'EXCEPTION', ref: 'EXP-2026-068', subject: 'Marketing Video Production Exemption Exceeding Quarterly Agency Retainer', dept: 'Commercial', status: 'rejected', amount: '₹21,50,000' },
  { id: 69, type: 'EXCEPTION', ref: 'EXP-2026-069', subject: 'Customer Success VIP Onboarding Concierge Guarantee Exemption', dept: 'Commercial', status: 'pending', amount: '₹17,00,000' },
  { id: 70, type: 'EXCEPTION', ref: 'EXP-2026-070', subject: 'Statutory Secretarial Regulatory Filing Fee Expedite Variance', dept: 'Legal', status: 'approved', amount: '₹8,00,000' },

  // ==========================================
  // SECTION 4: TRANSACTIONAL DECISIONS (30 Scenarios)
  // Standard operational procurement, recurring contracts, budget drawdowns & renewals
  // ==========================================
  { id: 71, type: 'TRANSACTIONAL', ref: 'TRX-2026-071', subject: 'Annual Datadog Infrastructure APM License Renewal', dept: 'Engineering', status: 'approved', amount: '₹14,00,000' },
  { id: 72, type: 'TRANSACTIONAL', ref: 'TRX-2026-072', subject: 'Salesforce Enterprise CRM 3-Year Seat Renewal (450 users)', dept: 'Commercial', status: 'approved', amount: '₹95,00,000' },
  { id: 73, type: 'TRANSACTIONAL', ref: 'TRX-2026-073', subject: 'AWS Monthly Compute & Database Reserved Instances Commitment', dept: 'Engineering', status: 'approved', amount: '₹68,00,000' },
  { id: 74, type: 'TRANSACTIONAL', ref: 'TRX-2026-074', subject: 'Workday HRMS Enterprise Platform Subscription SOW', dept: 'People', status: 'approved', amount: '₹52,00,000' },
  { id: 75, type: 'TRANSACTIONAL', ref: 'TRX-2026-075', subject: 'Baker McKenzie Corporate IP & Trademark Legal Retainer', dept: 'Legal', status: 'approved', amount: '₹30,00,000' },
  { id: 76, type: 'TRANSACTIONAL', ref: 'TRX-2026-076', subject: 'GitHub Enterprise EMU Cloud Seats & Copilot Business License', dept: 'Engineering', status: 'approved', amount: '₹16,50,000' },
  { id: 77, type: 'TRANSACTIONAL', ref: 'TRX-2026-077', subject: 'Corporate Cyber Insurance Policy Annual Underwriting Renewal', dept: 'Finance', status: 'approved', amount: '₹42,00,000' },
  { id: 78, type: 'TRANSACTIONAL', ref: 'TRX-2026-078', subject: 'Figma Organization Multi-Seat Design System Renewal', dept: 'Product', status: 'approved', amount: '₹7,80,000' },
  { id: 79, type: 'TRANSACTIONAL', ref: 'TRX-2026-079', subject: 'Employee Health Insurance Group Policy Annual Premium Drawdown', dept: 'People', status: 'approved', amount: '₹1,10,00,000' },
  { id: 80, type: 'TRANSACTIONAL', ref: 'TRX-2026-080', subject: 'Dell Precision Workstations Batch Refresh for Engineering Hub', dept: 'Operations', status: 'pending', amount: '₹34,00,000' },
  { id: 81, type: 'TRANSACTIONAL', ref: 'TRX-2026-081', subject: 'Customer Success Intercom Enterprise Messaging License', dept: 'Commercial', status: 'approved', amount: '₹12,40,000' },
  { id: 82, type: 'TRANSACTIONAL', ref: 'TRX-2026-082', subject: 'Office High-Speed Fiber Internet Leased Line Annual Contract', dept: 'Operations', status: 'approved', amount: '₹18,00,000' },
  { id: 83, type: 'TRANSACTIONAL', ref: 'TRX-2026-083', subject: 'CrowdStrike Falcon EDR Endpoint Security Renewal', dept: 'Security', status: 'approved', amount: '₹38,00,000' },
  { id: 84, type: 'TRANSACTIONAL', ref: 'TRX-2026-084', subject: 'Stripe Corporate Billing & Global Payout Fee Schedule Agreement', dept: 'Finance', status: 'approved', amount: '₹26,00,000' },
  { id: 85, type: 'TRANSACTIONAL', ref: 'TRX-2026-085', subject: 'Corporate Travel Management Platform Egencia SOW', dept: 'Operations', status: 'approved', amount: '₹9,20,000' },
  { id: 86, type: 'TRANSACTIONAL', ref: 'TRX-2026-086', subject: 'Slack Enterprise Grid Annual Multi-Workspace Contract', dept: 'Operations', status: 'approved', amount: '₹22,00,000' },
  { id: 87, type: 'TRANSACTIONAL', ref: 'TRX-2026-087', subject: 'External Auditor Engagement Letter & Interim Audit Fee SOW', dept: 'Audit', status: 'approved', amount: '₹48,00,000' },
  { id: 88, type: 'TRANSACTIONAL', ref: 'TRX-2026-088', subject: 'Gong.io Revenue Intelligence & Call Analytics Software Renewal', dept: 'Commercial', status: 'pending', amount: '₹19,50,000' },
  { id: 89, type: 'TRANSACTIONAL', ref: 'TRX-2026-089', subject: '1Password Enterprise Business Vault Licensing Upgrade', dept: 'Security', status: 'approved', amount: '₹6,40,000' },
  { id: 90, type: 'TRANSACTIONAL', ref: 'TRX-2026-090', subject: 'Snowflake Analytics Cloud Warehouse Compute Baseline Reserve', dept: 'Engineering', status: 'approved', amount: '₹55,00,000' },
  { id: 91, type: 'TRANSACTIONAL', ref: 'TRX-2026-091', subject: 'Ergonomic Standing Desks & Chairs Batch Procurement', dept: 'Operations', status: 'approved', amount: '₹15,50,000' },
  { id: 92, type: 'TRANSACTIONAL', ref: 'TRX-2026-092', subject: 'Executive Recruitment Retainer — Head of International Sales', dept: 'People', status: 'pending', amount: '₹28,00,000' },
  { id: 93, type: 'TRANSACTIONAL', ref: 'TRX-2026-093', subject: 'PagerDuty On-Call Incident Management Platform Renewal', dept: 'Engineering', status: 'approved', amount: '₹11,00,000' },
  { id: 94, type: 'TRANSACTIONAL', ref: 'TRX-2026-094', subject: 'Corporate Cell Phone Fleet Voice & 5G Data Contract', dept: 'Operations', status: 'approved', amount: '₹8,40,000' },
  { id: 95, type: 'TRANSACTIONAL', ref: 'TRX-2026-095', subject: 'PostgreSQL Database Performance Tuning Specialist Advisory SOW', dept: 'Engineering', status: 'approved', amount: '₹14,50,000' },
  { id: 96, type: 'TRANSACTIONAL', ref: 'TRX-2026-096', subject: 'Jira Software & Confluence Cloud Enterprise Tier True-up', dept: 'Product', status: 'approved', amount: '₹23,00,000' },
  { id: 97, type: 'TRANSACTIONAL', ref: 'TRX-2026-097', subject: 'Annual Security Guard Services & Facility Access Control Contract', dept: 'Operations', status: 'approved', amount: '₹31,00,000' },
  { id: 98, type: 'TRANSACTIONAL', ref: 'TRX-2026-098', subject: 'Corporate Tax Return Compliance & Filing Retainer SOW', dept: 'Finance', status: 'approved', amount: '₹17,50,000' },
  { id: 99, type: 'TRANSACTIONAL', ref: 'TRX-2026-099', subject: 'LinkedIn Recruiter Corporate Enterprise Seats License', dept: 'People', status: 'approved', amount: '₹21,00,000' },
  { id: 100, type: 'TRANSACTIONAL', ref: 'TRX-2026-100', subject: 'Facility HVAC Preventative Maintenance Service Contract', dept: 'Operations', status: 'approved', amount: '₹13,20,000' },
];

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- PURGING OLD TEST DATA & RESETTING FRESH ENVIRONMENT ---');

  try {
    const { rows: tRows } = await client.query(`SELECT id, subdomain FROM tenants WHERE subdomain = 'meridian'`);
    const tenantId = tRows[0].id;

    // 1. Purge all existing requests, steps and decision references for Meridian Corp
    console.log('Purging existing decisions, steps, and references for Meridian...');
    // Delete all child tables referencing approval_requests
    await client.query(`DELETE FROM decision_references WHERE tenant_id = $1`, [tenantId]).catch(() => {});
    await client.query(`
      DELETE FROM audit_log 
      WHERE request_id IN (SELECT id FROM approval_requests WHERE tenant_id = $1)
    `, [tenantId]).catch(e => console.log('audit_log delete:', e.message));
    await client.query(`
      DELETE FROM comments 
      WHERE request_id IN (SELECT id FROM approval_requests WHERE tenant_id = $1)
    `, [tenantId]).catch(() => {});
    await client.query(`
      DELETE FROM custom_field_values 
      WHERE request_id IN (SELECT id FROM approval_requests WHERE tenant_id = $1)
    `, [tenantId]).catch(() => {});
    await client.query(`
      DELETE FROM action_tokens 
      WHERE request_id IN (SELECT id FROM approval_requests WHERE tenant_id = $1)
    `, [tenantId]).catch(() => {});
    await client.query(`
      DELETE FROM approval_steps 
      WHERE request_id IN (SELECT id FROM approval_requests WHERE tenant_id = $1)
    `, [tenantId]).catch(e => console.log('approval_steps delete:', e.message));
    await client.query(`DELETE FROM approval_requests WHERE tenant_id = $1`, [tenantId]);
    console.log('✓ Database purged cleanly. Starting completely fresh.');

    // 2. Fetch category mappings for the 4 step types
    const { rows: cats } = await client.query(`SELECT id, name, step_type FROM categories WHERE tenant_id = $1`, [tenantId]);
    
    // Map categories cleanly:
    const structuralCat = cats.find(c => c.step_type === 'STRUCTURAL') || cats[0];
    const processCat = cats.find(c => c.step_type === 'PROCESS') || cats[0];
    const exceptionCat = cats.find(c => c.step_type === 'EXCEPTION') || cats[0];
    const transactionalCat = cats.find(c => c.step_type === 'TRANSACTIONAL') || cats.find(c => c.name === 'General Procurement') || cats[0];

    const categoryByType: Record<string, string> = {
      STRUCTURAL: structuralCat.id,
      PROCESS: processCat.id,
      EXCEPTION: exceptionCat.id,
      TRANSACTIONAL: transactionalCat.id,
    };

    // 3. Fetch key personas in Meridian
    const { rows: uRows } = await client.query(`SELECT id, email, name, role FROM users WHERE tenant_id = $1`, [tenantId]);
    const vijay = uRows.find(u => u.email === 'vijay.reddy@meridian.com') || uRows[0];
    const krishna = uRows.find(u => u.email === 'krishna.pillai@meridian.com') || uRows[1];
    const anand = uRows.find(u => u.email === 'anand.kulkarni@meridian.com') || uRows[2];
    const arjun = uRows.find(u => u.email === 'arjun.bose@meridian.com') || uRows[3];

    console.log(`Seeding 100 comprehensive enterprise scenarios across 4 step types...`);

    // 4. Seed all 100 scenarios with canonical SHA-256 seals, multi-stage approval steps and rich metadata
    for (let i = 0; i < scenarioCatalogue.length; i++) {
      const s = scenarioCatalogue[i];
      const reqId = crypto.randomUUID();
      const catId = categoryByType[s.type];

      // Assign realistic owner based on department
      const owner = (i % 4 === 0) ? arjun : ((i % 4 === 1) ? krishna : ((i % 4 === 2) ? anand : vijay));

      // Compute canonical SHA-256 seal for approved decisions
      const checksum = s.status === 'approved'
        ? crypto.createHash('sha256').update(`${s.ref}-${s.subject}-${tenantId}-canonical-sealed-2026-v2`).digest('hex')
        : null;

      // Stagger creation dates strictly within October 2026 (1 to 24 days ago) so OND 2026 intelligence reflects all 100 scenarios
      const daysAgo = 1 + Math.floor((i / 100) * 23);
      const isFinalized = s.status === 'approved' || s.status === 'rejected';

      await client.query(`
        INSERT INTO approval_requests (
          id, ref, tenant_id, owner_id, category_id, subject, status, 
          resolved_step_type, baseline_step_type, checksum_sha256, 
          finalized_at, created_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, 
          $8, $8, $9, 
          ${isFinalized ? `NOW() - interval '${daysAgo} days' + interval '6 hours'` : 'NULL'}, 
          NOW() - interval '${daysAgo} days'
        )
      `, [
        reqId, s.ref, tenantId, owner.id, catId, `${s.subject} (${s.amount})`, s.status,
        s.type, checksum
      ]);

      // Multi-stage approval steps:
      // Stage 1: Department VP or Director Review
      const step1Id = crypto.randomUUID();
      const step1Status = s.status === 'approved' ? 'approved' : (s.status === 'rejected' ? 'rejected' : 'pending');
      const step1Approver = (s.type === 'STRUCTURAL' || s.type === 'EXCEPTION') ? anand : krishna;
      const step1Comment = s.status === 'approved' 
        ? `Stage 1 Review Complete: Verified operational necessity, budget availability, and domain criteria under ${s.type} classification.` 
        : (s.status === 'rejected' ? `Rejected: Fails threshold limits set for ${s.dept} budget allocation.` : null);

      await client.query(`
        INSERT INTO approval_steps (id, request_id, order_index, stage_index, approver_id, type, status, comment, entered_at, acted_at)
        VALUES (
          $1, $2, 1, 1, $3, 'GENERAL', $4, $5, 
          NOW() - interval '${daysAgo} days', 
          ${step1Status !== 'pending' ? `NOW() - interval '${daysAgo} days' + interval '3 hours'` : 'NULL'}
        )
      `, [step1Id, reqId, step1Approver.id, step1Status, step1Comment]);

      // Stage 2: C-Suite / Executive Seal (Vijay Reddy) for Approved Decisions
      if (s.status === 'approved') {
        const step2Id = crypto.randomUUID();
        await client.query(`
          INSERT INTO approval_steps (id, request_id, order_index, stage_index, approver_id, type, status, comment, entered_at, acted_at)
          VALUES (
            $1, $2, 2, 2, $3, 'GENERAL', 'approved', 
            'Executive Authority Seal: Strategic alignment and governance compliance confirmed. Cryptographic seal issued.', 
            NOW() - interval '${daysAgo} days' + interval '3 hours', 
            NOW() - interval '${daysAgo} days' + interval '6 hours'
          )
        `, [step2Id, reqId, vijay.id]);
      }
    }

    console.log('✓ Successfully created 100 comprehensive fresh scenarios with multi-stage approval chains and SHA-256 seals!');

    // 5. Query and verify the fresh state
    const { rows: stats } = await client.query(`
      SELECT resolved_step_type, count(*), 
             count(*) FILTER (WHERE status = 'approved') as approved_count,
             count(*) FILTER (WHERE status = 'pending') as pending_count,
             count(*) FILTER (WHERE status = 'rejected') as rejected_count
      FROM approval_requests
      WHERE tenant_id = $1
      GROUP BY resolved_step_type
      ORDER BY resolved_step_type
    `, [tenantId]);

    console.log('\n--- FRESH 100 SCENARIOS VERIFICATION SUMMARY ---');
    console.table(stats);

    // Export fresh snapshot to local artifacts
    const { rows: fullList } = await client.query(`
      SELECT r.id, r.ref, r.subject, r.status, r.resolved_step_type, r.checksum_sha256, r.finalized_at, r.created_at,
             c.name as category_name, u.name as owner_name, u.email as owner_email
      FROM approval_requests r
      JOIN categories c ON r.category_id = c.id
      JOIN users u ON r.owner_id = u.id
      WHERE r.tenant_id = $1
      ORDER BY r.created_at DESC
    `, [tenantId]);

    const snapshot = {
      resetAt: new Date().toISOString(),
      tenant: 'Meridian Corp',
      totalFreshScenarios: fullList.length,
      stepTypeBreakdown: stats,
      scenarios: fullList
    };

    const outPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\3818f154-b0f5-4da6-9691-3a3aa08a418c\\sigmago_100_fresh_scenarios.json';
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
    console.log(`✓ Exported fresh 100-scenario dataset to: ${outPath}`);

  } catch (err) {
    console.error('Error during reset and seed:', err);
  } finally {
    await client.end();
  }
}

main();
