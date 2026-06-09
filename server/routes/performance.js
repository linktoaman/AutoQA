// ============================================
// Performance Testing Routes
// ============================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const { initProgress, getProgress, updateProgress } = require('../utils/progressTracker');
const { executePerformanceTest, abortPerformanceTest, getPerformanceResult, generatePerformanceReportHtml, savePerformanceReport } = require('../services/performanceService');

const router = express.Router();
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');

/**
 * POST /api/performance/run
 * Starts a new load test session and returns a sessionId for polling.
 */
router.post('/run', async (req, res) => {
  try {
    const config = req.body;
    if (!config || !config.url) {
      return res.status(400).json({
        status: 'error',
        message: 'Target URL is required for performance testing.'
      });
    }

    const sessionId = `performance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    initProgress(sessionId);
    updateProgress(sessionId, {
      stage: 'initialized',
      percentage: 5,
      message: 'Preparing performance test session...'
    });

    // Run the performance test asynchronously, while the client polls progress.
    executePerformanceTest(sessionId, config)
      .then((result) => {
        console.log(`[Performance] Session completed: ${sessionId}`);
      })
      .catch((error) => {
        console.error(`[Performance] Session failed: ${sessionId}`, error.message);
        updateProgress(sessionId, {
          stage: 'error',
          percentage: 100,
          message: `Performance test failed: ${error.message}`
        });
      });

    res.json({
      status: 'success',
      message: 'Performance test started',
      sessionId: sessionId
    });
  } catch (error) {
    console.error('[Performance] Run failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start performance test',
      error: error.message
    });
  }
});

/**
 * GET /api/performance/progress/:sessionId
 * Returns the current progress and live metrics for a performance session.
 */
router.get('/progress/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const progress = getProgress(sessionId);
    res.json({
      status: 'success',
      progress
    });
  } catch (error) {
    console.error('[Performance] Progress fetch failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get performance progress',
      error: error.message
    });
  }
});

/**
 * POST /api/performance/stop
 * Gracefully stops a running performance session.
 */
router.post('/stop', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId is required to stop a running test.'
      });
    }

    const stopped = abortPerformanceTest(sessionId);
    if (!stopped) {
      return res.status(404).json({
        status: 'error',
        message: 'Performance session not found or already completed.'
      });
    }

    res.json({
      status: 'success',
      message: 'Performance test abort requested.'
    });
  } catch (error) {
    console.error('[Performance] Stop failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to stop performance test',
      error: error.message
    });
  }
});

/**
 * GET /api/performance/results/:sessionId
 * Returns the final result payload for a completed performance session.
 */
router.get('/results/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = getPerformanceResult(sessionId);
    res.json({ status: 'success', result });
  } catch (error) {
    console.error('[Performance] Result fetch failed:', error.message);
    res.status(404).json({
      status: 'error',
      message: 'Performance results not found',
      error: error.message
    });
  }
});

/**
 * POST /api/performance/report
 * Generates an exportable HTML report from a completed performance result.
 */
router.post('/report', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId is required to generate report.'
      });
    }

    const result = getPerformanceResult(sessionId);
    const html = generatePerformanceReportHtml(result);
    const reportFilename = `performance-report-${sessionId}.html`;
    const reportPath = savePerformanceReport(html, reportFilename);

    res.json({
      status: 'success',
      reportFilename: path.basename(reportPath),
      reportPath: reportPath
    });
  } catch (error) {
    console.error('[Performance] Report generation failed:', error.message);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate performance report',
      error: error.message
    });
  }
});

module.exports = router;
