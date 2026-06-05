const express = require('express');
const router = express.Router();
const testCaseController = require('../../controllers/tcg/testCaseController');

/**
 * Generate test cases from a JIRA ticket
 * GET /api/tcg/generate-testcases?ticketId=JIRA-123
 */
router.get('/generate-testcases', testCaseController.handleGenerateTestCases);

/**
 * Verify JIRA credentials
 * GET /api/tcg/verify-jira
 */
router.get('/verify-jira', testCaseController.handleVerifyJira);

module.exports = router;
