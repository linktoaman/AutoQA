const { fetchJiraStory, verifyJiraCredentials } = require('../services/jiraService');
const { generateTestCases } = require('../services/ollamaService');
const { getCachedResponse, setCachedResponse } = require('../utils/cache');
const { saveTestCasesToFile } = require('../utils/fileStore');

async function handleGenerateTestCases(req, res, next) {
  const ticketId = req.query.ticketId;

  if (!ticketId) {
    return res.status(400).json({ error: 'Missing ticketId query parameter.' });
  }

  try {
    const result = await generateTestCasesForTicket(ticketId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function handleVerifyJira(req, res, next) {
  try {
    const result = await verifyJiraCredentials();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function generateTestCasesForTicket(ticketId) {
  const cacheKey = ticketId.toUpperCase();
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return { ticketId: cacheKey, fromCache: true, testCases: cached };
  }

  const jiraStory = await fetchJiraStory(cacheKey);
  if (!jiraStory.description) {
    throw createError(400, `JIRA ticket ${cacheKey} has an empty description.`);
  }

  const testCases = await generateTestCases(jiraStory);
  setCachedResponse(cacheKey, testCases);
  await saveTestCasesToFile(cacheKey, testCases);

  return {
    ticketId: cacheKey,
    fromCache: false,
    testCases
  };
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  handleGenerateTestCases,
  generateTestCasesForTicket,
  handleVerifyJira
};
