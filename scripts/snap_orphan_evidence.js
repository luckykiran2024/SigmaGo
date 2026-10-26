const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = path.join('C:', 'Users', 'HP', '.gemini', 'antigravity-ide', 'brain', '3818f154-b0f5-4da6-9691-3a3aa08a418c');

async function snapAll() {
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const tab = list.find(t => t.url.includes('3001')) || list.find(t => t.type === 'page');
  if (!tab) {
    console.log('No tab found');
    return;
  }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let currentStep = 'login';

  ws.onopen = () => {
    console.log('Connected to Chrome. Logging in...');
    ws.send(JSON.stringify({ id: 10, method: 'Page.navigate', params: { url: 'http://localhost:3001/login' } }));
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 11,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const e = document.querySelector('input[type="email"], input[name="email"]');
              const p = document.querySelector('input[type="password"], input[name="password"]');
              if (e && p) {
                e.value = 'vijay.reddy@meridian.com';
                e.dispatchEvent(new Event('input', { bubbles: true }));
                p.value = 'Password123!';
                p.dispatchEvent(new Event('input', { bubbles: true }));
                const b = document.querySelector('button[type="submit"]');
                if (b) b.click();
              }
            })()
          `
        }
      }));

      // Step 1: Intelligence Console Evidence
      setTimeout(() => {
        console.log('Navigating to Intelligence Console...');
        ws.send(JSON.stringify({ id: 20, method: 'Page.navigate', params: { url: 'http://localhost:3001/meridian/intelligence' } }));
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 21,
            method: 'Runtime.evaluate',
            params: {
              expression: `
                (() => {
                  const btns = Array.from(document.querySelectorAll('button'));
                  const evBtn = btns.find(b => b.textContent && (b.textContent.includes('Evidence') || b.textContent.includes('How strong is the evidence')));
                  if (evBtn) evBtn.click();
                  window.scrollTo(0, 160);
                })()
              `
            }
          }));

          setTimeout(() => {
            console.log('Snapping Intelligence Console with Orphan Score...');
            currentStep = 'snap_intelligence';
            ws.send(JSON.stringify({ id: 22, method: 'Page.captureScreenshot', params: { format: 'png' } }));
          }, 1500);
        }, 3000);
      }, 3000);
    }, 2500);
  };

  ws.onmessage = evt => {
    const msg = JSON.parse(evt.data.toString());

    if (msg.id === 22 && msg.result?.data) {
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'intelligence_orphan_score_dashboard.png'), Buffer.from(msg.result.data, 'base64'));
      console.log('✓ Saved intelligence_orphan_score_dashboard.png');

      // Next: Navigate to Orphan Request (TRX-2026-095)
      console.log('Navigating to Orphan Request TRX-2026-095...');
      ws.send(JSON.stringify({ id: 30, method: 'Page.navigate', params: { url: 'http://localhost:3001/meridian/requests/cfea0c86-7a5f-44b3-846d-cfe3b3064905' } }));
      setTimeout(() => {
        ws.send(JSON.stringify({ id: 31, method: 'Runtime.evaluate', params: { expression: 'window.scrollTo(0, 480)' } }));
        setTimeout(() => {
          console.log('Snapping Orphan Approval Detail...');
          currentStep = 'snap_orphan';
          ws.send(JSON.stringify({ id: 32, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 1500);
      }, 3500);
    }

    if (msg.id === 32 && msg.result?.data) {
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'orphan_approval_detail.png'), Buffer.from(msg.result.data, 'base64'));
      console.log('✓ Saved orphan_approval_detail.png');

      // Next: Navigate to Connected Request (PRC-2026-021)
      console.log('Navigating to Connected Request PRC-2026-021...');
      ws.send(JSON.stringify({ id: 40, method: 'Page.navigate', params: { url: 'http://localhost:3001/meridian/requests/d3cde03d-bda7-42dd-a72d-269b6729d320' } }));
      setTimeout(() => {
        ws.send(JSON.stringify({ id: 41, method: 'Runtime.evaluate', params: { expression: 'window.scrollTo(0, 480)' } }));
        setTimeout(() => {
          console.log('Snapping Connected Approval Detail...');
          currentStep = 'snap_connected';
          ws.send(JSON.stringify({ id: 42, method: 'Page.captureScreenshot', params: { format: 'png' } }));
        }, 1500);
      }, 3500);
    }

    if (msg.id === 42 && msg.result?.data) {
      fs.writeFileSync(path.join(ARTIFACTS_DIR, 'connected_approval_detail.png'), Buffer.from(msg.result.data, 'base64'));
      console.log('✓ Saved connected_approval_detail.png');
      console.log('\nAll 3 verification screenshots saved successfully!');
      ws.close();
      process.exit(0);
    }
  };
}

snapAll().catch(console.error);
