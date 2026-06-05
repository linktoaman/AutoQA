const axios = require('axios');

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

async function generateTestCases(ticketDetails) {
  const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
  const model = process.env.OLLAMA_MODEL || 'gemma4:e4b';

  if (!ticketDetails || !ticketDetails.ticketId) {
    throw createError(400, 'Missing ticket details for LLM generation.');
  }

  // ✅ Limit description size (VERY IMPORTANT for timeout fix)
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
        num_predict: 300   // ✅ correct token param for Ollama
      },
      {
        timeout: 120000,   // ✅ increased timeout
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    // ✅ Correct extraction for /api/generate
    const rawText = response.data?.response;

    if (!rawText) {
      throw new Error('Empty response from Ollama');
    }

    // ✅ Parse JSON safely
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

function parseJsonArray(text) {
  const jsonText = text.trim();

  try {
    return JSON.parse(jsonText);
  } catch (_) {
    // ✅ Recover JSON if model adds extra text
    const firstBracket = jsonText.indexOf('[');
    const lastBracket = jsonText.lastIndexOf(']');

    if (firstBracket >= 0 && lastBracket > firstBracket) {
      return JSON.parse(jsonText.slice(firstBracket, lastBracket + 1));
    }

    throw new SyntaxError('Response could not be parsed into JSON array.');
  }
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = {
  generateTestCases,
  buildPrompt
};