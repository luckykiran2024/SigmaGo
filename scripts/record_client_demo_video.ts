import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\3818f154-b0f5-4da6-9691-3a3aa08a418c';
const FRAMES_DIR = path.join(ARTIFACT_DIR, 'client_demo_full_workflow_frames');

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
  console.log('Connecting to Chrome CDP on port 9222...');
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const list = await res.json();
  const page = list.find((p: any) => p.type === 'page' && p.url.includes('sigma-go.vercel.app')) || list.find((p: any) => p.type === 'page');

  if (!page) {
    throw new Error('No Chrome page found');
  }

  console.log(`Attached to Chrome: ${page.id} - ${page.url}`);
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  let frameCount = 0;
  async function snap(label: string) {
    frameCount++;
    const snapRes = await cdp.send('Page.captureScreenshot', { format: 'png', quality: 95 });
    if (snapRes.result && snapRes.result.data) {
      const buf = Buffer.from(snapRes.result.data, 'base64');
      const filename = `frame_${String(frameCount).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(FRAMES_DIR, filename), buf);
      console.log(`[Frame ${frameCount}] Captured: ${label}`);
    }
  }

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
    await sleep(800);
    await snap(`Login Form - ${roleName} (${email})`);

    await cdp.send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign in') || b.textContent.includes('Sign In'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(3500);
  }

  // ==========================================
  // SCENE 1: HOMEPAGE INTRODUCTION
  // ==========================================
  console.log('--- SCENE 1: HOMEPAGE DEMO ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/' });
  await sleep(3000);
  await snap('SigmaGo Homepage Brand & Hero');
  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 450)' });
  await sleep(1500);
  await snap('SigmaGo Decision Architecture');

  // ==========================================
  // SCENE 2: MULTI-USER WORKFLOW (RAISE & APPROVE)
  // ==========================================

  // --- WORKFLOW 1: STRUCTURAL DECISION ---
  // Requester: Vijay Reddy (CEO) -> Approver: Krishna Pillai (CFO)
  console.log('--- WORKFLOW 1: STRUCTURAL DECISION ---');
  await performLogin('vijay.reddy@meridian.com', 'CEO Vijay Reddy');
  await snap('CEO Dashboard - Active MetricStrip');

  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/requests/new' });
  await sleep(3000);
  await snap('Raise New Request - Intake Form');

  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const sub = document.querySelector('input[name="subject"], input[placeholder*="Subject"]');
        if (sub) {
          sub.value = 'STR-2026-101 M&A Strategic Cloud Entity Formation ($15.0M)';
          sub.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `
  });
  await sleep(1500);
  await snap('Raise Request - STR-2026-101 Capital Allocation ($15.0M)');

  // Now login as CFO Krishna Pillai to review & approve
  await performLogin('krishna.pillai@meridian.com', 'CFO Krishna Pillai');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/approvals' });
  await sleep(3000);
  await snap('CFO Approvals Queue - Multi-Stage Reviews');

  // Open the first pending approval
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const item = document.querySelector('a[href*="/meridian/requests/"], a[href*="/requests/"]');
        if (item) item.click();
      })()
    `
  });
  await sleep(3000);
  await snap('CFO Reviewing Pending Decision');

  // Enter approval reasoning
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.value = 'CFO Authority Signoff: Financial synergy models and capital allocation limits verified compliant with Board mandate.';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `
  });
  await sleep(1500);
  await snap('CFO Recorded Written Reasoning for Audit');

  // Click Approve
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const approveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Approve'));
        if (approveBtn) approveBtn.click();
      })()
    `
  });
  await sleep(3000);
  await snap('Decision Approved with Cryptographic Sealing Triggered');

  // --- WORKFLOW 2: EXCEPTION DECISION ---
  // Requester: Neha Patel (Commercial) -> Approver: Vijay Reddy (CEO)
  console.log('--- WORKFLOW 2: EXCEPTION DECISION ---');
  await performLogin('vijay.reddy@meridian.com', 'CEO Vijay Reddy');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/requests/new' });
  await sleep(2500);

  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const sub = document.querySelector('input[name="subject"], input[placeholder*="Subject"]');
        if (sub) {
          sub.value = 'EXP-2026-102 Commercial Discount Authority Ceiling Variance (35% vs 20%)';
          sub.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `
  });
  await sleep(1200);
  await snap('Raise Exception Request - Commercial Discount Ceiling Variance');

  // ==========================================
  // SCENE 3: 100 SCENARIOS IN THE DECISION VAULT
  // ==========================================
  console.log('--- SCENE 3: PRODUCTION DECISION VAULT ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/decisions' });
  await sleep(3500);
  await snap('Decision Vault - All 100 Enterprise Scenarios');

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 450)' });
  await sleep(2000);
  await snap('Decision Vault Scrolled - Structural & Process Scenarios');

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 500)' });
  await sleep(2000);
  await snap('Decision Vault Scrolled - Exception & Transactional Scenarios');

  // ==========================================
  // SCENE 4: 5-PROOF CRYPTOGRAPHIC CERTIFICATE
  // ==========================================
  console.log('--- SCENE 4: 5-PROOF CRYPTOGRAPHIC CERTIFICATE ---');
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const firstSealed = document.querySelector('a[href*="/meridian/records/"], a[href*="/records/"]');
        if (firstSealed) firstSealed.click();
      })()
    `
  });
  await sleep(3500);
  await snap('Decision Record Detail View');

  // Click View Certificate
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const certLink = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Certificate') || el.textContent.includes('Proof') || el.getAttribute('href')?.includes('certificate'));
        if (certLink) certLink.click();
      })()
    `
  });
  await sleep(3000);
  await snap('5-Proof Cryptographic Certificate - Authority & Sequence Proofs');

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 550)' });
  await sleep(2500);
  await snap('5-Proof Cryptographic Certificate - Written Reasoning & SHA-256 Seal');

  // ==========================================
  // SCENE 5: ORGANISATIONAL INTELLIGENCE DASHBOARD
  // ==========================================
  console.log('--- SCENE 5: ORGANISATIONAL INTELLIGENCE DASHBOARD ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/intelligence' });
  await sleep(4000);
  await snap('Organisational Intelligence Console - Live STEP Portfolio Metrics');

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 450)' });
  await sleep(2500);
  await snap('Organisational Intelligence - Decision Tempo & Dwell Time Velocity');

  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 500)' });
  await sleep(2500);
  await snap('Organisational Intelligence - Exception Pressure & Governance Friction');

  cdp.close();
  console.log(`\n✓ Captured ${frameCount} crystal clear HD frames.`);

  // Compile video
  const outputVideo = path.join(ARTIFACT_DIR, 'sigmago_client_demo_full_workflow.webp');
  console.log(`Compiling frames into HD Client Video: ${outputVideo}`);

  const ffmpegCmd = `ffmpeg -y -framerate 0.6 -i "${FRAMES_DIR}\\frame_%04d.png" -vcodec libwebp -lossless 0 -q:v 90 -loop 0 -vf "scale=1920:-1:flags=lanczos" "${outputVideo}"`;
  execSync(ffmpegCmd);

  console.log('✓ Successfully generated executive client demo video: ' + outputVideo);
}

main().catch(console.error);
