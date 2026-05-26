// ============================================
// Test Routes
// ============================================
// Handles API testing execution endpoints.

const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Import services
const { readJsonFile, writeJsonFile } = require('../utils/helpers');
const { generateTestCases } = require('../services/ollamaService');
const { executeTests } = require('../services/apiExecutor');
const { initProgress, updateProgress, getProgress, clearProgress } = require('../utils/progressTracker');

// Configure paths
const uploadsDir = process.env.UPLOADS_DIR || './server/uploads';
const reportsDir = process.env.REPORTS_DIR || './server/reports';

/**
 * POST /api/test/run - Run tests for a session
 * Body: { sessionId: string }
 */
router.post('/run', async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Validate input
    if (!sessionId) {
      return res.status(400).json({
        status: 'error',
        message: 'sessionId is required'
      });
    }

    // Read session data
    const sessionFile = path.join(uploadsDir, `${sessionId}.json`);
    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    const sessionData = readJsonFile(sessionFile);
    const apis = sessionData.apis;

    // Initialize progress tracking
    initProgress(sessionId);
    updateProgress(sessionId, {
      stage: 'initialized',
      totalApis: apis.length,
      message: `Initializing tests for ${apis.length} APIs...`
    });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Starting test execution for session: ${sessionId}`);
    console.log(`Total APIs to test: ${apis.length}`);
    console.log(`${'='.repeat(50)}\n`);

    // Generate and execute tests
    const results = [];
    let allTestCases = [];

    // For each API, generate test cases and execute them
    for (let i = 0; i < apis.length; i++) {
      const api = apis[i];
      console.log(`\n[${i + 1}/${apis.length}] Testing: ${api.method} ${api.name}`);

      try {
        // Update progress: generating tests
        updateProgress(sessionId, {
          stage: 'generating_tests',
          currentApi: i + 1,
          totalApis: apis.length,
          message: `Generating test cases for ${api.name}...`
        });

        // Step 1: Generate test cases using Ollama
        console.log(`  → Generating test cases...`);
        const testCases = await generateTestCases(api);

        // Update progress: executing tests
        updateProgress(sessionId, {
          stage: 'executing_tests',
          currentApi: i + 1,
          totalApis: apis.length,
          totalTests: allTestCases.length + testCases.length,
          message: `Executing ${testCases.length} tests for ${api.name}...`
        });

        // Step 2: Execute tests
        console.log(`  → Executing ${testCases.length} tests...`);
        const testResults = await executeTests(api, testCases);

        // Store all results
        allTestCases.push(...testResults);
        results.push({
          api: api,
          testResults: testResults,
          status: 'completed'
        });

        // Update progress with new test count
        updateProgress(sessionId, {
          currentTest: allTestCases.length,
          message: `Executed ${allTestCases.length} tests so far...`
        });

        console.log(`  ✓ Completed`);
      } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
        results.push({
          api: api,
          testResults: [],
          error: error.message,
          status: 'failed'
        });
      }

      // Small delay between APIs to avoid overwhelming
      if (i < apis.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Save test results and mark test execution complete
    const testResultsId = `results-${Date.now()}`;
    const resultsFile = path.join(uploadsDir, `${testResultsId}.json`);
    writeJsonFile(resultsFile, {
      testResultsId: testResultsId,
      sessionId: sessionId,
      apis: apis,
      allTestCases: allTestCases,
      results: results,
      executedAt: new Date().toISOString(),
      totalApis: apis.length,
      totalTests: allTestCases.length,
      passedTests: allTestCases.filter((t) => t.passed === true).length,
      failedTests: allTestCases.filter((t) => t.passed === false).length
    });

    // Calculate statistics
    const passedTests = allTestCases.filter((t) => t.passed === true).length;
    const failedTests = allTestCases.filter((t) => t.passed === false).length;
    const passRate =
      allTestCases.length > 0 ? Math.round((passedTests / allTestCases.length) * 100) : 0;

    // Update progress: tests complete, waiting for report generation
    updateProgress(sessionId, {
      stage: 'tests_complete',
      percentage: 85,
      message: 'Test execution complete. Ready to generate report.',
      currentApi: apis.length,
      totalApis: apis.length,
      currentTest: allTestCases.length,
      totalTests: allTestCases.length
    });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`Test Execution Complete!`);
    console.log(`Total APIs: ${apis.length}`);
    console.log(`Total Tests: ${allTestCases.length}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`${'='.repeat(50)}\n`);

    // Return success response with results ID for report generation
    res.json({
      status: 'success',
      message: 'Tests executed successfully',
      testResultsId: testResultsId,
      summary: {
        totalApis: apis.length,
        totalTests: allTestCases.length,
        passedTests: passedTests,
        failedTests: failedTests,
        passRate: passRate
      }
    });
  } catch (error) {
    console.error('Test execution error:', error);
    clearProgress(sessionId);
    res.status(500).json({
      status: 'error',
      message: 'Test execution failed',
      error: error.message
    });
  }
});

/**
 * GET /api/test/progress/:sessionId - Get real-time progress
 * Returns: { sessionId, stage, percentage, message, currentApi, totalApis, currentTest, totalTests }
 */
router.get('/progress/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const progress = getProgress(sessionId);

    res.json({
      status: 'success',
      progress: progress
    });
  } catch (error) {
    console.error('Error getting progress:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get progress',
      error: error.message
    });
  }
});

/**
 * GET /api/test/results/:testResultsId - Get test results
 */
router.get('/results/:testResultsId', (req, res) => {
  try {
    const { testResultsId } = req.params;
    const resultsFile = path.join(uploadsDir, `${testResultsId}.json`);

    if (!fs.existsSync(resultsFile)) {
      return res.status(404).json({
        status: 'error',
        message: 'Test results not found'
      });
    }

    const resultsData = readJsonFile(resultsFile);

    res.json({
      status: 'success',
      results: resultsData
    });
  } catch (error) {
    console.error('Error reading test results:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to read test results',
      error: error.message
    });
  }
});

/**
 * GET /api/test/status/:testResultsId - Get test status
 */
router.get('/status/:testResultsId', (req, res) => {
  try {
    const { testResultsId } = req.params;
    const resultsFile = path.join(uploadsDir, `${testResultsId}.json`);

    if (!fs.existsSync(resultsFile)) {
      return res.status(404).json({
        status: 'error',
        message: 'Test results not found'
      });
    }

    const resultsData = readJsonFile(resultsFile);

    res.json({
      status: 'success',
      testResultsId: testResultsId,
      summary: {
        totalApis: resultsData.totalApis,
        totalTests: resultsData.totalTests,
        passedTests: resultsData.passedTests,
        failedTests: resultsData.failedTests,
        passRate: resultsData.totalTests > 0
          ? Math.round((resultsData.passedTests / resultsData.totalTests) * 100)
          : 0,
        executedAt: resultsData.executedAt
      }
    });
  } catch (error) {
    console.error('Error getting test status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get test status',
      error: error.message
    });
  }
});

// Export router
module.exports = router;
