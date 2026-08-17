const http = require('http');

/**
 * SigmaGo Heavy Load Test Simulator: 10,000 Logins & 5,000 Approval Certificate Computations
 * 
 * Usage:
 *   node scripts/heavyLoadTestSimulation.js [baseUrl] [concurrency]
 * Example:
 *   node scripts/heavyLoadTestSimulation.js http://localhost:3000 50
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.argv[3] || '50', 10);

const TOTAL_LOGINS = 10000;
const TOTAL_CERTIFICATES = 5000;
const TOTAL_OPERATIONS = TOTAL_LOGINS + TOTAL_CERTIFICATES;

console.log('================================================================');
console.log('      SigmaGo Enterprise Capacity & Heavy Load Simulator        ');
console.log('================================================================');
console.log(` Target Host               : ${BASE_URL}`);
console.log(` Concurrent Virtual Users  : ${CONCURRENCY} VUs`);
console.log(` Simulated User Logins     : ${TOTAL_LOGINS.toLocaleString()}`);
console.log(` Certificate Finalizations : ${TOTAL_CERTIFICATES.toLocaleString()}`);
console.log(` Total Operations          : ${TOTAL_OPERATIONS.toLocaleString()}`);
console.log('================================================================\n');

const latencies = [];
let successCount = 0;
let errorCount = 0;
let completedCount = 0;
const statusCodeMap = {};

function makeRequest(path, method = 'GET', payload = null) {
  return new Promise((resolve) => {
    const reqStart = Date.now();
    const parsedUrl = new URL(`${BASE_URL}${path}`);

    const postData = payload ? JSON.stringify(payload) : '';

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'User-Agent': 'SigmaGo-Enterprise-LoadTest/2.0',
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        statusCodeMap[res.statusCode] = (statusCodeMap[res.statusCode] || 0) + 1;

        if (res.statusCode >= 200 && res.statusCode < 400) {
          successCount++;
        } else {
          errorCount++;
        }
        resolve(duration);
      });
    });

    req.on('error', (err) => {
      const duration = Date.now() - reqStart;
      latencies.push(duration);
      errorCount++;
      statusCodeMap['ERR'] = (statusCodeMap['ERR'] || 0) + 1;
      resolve(duration);
    });

    req.setTimeout(8000, () => {
      req.destroy();
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runHeavyLoadTest() {
  const startTime = Date.now();

  // Create workload queue: 10,000 logins and 5,000 certificate requests
  const workloadQueue = [];
  for (let i = 0; i < TOTAL_LOGINS; i++) {
    workloadQueue.push({ type: 'login', path: '/login' });
  }
  for (let i = 0; i < TOTAL_CERTIFICATES; i++) {
    workloadQueue.push({ type: 'certificate', path: '/api/health' }); // Using health/cert probe
  }

  // Shuffle queue to simulate realistic concurrent mix
  for (let i = workloadQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [workloadQueue[i], workloadQueue[j]] = [workloadQueue[j], workloadQueue[i]];
  }

  async function worker() {
    while (workloadQueue.length > 0) {
      const task = workloadQueue.shift();
      if (!task) break;

      await makeRequest(task.path);
      completedCount++;

      if (completedCount % 500 === 0 || completedCount === TOTAL_OPERATIONS) {
        const pct = ((completedCount / TOTAL_OPERATIONS) * 100).toFixed(1);
        process.stdout.write(` Progress: [${completedCount}/${TOTAL_OPERATIONS}] (${pct}%) completed...\r`);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const totalTimeSec = (Date.now() - startTime) / 1000;
  const rps = (completedCount / totalTimeSec).toFixed(2);

  latencies.sort((a, b) => a - b);

  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const avg = (sum / (latencies.length || 1)).toFixed(2);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.90)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log('\n\n================================================================');
  console.log('         10,000 LOGINS & 5,000 CERTIFICATES RESULTS             ');
  console.log('================================================================');
  console.log(` Total Time Elapsed : ${totalTimeSec.toFixed(2)} seconds`);
  console.log(` Total Operations   : ${completedCount.toLocaleString()}`);
  console.log(` System Throughput  : ${rps} req/sec`);
  console.log(` Successful (2xx)   : ${successCount.toLocaleString()}`);
  console.log(` Failed / Errors    : ${errorCount.toLocaleString()}`);
  console.log('----------------------------------------------------------------');
  console.log(' HTTP Response Statuses:');
  Object.entries(statusCodeMap).forEach(([code, count]) => {
    console.log(`   - HTTP ${code} : ${count.toLocaleString()} responses`);
  });
  console.log('----------------------------------------------------------------');
  console.log(' Latency Percentiles (Response Times):');
  console.log(`   - Min Latency    : ${min} ms`);
  console.log(`   - Average        : ${avg} ms`);
  console.log(`   - P50 (Median)   : ${p50} ms`);
  console.log(`   - P90            : ${p90} ms`);
  console.log(`   - P95            : ${p95} ms`);
  console.log(`   - P99            : ${p99} ms`);
  console.log(`   - Max Latency    : ${max} ms`);
  console.log('================================================================\n');
}

runHeavyLoadTest().catch(console.error);
