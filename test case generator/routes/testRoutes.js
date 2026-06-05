const express = require('express');
const router = express.Router();
const testCaseController = require('../controllers/testCaseController');

router.get('/generate-testcases', testCaseController.handleGenerateTestCases);
router.get('/verify-jira', testCaseController.handleVerifyJira);

module.exports = router;
