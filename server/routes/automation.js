// ============================================
// Automation Routes
// ============================================
// Handles automation test case conversion, Selenium execution, and report generation.

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const {
  readJsonFile,
  writeJsonFile,
  sanitizeFilename,
  generateId
} = require('../utils/helpers');
const {
  initProgress,
  updateProgress,
  getProgress,
  clearProgress
} = require('../utils/progressTracker');
const {
  generateAutomationScript,
  executeAutomationWithRealSelenium,
  simulateSeleniumExecution
} = require('../services/automationService');
const {
  generateAutomationHtmlReport,
  saveReport
} = require('../services/automationReportGenerator');

const uploadsDir = process.env.UPLOADS_DIR || './server/uploads';
const reportsDir = process.env.REPORTS_DIR || './server/reports';

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

router.post('/prepare', async (req, res) => {
  try {
    const { manualTestCases, fileName, fileType, fileContent } = req.body;

    if (!manualTestCases && !fileContent) {
      return res.status(400).json({
        status: 'error',
        message: 'Either manual test cases or file content must be provided.'
      });
    }

    const sessionId = `automation-${Date.now()}`;
    const sanitizedFileName = fileName ? sanitizeFilename(fileName) : 'manual-input';

    initProgress(sessionId);
    updateProgress(sessionId, {
      stage: 'parsing',
      message: 'Parsing automation test cases...',
      percentage: 12
    });

    const generatedScript = await generateAutomationScript(manualTestCases || '', sanitizedFileName);
    const sessionFile = path.join(uploadsDir, `${sessionId}.json`);
    const scriptFile = path.join(uploadsDir, `${sessionId}.js`);

    writeJsonFile(sessionFile, {
      sessionId,
      fileName: sanitizedFileName,
      fileType,
      manualTestCases,
      fileContent,
      generatedScript,
      createdAt: new Date().toISOString()
    });

    fs.writeFileSync(scriptFile, generatedScript, 'utf8');

    updateProgress(sessionId, {
      stage: 'ready',
      message: 'Automation script generated and ready for execution.',
      percentage: 28
    });

    res.json({
      status: 'success',
      sessionId,
      generatedScript,
      scriptFile: `${sessionId}.js`
    });
  } catch (error) {
    console.error('[Automation Prepare] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to prepare automation script',
      error: error.message
    });
  }
});

router.post('/run', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId is required'
      });
    }

    const sessionFile = path.join(uploadsDir, `${sessionId}.json`);
    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({
        status: 'error',
        message: 'Automation session not found'
      });
    }

    const sessionData = readJsonFile(sessionFile);
    initProgress(sessionId);
    updateProgress(sessionId, {
      stage: 'executing',
      message: 'Running Selenium automation...',
      percentage: 40
    });

    // Use real Selenium execution with screenshot capture
    const executionResult = await executeAutomationWithRealSelenium(sessionData.generatedScript, sessionId);

    const resultsId = `automation-results-${Date.now()}`;
    const resultsFile = path.join(uploadsDir, `${resultsId}.json`);

    writeJsonFile(resultsFile, {
      resultsId,
      sessionId,
      sessionData,
      summary: executionResult.summary,
      steps: executionResult.steps,
      logs: executionResult.logs,
      screenshots: executionResult.screenshots,
      createdAt: new Date().toISOString()
    });

    updateProgress(sessionId, {
      stage: 'completed',
      message: 'Automation execution completed successfully.',
      percentage: 70
    });

    res.json({
      status: 'success',
      resultsId,
      summary: executionResult.summary,
      steps: executionResult.steps,
      screenshots: executionResult.screenshots,
      logs: executionResult.logs
    });
  } catch (error) {
    console.error('[Automation Run] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to execute automation',
      error: error.message
    });
  }
});

router.post('/report', async (req, res) => {
  try {
    const { resultsId } = req.body;
    if (!resultsId) {
      return res.status(400).json({
        status: 'error',
        message: 'resultsId is required'
      });
    }

    const resultsFile = path.join(uploadsDir, `${resultsId}.json`);
    if (!fs.existsSync(resultsFile)) {
      return res.status(404).json({
        status: 'error',
        message: 'Automation results not found'
      });
    }

    const resultsData = readJsonFile(resultsFile);
    const html = generateAutomationHtmlReport(resultsData);
    const reportFilename = saveReport(html, `automation-report-${Date.now()}.html`);

    updateProgress(resultsData.sessionId, {
      stage: 'report_generated',
      message: 'Automation report generated successfully.',
      percentage: 100
    });

    res.json({
      status: 'success',
      reportFilename
    });
  } catch (error) {
    console.error('[Automation Report] Error:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate automation report',
      error: error.message
    });
  }
});

router.get('/status/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const progress = getProgress(sessionId);
    res.json({ status: 'success', progress });
  } catch (error) {
    console.error('[Automation Status] Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to read automation status', error: error.message });
  }
});

router.get('/results/:resultsId', (req, res) => {
  try {
    const { resultsId } = req.params;
    const resultsFile = path.join(uploadsDir, `${resultsId}.json`);
    if (!fs.existsSync(resultsFile)) {
      return res.status(404).json({ status: 'error', message: 'Results not found' });
    }
    const resultsData = readJsonFile(resultsFile);
    res.json({ status: 'success', results: resultsData });
  } catch (error) {
    console.error('[Automation Results] Error:', error.message);
    res.status(500).json({ status: 'error', message: 'Failed to read automation results', error: error.message });
  }
});

module.exports = router;
