import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\3818f154-b0f5-4da6-9691-3a3aa08a418c';
const FRAMES_DIR = path.join(ARTIFACT_DIR, 'client_demo_presentation_frames');

if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
} else {
  fs.readdirSync(FRAMES_DIR).forEach(f => fs.unlinkSync(path.join(FRAMES_DIR, f)));
}

class CDP {
  ws: WebSocket;
  id = 0;
  pending = new Map<number, (res: any) => void>();

  constructor(wsUrl: string) {
    this.ws = new (globalThis as any).WebSocket(wsUrl);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data.toString());
        if (msg.id && this.pending.has(msg.id)) {
          const resolveFn = this.pending.get(msg.id)!;
          this.pending.delete(msg.id);
          resolveFn(msg);
        }
      };
    });
  }

  send(method: string, params: any = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('=== SIGMAGO CLIENT DEMO RECORDING INITIALIZATION ===');
  console.log('Connecting to Google Chrome CDP on port 9222...');
  
  // 1. Get browser version and target endpoint
  const versionRes = await fetch('http://127.0.0.1:9222/json/version');
  const versionData = await versionRes.json();
  const browserWsUrl = versionData.webSocketDebuggerUrl;
  
  const browserCdp = new CDP(browserWsUrl);
  await browserCdp.connect();
  console.log('✓ Connected to Google Chrome Browser instance');

  // 2. Open a dedicated new Google Chrome window
  console.log('Opening a new Google Chrome window for https://sigma-go.vercel.app/ ...');
  const targetRes = await browserCdp.send('Target.createTarget', {
    url: 'https://sigma-go.vercel.app/login',
    newWindow: true
  });
  const targetId = targetRes.result.targetId;
  console.log(`✓ New window created with Target ID: ${targetId}`);

  // Connect to the new window page
  await sleep(1500);
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const list = await listRes.json();
  const pageTarget = list.find((t: any) => t.id === targetId) || list.find((t: any) => t.url.includes('sigma-go.vercel.app'));

  if (!pageTarget) {
    throw new Error('Could not find newly created window page');
  }

  const cdp = new CDP(pageTarget.webSocketDebuggerUrl);
  await cdp.connect();
  console.log(`✓ Attached CDP to new window: ${pageTarget.title}`);

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  // Set viewport to crisp Full HD 1920x1080
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false
  });

  let frameCount = 0;
  async function snap(label: string, holdMs = 2000) {
    frameCount++;
    await sleep(holdMs);
    const snapRes = await cdp.send('Page.captureScreenshot', { format: 'png', quality: 95 });
    if (snapRes.result && snapRes.result.data) {
      const buf = Buffer.from(snapRes.result.data, 'base64');
      const filename = `frame_${String(frameCount).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(FRAMES_DIR, filename), buf);
      console.log(`  [Frame ${String(frameCount).padStart(3, '0')}] ${label}`);
    }
  }

  // Helper for logging in as an executive persona
  async function performLogin(email: string, roleName: string) {
    console.log(`\nLogging in as: ${email} (${roleName})`);
    await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/login' });
    await sleep(2500);

    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const emailInput = document.querySelector('input[type="email"], input[name="email"]');
          const passInput = document.querySelector('input[type="password"], input[name="password"]');
          if (emailInput) {
            emailInput.value = '${email}';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (passInput) {
            passInput.value = 'Password123!';
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        })()
      `
    });
    await snap(`Login Form Populated: ${email} (${roleName})`, 800);

    // Submit login
    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign in') || b.textContent.includes('Log in'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(3500);
  }

  // ==========================================
  // SCENE 1: EXECUTIVE SIGN-IN & DASHBOARD
  // Managing Director & CEO (Vijay Reddy)
  // ==========================================
  console.log('\n======================================================');
  console.log('SCENE 1: AUTHENTICATION & EXECUTIVE CONSOLE');
  console.log('======================================================');
  await performLogin('vijay.reddy@meridian.com', 'Managing Director & CEO');
  await snap('Executive Home Dashboard — Meridian Corp', 2000);

  // ==========================================
  // SCENE 2: RAISING A STRUCTURAL PROPOSAL
  // VP Engineering (Priya Sharma)
  // ==========================================
  console.log('\n======================================================');
  console.log('SCENE 2: RAISING STRUCTURAL GOVERNANCE PROPOSAL');
  console.log('======================================================');
  await performLogin('priya.sharma@meridian.com', 'VP Engineering');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/requests/new' });
  await sleep(3000);
  await snap('New Decision Request Form — Step Selection & Governance Gates', 1500);

  // Populate Proposal details
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const subInput = document.querySelector('input[name="subject"], input[placeholder*="Subject"], input[id*="subject"]');
        if (subInput) {
          subInput.value = 'STR-2026-101 APAC Sovereign Cloud Infrastructure & Subsidiary Capitalization ($12.5M)';
          subInput.dispatchEvent(new Event('input', { bubbles: true }));
          subInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
  });
  await sleep(1000);
  await snap('Form Input: Strategic APAC Cloud Infrastructure Expansion', 1500);

  // ==========================================
  // SCENE 3: MULTI-STAGE APPROVAL & GOVERNANCE SIGN-OFF
  // Chief Operating Officer (Anand Kulkarni) & CFO (Krishna Pillai)
  // ==========================================
  console.log('\n======================================================');
  console.log('SCENE 3: MULTI-STAGE APPROVAL WORKFLOW');
  console.log('======================================================');
  await performLogin('anand.kulkarni@meridian.com', 'Chief Operating Officer');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/approvals' });
  await sleep(3000);
  await snap('Operational Approvals Queue — Pending Actions', 2000);

  // Navigate to CFO approval view
  await performLogin('krishna.pillai@meridian.com', 'Chief Financial Officer');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/approvals' });
  await sleep(3000);
  await snap('Financial Approvals Queue — Capital Drawdowns & Fiscal Authority', 2000);

  // ==========================================
  // SCENE 4: 100 ENTERPRISE DECISIONS LEDGER
  // Structural (20), Process (20), Exception (30), Transactional (30)
  // ==========================================
  console.log('\n======================================================');
  console.log('SCENE 4: 100 SCENARIOS DECISION VAULT');
  console.log('======================================================');
  await performLogin('vijay.reddy@meridian.com', 'Managing Director & CEO');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/decisions' });
  await sleep(3500);
  await snap('Decision Records Vault — 100 Fresh Scenarios Overview', 2500);

  // Smooth scroll through the 100 scenarios ledger
  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy({ top: 600, behavior: "smooth" })' });
  await snap('Decision Records Vault — Structural Acquisitions & Capital Pool Reconstitutions', 2000);

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy({ top: 600, behavior: "smooth" })' });
  await snap('Decision Records Vault — Process Controls, SOC2 Audits & Compliance Gates', 2000);

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy({ top: 600, behavior: "smooth" })' });
  await snap('Decision Records Vault — Exception Overrides, Bypass Authorizations & Policy Variances', 2000);

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy({ top: 600, behavior: "smooth" })' });
  await snap('Decision Records Vault — Transactional Contracts, Cloud Subscriptions & Renewals', 2000);

  // ==========================================
  // SCENE 5: 5-PROOF CRYPTOGRAPHIC CERTIFICATE
  // Immutable SHA-256 Seal, Audit Trail & Authority Sequence
  // ==========================================
  console.log('\n======================================================');
  console.log('SCENE 5: 5-PROOF CRYPTOGRAPHIC CERTIFICATE');
  console.log('======================================================');
  // Click on the first sealed decision record
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const link = document.querySelector('a[href*="/meridian/records/"], a[href*="/records/"]');
        if (link) link.click();
      })()
    `
  });
  await sleep(3500);
  await snap('Decision Detail — Cryptographic Fingerprint & Multi-Stage Trail', 2000);

  // Open the cryptographic certificate view
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const certBtn = Array.from(document.querySelectorAll('a, button')).find(el => 
          el.textContent.includes('Certificate') || 
          el.textContent.includes('Proof') || 
          el.getAttribute('href')?.includes('certificate')
        );
        if (certBtn) certBtn.click();
      })()
    `
  });
  await sleep(3000);
  await snap('5-Proof Cryptographic Certificate — Authority, Sequence & Tamper-Proof Seals', 2500);

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy({ top: 500, behavior: "smooth" })' });
  await snap('5-Proof Cryptographic Certificate — Canonical SHA-256 Verification & Non-Repudiation', 2000);

  // ==========================================
  // SCENE 6: ORGANISATIONAL INTELLIGENCE DASHBOARD
  // 100 Decisions Live Metrics, STEP Distribution, Signals & Consequential Footprints
  // ==========================================
  console.log('\n======================================================');
  console.log('SCENE 6: ORGANISATIONAL INTELLIGENCE DASHBOARD');
  console.log('======================================================');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/intelligence' });
  await sleep(4000);
  await snap('Organisational Intelligence — 100 Decisions STEP Distribution (100% Data Coverage)', 3000);

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy({ top: 400, behavior: "smooth" })' });
  await snap('Organisational Intelligence — Decision Behaviour Cards (Structural 20%, Exception 30%, Transactional 30%, Process 20%)', 2500);

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy({ top: 500, behavior: "smooth" })' });
  await snap('Organisational Intelligence — Governance Attention Signals & STEP Period Movements', 2500);

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy({ top: 600, behavior: "smooth" })' });
  await snap('Organisational Intelligence — Structured Ledger of Decisions Shaping the Organisation', 3000);

  console.log(`\n✓ All recording scenes successfully executed! Captured ${frameCount} HD frames.`);
  cdp.close();
  browserCdp.close();

  // ==========================================
  // COMPILE CLIENT DEMO VIDEO VIA FFMPEG
  // ==========================================
  console.log('\nCompiling high-definition WebP video presentation...');
  const outputVideo = path.join(ARTIFACT_DIR, 'sigmago_100_scenarios_production_client_demo.webp');

  const ffmpegCmd = `ffmpeg -y -framerate 0.6 -i "${FRAMES_DIR}\\frame_%04d.png" -vcodec libwebp -lossless 0 -q:v 92 -loop 0 -vf "scale=1920:-1:flags=lanczos" "${outputVideo}"`;
  
  console.log(`Executing: ${ffmpegCmd}`);
  execSync(ffmpegCmd, { stdio: 'inherit' });

  const stats = fs.statSync(outputVideo);
  console.log(`\n✓ SUCCESS! Master Client Demo Video generated:`);
  console.log(`  Path: ${outputVideo}`);
  console.log(`  Size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
}

main().catch(console.error);
