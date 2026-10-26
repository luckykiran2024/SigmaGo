import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\3818f154-b0f5-4da6-9691-3a3aa08a418c';
const FRAMES_DIR = path.join(ARTIFACT_DIR, 'production_demo_frames');

if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
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
  console.log('Connecting to Chrome CDP...');
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const list = await res.json();
  const page = list.find((p: any) => p.type === 'page' && p.url.includes('sigma-go.vercel.app')) || list.find((p: any) => p.type === 'page');

  if (!page) {
    throw new Error('No Chrome page found');
  }

  console.log(`Using page: ${page.id} - ${page.url}`);
  const cdp = new CDP(page.webSocketDebuggerUrl);
  await cdp.connect();
  console.log('Connected to CDP successfully!');

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');

  let frameCount = 0;
  async function snap(label: string) {
    frameCount++;
    const snapRes = await cdp.send('Page.captureScreenshot', { format: 'png', quality: 90 });
    if (snapRes.result && snapRes.result.data) {
      const buf = Buffer.from(snapRes.result.data, 'base64');
      const filename = `frame_${String(frameCount).padStart(4, '0')}.png`;
      fs.writeFileSync(path.join(FRAMES_DIR, filename), buf);
      console.log(`[Frame ${frameCount}] Saved: ${label}`);
    }
  }

  // 1. Navigate to Production Homepage
  console.log('--- 1. HOMEPAGE DEMO ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/' });
  await sleep(3000);
  await snap('Homepage Header');
  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 400)' });
  await sleep(1500);
  await snap('Homepage Hero Value Prop');

  // 2. Navigate to Login Page
  console.log('--- 2. LOGIN DEMO ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/login' });
  await sleep(2500);
  await snap('Login Screen Initial');

  // Enter Credentials
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const emailInput = document.querySelector('input[type="email"], input[name="email"]');
        const passInput = document.querySelector('input[type="password"], input[name="password"]');
        if (emailInput) {
          emailInput.value = 'vijay.reddy@meridian.com';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (passInput) {
          passInput.value = 'Password123!';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
  });
  await sleep(1500);
  await snap('Login Screen Credentials Entered');

  // Submit Login
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Sign in') || b.textContent.includes('Sign In'));
        if (btn) btn.click();
      })()
    `
  });
  console.log('Submitted login credentials...');
  await sleep(4000);

  // 3. Meridian Executive Dashboard
  console.log('--- 3. EXECUTIVE DASHBOARD DEMO ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian' });
  await sleep(3500);
  await snap('Meridian Dashboard MetricStrip');
  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 450)' });
  await sleep(2000);
  await snap('Meridian Dashboard Activity');

  // 4. Create New Request
  console.log('--- 4. NEW REQUEST RAISE WORKFLOW ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/requests/new' });
  await sleep(3000);
  await snap('New Request Form');

  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const subInput = document.querySelector('input[name="subject"], input[placeholder*="Subject"], input[id*="subject"]');
        if (subInput) {
          subInput.value = 'STR-2026-105 APAC Expansion & Cloud Sovereign Entity Formation ($18.5M)';
          subInput.dispatchEvent(new Event('input', { bubbles: true }));
          subInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `
  });
  await sleep(1500);
  await snap('New Request Subject & Classification');

  // 5. Approvals Queue
  console.log('--- 5. APPROVALS QUEUE & MULTI-STAGE SIGN-OFF ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/approvals' });
  await sleep(3000);
  await snap('Approvals Queue Overview');

  // 6. Decision Records Ledger
  console.log('--- 6. DECISION RECORDS VAULT ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/decisions' });
  await sleep(3500);
  await snap('Decision Vault 100 Scenarios');
  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 500)' });
  await sleep(2000);
  await snap('Decision Vault Scrolled');

  // 7. Cryptographic 5-Proof Certificate
  console.log('--- 7. 5-PROOF CRYPTOGRAPHIC CERTIFICATE ---');
  // Click first decision or navigate to records certificate
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const link = document.querySelector('a[href*="/meridian/records/"], a[href*="/records/"]');
        if (link) link.click();
      })()
    `
  });
  await sleep(3500);
  await snap('Decision Record Detail');

  // Check if there is a certificate view button
  await cdp.send('Runtime.evaluate', {
    expression: `
      (() => {
        const certBtn = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Certificate') || el.textContent.includes('Proof') || el.getAttribute('href')?.includes('certificate'));
        if (certBtn) certBtn.click();
      })()
    `
  });
  await sleep(3000);
  await snap('5-Proof Cryptographic Certificate Authority & Sequence');
  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 600)' });
  await sleep(2000);
  await snap('5-Proof Cryptographic Certificate Authenticity & SHA-256 Seal');

  // 8. Executive Intelligence Console
  console.log('--- 8. EXECUTIVE GOVERNANCE INTELLIGENCE ---');
  await cdp.send('Page.navigate', { url: 'https://sigma-go.vercel.app/meridian/intelligence' });
  await sleep(4000);
  await snap('Executive Intelligence 4-Step Mix & Overview');
  await cdp.send('Runtime.evaluate', { expression: 'window.scrollBy(0, 500)' });
  await sleep(2000);
  await snap('Executive Intelligence Governance Friction & Dwell Time');

  cdp.close();
  console.log(`Captured ${frameCount} high-resolution frames.`);

  // 9. Compile frames into client demo WebP video using ffmpeg
  const outputVideo = path.join(ARTIFACT_DIR, 'sigmago_production_client_demo.webp');
  console.log(`Compiling frames into video: ${outputVideo}`);

  const ffmpegCmd = `ffmpeg -y -framerate 1 -i "${FRAMES_DIR}\\frame_%04d.png" -vcodec libwebp -lossless 0 -q:v 85 -loop 0 -vf "scale=1920:-1:flags=lanczos" "${outputVideo}"`;
  execSync(ffmpegCmd);

  console.log('✓ Successfully generated client demo video: ' + outputVideo);
}

main().catch(console.error);
