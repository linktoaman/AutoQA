// ============================================
// AutoQA Performance Testing Frontend
// ============================================

const perfState = {
  sessionId: null,
  isRunning: false,
  pollAbort: false,
  lastMetrics: null,
  timeline: []
};

const elements = {
  url: document.getElementById('targetUrl'),
  method: document.getElementById('httpMethod'),
  concurrency: document.getElementById('concurrency'),
  rampUp: document.getElementById('rampUpSeconds'),
  duration: document.getElementById('durationSeconds'),
  authType: document.getElementById('authType'),
  bearerToken: document.getElementById('bearerToken'),
  basicUsername: document.getElementById('basicUsername'),
  basicPassword: document.getElementById('basicPassword'),
  authFields: document.getElementById('authFields'),
  bearerGroup: document.getElementById('bearerGroup'),
  basicUserGroup: document.getElementById('basicUserGroup'),
  basicPassGroup: document.getElementById('basicPassGroup'),
  headersContainer: document.getElementById('headersContainer'),
  addHeaderBtn: document.getElementById('addHeaderBtn'),
  payload: document.getElementById('requestPayload'),
  maxLatency: document.getElementById('maxAverageLatencyMs'),
  maxErrorRate: document.getElementById('maxErrorRatePct'),
  minRps: document.getElementById('minRps'),
  startTestBtn: document.getElementById('startTestBtn'),
  stopTestBtn: document.getElementById('stopTestBtn'),
  downloadReportBtn: document.getElementById('downloadReportBtn'),
  summaryRequests: document.getElementById('summaryRequests'),
  summarySuccessRate: document.getElementById('summarySuccessRate'),
  summaryErrorRate: document.getElementById('summaryErrorRate'),
  summaryRps: document.getElementById('summaryRps'),
  summaryElapsed: document.getElementById('summaryElapsed'),
  logs: document.getElementById('performanceLogs'),
  latencyCanvas: document.getElementById('liveLatencyChart'),
  throughputCanvas: document.getElementById('liveThroughputChart')
};

let timerInterval = null;
let timerSeconds = 0;

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

