const { fetchJiraStory, verifyJiraCredentials } = require('../../services/tcg/jiraService');
const { generateTestCases } = require('../../services/tcg/ollamaService');
const { getCachedResponse, setCachedResponse } = require('../../utils/tcgCache');
const { saveTestCasesToFile } = require('../../utils/tcgFileStore');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function handleGenerateTestCases(req, res, next) {
  const ticketId = (req.body && req.body.ticketId) || req.query.ticketId;
  const jiraConfig = {
    baseUrl: req.body?.baseUrl || req.query?.baseUrl,
    email: req.body?.email || req.query?.email,
    apiToken: req.body?.apiToken || req.query?.apiToken
  };

  if (!ticketId) {
    console.warn('[TCG Controller] Missing ticketId parameter');
    return res.status(400).json({ error: 'Missing ticketId parameter.' });
  }

  console.log('[TCG Controller] Test case generation request started', {
    ticketId,
    timestamp: new Date().toISOString()
  });

  try {
    const result = await generateTestCasesForTicket(ticketId, jiraConfig);
    console.log('[TCG Controller] Test case generation completed successfully', {
      ticketId,
      fromCache: result.fromCache,
      testCaseCount: result.testCases?.length || 0,
      timestamp: new Date().toISOString()
    });
    res.json(result);
  } catch (error) {
    console.error('[TCG Controller] Test case generation failed', {
      ticketId,
      error: error.message,
      status: error.status,
      timestamp: new Date().toISOString()
    });
    next(error);
  }
}

async function handleVerifyJira(req, res, next) {
  const jiraConfig = {
    baseUrl: req.body?.baseUrl || req.query?.baseUrl,
    email: req.body?.email || req.query?.email,
    apiToken: req.body?.apiToken || req.query?.apiToken
  };

  try {
    const result = await verifyJiraCredentials(jiraConfig);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function generateTestCasesForTicket(ticketId, jiraConfig = {}) {
  const cacheKey = ticketId.toUpperCase();
  
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    console.log('[TCG Service] Cache hit', { ticketId: cacheKey, cachedCount: cached.length });
    return { ticketId: cacheKey, fromCache: true, testCases: cached };
  }
  console.log('[TCG Service] Cache miss - fetching from JIRA', { ticketId: cacheKey });

  console.log('[TCG Service] Fetching JIRA story', { ticketId: cacheKey, timestamp: new Date().toISOString() });
  const jiraStory = await fetchJiraStory(cacheKey, jiraConfig);
  console.log('[TCG Service] JIRA story fetched', {
    ticketId: cacheKey,
    summary: jiraStory.summary,
    hasDescription: !!jiraStory.description,
    descriptionLength: jiraStory.description?.length || 0
  });

  if (!jiraStory.description) {
    throw createError(400, `JIRA ticket ${cacheKey} has an empty description.`);
  }

  console.log('[TCG Service] Starting AI test case generation', {
    ticketId: cacheKey,
    descriptionLength: jiraStory.description.length,
    timestamp: new Date().toISOString()
  });

  const testCases = await generateTestCases(jiraStory);
  
  console.log('[TCG Service] Test cases generated successfully', {
    ticketId: cacheKey,
    count: testCases?.length || 0,
    timestamp: new Date().toISOString()
  });

  setCachedResponse(cacheKey, testCases);
  await saveTestCasesToFile(cacheKey, testCases);
  console.log('[TCG Service] Test cases cached and saved to file', { ticketId: cacheKey });

  return {
    ticketId: cacheKey,
    fromCache: false,
    testCases
  };
}

module.exports = {
  handleGenerateTestCases,
  generateTestCasesForTicket,
  handleVerifyJira
};
