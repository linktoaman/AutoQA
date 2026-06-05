const axios = require('axios');
const { createError } = require('./jiraService');

const defaultPrompt = `You are a test case generator.

Using the JIRA story summary, description, and acceptance criteria, generate ONLY:
- 1 positive test case
- 1 negative test case

Requirements:
- Return valid JSON array only
- No markdown, no explanation
- Use this structure:

[
  {
    "testCaseId": "",
    "title": "",
    "preconditions": "",
    "steps": [],
    "expectedResult": "",
    "type": "functional"
  }
]

JIRA Ticket: {{ticketId}}

Summary:
{{summary}}

Description:
{{description}}

Acceptance Criteria:
{{acceptanceCriteria}}
`;

function buildPrompt(ticket) {
  return defaultPrompt
    .replace('{{ticketId}}', ticket.ticketId)
    .replace('{{summary}}', ticket.summary || 'No summary provided.')
    .replace('{{description}}', ticket.description || 'No description provided.')
    .replace('{{acceptanceCriteria}}', ticket.acceptanceCriteria || 'No acceptance criteria available.');
}

function parseJsonArray(text) {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array found in Ollama response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateTestCases(ticketDetails) {
  const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
  const model = process.env.OLLAMA_MODEL || 'mistral';

  if (!ticketDetails || !ticketDetails.ticketId) {
    throw createError(400, 'Missing ticket details for LLM generation.');
  }

  // Limit description size
  const trimmedDetails = {
    ticketId: ticketDetails.ticketId,
    summary: ticketDetails.summary || '',
    description: (ticketDetails.description || '').slice(0, 1000),
    acceptanceCriteria: (ticketDetails.acceptanceCriteria || '').slice(0, 800)
  };

  const prompt = buildPrompt(trimmedDetails);

  try {
    const response = await axios.post(
      apiUrl,
      {
        model,
        prompt,
        temperature: 0.2,
        stream: false,
        num_predict: 300
      },
      {
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const rawText = response.data?.response;

    if (!rawText) {
      throw new Error('Empty response from Ollama');
    }

    return parseJsonArray(rawText);

  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH') {
      throw createError(503, 'Ollama service is unavailable. Ensure it is running.');
    }

    if (error.code === 'ECONNABORTED') {
      throw createError(504, 'Ollama request timed out. Reduce prompt size or check system performance.');
    }

    throw createError(500, `Ollama error: ${error.message}`);
  }
}

module.exports = {
  generateTestCases
};