function startTimer() {
  stopTimer();
  timerSeconds = 0;
  if (elements.summaryElapsed) {
    elements.summaryElapsed.textContent = formatDuration(timerSeconds);
  }
  timerInterval = setInterval(() => {
    timerSeconds += 1;
    if (elements.summaryElapsed) {
      elements.summaryElapsed.textContent = formatDuration(timerSeconds);
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function getInputValue(element, fallback = '') {
  return element && typeof element.value !== 'undefined' ? element.value : fallback;
}

function setElementDisplay(element, display) {
  if (element) {
    element.style.display = display;
  }
}

function setAuthFields() {
  const type = getInputValue(elements.authType, 'none');
  setElementDisplay(elements.authFields, type === 'none' ? 'none' : 'block');
  setElementDisplay(elements.bearerGroup, type === 'bearer' ? 'block' : 'none');
  setElementDisplay(elements.basicUserGroup, type === 'basic' ? 'block' : 'none');
  setElementDisplay(elements.basicPassGroup, type === 'basic' ? 'block' : 'none');
}

function addHeaderRow(name = '', value = '') {
  const row = document.createElement('div');
  row.className = 'header-row';
  row.innerHTML = `
    <input type="text" placeholder="Header name" value="${name}" class="header-key" />
    <input type="text" placeholder="Header value" value="${value}" class="header-value" />
    <button class="btn btn-secondary" type="button">Remove</button>
  `;

  const removeBtn = row.querySelector('button');
  removeBtn.addEventListener('click', () => row.remove());
  elements.headersContainer.appendChild(row);
}

function getHeaders() {
  const headers = {};
  if (!elements.headersContainer) return headers;

  elements.headersContainer.querySelectorAll('.header-row').forEach((row) => {
    const keyEl = row.querySelector('.header-key');
    const valueEl = row.querySelector('.header-value');
    const key = keyEl ? keyEl.value.trim() : '';
    const value = valueEl ? valueEl.value.trim() : '';
    if (key !== '') {
      headers[key] = value;
    }
  });
  return headers;
}

function logMessage(message, level = 'info') {
  const line = document.createElement('div');
  line.className = 'log-entry';
  line.innerHTML = `<span>${new Date().toLocaleTimeString()}</span> ${message}`;
  if (elements.logs) {
    elements.logs.prepend(line);
  } else {
    console[level === 'error' ? 'error' : 'log'](message);
  }
}

function clearLogs() {
  elements.logs.innerHTML = '';
}

function updateSummary(metrics) {
  if (!metrics) return;
  if (elements.summaryRequests) elements.summaryRequests.textContent = metrics.totalRequests || 0;
  if (elements.summarySuccessRate) elements.summarySuccessRate.textContent = `${metrics.successRate || 0}%`;
  if (elements.summaryErrorRate) elements.summaryErrorRate.textContent = `${metrics.errorRate || 0}%`;
  if (elements.summaryRps) elements.summaryRps.textContent = `${metrics.rps || 0} RPS`;
}

function drawLineCanvas(canvas, points, color) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  if (!points.length) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '14px Arial';
    ctx.fillText('Waiting for results...', 16, 40);
    return;
  }

  const values = points.map((point) => point.value);
  const labels = points.map((point) => point.label);
  const maxValue = Math.max(...values, 1);
  const padding = 28;
  const graphHeight = height - padding * 1.8;
  const graphWidth = width - padding * 1.4;

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding / 2, height - padding);
  ctx.stroke();

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  values.forEach((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * graphWidth;
    const y = height - padding - (value / maxValue) * graphHeight;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.font = '12px Arial';
  ctx.fillText(labels[0] || '', padding, height - 8);
  ctx.fillText(labels[labels.length - 1] || '', width - padding - 40, height - 8);
}

function renderCharts(metrics) {
  const timeline = metrics.timeline || [];
  const latencyPoints = timeline.map((item) => ({
    label: item.timestamp ? item.timestamp.substr(11, 8) : '',
    value: item.averageLatency
  }));
  const throughputPoints = timeline.map((item) => ({
    label: item.timestamp ? item.timestamp.substr(11, 8) : '',
    value: item.rps
  }));

  drawLineCanvas(elements.latencyCanvas, latencyPoints, '#2563eb');
  drawLineCanvas(elements.throughputCanvas, throughputPoints, '#16a34a');
}

function enableControls(isRunning) {
  perfState.isRunning = isRunning;
  elements.startTestBtn.disabled = isRunning;
  elements.stopTestBtn.disabled = !isRunning;
  elements.downloadReportBtn.disabled = isRunning || !perfState.sessionId;
}

function createRunPayload() {
  const authType = getInputValue(elements.authType, 'none');
  const auth = { type: authType };

  if (authType === 'bearer') {
    auth.token = getInputValue(elements.bearerToken, '').trim();
  }
  if (authType === 'basic') {
    auth.username = getInputValue(elements.basicUsername, '').trim();
    auth.password = getInputValue(elements.basicPassword, '');
  }

  return {
    url: getInputValue(elements.url, '').trim(),
    method: getInputValue(elements.method, 'GET'),
    headers: getHeaders(),
    auth,
    payload: getInputValue(elements.payload, '').trim(),
    concurrency: Number(getInputValue(elements.concurrency, '1')) || 1,
    rampUpSeconds: Number(getInputValue(elements.rampUp, '0')) || 0,
    durationSeconds: Number(getInputValue(elements.duration, '30')) || 30,
    maxAverageLatencyMs: Number(getInputValue(elements.maxLatency, '0')) || 0,
    maxErrorRatePct: Number(getInputValue(elements.maxErrorRate, '0')) || 0,
    minRps: Number(getInputValue(elements.minRps, '0')) || 0
  };
}

async function startPerformanceTest() {
  if (!elements.url.value.trim()) {
    alert('Please enter a valid API endpoint URL.');
    return;
  }

  clearLogs();
  updateSummary({ totalRequests: 0, successRate: 0, errorRate: 0, rps: 0, timeline: [] });
  renderCharts({ timeline: [] });
  enableControls(true);
  logMessage('Starting performance test...');

  const payload = createRunPayload();
  const response = await fetch('/api/performance/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    enableControls(false);
    stopTimer();
    logMessage(`Unable to start test: ${body.message || response.statusText}`, 'error');
    return;
  }

  const data = await response.json();
  perfState.sessionId = data.sessionId;
  perfState.timeline = [];
  logMessage(`Session created: ${data.sessionId}`);
  startTimer();
  enableControls(true);
  pollPerformanceProgress(data.sessionId);
}

async function stopPerformanceTest() {
  if (!perfState.sessionId) {
    logMessage('No active performance session to stop.', 'error');
    return;
  }

  perfState.pollAbort = true;
  enableControls(false);
  stopTimer();
  logMessage('Requesting stop of the current test...');

  await fetch('/api/performance/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: perfState.sessionId })
  }).catch((error) => {
    logMessage(`Stop request failed: ${error.message}`, 'error');
  });
}

async function fetchPerformanceProgress(sessionId) {
  const response = await fetch(`/api/performance/progress/${encodeURIComponent(sessionId)}`);
  if (!response.ok) {
    throw new Error('Unable to fetch progress');
  }
  return response.json();
}

async function pollPerformanceProgress(sessionId) {
  perfState.pollAbort = false;

  while (!perfState.pollAbort) {
    try {
      const result = await fetchPerformanceProgress(sessionId);
      const progress = result.progress || {};
      const metrics = progress.metrics || {};

      if (metrics.totalRequests !== undefined) {
        perfState.lastMetrics = metrics;
        updateSummary(metrics);
        renderCharts(metrics);
      }

      if (progress.message) {
        logMessage(progress.message);
      }

      if (progress.stage === 'completed' || progress.stage === 'error') {
        stopTimer();
        enableControls(false);
        const message = progress.stage === 'completed'
          ? 'Performance test completed successfully.'
          : `Test ended with error: ${progress.message}`;
        logMessage(message, progress.stage === 'error' ? 'error' : 'success');
        elements.downloadReportBtn.disabled = false;
        break;
      }
    } catch (error) {
      logMessage(`Progress polling failed: ${error.message}`, 'error');
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

async function exportReport() {
  if (!perfState.sessionId) {
    alert('No session available to export. Run a test first.');
    return;
  }

  const response = await fetch('/api/performance/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: perfState.sessionId })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    logMessage(`Report export failed: ${body.message || response.statusText}`, 'error');
    return;
  }

  const data = await response.json();
  const reportUrl = `/api/report/view/${encodeURIComponent(data.reportFilename)}`;
  logMessage('Exported performance report successfully. Opening report...', 'success');
  window.open(reportUrl, '_blank');
}

function initialize() {
  try {
    if (!elements.url || !elements.method || !elements.authType || !elements.headersContainer || !elements.startTestBtn) {
      throw new Error('Performance UI is missing required form elements. Please open /performance after server restart.');
    }

    setAuthFields();
    addHeaderRow('Content-Type', 'application/json');
    addHeaderRow('Accept', 'application/json');

    elements.authType.addEventListener('change', setAuthFields);
    elements.addHeaderBtn.addEventListener('click', () => addHeaderRow());
    elements.startTestBtn.addEventListener('click', (event) => {
      event.preventDefault();
      startPerformanceTest();
    });
    elements.stopTestBtn.addEventListener('click', stopPerformanceTest);
    elements.downloadReportBtn.addEventListener('click', exportReport);
    window.addEventListener('resize', () => renderCharts(perfState.lastMetrics || { timeline: [] }));

    logMessage('Performance module initialized.', 'success');
    console.log('[Performance] frontend initialized');
  } catch (error) {
    const message = `Initialization failed: ${error.message}`;
    logMessage(message, 'error');
    console.error('[Performance] initialization error', error);
  }
}

window.addEventListener('error', (event) => {
  logMessage(`Runtime error: ${event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
  logMessage(`Unhandled rejection: ${event.reason}`, 'error');
});

window.addEventListener('DOMContentLoaded', initialize);