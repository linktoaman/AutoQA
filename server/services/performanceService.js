// ============================================
// Performance Testing Service
// ============================================

const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { writeJsonFile, readJsonFile, generateId, sanitizeFilename } = require('../utils/helpers');
const { updateProgress } = require('../utils/progressTracker');

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
const reportsDir = process.env.REPORTS_DIR || path.join(__dirname, '..', 'reports');
const abortMap = {};

function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function normalizeHeaders(headers) {
  const normalized = {};
  if (!headers || typeof headers !== 'object') return normalized;

  Object.entries(headers).forEach(([name, value]) => {
    if (name && value !== undefined && value !== null && String(name).trim() !== '') {
      normalized[String(name).trim()] = String(value).trim();
    }
  });

  return normalized;
}

function buildAuthHeaders(auth) {
  if (!auth || !auth.type) return {};

  switch (auth.type) {
    case 'bearer':
      if (auth.token) {
        return { Authorization: `Bearer ${auth.token}` };
      }
      return {};
    case 'basic':
      if (auth.username !== undefined && auth.password !== undefined) {
        const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        return { Authorization: `Basic ${encoded}` };
      }
      return {};
    default:
      return {};
  }
}

function parseBody(body) {
  if (!body && body !== 0) return undefined;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (_err) {
      return body;
    }
  }
  return body;
}

function calculateLatencyStats(latencies) {
  const sorted = [...latencies].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((total, value) => total + value, 0);
  const average = count === 0 ? 0 : sum / count;

  function percentile(p) {
    if (count === 0) return 0;
    const rank = Math.ceil((p / 100) * count) - 1;
    return sorted[Math.min(Math.max(rank, 0), count - 1)];
  }

  return {
    count,
    average: Math.round(average),
    median: Math.round(percentile(50)),
    p95: Math.round(percentile(95)),
    p99: Math.round(percentile(99)),
    min: Math.round(sorted[0] || 0),
    max: Math.round(sorted[count - 1] || 0)
  };
}

function calculateMetricPoints(timeline) {
  return timeline.map((entry) => ({
    timestamp: entry.timestamp,
    rps: entry.rps,
    averageLatency: entry.averageLatency,
    errorRate: entry.errorRate
  }));
}

function buildRequestConfig(target) {
  const headers = normalizeHeaders(target.headers || {});
  const authHeaders = buildAuthHeaders(target.auth || {});
  const mergedHeaders = { ...headers, ...authHeaders };

  const body = parseBody(target.payload);
  const config = {
    method: target.method || 'GET',
    url: target.url,
    headers: mergedHeaders,
    timeout: 30000,
    validateStatus: () => true,
    data: body
  };

  if (config.method.toUpperCase() === 'GET' || config.method.toUpperCase() === 'DELETE') {
    delete config.data;
  }

  return config;
}

function createMetricsSnapshot(metrics, elapsedMs) {
  const latencyStats = calculateLatencyStats(metrics.latencies);
  const rps = elapsedMs > 0 ? Math.round((metrics.totalRequests / elapsedMs) * 1000) : 0;
  const errorRate = metrics.totalRequests > 0 ? Math.round((metrics.errors / metrics.totalRequests) * 100) : 0;
  const successRate = metrics.totalRequests > 0 ? Math.round(((metrics.totalRequests - metrics.errors) / metrics.totalRequests) * 100) : 0;
  const memory = process.memoryUsage();

  return {
    totalRequests: metrics.totalRequests,
    successfulRequests: metrics.successfulRequests,
    errors: metrics.errors,
    errorRate,
    successRate,
    rps,
    throughput: metrics.totalRequests,
    latency: latencyStats,
    statusCodes: metrics.statusCodes,
    timeline: calculateMetricPoints(metrics.timeline),
    resourceUsage: {
      memory: {
        rss: memory.rss,
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external
      }
    }
  };
}

function evaluateThresholds(metrics, thresholds) {
  const failures = [];
  if (thresholds.maxAverageLatencyMs && metrics.latency.average > thresholds.maxAverageLatencyMs) {
    failures.push(`Average latency ${metrics.latency.average}ms exceeds threshold ${thresholds.maxAverageLatencyMs}ms`);
  }
  if (thresholds.maxErrorRatePct && metrics.errorRate > thresholds.maxErrorRatePct) {
    failures.push(`Error rate ${metrics.errorRate}% exceeds threshold ${thresholds.maxErrorRatePct}%`);
  }
  if (thresholds.minRps && metrics.rps < thresholds.minRps) {
    failures.push(`Observed throughput ${metrics.rps} RPS is below threshold ${thresholds.minRps} RPS`);
  }
  return {
    passed: failures.length === 0,
    failures
  };
}

