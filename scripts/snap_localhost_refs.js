const fs = require('fs');
const path = require('path');

async function testLocalhost() {
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const tab = list.find(t => t.url.includes('3001')) || list.find(t => t.type === 'page');
  if (!tab) {
    console.log('No tab found');
    return;
  }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.onopen = async () => {
    // 1. Login on localhost:3001
    ws.send(JSON.stringify({ id: 1, method: 'Page.navigate', params: { url: 'http://localhost:3001/login' } }));
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
          expression: `
            (() => {
              const e = document.querySelector('input[type="email"], input[name="email"]');
              const p = document.querySelector('input[type="password"], input[name="password"]');
              if (e) { e.value = 'vijay.reddy@meridian.com'; e.dispatchEvent(new Event('input', { bubbles: true })); }
              if (p) { p.value = 'Password123!'; p.dispatchEvent(new Event('input', { bubbles: true })); }
              const b = document.querySelector('button[type="submit"]');
              if (b) b.click();
            })()
          `
        }
      }));

      // 2. Navigate to request page after login
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 3,
          method: 'Page.navigate',
          params: { url: 'http://localhost:3001/meridian/requests/d3cde03d-bda7-42dd-a72d-269b6729d320' }
        }));

        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 4,
            method: 'Runtime.evaluate',
            params: { expression: 'window.scrollTo(0, 650)' }
          }));

          setTimeout(() => {
            ws.send(JSON.stringify({ id: 5, method: 'Page.captureScreenshot', params: { format: 'png' } }));
          }, 2000);
        }, 3500);
      }, 3000);
    }, 3000);
  };

  ws.onmessage = evt => {
    const msg = JSON.parse(evt.data.toString());
    if (msg.id === 5 && msg.result?.data) {
      const out = path.join('C:', 'Users', 'HP', '.gemini', 'antigravity-ide', 'brain', '3818f154-b0f5-4da6-9691-3a3aa08a418c', 'localhost_references_card.png');
      fs.writeFileSync(out, Buffer.from(msg.result.data, 'base64'));
      console.log('Saved localhost screenshot to localhost_references_card.png');
      ws.close();
      process.exit(0);
    }
  };
}
testLocalhost().catch(console.error);
