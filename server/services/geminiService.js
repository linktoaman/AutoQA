const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_KEY_HEADER = (process.env.GEMINI_API_KEY_HEADER || 'Authorization').trim();
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-mini';
const GEMINI_API_URL = process.env.GEMINI_API_URL || `https://gemini.googleapis.com/v1/models/${GEMINI_MODEL}:generate`;
const GEMINI_TEMPERATURE = parseFloat(process.env.GEMINI_TEMPERATURE || '0.7');
const GEMINI_MAX_OUTPUT_TOKENS = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '1200', 10);

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set. Gemini provider will fail until the key is provided.');
}

function buildGeminiHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (!GEMINI_API_KEY) {
    return headers;
  }

  if (GEMINI_API_KEY_HEADER.toLowerCase() === 'x-api-key') {
    headers['x-api-key'] = GEMINI_API_KEY;
  } else {
    headers.Authorization = `Bearer ${GEMINI_API_KEY}`;
  }

  return headers;
}

function extractTextFromGeminiResponse(response) {
  if (!response) {
    return '';
  }

  if (typeof response === 'string') {
    return response.trim();
  }

  const data = response.data || response;

  if (typeof data === 'string') {
    return data.trim();
  }

  if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (typeof candidate.output === 'string') {
      return candidate.output.trim();
    }
    if (typeof candidate.text === 'string') {
      return candidate.text.trim();
    }
    if (candidate.content && Array.isArray(candidate.content)) {
      return candidate.content
        .map((item) => (typeof item.text === 'string' ? item.text : ''))
        .join('')
        .trim();
    }
  }

  if (typeof data.output_text === 'string') {
    return data.output_text.trim();
  }

  if (typeof data.text === 'string') {
    return data.text.trim();
  }

  if (Array.isArray(data.output)) {
    return data.output
      .map((item) => (typeof item.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }

  return '';
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is required for Gemini provider.');
  }

  console.log(`Calling Gemini model ${GEMINI_MODEL} at ${GEMINI_API_URL}...`);

  try {
    const payload = {
      prompt: {
        text: prompt
      },
      temperature: GEMINI_TEMPERATURE,
      max_output_tokens: GEMINI_MAX_OUTPUT_TOKENS,
      candidate_count: 1
    };

    const response = await axios.post(GEMINI_API_URL, payload, {
      headers: buildGeminiHeaders(),
      timeout: 120000
    });

    const output = extractTextFromGeminiResponse(response);
    if (!output) {
      throw new Error('Empty response from Gemini.');
    }

    return output;
  } catch (error) {
    console.error('Gemini API error:', error.message);
    throw new Error(`Failed to generate text with Gemini: ${error.message}`);
  }
}

module.exports = {
  callGemini
};