async function executePerformanceTest(sessionId, config) {
  ensureDirectoryExists(uploadsDir);
  ensureDirectoryExists(reportsDir);

  const target = {
    url: config.url,
    method: config.method || 'GET',
    headers: config.headers || {},
    auth: config.auth || {},
    payload: config.payload
  };

  const concurrency = Math.max(1, Number(config.concurrency) || 1);
  const rampUpSeconds = Math.max(0, Number(config.rampUpSeconds) || 0);
  const durationSeconds = Math.max(5, Number(config.durationSeconds) || 30);
  const thresholds = {
    maxAverageLatencyMs: Number(config.maxAverageLatencyMs) || 0,
    maxErrorRatePct: Number(config.maxErrorRatePct) || 0,
    minRps: Number(config.minRps) || 0
  };

  const requestConfig = buildRequestConfig(target);
  const metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    errors: 0,
    statusCodes: {},
    latencies: [],
    timeline: [],
    sampleWindow: [],
    memorySamples: []
  };

  const startTime = Date.now();
  const stopAt = startTime + durationSeconds * 1000;
  let activeWorkers = 0;
  let isAborted = false;
  let lastUpdateAt = Date.now();
  const sampleIntervalMs = 1000;

  async function sendSingleRequest() {
    const requestStart = Date.now();
    try {
      const response = await axios({ ...requestConfig });
      const responseTime = Date.now() - requestStart;
      const status = response.status;

      metrics.totalRequests += 1;
      metrics.latencies.push(responseTime);
      metrics.statusCodes[status] = (metrics.statusCodes[status] || 0) + 1;

      if (status >= 200 && status < 300) {
        metrics.successfulRequests += 1;
      } else {
        metrics.errors += 1;
      }

      metrics.sampleWindow.push(responseTime);
      if (metrics.sampleWindow.length > 1000) {
        metrics.sampleWindow.shift();
      }

      return {
        status,
        responseTime,
        error: null
      };
    } catch (error) {
      const responseTime = Date.now() - requestStart;
      metrics.totalRequests += 1;
      metrics.errors += 1;
      metrics.latencies.push(responseTime);
      metrics.statusCodes[0] = (metrics.statusCodes[0] || 0) + 1;
      metrics.sampleWindow.push(responseTime);
      if (metrics.sampleWindow.length > 1000) {
        metrics.sampleWindow.shift();
      }

      return {
        status: 0,
        responseTime,
        error: error.message || 'Request failed'
      };
    }
  }

  async function workerLoop(workerId) {
    activeWorkers += 1;
    try {
      while (Date.now() < stopAt && !isAborted) {
        await sendSingleRequest();
      }
    } finally {
      activeWorkers -= 1;
    }
  }

  function scheduleWorkers() {
    const workers = [];
    for (let index = 0; index < concurrency; index += 1) {
      const delay = rampUpSeconds > 0 ? Math.round((rampUpSeconds * 1000 * index) / concurrency) : 0;
      workers.push(new Promise((resolve) => {
        setTimeout(async () => {
          if (!isAborted) {
            await workerLoop(index + 1);
          }
          resolve();
        }, delay);
      }));
    }
    return workers;
  }

  abortMap[sessionId] = () => {
    isAborted = true;
  };

  const progressSampler = setInterval(() => {
    const elapsedMs = Date.now() - startTime;
    const snapshot = createMetricsSnapshot(metrics, elapsedMs);
    metrics.timeline.push({
      timestamp: new Date().toISOString(),
      rps: snapshot.rps,
      errorRate: snapshot.errorRate,
      averageLatency: snapshot.latency.average
    });
    metrics.memorySamples.push(process.memoryUsage());

    updateProgress(sessionId, {
      stage: 'executing_load',
      percentage: Math.min(95, Math.round((elapsedMs / (durationSeconds * 1000)) * 100)),
      message: `Load test running with ${activeWorkers}/${concurrency} virtual users...`,
      currentTest: metrics.totalRequests,
      totalTests: Math.round(durationSeconds * concurrency),
      metrics: snapshot
    });
  }, sampleIntervalMs);

  try {
    updateProgress(sessionId, {
      stage: 'starting_load',
      percentage: 5,
      message: 'Starting load test, preparing virtual users...',
      currentTest: 0,
      totalTests: Math.round(durationSeconds * concurrency),
      metrics: createMetricsSnapshot(metrics, 0)
    });

    const workers = scheduleWorkers();
    await Promise.all(workers);

    const elapsedMs = Date.now() - startTime;
    const finalMetrics = createMetricsSnapshot(metrics, elapsedMs);
    const thresholdResult = evaluateThresholds(finalMetrics, thresholds);

    const performanceResult = {
      sessionId,
      config: {
        target,
        concurrency,
        rampUpSeconds,
        durationSeconds,
        thresholds
      },
      summary: finalMetrics,
      thresholdEvaluation: thresholdResult,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      durationMs: elapsedMs,
      memorySamples: metrics.memorySamples,
      timeline: metrics.timeline
    };

    const resultFilename = path.join(uploadsDir, 'performance', `${sessionId}.json`);
    ensureDirectoryExists(path.dirname(resultFilename));
    writeJsonFile(resultFilename, performanceResult);

    updateProgress(sessionId, {
      stage: 'completed',
      percentage: 100,
      message: `Load test completed: ${finalMetrics.totalRequests} requests, ${thresholdResult.passed ? 'PASSED' : 'FAILED'} SLA checks`,
      currentTest: finalMetrics.totalRequests,
      totalTests: Math.round(durationSeconds * concurrency),
      metrics: finalMetrics
    });

    return performanceResult;
  } finally {
    clearInterval(progressSampler);
    delete abortMap[sessionId];
  }
}

