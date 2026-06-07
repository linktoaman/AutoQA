const OpenAI = require('openai');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');
const OPENAI_MAX_OUTPUT_TOKENS = parseInt(process.env.OPENAI_MAX_OUTPUT_TOKENS || '1200', 10);

if (!OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY is not set. ChatGPT provider will fail until the key is provided.');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function extractTextFromResponse(response) {
  if (!response) return '';

  if (typeof response === 'string') {
    return response;
  }

  let text = '';

  if (response.output_text) {
    text += response.output_text;
  }

  if (Array.isArray(response.output)) {
    response.output.forEach((item) => {
      if (Array.isArray(item.content)) {
        item.content.forEach((contentPiece) => {
          if (typeof contentPiece.text === 'string') {
            text += contentPiece.text;
          }
        });
      }
    });
  }

  return text.trim();
}

async function callChatGPT(prompt) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for ChatGPT provider.');
  }

  console.log(`Calling OpenAI ChatGPT model ${OPENAI_MODEL}...`);

  const response = await openai.responses.create({
    model: OPENAI_MODEL,
    input: prompt,
    temperature: OPENAI_TEMPERATURE,
    max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS
  });

  const output = extractTextFromResponse(response);
  if (!output) {
    throw new Error('Empty response from OpenAI.');
  }

  return output;
}

module.exports = {
  callChatGPT
};
