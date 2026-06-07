// ============================================
// Report Routes
// ============================================
// Handles report generation and retrieval endpoints.

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Import services
const { readJsonFile, writeJsonFile } = require('../utils/helpers');
const { generateHtmlReport, saveReport, getReports, readReport } = require('../services/reportGenerator');
const { updateProgress } = require('../utils/progressTracker');

// Configure paths
const uploadsDir = process.env.UPLOADS_DIR || './server/uploads';
const reportsDir = process.env.REPORTS_DIR || './server/reports';

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * POST /api/report/generate - Generate HTML report from test results
 * Body: { testResultsId: string }
 */
router.post('/generate', (req, res) => {
  try {
    const { testResultsId } = req.body;

    if (!testResultsId) {
      return res.status(400).json({
        status: 'error',
        message: 'testResultsId is required'
      });
    }

    // Read test results
    const resultsFile = path.join(uploadsDir, `${testResultsId}.json`);
    if (!fs.existsSync(resultsFile)) {
      return res.status(404).json({
        status: 'error',
        message: 'Test results not found'
      });
    }

    const resultsData = readJsonFile(resultsFile);
    const sessionId = resultsData.sessionId;

    // Update progress before generating the report
    updateProgress(sessionId, {
      stage: 'generating_report',
      percentage: 90,
      message: 'Generating HTML report...',
      currentTest: resultsData.totalTests,
      totalTests: resultsData.totalTests,
      currentApi: resultsData.totalApis,
      totalApis: resultsData.totalApis
    });

    // Generate HTML report
    const reportData = {
      apis: resultsData.apis,
      allResults: resultsData.allTestCases,
      stats: {
        totalApis: resultsData.totalApis,
        totalTests: resultsData.totalTests,
        passedTests: resultsData.passedTests,
        failedTests: resultsData.failedTests
      },
      timestamp: resultsData.executedAt
    };

    const htmlReport = generateHtmlReport(reportData);

    // Save report to file
    const reportFilename = `report-${Date.now()}.html`;
    console.log('[Report] Saving report to file', { reportFilename, htmlSize: htmlReport.length });
    const reportPath = saveReport(htmlReport, reportFilename);
    console.log('[Report] Report saved successfully', { reportPath, fileExists: fs.existsSync(reportPath) });

    // Store report metadata
    const reportMetadata = {
      reportId: `report-${Date.now()}`,
      reportFilename: reportFilename,
      testResultsId: testResultsId,
      sessionId: resultsData.sessionId,
      generatedAt: new Date().toISOString(),
      stats: {
        totalApis: resultsData.totalApis,
        totalTests: resultsData.totalTests,
        passedTests: resultsData.passedTests,
        failedTests: resultsData.failedTests,
        passRate:
          resultsData.totalTests > 0
            ? Math.round((resultsData.passedTests / resultsData.totalTests) * 100)
            : 0
      }
    };

    // Save metadata
    const metadataFile = path.join(uploadsDir, `report-metadata-${reportMetadata.reportId}.json`);
    writeJsonFile(metadataFile, reportMetadata);

    console.log(`✓ Report generated: ${reportFilename}`);

    updateProgress(sessionId, {
      stage: 'completed',
      percentage: 100,
      message: 'Report generated successfully',
      currentTest: resultsData.totalTests,
      totalTests: resultsData.totalTests,
      currentApi: resultsData.totalApis,
      totalApis: resultsData.totalApis
    });

    res.json({
      status: 'success',
      message: 'Report generated successfully',
      reportId: reportMetadata.reportId,
      reportFilename: reportFilename,
      stats: reportMetadata.stats
    });
  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Report generation failed',
      error: error.message
    });
  }
});

/**
 * GET /api/report/list - List all generated reports
 */
router.get('/list', (req, res) => {
  try {
    const reports = getReports();

    // Get metadata for each report
    const reportList = [];
    reports.forEach((filename) => {
      try {
        const reportPath = path.join(reportsDir, filename);
        const stats = fs.statSync(reportPath);

        reportList.push({
          filename: filename,
          createdAt: stats.birthtime,
          size: stats.size
        });
      } catch (error) {
        console.error(`Error reading report ${filename}:`, error.message);
      }
    });

    // Sort by created date (newest first)
    reportList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      status: 'success',
      reports: reportList,
      total: reportList.length
    });
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list reports',
      error: error.message
    });
  }
});

/**
 * GET /api/report/view/:reportFilename - View a specific report
 */
router.get('/view/:reportFilename', (req, res) => {
  try {
    const { reportFilename } = req.params;

    console.log('[Report View] Requested report', { reportFilename });

    // Security: validate filename to prevent directory traversal
    if (reportFilename.includes('..') || reportFilename.includes('/') || reportFilename.includes('\\')) {
      console.warn('[Report View] Invalid filename attempted', { reportFilename });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid report filename'
      });
    }

    const reportPath = path.join(reportsDir, reportFilename);
    console.log('[Report View] Looking for file', { reportPath, exists: fs.existsSync(reportPath) });

    if (!fs.existsSync(reportPath)) {
      console.warn('[Report View] Report file not found', { reportPath, reportsDir });
      // List available reports for debugging
      try {
        const availableReports = fs.readdirSync(reportsDir);
        console.log('[Report View] Available reports:', { count: availableReports.length, reports: availableReports });
      } catch (dirError) {
        console.error('[Report View] Cannot list reports directory:', dirError.message);
      }
      return res.status(404).json({
        status: 'error',
        message: 'Report not found',
        requestedFile: reportFilename,
        lookingAt: reportPath
      });
    }

    // Read and return the HTML report
    console.log('[Report View] Reading report file', { reportPath, size: fs.statSync(reportPath).size });
    const htmlContent = readReport(reportFilename);

    console.log('[Report View] Report served successfully', { reportFilename, size: htmlContent.length });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
  } catch (error) {
    console.error('[Report View] Error reading report:', {
      error: error.message,
      stack: error.stack,
      filename: req.params.reportFilename
    });
    res.status(500).json({
      status: 'error',
      message: 'Failed to read report',
      error: error.message
    });
  }
});

/**
 * GET /api/report/download/:reportFilename - Download report as HTML
 */
router.get('/download/:reportFilename', (req, res) => {
  try {
    const { reportFilename } = req.params;

    // Security: validate filename
    if (reportFilename.includes('..') || reportFilename.includes('/') || reportFilename.includes('\\')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid report filename'
      });
    }

    const reportPath = path.join(reportsDir, reportFilename);
    const absoluteReportPath = path.resolve(reportPath);

    if (!fs.existsSync(absoluteReportPath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found'
      });
    }

    // Set download headers
    res.setHeader('Content-Disposition', `attachment; filename="${reportFilename}"`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Send file using absolute path
    res.sendFile(absoluteReportPath);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download report',
      error: error.message
    });
  }
});

/**
 * DELETE /api/report/:reportFilename - Delete a report
 */
router.delete('/:reportFilename', (req, res) => {
  try {
    const { reportFilename } = req.params;

    // Security: validate filename
    if (reportFilename.includes('..') || reportFilename.includes('/') || reportFilename.includes('\\')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid report filename'
      });
    }

    const reportPath = path.join(reportsDir, reportFilename);

    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({
        status: 'error',
        message: 'Report not found'
      });
    }

    fs.unlinkSync(reportPath);

    console.log(`✓ Report deleted: ${reportFilename}`);

    res.json({
      status: 'success',
      message: 'Report deleted'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete report',
      error: error.message
    });
  }
});

// Export router
module.exports = router;
