const fs = require('fs');
const path = require('path');

async function testClick() {
  const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
  const tab = list.find(t => t.url.includes('/meridian/intelligence')) || list.find(t => t.url.includes('sigma-go.vercel.app'));
  if (!tab) return;
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  ws.onopen = () => {
    ws.send(JSON.stringify({
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: `
          const link = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent.includes('Review evidence'));
          if (link) link.click();
        `
      }
    }));
    setTimeout(() => {
      ws.send(JSON.stringify({ id: 2, method: 'Page.captureScreenshot', params: { format: 'png' } }));
    }, 2500);
  };
  ws.onmessage = evt => {
    const msg = JSON.parse(evt.data.toString());
    if (msg.id === 2 && msg.result?.data) {
      const out = path.join('C:', 'Users', 'HP', '.gemini', 'antigravity-ide', 'brain', '3818f154-b0f5-4da6-9691-3a3aa08a418c', 'intelligence_drawer_open.png');
      fs.writeFileSync(out, Buffer.from(msg.result.data, 'base64'));
      console.log('Saved drawer screenshot to intelligence_drawer_open.png');
      ws.close();
      process.exit(0);
    }
  };
}
testClick();
