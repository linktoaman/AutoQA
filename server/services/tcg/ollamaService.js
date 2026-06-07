// ============================================
// AI-backed TCG Service
// ============================================
// Generates JIRA-driven test cases using the configured AI provider (Ollama, ChatGPT, or Gemini).
const axios = require('axios');
const { createError } = require('./jiraService');
const { callChatGPT } = require('../chatgptService');
const { callGemini } = require('../geminiService');

const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';
const useChatGPT = AI_PROVIDER === 'chatgpt';
const useGemini = AI_PROVIDER === 'gemini';
const providerName = useChatGPT ? 'ChatGPT' : useGemini ? 'Gemini' : 'Ollama';

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
    throw new Error(`No JSON array found in ${providerName} response`);
  }

  return JSON.parse(jsonMatch[0]);
}

async function generateTestCases(ticketDetails) {
  const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
  const model = useGemini ? process.env.GEMINI_MODEL || 'gemini-1.5-mini' : process.env.OLLAMA_MODEL || 'gemma4:e4b';

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

  console.log(`[${providerName}] Starting test case generation`, {
    ticketId: ticketDetails.ticketId,
    model,
    prompt_length: prompt.length,
    timestamp: new Date().toISOString()
  });

  try {
    const startTime = Date.now();
    let response;
    let rawText;

    if (useChatGPT) {
      rawText = await callChatGPT(prompt);
      response = { data: { response: rawText } };
    } else if (useGemini) {
      rawText = await callGemini(prompt);
      response = { data: { response: rawText } };
    } else {
      response = await axios.post(
        apiUrl,
        {
          model,
          prompt,
          temperature: 0.2,
          stream: false,
          num_predict: 300
        },
        {
          timeout: 180000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      rawText = response.data?.response;
    }

    const elapsedTime = Date.now() - startTime;
    console.log(`[${providerName}] Request completed successfully`, {
      ticketId: ticketDetails.ticketId,
      elapsed_ms: elapsedTime,
      response_length: rawText?.length,
      model,
      timestamp: new Date().toISOString()
    });

    if (!rawText) {
      throw new Error(`Empty response from ${providerName}`);
    }

    return parseJsonArray(rawText);

  } catch (error) {
    console.error(`[${providerName}] Request failed`, {
      ticketId: ticketDetails.ticketId,
      timestamp: new Date().toISOString(),
      code: error.code,
      message: error.message,
      status: error.status,
      prompt_length: prompt.length,
      timeout_config: '180s'
    });

    if (!useChatGPT && !useGemini && (error.code === 'ECONNREFUSED' || error.code === 'EHOSTUNREACH')) {
      console.error('[CRITICAL] Ollama service unreachable at', apiUrl);
      throw createError(503, 'Ollama service is unavailable. Ensure it is running on port 11434.');
    }

    if (!useChatGPT && !useGemini && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
      console.error('[TIMEOUT] Request exceeded 180 seconds - system may be overloaded');
      throw createError(504, 'Ollama request timed out (180s limit). Try: 1) Reduce prompt size, 2) Check system resources, 3) Restart Ollama service.');
    }

    if (error.message && error.message.includes('timeout')) {
      console.error('[TIMEOUT] Network timeout detected');
      throw createError(504, 'Request timeout. System may be overloaded or not responding.');
    }

    throw createError(500, `${providerName} error: ${error.message}`);
  }
}

module.exports = {
  generateTestCases
};
