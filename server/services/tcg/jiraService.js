const axios = require('axios');

/**
 * Create error helper
 */
function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/**
 * Fetch a JIRA issue by ticket key and return relevant fields.
 * @param {string} ticketId
 */
async function fetchJiraStory(ticketId) {
  const baseUrl = process.env.JIRA_BASE_URL;
  const authEmail = process.env.JIRA_EMAIL;
  const authToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !authEmail || !authToken) {
    throw createError(500, 'Missing JIRA configuration in environment variables.');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3/issue/${encodeURIComponent(ticketId)}`;
  const auth = Buffer.from(`${authEmail}:${authToken}`).toString('base64');

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json'
      },
      params: {
        fields: 'summary,description'
      }
    });

    const issue = response.data;
    const fields = issue.fields || {};
    const summary = fields.summary || '';
    const description = extractDescription(fields.description);
    const acceptanceCriteria = extractAcceptanceCriteria(fields.description);

    return {
      ticketId,
      summary,
      description,
      acceptanceCriteria
    };
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw createError(404, `JIRA ticket ${ticketId} not found.`);
    }

    throw createError(502, `Failed to fetch JIRA ticket: ${error.message}`);
  }
}

function extractDescription(rawDescription) {
  if (!rawDescription) {
    return '';
  }

  if (typeof rawDescription === 'string') {
    return rawDescription.trim();
  }

  if (rawDescription.content && Array.isArray(rawDescription.content)) {
    return rawDescription.content
      .map((block) => block.text || block.content?.map((inner) => inner.text).join('') || '')
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  return '';
}

function extractAcceptanceCriteria(rawDescription) {
  const description = extractDescription(rawDescription);
  if (!description) {
    return '';
  }

  const normalized = description.replace(/\r/g, '').split('\n');
  const candidates = [];
  let capture = false;

  for (const line of normalized) {
    const trimmed = line.trim();
    if (/^(acceptance criteria|acceptance criterion|criteria):?/i.test(trimmed)) {
      capture = true;
      continue;
    }

    if (capture) {
      if (!trimmed) {
        break;
      }
      candidates.push(trimmed);
    }
  }

  if (candidates.length > 0) {
    return candidates.join('\n');
  }

  return '';
}

async function verifyJiraCredentials() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const authEmail = process.env.JIRA_EMAIL;
  const authToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !authEmail || !authToken) {
    throw createError(500, 'Missing JIRA configuration in environment variables.');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/rest/api/3/myself`;
  const auth = Buffer.from(`${authEmail}:${authToken}`).toString('base64');

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json'
      }
    });

    return {
      status: 'ok',
      jiraUser: response.data.displayName || response.data.emailAddress || 'unknown',
      accountId: response.data.accountId || null,
      message: 'JIRA credentials are valid.'
    };
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw createError(401, 'Invalid JIRA credentials. Verify JIRA_EMAIL and JIRA_API_TOKEN.');
    }
    if (error.response && error.response.status === 403) {
      throw createError(403, 'JIRA credentials are valid but do not have access to the API endpoint.');
    }
    throw createError(502, `Failed to verify JIRA credentials: ${error.message}`);
  }
}

module.exports = {
  fetchJiraStory,
  verifyJiraCredentials,
  createError
};
