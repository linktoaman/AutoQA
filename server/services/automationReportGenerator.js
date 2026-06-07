// ============================================
// Automation Report Generator
// ============================================
// Builds a clean HTML report for automation execution results.

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

function createScreenshotHtml(screenshot) {
  return `
    <div class="screenshot-card">
      <img src="${escapeHtml(screenshot.imageData || '')}" alt="${escapeHtml(screenshot.caption)}" />
      <div class="screenshot-caption"><strong>${escapeHtml(screenshot.caption)}</strong><p>${escapeHtml(screenshot.details)}</p></div>
    </div>
  `;
}

function generateAutomationHtmlReport(resultData) {
  const summary = resultData.summary || {};
  const steps = resultData.steps || [];
  const logs = resultData.logs || [];
  const screenshots = resultData.screenshots || [];
  const reportTimestamp = escapeHtml(resultData.createdAt || new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QAgent Automation Report</title>
  <style>
    body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f8fafc; color: #0f172a; }
    .container { max-width: 1200px; margin: 0 auto; padding: 28px; }
    .hero { background: #4338ca; color: white; border-radius: 28px; padding: 32px; box-shadow: 0 24px 60px rgba(67, 56, 202, 0.18); }
    .hero h1 { font-size: 2.6rem; margin-bottom: 12px; }
    .hero p { margin: 0; opacity: 0.85; }
    .grid { display: grid; gap: 18px; margin-top: 24px; }
    .summary-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .metric-card { background: white; border-radius: 22px; padding: 22px; box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08); }
    .metric-card h2 { margin: 0 0 8px; font-size: 1.1rem; color: #475569; }
    .metric-card strong { font-size: 2rem; display: block; color: #0f172a; }
    .section-card { background: white; border-radius: 26px; padding: 24px; box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08); }
    .section-card h3 { margin-top: 0; font-size: 1.2rem; }
    .step-list, .log-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
    .step-item, .log-item { padding: 18px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .step-item strong { display: block; margin-bottom: 8px; }
    .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; }
    .screenshot-card { overflow: hidden; border-radius: 24px; background: white; box-shadow: 0 18px 36px rgba(15, 23, 42, 0.08); }
    .screenshot-card img { width: 100%; height: 180px; object-fit: cover; display: block; }
    .screenshot-caption { padding: 18px; }
    .screenshot-caption p { margin: 0; color: #475569; line-height: 1.7; }
    .footer { margin-top: 28px; text-align: center; color: #64748b; font-size: 0.95rem; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <h1>QAgent Automation Report</h1>
      <p>Generated: ${reportTimestamp}</p>
    </div>

    <div class="grid summary-grid">
      <div class="metric-card"><h2>Total Steps</h2><strong>${escapeHtml(summary.totalSteps || 0)}</strong></div>
      <div class="metric-card"><h2>Passed Steps</h2><strong>${escapeHtml(summary.passedSteps || 0)}</strong></div>
      <div class="metric-card"><h2>Failed Steps</h2><strong>${escapeHtml(summary.failedSteps || 0)}</strong></div>
      <div class="metric-card"><h2>Pass Rate</h2><strong>${escapeHtml(summary.passRate || 0)}%</strong></div>
    </div>

    <div class="grid">
      <div class="section-card">
        <h3>Execution Summary</h3>
        <p>Automation session <strong>${escapeHtml(resultData.sessionId)}</strong> completed in <strong>${escapeHtml(summary.durationMs || 0)}ms</strong>.</p>
      </div>

      <div class="section-card">
        <h3>Execution Steps</h3>
        <ul class="step-list">
          ${steps.map(step => `
            <li class="step-item">
              <strong>${escapeHtml(step.name)} • ${escapeHtml(step.status.toUpperCase())}</strong>
              <p>${escapeHtml(step.details)}</p>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="section-card">
        <h3>Execution Logs</h3>
        <ul class="log-list">
          ${logs.map((log) => `<li class="log-item">${escapeHtml(log)}</li>`).join('')}
        </ul>
      </div>

      <div class="section-card">
        <h3>Screenshots</h3>
        <div class="screenshot-grid">
          ${screenshots.map(createScreenshotHtml).join('')}
        </div>
      </div>
    </div>

    <div class="footer">Report generated by QAgent Automation Testing module.</div>
  </div>
</body>
</html>`;
}

function saveReport(html, filename) {
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFilename = filename || `automation-report-${Date.now()}.html`;
  const reportPath = path.join(reportsDir, reportFilename);
  fs.writeFileSync(reportPath, html, 'utf8');
  return reportFilename;
}

module.exports = {
  generateAutomationHtmlReport,
  saveReport
};
