const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderTest(test, apiIndex, testIndex) {
  const statusClass = test.passed === true ? 'status-passed' : test.error ? 'status-error' : 'status-failed';
  const statusText = test.passed === true ? 'PASSED' : test.error ? 'ERROR' : 'FAILED';
  const requestHeaders = test.request?.headers ? escapeHtml(test.request.headers) : 'None';
  const requestBody = test.request?.body ? escapeHtml(typeof test.request.body === 'string' ? test.request.body : JSON.stringify(test.request.body, null, 2)) : 'No request body sent';
  const responseHeaders = test.actual_result?.headers ? escapeHtml(test.actual_result.headers) : 'None';
  const responseBody = test.actual_result?.body ? escapeHtml(typeof test.actual_result.body === 'string' ? test.actual_result.body : JSON.stringify(test.actual_result.body, null, 2)) : 'No response body received';
  const expandId = `test-${apiIndex}-${testIndex}`;

  return `
    <div class="test-result">
      <div class="test-header">
        <div>
          <div class="test-type">${escapeHtml(test.type || 'Test')}</div>
          <div class="test-description">${escapeHtml(test.description || 'No description')}</div>
        </div>
        <div class="test-status">
          <span class="status-badge ${statusClass}">${statusText}</span>
          <span class="response-time">${escapeHtml(test.response_time || '0')}ms</span>
        </div>
      </div>
      <div class="test-details" id="${expandId}">
        <div class="detail-row"><strong>Request:</strong> ${escapeHtml(test.request?.method || '')} ${escapeHtml(test.request?.url || '')}</div>
        <div class="detail-row"><strong>Request Headers:</strong><pre>${requestHeaders}</pre></div>
        <div class="detail-row"><strong>Request Body:</strong><pre>${requestBody}</pre></div>
        <div class="detail-row"><strong>Response Status:</strong> ${escapeHtml(test.actual_result?.statusCode || '')}</div>
        <div class="detail-row"><strong>Response Headers:</strong><pre>${responseHeaders}</pre></div>
        <div class="detail-row"><strong>Response Body:</strong><pre>${responseBody}</pre></div>
        <div class="detail-row"><strong>Outcome:</strong> ${escapeHtml(test.error || (test.passed ? 'PASS' : 'FAIL'))}</div>
      </div>
    </div>
  `;
}

function renderApiSection(api, apiIndex, allResults) {
  const apiTests = allResults.filter((result) => result.api_id === api.id || result.api?.id === api.id);
  const passed = apiTests.filter((item) => item.passed === true).length;
  const total = apiTests.length;

  return `
    <div class="api-section">
      <div class="api-header">
        <div>
          <div class="api-name">${escapeHtml(api.name || api.url)}</div>
          <div class="api-meta">${escapeHtml(api.method || '')} ${escapeHtml(api.url || '')}</div>
        </div>
        <div class="api-summary">${passed}/${total} passed</div>
      </div>
      ${apiTests.map((test, testIndex) => renderTest(test, apiIndex, testIndex)).join('')}
    </div>
  `;
}

function generateHtmlReport(data) {
  const apis = Array.isArray(data.apis) ? data.apis : [];
  const allResults = Array.isArray(data.allResults) ? data.allResults : [];
  const stats = data.stats || {};
  const totalTests = stats.totalTests || allResults.length;
  const passedTests = stats.passedTests || allResults.filter((item) => item.passed === true).length;
  const failedTests = stats.failedTests || allResults.filter((item) => item.passed === false).length;
  const passRate = stats.passRate || (totalTests ? Math.round((passedTests / totalTests) * 100) : 0);
  const timestamp = escapeHtml(data.timestamp || new Date().toISOString());

  const apiSections = apis.map((api, index) => renderApiSection(api, index, allResults)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QAgent Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f7fb; color: #1f2937; }
    .container { max-width: 1180px; margin: 0 auto; padding: 28px; }
    .header { background: #1d4ed8; color: white; border-radius: 12px; padding: 28px; }
    .header h1 { margin: 0 0 10px; font-size: 2rem; }
    .header p { margin: 0; opacity: 0.85; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-top: 22px; }
    .metric { background: white; border-radius: 12px; padding: 18px 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); color: #111827 !important; }
    .metric h2 { margin: 0 0 6px; font-size: 1.8rem; color: #111827 !important; }
    .metric p { margin: 0; color: #475569 !important; }
    .metric * { color: #111827 !important; }
    .api-section { margin-top: 22px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); }
    .api-header { display: flex; justify-content: space-between; flex-wrap: wrap; align-items: center; gap: 12px; padding: 18px 22px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
    .api-name { font-weight: 700; font-size: 1.05rem; }
    .api-meta { color: #475569; margin-top: 4px; }
    .api-summary { color: #1d4ed8; font-weight: 700; }
    .test-result { border-top: 1px solid #e2e8f0; }
    .test-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; cursor: pointer; transition: background 0.2s ease; }
    .test-header:hover { background: #f8fafc; }
    .test-status { display: flex; align-items: center; gap: 12px; }
    .status-badge { padding: 6px 12px; border-radius: 9999px; color: white; font-size: 0.84rem; }
    .status-passed { background: #16a34a; }
    .status-failed { background: #dc2626; }
    .status-error { background: #d97706; }
    .response-time { color: #475569; }
    .test-details { display: none; padding: 0 22px 22px; background: #f8fafc; }
    .detail-row { margin-bottom: 16px; }
    .detail-row strong { display: block; margin-bottom: 6px; }
    pre { margin: 0; padding: 14px; border-radius: 10px; background: #eef2ff; color: #0f172a; overflow-x: auto; white-space: pre-wrap; word-break: break-word; }
    .footer { margin-top: 28px; font-size: 0.95rem; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>QAgent Test Report</h1>
      <p>Generated: ${timestamp}</p>
      <div class="summary">
        <div class="metric"><h2>${totalTests}</h2><p>Total tests</p></div>
        <div class="metric"><h2>${passedTests}</h2><p>Passed</p></div>
        <div class="metric"><h2>${failedTests}</h2><p>Failed</p></div>
        <div class="metric"><h2>${passRate}%</h2><p>Pass rate</p></div>
      </div>
    </div>
    ${apiSections}
    <div class="footer">Report generated by QAgent</div>
  </div>
  <script>
    document.querySelectorAll('.test-header').forEach((header) => {
      header.addEventListener('click', () => {
        const details = header.nextElementSibling;
        if (details) {
          details.style.display = details.style.display === 'block' ? 'none' : 'block';
        }
      });
    });
  </script>
</body>
</html>`;
}

function saveReport(html, filename) {
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const reportFilename = filename || `report-${Date.now()}.html`;
  const reportPath = path.join(reportsDir, reportFilename);
  fs.writeFileSync(reportPath, html, 'utf8');
  return reportPath;
}

function getReports() {
  try {
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) return [];
    return fs.readdirSync(reportsDir).filter((file) => file.endsWith('.html'));
  } catch (error) {
    return [];
  }
}

function readReport(filename) {
  const reportsDir = path.join(__dirname, '..', 'reports');
  const reportPath = path.join(reportsDir, filename);
  if (!reportPath.startsWith(reportsDir) || !fs.existsSync(reportPath)) {
    throw new Error('Report not found');
  }
  return fs.readFileSync(reportPath, 'utf8');
}

module.exports = {
  generateHtmlReport,
  saveReport,
  getReports,
  readReport,
};
