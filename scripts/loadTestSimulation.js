const http = require('http');

/**
 * SigmaGo Load Testing & Performance Benchmark Simulation Script
 * 
 * Usage:
 *   node scripts/loadTestSimulation.js [baseUrl] [concurrency] [totalRequests]
 * Example:
 *   node scripts/loadTestSimulation.js http://localhost:3000 20 200
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';
const CONCURRENCY = parseInt(process.argv[3] || '20', 10);
const TOTAL_REQUESTS = parseInt(process.argv[4] || '200', 10);

const ENDPOINTS = [
  '/',
  '/api/health',
  '/about',
  '/product',
  '/login',
  '/blog',
];

const latencies = [];
let completedRequests = 0;
let successCount = 0;
let errorCount = 0;
const statusCodeMap = {};

console.log('====================================================');
console.log('      SigmaGo Load Test & Benchmark Simulator       ');
console.log('====================================================');
console.log(` Target Host  : ${BASE_URL}`);
console.log(` Concurrency  : ${CONCURRENCY} Virtual Users (VUs)`);
console.log(` Total Requests: ${TOTAL_REQUESTS}`);
console.log('====================================================\n');

const startTime = Date.now();

function makeRequest(url) {
  return new Promise((resolve) => {
    const reqStart = Date.now();
    const parsedUrl = new URL(url);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'SigmaGo-LoadTest-Simulator/1.0',
        'Accept': '*/*',
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

    req.setTimeout(5000, () => {
      req.destroy();
    });

    req.end();
  });
}

async function worker(workerId, requestQueue) {
  while (requestQueue.length > 0) {
    const endpoint = requestQueue.shift();
    if (!endpoint) break;
    
    const targetUrl = `${BASE_URL}${endpoint}`;
    await makeRequest(targetUrl);
    
    completedRequests++;
    if (completedRequests % 20 === 0 || completedRequests === TOTAL_REQUESTS) {
      process.stdout.write(` Progress: [${completedRequests}/${TOTAL_REQUESTS}] requests completed...\r`);
    }
  }
}

async function runLoadTest() {
  // Build queue of requests distributed across endpoints
  const requestQueue = [];
  for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const endpoint = ENDPOINTS[i % ENDPOINTS.length];
    requestQueue.push(endpoint);
  }

  // Create concurrent workers
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker(i + 1, requestQueue));
  }

  await Promise.all(workers);

  const totalTimeMs = Date.now() - startTime;
  const totalTimeSec = (totalTimeMs / 1000).toFixed(2);
  const rps = (completedRequests / (totalTimeMs / 1000)).toFixed(2);

  latencies.sort((a, b) => a - b);

  const min = latencies[0] || 0;
  const max = latencies[latencies.length - 1] || 0;
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const avg = (sum / (latencies.length || 1)).toFixed(2);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p90 = latencies[Math.floor(latencies.length * 0.90)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

  console.log('\n\n====================================================');
  console.log('              LOAD TEST BENCHMARK RESULTS           ');
  console.log('====================================================');
  console.log(` Total Time Elapsed : ${totalTimeSec} s`);
  console.log(` Total Requests     : ${completedRequests}`);
  console.log(` Throughput (RPS)   : ${rps} req/sec`);
  console.log(` Successful (2xx)   : ${successCount}`);
  console.log(` Failed / Errors    : ${errorCount}`);
  console.log('----------------------------------------------------');
  console.log(' HTTP Status Code Breakdown:');
  Object.entries(statusCodeMap).forEach(([code, count]) => {
    console.log(`   - HTTP ${code} : ${count} responses`);
  });
  console.log('----------------------------------------------------');
  console.log(' Latency Percentiles (Response Times):');
  console.log(`   - Min Latency    : ${min} ms`);
  console.log(`   - Average        : ${avg} ms`);
  console.log(`   - P50 (Median)   : ${p50} ms`);
  console.log(`   - P90            : ${p90} ms`);
  console.log(`   - P95            : ${p95} ms`);
  console.log(`   - P99            : ${p99} ms`);
  console.log(`   - Max Latency    : ${max} ms`);
  console.log('====================================================\n');
}

runLoadTest().catch(console.error);