function abortPerformanceTest(sessionId) {
  if (abortMap[sessionId]) {
    abortMap[sessionId]();
    return true;
  }
  return false;
}

function getPerformanceResult(sessionId) {
  const resultFilename = path.join(uploadsDir, 'performance', `${sessionId}.json`);
  if (!fs.existsSync(resultFilename)) {
    throw new Error('Performance results not found');
  }
  return readJsonFile(resultFilename);
}

function generatePerformanceReportHtml(result) {
  const sanitizedTitle = sanitizeFilename(`performance-report-${result.sessionId}`);
  const reportTitle = `Performance Report - ${result.sessionId}`;
  const thresholds = result.config.thresholds || {};
  const latency = result.summary.latency || {};
  const timelineData = JSON.stringify(result.timeline || []);
  const statusCodes = JSON.stringify(result.summary.statusCodes || {});

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${reportTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f5f7fb; color: #1f2937; }
    .container { max-width: 1180px; margin: 0 auto; padding: 28px; }
    .header { padding: 24px; background: #1d4ed8; color: white; border-radius: 16px; }
    .header h1 { margin: 0 0 10px; font-size: 2rem; }
    .section { margin-top: 24px; background: white; border-radius: 16px; padding: 22px; box-shadow: 0 10px 35px rgba(15, 23, 42, 0.08); }
    .section h2 { margin-top: 0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); gap: 16px; }
    .metric-card { border-radius: 14px; background: #f8fafc; padding: 18px; border: 1px solid #e2e8f0; }
    .metric-card h3 { margin: 0 0 10px; font-size: 1rem; color: #4b5563; }
    .metric-card p { margin: 0; font-size: 1.75rem; font-weight: 700; color: #111827; }
    .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .chart-card { padding: 18px; border-radius: 14px; border: 1px solid #e2e8f0; background: #ffffff; }
    canvas { width: 100%; max-height: 320px; }
    .status-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .status-table th, .status-table td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .status-pass { color: #16a34a; font-weight: 700; }
    .status-fail { color: #dc2626; font-weight: 700; }
    .threshold-list { list-style: none; padding-left: 0; }
    .threshold-list li { margin-bottom: 10px; }
    .footer { margin-top: 30px; color: #6b7280; font-size: 0.95rem; }
    .tag { display: inline-flex; padding: 6px 10px; border-radius: 999px; font-size: 0.9rem; background: #e0f2fe; color: #0369a1; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${reportTitle}</h1>
      <p>Executed: ${result.startTime} → ${result.endTime}</p>
      <div class="tags">
        <span class="tag">Concurrency: ${result.config.concurrency}</span>
        <span class="tag">Ramp-up: ${result.config.rampUpSeconds}s</span>
        <span class="tag">Duration: ${result.config.durationSeconds}s</span>
      </div>
    </div>

    <div class="section">
      <h2>Test Summary</h2>
      <div class="metrics-grid">
        <div class="metric-card"><h3>Total Requests</h3><p>${result.summary.totalRequests}</p></div>
        <div class="metric-card"><h3>Success Rate</h3><p>${result.summary.successRate}%</p></div>
        <div class="metric-card"><h3>Error Rate</h3><p>${result.summary.errorRate}%</p></div>
        <div class="metric-card"><h3>Throughput (RPS)</h3><p>${result.summary.rps}</p></div>
      </div>
      <div class="metrics-grid" style="margin-top: 16px;">
        <div class="metric-card"><h3>Average Latency</h3><p>${result.summary.latency.average}ms</p></div>
        <div class="metric-card"><h3>Median Latency</h3><p>${result.summary.latency.median}ms</p></div>
        <div class="metric-card"><h3>P95 Latency</h3><p>${result.summary.latency.p95}ms</p></div>
        <div class="metric-card"><h3>P99 Latency</h3><p>${result.summary.latency.p99}ms</p></div>
      </div>
    </div>

    <div class="section">
      <h2>Threshold Evaluation</h2>
      <p>${result.thresholdEvaluation.passed ? '<span class="status-pass">PASS</span>' : '<span class="status-fail">FAIL</span>'}</p>
      <ul class="threshold-list">
        <li>Max average latency: ${thresholds.maxAverageLatencyMs || 'n/a'}ms</li>
        <li>Max error rate: ${thresholds.maxErrorRatePct || 'n/a'}%</li>
        <li>Minimum throughput: ${thresholds.minRps || 'n/a'} RPS</li>
      </ul>
      ${result.thresholdEvaluation.failures.length > 0 ? `<div><strong>Failures:</strong><ul>${result.thresholdEvaluation.failures.map((item) => `<li>${item}</li>`).join('')}</ul></div>` : '<p>No SLA failures detected.</p>'}
    </div>

    <div class="section chart-grid">
      <div class="chart-card">
        <h2>Latency Trend</h2>
        <canvas id="latencyChart"></canvas>
      </div>
      <div class="chart-card">
        <h2>Throughput Trend</h2>
        <canvas id="throughputChart"></canvas>
      </div>
    </div>

    <div class="section">
      <h2>Status Code Distribution</h2>
      <table class="status-table">
        <thead><tr><th>Status Code</th><th>Count</th></tr></thead>
        <tbody>${Object.entries(result.summary.statusCodes || {}).map(([code, count]) => `<tr><td>${code}</td><td>${count}</td></tr>`).join('')}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Request Timeline</h2>
      <table class="status-table">
        <thead><tr><th>Timestamp</th><th>RPS</th><th>Avg Latency (ms)</th><th>Error Rate</th></tr></thead>
        <tbody>${(result.timeline || []).map((entry) => `<tr><td>${entry.timestamp}</td><td>${entry.rps}</td><td>${entry.averageLatency}</td><td>${entry.errorRate}%</td></tr>`).join('')}</tbody>
      </table>
    </div>

    <div class="footer">Generated by AutoQA Performance Testing Module</div>
  </div>

  <script>
    const timeline = ${timelineData};

    function drawLineChart(canvasId, label, field, color) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.clientWidth * window.devicePixelRatio;
      const height = canvas.clientHeight * window.devicePixelRatio;
      canvas.width = width;
      canvas.height = height;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const data = timeline.map((point) => point[field] || 0);
      const labels = timeline.map((point) => point.timestamp.substr(11, 8));
      const paddedWidth = canvas.clientWidth;
      const paddedHeight = canvas.clientHeight;
      const maxValue = Math.max(...data, 1);
      const minValue = Math.min(...data, 0);

      ctx.clearRect(0, 0, paddedWidth, paddedHeight);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, paddedHeight - 24);
      ctx.lineTo(paddedWidth, paddedHeight - 24);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((value, index) => {
        const x = (index / Math.max(data.length - 1, 1)) * (paddedWidth - 40) + 20;
        const y = paddedHeight - 24 - ((value - minValue) / Math.max(maxValue - minValue, 1)) * (paddedHeight - 64);
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      labels.forEach((labelText, index) => {
        const x = (index / Math.max(labels.length - 1, 1)) * (paddedWidth - 40) + 20;
        ctx.fillText(labelText, x - 18, paddedHeight - 6);
      });
    }

    drawLineChart('latencyChart', 'Latency', 'averageLatency', '#2563eb');
    drawLineChart('throughputChart', 'Throughput', 'rps', '#16a34a');
  </script>
</body>
</html>`;
}

function savePerformanceReport(html, filename) {
  ensureDirectoryExists(reportsDir);
  const safeFilename = sanitizeFilename(filename || `performance-report-${generateId()}.html`);
  const filePath = path.join(reportsDir, safeFilename);
  fs.writeFileSync(filePath, html, 'utf8');
  return filePath;
}

module.exports = {
  executePerformanceTest,
  abortPerformanceTest,
  getPerformanceResult,
  generatePerformanceReportHtml,
  savePerformanceReport
};
