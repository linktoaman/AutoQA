const express = require('express');
const router = express.Router();
const testCaseController = require('../../controllers/tcg/testCaseController');

/**
 * Generate test cases from a JIRA ticket
 * POST /api/tcg/generate-testcases
 */
router.post('/generate-testcases', testCaseController.handleGenerateTestCases);

/**
 * Verify JIRA credentials
 * POST /api/tcg/verify-jira
 */
router.post('/verify-jira', testCaseController.handleVerifyJira);

module.exports = router;
