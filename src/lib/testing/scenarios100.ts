// Comprehensive 100 Enterprise Scenarios Catalogue across 4 Step Types & 10 Distinct Email IDs

export interface ScenarioDefinition {
  id: number;
  type: 'STRUCTURAL' | 'PROCESS' | 'EXCEPTION' | 'TRANSACTIONAL';
  ref: string;
  subject: string;
  dept: 'Executive' | 'Finance' | 'Legal' | 'Security' | 'People' | 'Engineering' | 'Operations' | 'Commercial' | 'Audit' | 'Product';
  amount: string;
  requesterEmail: string;
  requesterName: string;
  approverEmail: string;
  approverName: string;
  status: 'approved' | 'rejected' | 'pending';
  comment: string;
}

export const SCENARIOS_100: ScenarioDefinition[] = [
  // SECTION 1: STRUCTURAL DECISIONS (20 Scenarios)
  {
    id: 1, type: 'STRUCTURAL', ref: 'STR-2026-001',
    subject: 'Acquisition of FinTech Cloud Ledger Target Alpha ($12.5M)',
    dept: 'Executive', amount: '₹10,50,00,000',
    requesterEmail: 'vijay.reddy@meridian.com', requesterName: 'Vijay Reddy (CEO)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Board-mandated M&A valuation models confirmed. Synergies verified.'
  },
  {
    id: 2, type: 'STRUCTURAL', ref: 'STR-2026-002',
    subject: 'Establishment of Singapore Subsidiary for APAC Treasury',
    dept: 'Finance', amount: '₹4,20,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'APAC treasury nexus approved. Cross-border tax compliance verified.'
  },
  {
    id: 3, type: 'STRUCTURAL', ref: 'STR-2026-003',
    subject: 'Board Reconstitution & Independent Director Appointment',
    dept: 'Executive', amount: '₹75,00,000',
    requesterEmail: 'vijay.reddy@meridian.com', requesterName: 'Vijay Reddy (CEO)',
    approverEmail: 'sunita.rao@meridian.com', approverName: 'Sunita Rao (Head of Legal)',
    status: 'approved', comment: 'Nomination and Remuneration Committee governance protocol cleared.'
  },
  {
    id: 4, type: 'STRUCTURAL', ref: 'STR-2026-004',
    subject: 'Employee Stock Option Pool Expansion (Series D Prep)',
    dept: 'People', amount: '₹18,00,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Dilution schedule aligned with Series D term sheet expectations.'
  },
  {
    id: 5, type: 'STRUCTURAL', ref: 'STR-2026-005',
    subject: 'Spin-off of Edge Robotics Business Unit into Standalone Entity',
    dept: 'Executive', amount: '₹6,50,00,000',
    requesterEmail: 'anand.kulkarni@meridian.com', requesterName: 'Anand Kulkarni (COO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Carve-out operating framework approved under dual entity governance.'
  },
  {
    id: 6, type: 'STRUCTURAL', ref: 'STR-2026-006',
    subject: 'European Data Sovereign Cloud Operating Entity Formation (Frankfurt)',
    dept: 'Legal', amount: '₹3,80,00,000',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'GDPR Article 28 data sovereignty legal entity ratified.'
  },
  {
    id: 7, type: 'STRUCTURAL', ref: 'STR-2026-007',
    subject: 'Joint Venture Capital Allocation — Southeast Asia Telecom Alliance',
    dept: 'Commercial', amount: '₹8,20,00,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'pending', comment: 'Awaiting regulatory sign-off on anti-trust foreign direct investment limits.'
  },
  {
    id: 8, type: 'STRUCTURAL', ref: 'STR-2026-008',
    subject: 'Syndicated Banking Facility Debt Restructuring Protocol',
    dept: 'Finance', amount: '₹25,00,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Refinancing covenant package achieves 180bps interest reduction.'
  },
  {
    id: 9, type: 'STRUCTURAL', ref: 'STR-2026-009',
    subject: 'Core Intellectual Property Portfolio Holding Transfer to Trust',
    dept: 'Legal', amount: '₹5,00,00,000',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'IP asset ring-fencing execution confirmed by outside patent counsel.'
  },
  {
    id: 10, type: 'STRUCTURAL', ref: 'STR-2026-010',
    subject: 'C-Suite Operating Model Realignment & Dual Reporting Governance',
    dept: 'People', amount: '₹1,50,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Matrix reporting model aligned with global growth objectives.'
  },
  {
    id: 11, type: 'STRUCTURAL', ref: 'STR-2026-011',
    subject: 'Strategic Divestiture of Legacy On-Premise Hosting Assets',
    dept: 'Finance', amount: '₹2,90,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Asset retirement schedule verified. Positive cash flow impact.'
  },
  {
    id: 12, type: 'STRUCTURAL', ref: 'STR-2026-012',
    subject: 'Class A to Class B Voting Share Conversion Authorization',
    dept: 'Legal', amount: '₹0',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Founder super-voting transition mapped to corporate charter.'
  },
  {
    id: 13, type: 'STRUCTURAL', ref: 'STR-2026-013',
    subject: 'Merger Integration Governance Committee Charter Ratification',
    dept: 'Executive', amount: '₹45,00,000',
    requesterEmail: 'anand.kulkarni@meridian.com', requesterName: 'Anand Kulkarni (COO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Committee mandate established with 100-day execution milestones.'
  },
  {
    id: 14, type: 'STRUCTURAL', ref: 'STR-2026-014',
    subject: 'Cross-Border Intercompany Licensing Framework Restructuring',
    dept: 'Finance', amount: '₹3,40,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'sunita.rao@meridian.com', approverName: 'Sunita Rao (Head of Legal)',
    status: 'pending', comment: 'Awaiting transfer pricing arm’s-length benchmark report from KPMG.'
  },
  {
    id: 15, type: 'STRUCTURAL', ref: 'STR-2026-015',
    subject: 'Executive Equity Clawback & Governance Bylaw Amendment',
    dept: 'People', amount: '₹0',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'SEC Rule 10D-1 mandatory clawback provisions incorporated.'
  },
  {
    id: 16, type: 'STRUCTURAL', ref: 'STR-2026-016',
    subject: 'Global Corporate Tax Holding Nexus Reorganization (Mauritius/Dubai)',
    dept: 'Finance', amount: '₹1,80,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Double tax avoidance treaty optimization approved.'
  },
  {
    id: 17, type: 'STRUCTURAL', ref: 'STR-2026-017',
    subject: 'Chief Sustainability Officer Board Advisory Seat Establishment',
    dept: 'Executive', amount: '₹60,00,000',
    requesterEmail: 'vijay.reddy@meridian.com', requesterName: 'Vijay Reddy (CEO)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'ESG corporate charter updated to include dedicated advisory voting role.'
  },
  {
    id: 18, type: 'STRUCTURAL', ref: 'STR-2026-018',
    subject: 'Commercial Real Estate Sale-and-Leaseback Authorization',
    dept: 'Operations', amount: '₹14,00,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Liquidity unlocked for primary R&D reinvestment with 15-yr stable lease.'
  },
  {
    id: 19, type: 'STRUCTURAL', ref: 'STR-2026-019',
    subject: 'Acquisition Earnout Milestone Revision — CyberSec Labs',
    dept: 'Executive', amount: '₹4,50,00,000',
    requesterEmail: 'anand.kulkarni@meridian.com', requesterName: 'Anand Kulkarni (COO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'rejected', comment: 'Target failed Year-2 ARR threshold. Earnout waiver denied by Executive Board.'
  },
  {
    id: 20, type: 'STRUCTURAL', ref: 'STR-2026-020',
    subject: 'Public Listing (IPO) Readiness Advisory Council Mandate',
    dept: 'Executive', amount: '₹2,20,00,000',
    requesterEmail: 'vijay.reddy@meridian.com', requesterName: 'Vijay Reddy (CEO)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Morgan Stanley & J.P. Morgan preliminary readiness council engagement ratified.'
  },

  // SECTION 2: PROCESS DECISIONS (20 Scenarios)
  {
    id: 21, type: 'PROCESS', ref: 'PRC-2026-021',
    subject: 'SOC2 Type II Annual Security Audit Certification Protocol',
    dept: 'Security', amount: '₹28,00,000',
    requesterEmail: 'dev.singh@meridian.com', requesterName: 'Dev Singh (CISO)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'Trust Services Criteria scope and Ernst & Young audit schedule verified.'
  },
  {
    id: 22, type: 'PROCESS', ref: 'PRC-2026-022',
    subject: 'ISO 27001 Information Security Management System Recertification',
    dept: 'Security', amount: '₹22,50,000',
    requesterEmail: 'dev.singh@meridian.com', requesterName: 'Dev Singh (CISO)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'ISMS risk assessment methodology verified compliant with ISO/IEC 27001:2022.'
  },
  {
    id: 23, type: 'PROCESS', ref: 'PRC-2026-023',
    subject: 'Annual Multi-Region Disaster Recovery Failover Simulation Drill',
    dept: 'Engineering', amount: '₹16,00,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'RTO < 15 mins and RPO < 30 secs verified across Dublin & Frankfurt clusters.'
  },
  {
    id: 24, type: 'PROCESS', ref: 'PRC-2026-024',
    subject: 'SOX 404 Financial Internal Control Assessment & Testing Cycle',
    dept: 'Finance', amount: '₹34,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'PwC internal controls sampling plan approved by Audit Committee.'
  },
  {
    id: 25, type: 'PROCESS', ref: 'PRC-2026-025',
    subject: 'Vendor Risk Tiering & Security Scorecard Evaluation Workflow',
    dept: 'Operations', amount: '₹12,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'dev.singh@meridian.com', approverName: 'Dev Singh (CISO)',
    status: 'approved', comment: 'Tier 1 through Tier 4 third-party risk assessment framework ratified.'
  },
  {
    id: 26, type: 'PROCESS', ref: 'PRC-2026-026',
    subject: 'GDPR / DPDP Global Data Retention & Deletion Workflow Verification',
    dept: 'Legal', amount: '₹19,00,000',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'Right-to-be-forgotten automated tombstone replication verified.'
  },
  {
    id: 27, type: 'PROCESS', ref: 'PRC-2026-027',
    subject: 'Enterprise Incident Response Runbook & Severity Escalation SLA Review',
    dept: 'Engineering', amount: '₹8,50,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'dev.singh@meridian.com', approverName: 'Dev Singh (CISO)',
    status: 'approved', comment: 'P0 SLA tightened to 10-minute engagement with direct executive bridge.'
  },
  {
    id: 28, type: 'PROCESS', ref: 'PRC-2026-028',
    subject: 'Statutory Financial Statement Half-Year Sign-off Protocol',
    dept: 'Audit', amount: '₹45,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Deloitte interim review unqualified opinion approved.'
  },
  {
    id: 29, type: 'PROCESS', ref: 'PRC-2026-029',
    subject: 'Engineering Software Release Gate & Semantic Versioning Standard',
    dept: 'Engineering', amount: '₹0',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'Automated release blocker rules enforced on broken unit tests or CVSS > 7.0.'
  },
  {
    id: 30, type: 'PROCESS', ref: 'PRC-2026-030',
    subject: 'Workplace Health & Occupational Safety Statutory Compliance Review',
    dept: 'Operations', amount: '₹9,80,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'vikram.malhotra@meridian.com', approverName: 'Vikram Malhotra (VP HR)',
    status: 'approved', comment: 'Annual fire safety, ergonomics, and emergency evacuation drills certified.'
  },
  {
    id: 31, type: 'PROCESS', ref: 'PRC-2026-031',
    subject: 'Anti-Bribery and FCPA Compliance Training & Attestation Cycle',
    dept: 'Legal', amount: '₹14,00,000',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: '100% mandatory employee attestation workflow deployed with automated compliance tracking.'
  },
  {
    id: 32, type: 'PROCESS', ref: 'PRC-2026-032',
    subject: 'Quarterly Cloud Cost Allocation & FinOps Tagging Enforcement',
    dept: 'Engineering', amount: '₹0',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Untagged AWS/GCP instance automated shutdown rule approved.'
  },
  {
    id: 33, type: 'PROCESS', ref: 'PRC-2026-033',
    subject: 'Customer Support Escalation Tier 3 Handover Protocol',
    dept: 'Commercial', amount: '₹6,40,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Zendesk-to-Jira enterprise bridge protocol ratified with 2-hour SLA.'
  },
  {
    id: 34, type: 'PROCESS', ref: 'PRC-2026-034',
    subject: 'ESG Environmental Carbon Footprint Audit Methodology Approval',
    dept: 'Executive', amount: '₹18,00,000',
    requesterEmail: 'anand.kulkarni@meridian.com', requesterName: 'Anand Kulkarni (COO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'pending', comment: 'Pending Scope 3 supplier data harmonization from European logistics carriers.'
  },
  {
    id: 35, type: 'PROCESS', ref: 'PRC-2026-035',
    subject: 'Cryptographic HSM Key Lifecycle & Backup Procedure Verification',
    dept: 'Security', amount: '₹15,00,000',
    requesterEmail: 'dev.singh@meridian.com', requesterName: 'Dev Singh (CISO)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'FIPS 140-3 Level 3 hardware security module key generation protocol signed off.'
  },
  {
    id: 36, type: 'PROCESS', ref: 'PRC-2026-036',
    subject: 'Global Procurement Anti-Modern-Slavery Due Diligence Gate',
    dept: 'Operations', amount: '₹11,50,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'sunita.rao@meridian.com', approverName: 'Sunita Rao (Head of Legal)',
    status: 'approved', comment: 'Statutory supply chain attestation gate added to vendor onboarding.'
  },
  {
    id: 37, type: 'PROCESS', ref: 'PRC-2026-037',
    subject: 'Continuous Integration / Continuous Deployment Pipeline Security Gate',
    dept: 'Engineering', amount: '₹0',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'dev.singh@meridian.com', approverName: 'Dev Singh (CISO)',
    status: 'approved', comment: 'GitHub Actions SonarQube & Snyk SCA scanning mandatory gates deployed.'
  },
  {
    id: 38, type: 'PROCESS', ref: 'PRC-2026-038',
    subject: 'Corporate Governance Whistleblower Escalation Pathway Review',
    dept: 'Legal', amount: '₹7,20,000',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Third-party anonymous hotline intake SLA confirmed with Audit Chair.'
  },
  {
    id: 39, type: 'PROCESS', ref: 'PRC-2026-039',
    subject: 'Vendor Contract Auto-Renewal Review Window Enforcement (60-day)',
    dept: 'Operations', amount: '₹0',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'rejected', comment: 'Proposed 30-day exception clause introduces unacceptable legal exposure.'
  },
  {
    id: 40, type: 'PROCESS', ref: 'PRC-2026-040',
    subject: 'AI Ethics & Model Fairness Verification Standard Operating Procedure',
    dept: 'Product', amount: '₹21,00,000',
    requesterEmail: 'arjun.bose@meridian.com', requesterName: 'Arjun Bose (CTO)',
    approverEmail: 'sunita.rao@meridian.com', approverName: 'Sunita Rao (Head of Legal)',
    status: 'approved', comment: 'NIST AI Risk Management Framework 1.0 testing criteria approved.'
  },

  // SECTION 3: EXCEPTION DECISIONS (30 Scenarios)
  {
    id: 41, type: 'EXCEPTION', ref: 'EXP-2026-041',
    subject: 'Emergency High-Capacity Cloud GPU Cluster Provisioning ($180k/yr)',
    dept: 'Engineering', amount: '₹1,50,00,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'Critical training deadline for Foundation LLM v3 requires 64x H100 cluster.'
  },
  {
    id: 42, type: 'EXCEPTION', ref: 'EXP-2026-042',
    subject: 'Off-cycle Retention Equity Allocation for Staff AI Scientist',
    dept: 'People', amount: '₹48,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Counter-offer defense for core generative model researcher verified.'
  },
  {
    id: 43, type: 'EXCEPTION', ref: 'EXP-2026-043',
    subject: 'Single-Source Exemption — Specialized Threat Intelligence Feed',
    dept: 'Security', amount: '₹35,00,000',
    requesterEmail: 'dev.singh@meridian.com', requesterName: 'Dev Singh (CISO)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Mandrill Labs is the sole provider of targeted nation-state telemetry.'
  },
  {
    id: 44, type: 'EXCEPTION', ref: 'EXP-2026-044',
    subject: 'Executive Travel Policy Exemption — International Jet Charter for Deal Close',
    dept: 'Commercial', amount: '₹28,50,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'rejected', comment: 'Commercial airline first class options available. Charter exceeds policy ceiling.'
  },
  {
    id: 45, type: 'EXCEPTION', ref: 'EXP-2026-045',
    subject: 'Capex Increment Above 12% — Tier-4 Datacenter Power Backup',
    dept: 'Finance', amount: '₹65,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Power grid reliability report justifies dual UPS rotary flywheel capex variance.'
  },
  {
    id: 46, type: 'EXCEPTION', ref: 'EXP-2026-046',
    subject: 'Production DB Direct Access Policy Exemption (Post-Incident Hotfix)',
    dept: 'Security', amount: '₹0',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'dev.singh@meridian.com', approverName: 'Dev Singh (CISO)',
    status: 'approved', comment: 'Granted for 4 hours with full keystroke recording and dual session monitoring.'
  },
  {
    id: 47, type: 'EXCEPTION', ref: 'EXP-2026-047',
    subject: 'Off-policy Severance Package for Senior Executive Departure',
    dept: 'People', amount: '₹55,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Non-compete and mutual non-disparagement agreements secured.'
  },
  {
    id: 48, type: 'EXCEPTION', ref: 'EXP-2026-048',
    subject: 'Unbudgeted Office Acoustic Enclosure Installation (Exec Suite)',
    dept: 'Operations', amount: '₹14,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'rejected', comment: 'Non-essential capital expenditure. Must be deferred to next fiscal year.'
  },
  {
    id: 49, type: 'EXCEPTION', ref: 'EXP-2026-049',
    subject: 'Supplier Late Delivery Penalty Waiver — Global Telecom Carrier',
    dept: 'Commercial', amount: '₹18,50,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Waiver granted in exchange for 3-year enterprise dark fiber rate lock.'
  },
  {
    id: 50, type: 'EXCEPTION', ref: 'EXP-2026-050',
    subject: 'Cryptographic Key Expiry Rotation Window 30-Day Grace Period',
    dept: 'Security', amount: '₹0',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'dev.singh@meridian.com', approverName: 'Dev Singh (CISO)',
    status: 'approved', comment: 'Compensating controls active. Client legacy SDK deprecation timeline verified.'
  },
  {
    id: 51, type: 'EXCEPTION', ref: 'EXP-2026-051',
    subject: 'Exceeding Commercial Discount Authority Ceiling (32% vs 20% limit)',
    dept: 'Commercial', amount: '₹85,00,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Strategic Fortune 50 anchor logo. Multi-year lock-in justifies 32% discount.'
  },
  {
    id: 52, type: 'EXCEPTION', ref: 'EXP-2026-052',
    subject: 'Rapid Hire Sign-on Compensation Cap Waiver — Principal Architect',
    dept: 'People', amount: '₹32,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Signed with 24-month clawback structure.'
  },
  {
    id: 53, type: 'EXCEPTION', ref: 'EXP-2026-053',
    subject: 'Emergency Datacenter Cooling Plant Overhaul outside Annual Budget',
    dept: 'Operations', amount: '₹42,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Critical thermal failure risks server throttling. Emergency capex released.'
  },
  {
    id: 54, type: 'EXCEPTION', ref: 'EXP-2026-054',
    subject: 'Bypass of RFP Mandate for Deloitte Strategic Tax Restructuring',
    dept: 'Finance', amount: '₹38,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Pre-existing institutional knowledge prevents costly onboarding delays.'
  },
  {
    id: 55, type: 'EXCEPTION', ref: 'EXP-2026-055',
    subject: 'Customer SLA Refund Claim Authorization Above Manager Threshold',
    dept: 'Commercial', amount: '₹24,00,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Outage rebate credit applied in accordance with Master Services Agreement.'
  },
  {
    id: 56, type: 'EXCEPTION', ref: 'EXP-2026-056',
    subject: 'Hardware Depreciation Lifecycle Acceleration Exemption',
    dept: 'Finance', amount: '₹19,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Accelerated tax write-off aligned with early GPU hardware retirement.'
  },
  {
    id: 57, type: 'EXCEPTION', ref: 'EXP-2026-057',
    subject: 'Relocation Tax Gross-Up Exception for VP Infrastructure Transfer',
    dept: 'People', amount: '₹22,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'International inter-entity transfer policy variance granted.'
  },
  {
    id: 58, type: 'EXCEPTION', ref: 'EXP-2026-058',
    subject: 'Unplanned Penetration Test Remediation Tools Procurement',
    dept: 'Security', amount: '₹16,50,000',
    requesterEmail: 'dev.singh@meridian.com', requesterName: 'Dev Singh (CISO)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'pending', comment: 'Evaluating tool efficacy vs. existing CrowdStrike Falcon capabilities.'
  },
  {
    id: 59, type: 'EXCEPTION', ref: 'EXP-2026-059',
    subject: 'Expedited Patent Application Fast-Track Fee Override',
    dept: 'Legal', amount: '₹11,00,000',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'USPTO Track One prioritized examination justified by competitive release.'
  },
  {
    id: 60, type: 'EXCEPTION', ref: 'EXP-2026-060',
    subject: 'Remote Work Cross-Jurisdiction Tax Presence Exemption',
    dept: 'People', amount: '₹9,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'sunita.rao@meridian.com', approverName: 'Sunita Rao (Head of Legal)',
    status: 'rejected', comment: 'Permanent establishment tax exposure in state exceeds employee retention value.'
  },
  {
    id: 61, type: 'EXCEPTION', ref: 'EXP-2026-061',
    subject: 'Sales Commission Accelerator Plan Exception for Top Tier Closer',
    dept: 'Commercial', amount: '₹36,00,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Quarterly quota attainment exceeded 240%; accelerator approved by Compensation Committee.'
  },
  {
    id: 62, type: 'EXCEPTION', ref: 'EXP-2026-062',
    subject: 'Out-of-Cycle Software License True-Up Overages (Oracle/SAP)',
    dept: 'Engineering', amount: '₹44,00,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Mandatory true-up payment to avoid legal audit infringement penalties.'
  },
  {
    id: 63, type: 'EXCEPTION', ref: 'EXP-2026-063',
    subject: 'Executive Life Insurance Coverage Upgrade Beyond Standard Policy',
    dept: 'Executive', amount: '₹25,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Key person life insurance requirement under syndicated loan terms.'
  },
  {
    id: 64, type: 'EXCEPTION', ref: 'EXP-2026-064',
    subject: 'Sole Source Procurement for Specialist Cryptographic Silicon Chipset',
    dept: 'Security', amount: '₹58,00,000',
    requesterEmail: 'dev.singh@meridian.com', requesterName: 'Dev Singh (CISO)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'pending', comment: 'Validating export control license compliance with Department of Commerce.'
  },
  {
    id: 65, type: 'EXCEPTION', ref: 'EXP-2026-065',
    subject: 'Emergency Core Router Replacement following Firmware Vulnerability',
    dept: 'Engineering', amount: '₹27,00,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'dev.singh@meridian.com', approverName: 'Dev Singh (CISO)',
    status: 'approved', comment: 'Zero-day vulnerability CVE-2026-3829 requires immediate hardware swap.'
  },
  {
    id: 66, type: 'EXCEPTION', ref: 'EXP-2026-066',
    subject: 'Vendor Contract Term Extension without Mandatory Security Re-Audit',
    dept: 'Operations', amount: '₹15,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'dev.singh@meridian.com', approverName: 'Dev Singh (CISO)',
    status: 'rejected', comment: 'Security re-audit cannot be waived for vendors with SOC access.'
  },
  {
    id: 67, type: 'EXCEPTION', ref: 'EXP-2026-067',
    subject: 'Unscheduled Shareholder Briefing Meeting Venue Capitalization',
    dept: 'Executive', amount: '₹13,50,000',
    requesterEmail: 'vijay.reddy@meridian.com', requesterName: 'Vijay Reddy (CEO)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Host location confirmed for institutional investor quarterly symposium.'
  },
  {
    id: 68, type: 'EXCEPTION', ref: 'EXP-2026-068',
    subject: 'Marketing Video Production Exemption Exceeding Quarterly Agency Retainer',
    dept: 'Commercial', amount: '₹21,50,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'rejected', comment: 'Production costs must be absorbed within standard marketing allocation.'
  },
  {
    id: 69, type: 'EXCEPTION', ref: 'EXP-2026-069',
    subject: 'Customer Success VIP Onboarding Concierge Guarantee Exemption',
    dept: 'Commercial', amount: '₹17,00,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'pending', comment: 'Assessing staffing requirements for dedicated 24/7 technical account manager.'
  },
  {
    id: 70, type: 'EXCEPTION', ref: 'EXP-2026-070',
    subject: 'Statutory Secretarial Regulatory Filing Fee Expedite Variance',
    dept: 'Legal', amount: '₹8,00,000',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Avoids late penalty fees on registrar filings.'
  },

  // SECTION 4: TRANSACTIONAL DECISIONS (30 Scenarios)
  {
    id: 71, type: 'TRANSACTIONAL', ref: 'TRX-2026-071',
    subject: 'Annual Datadog Infrastructure APM License Renewal',
    dept: 'Engineering', amount: '₹14,00,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'Approved under budgeted operational software expenditure.'
  },
  {
    id: 72, type: 'TRANSACTIONAL', ref: 'TRX-2026-072',
    subject: 'Salesforce Enterprise CRM 3-Year Seat Renewal (450 users)',
    dept: 'Commercial', amount: '₹95,00,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Multi-year discount yields 22% annual cost reduction.'
  },
  {
    id: 73, type: 'TRANSACTIONAL', ref: 'TRX-2026-073',
    subject: 'AWS Monthly Compute & Database Reserved Instances Commitment',
    dept: 'Engineering', amount: '₹68,00,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'FinOps compute reservation plan approved.'
  },
  {
    id: 74, type: 'TRANSACTIONAL', ref: 'TRX-2026-074',
    subject: 'Workday HRMS Enterprise Platform Subscription SOW',
    dept: 'People', amount: '₹52,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Payroll & HR operations core module renewal.'
  },
  {
    id: 75, type: 'TRANSACTIONAL', ref: 'TRX-2026-075',
    subject: 'Baker McKenzie Corporate IP & Trademark Legal Retainer',
    dept: 'Legal', amount: '₹30,00,000',
    requesterEmail: 'sunita.rao@meridian.com', requesterName: 'Sunita Rao (Head of Legal)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Global trademark maintenance retainer confirmed.'
  },
  {
    id: 76, type: 'TRANSACTIONAL', ref: 'TRX-2026-076',
    subject: 'GitHub Enterprise EMU Cloud Seats & Copilot Business License',
    dept: 'Engineering', amount: '₹16,50,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'Developer tooling subscription renewed for 320 engineers.'
  },
  {
    id: 77, type: 'TRANSACTIONAL', ref: 'TRX-2026-077',
    subject: 'Corporate Cyber Insurance Policy Annual Underwriting Renewal',
    dept: 'Finance', amount: '₹42,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: '$20M aggregate limits bound with Lloyd’s syndicate.'
  },
  {
    id: 78, type: 'TRANSACTIONAL', ref: 'TRX-2026-078',
    subject: 'Figma Organization Multi-Seat Design System Renewal',
    dept: 'Product', amount: '₹7,80,000',
    requesterEmail: 'arjun.bose@meridian.com', requesterName: 'Arjun Bose (CTO)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Product design and engineering collaboration license confirmed.'
  },
  {
    id: 79, type: 'TRANSACTIONAL', ref: 'TRX-2026-079',
    subject: 'Employee Health Insurance Group Policy Annual Premium Drawdown',
    dept: 'People', amount: '₹1,10,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Comprehensive employee medical benefits pool execution.'
  },
  {
    id: 80, type: 'TRANSACTIONAL', ref: 'TRX-2026-080',
    subject: 'Dell Precision Workstations Batch Refresh for Engineering Hub',
    dept: 'Operations', amount: '₹34,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'pending', comment: 'Validating delivery lead times and leasing options with Dell Financial.'
  },
  {
    id: 81, type: 'TRANSACTIONAL', ref: 'TRX-2026-081',
    subject: 'Customer Success Intercom Enterprise Messaging License',
    dept: 'Commercial', amount: '₹12,40,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Live user support chat software annual contract.'
  },
  {
    id: 82, type: 'TRANSACTIONAL', ref: 'TRX-2026-082',
    subject: 'Office High-Speed Fiber Internet Leased Line Annual Contract',
    dept: 'Operations', amount: '₹18,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: '10 Gbps primary and redundant secondary fiber circuits locked.'
  },
  {
    id: 83, type: 'TRANSACTIONAL', ref: 'TRX-2026-083',
    subject: 'CrowdStrike Falcon EDR Endpoint Security Renewal',
    dept: 'Security', amount: '₹38,00,000',
    requesterEmail: 'dev.singh@meridian.com', requesterName: 'Dev Singh (CISO)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Enterprise endpoint telemetry and identity protection renewed.'
  },
  {
    id: 84, type: 'TRANSACTIONAL', ref: 'TRX-2026-084',
    subject: 'Stripe Corporate Billing & Global Payout Fee Schedule Agreement',
    dept: 'Finance', amount: '₹26,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Custom volume processing fee tiers confirmed.'
  },
  {
    id: 85, type: 'TRANSACTIONAL', ref: 'TRX-2026-085',
    subject: 'Corporate Travel Management Platform Egencia SOW',
    dept: 'Operations', amount: '₹9,20,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Corporate travel policy engine and booking workflow renewal.'
  },
  {
    id: 86, type: 'TRANSACTIONAL', ref: 'TRX-2026-086',
    subject: 'Slack Enterprise Grid Annual Multi-Workspace Contract',
    dept: 'Operations', amount: '₹22,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Internal collaboration software renewed across 1,200 seats.'
  },
  {
    id: 87, type: 'TRANSACTIONAL', ref: 'TRX-2026-087',
    subject: 'External Auditor Engagement Letter & Interim Audit Fee SOW',
    dept: 'Audit', amount: '₹48,00,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Audit Committee approved statutory engagement agreement.'
  },
  {
    id: 88, type: 'TRANSACTIONAL', ref: 'TRX-2026-088',
    subject: 'Gong.io Revenue Intelligence & Call Analytics Software Renewal',
    dept: 'Commercial', amount: '₹19,50,000',
    requesterEmail: 'neha.patel@meridian.com', requesterName: 'Neha Patel (VP Commercial)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'pending', comment: 'Reviewing active license utilization across sales teams.'
  },
  {
    id: 89, type: 'TRANSACTIONAL', ref: 'TRX-2026-089',
    subject: '1Password Enterprise Business Vault Licensing Upgrade',
    dept: 'Security', amount: '₹6,40,000',
    requesterEmail: 'dev.singh@meridian.com', requesterName: 'Dev Singh (CISO)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Credential management vault upgrade to Business tier.'
  },
  {
    id: 90, type: 'TRANSACTIONAL', ref: 'TRX-2026-090',
    subject: 'Snowflake Analytics Cloud Warehouse Compute Baseline Reserve',
    dept: 'Engineering', amount: '₹55,00,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Pre-purchased capacity credits with 18% volume discount.'
  },
  {
    id: 91, type: 'TRANSACTIONAL', ref: 'TRX-2026-091',
    subject: 'Ergonomic Standing Desks & Chairs Batch Procurement',
    dept: 'Operations', amount: '₹15,50,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Herman Miller ergonomic workstations for 40 new team members.'
  },
  {
    id: 92, type: 'TRANSACTIONAL', ref: 'TRX-2026-092',
    subject: 'Executive Recruitment Retainer — Head of International Sales',
    dept: 'People', amount: '₹28,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'pending', comment: 'Heidrick & Struggles search agreement under review.'
  },
  {
    id: 93, type: 'TRANSACTIONAL', ref: 'TRX-2026-093',
    subject: 'PagerDuty On-Call Incident Management Platform Renewal',
    dept: 'Engineering', amount: '₹11,00,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'Site Reliability Engineering on-call paging schedule license.'
  },
  {
    id: 94, type: 'TRANSACTIONAL', ref: 'TRX-2026-094',
    subject: 'Corporate Cell Phone Fleet Voice & 5G Data Contract',
    dept: 'Operations', amount: '₹8,40,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Airtel Enterprise pooling agreement for 180 mobile devices.'
  },
  {
    id: 95, type: 'TRANSACTIONAL', ref: 'TRX-2026-095',
    subject: 'PostgreSQL Database Performance Tuning Specialist Advisory SOW',
    dept: 'Engineering', amount: '₹14,50,000',
    requesterEmail: 'priya.sharma@meridian.com', requesterName: 'Priya Sharma (VP Eng)',
    approverEmail: 'arjun.bose@meridian.com', approverName: 'Arjun Bose (CTO)',
    status: 'approved', comment: 'EnterpriseDB consultant advisory for high-throughput query optimization.'
  },
  {
    id: 96, type: 'TRANSACTIONAL', ref: 'TRX-2026-096',
    subject: 'Jira Software & Confluence Cloud Enterprise Tier True-up',
    dept: 'Product', amount: '₹23,00,000',
    requesterEmail: 'arjun.bose@meridian.com', requesterName: 'Arjun Bose (CTO)',
    approverEmail: 'krishna.pillai@meridian.com', approverName: 'Krishna Pillai (CFO)',
    status: 'approved', comment: 'Atlassian Enterprise license upgrade for 500 users.'
  },
  {
    id: 97, type: 'TRANSACTIONAL', ref: 'TRX-2026-097',
    subject: 'Annual Security Guard Services & Facility Access Control Contract',
    dept: 'Operations', amount: '₹31,00,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: '24/7 on-premise physical security and visitor badge management.'
  },
  {
    id: 98, type: 'TRANSACTIONAL', ref: 'TRX-2026-098',
    subject: 'Corporate Tax Return Compliance & Filing Retainer SOW',
    dept: 'Finance', amount: '₹17,50,000',
    requesterEmail: 'krishna.pillai@meridian.com', requesterName: 'Krishna Pillai (CFO)',
    approverEmail: 'vijay.reddy@meridian.com', approverName: 'Vijay Reddy (CEO)',
    status: 'approved', comment: 'Annual corporate tax compliance, advance tax, and filing retainer.'
  },
  {
    id: 99, type: 'TRANSACTIONAL', ref: 'TRX-2026-099',
    subject: 'LinkedIn Recruiter Corporate Enterprise Seats License',
    dept: 'People', amount: '₹21,00,000',
    requesterEmail: 'vikram.malhotra@meridian.com', requesterName: 'Vikram Malhotra (VP HR)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Talent acquisition multi-seat recruiter pipeline software.'
  },
  {
    id: 100, type: 'TRANSACTIONAL', ref: 'TRX-2026-100',
    subject: 'Facility HVAC Preventative Maintenance Service Contract',
    dept: 'Operations', amount: '₹13,20,000',
    requesterEmail: 'rahul.mehta@meridian.com', requesterName: 'Rahul Mehta (Dir Operations)',
    approverEmail: 'anand.kulkarni@meridian.com', approverName: 'Anand Kulkarni (COO)',
    status: 'approved', comment: 'Quarterly chiller, air handler, and filter replacement schedule.'
  }
];
