// ============================================
// AI Service - Test Case Generation
// ============================================
// This service communicates with the configured AI provider to generate test cases.
// Supported providers: Ollama (default), ChatGPT via OpenAI, or Gemini.

const axios = require('axios');
const { callChatGPT } = require('./chatgptService');
const { callGemini } = require('./geminiService');

// Get AI provider configuration from environment
const AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';
const useChatGPT = AI_PROVIDER === 'chatgpt';
const useGemini = AI_PROVIDER === 'gemini';

/**
 * Generate test cases for a single API endpoint using Ollama
 * @param {Object} api - API endpoint details
 * @returns {Promise<Array>} Array of generated test cases
 */
async function generateTestCases(api) {
  try {
    console.log(`Generating test cases for: ${api.method} ${api.name}`);

    // Create a prompt for Ollama asking to generate test cases
    const prompt = createTestGenerationPrompt(api);

    // Call AI provider to generate test cases
    const testCases = await callAI(prompt);

    // Parse the response into structured test cases
    const parsedTests = parseTestCases(testCases, api);

    console.log(`✓ Generated ${parsedTests.length} test cases for ${api.name}`);
    return parsedTests;
  } catch (error) {
    console.error(`Error generating test cases for ${api.name}:`, error.message);
    // Return fallback test cases if Ollama fails
    return generateDefaultTestCases(api);
  }
}

/**
 * Create a prompt for Ollama to generate test cases
 * @param {Object} api - API endpoint details
 * @returns {String} Prompt text for Ollama
 */
function createTestGenerationPrompt(api) {
  return `Generate 5 simple test cases for this API endpoint:

Name: ${api.name}
Method: ${api.method}
URL: ${api.url}
Description: ${api.description}

Generate test cases in a simple format. Each test case should have:
- Type: (e.g., "Positive Test", "Negative Test", "Invalid Payload", "Missing Auth", "Status Code Validation")
- Description: Brief description of what this test does
- Expected Result: What should happen

Keep responses short and practical. Return exactly 5 test cases.`;
}

/**
 * Call Ollama API to generate content
 * @param {String} prompt - The prompt to send to Ollama
 * @returns {Promise<String>} Generated response from Ollama
 */
async function callOllama(prompt) {
  try {
    console.log(`Calling Ollama at ${OLLAMA_API_URL}...`);

    const response = await axios.post(OLLAMA_API_URL, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      temperature: 0.7
    }, {
      timeout: 120000 // 120 second timeout
    });

    if (!response.data || !response.data.response) {
      throw new Error('Invalid response from Ollama');
    }

    return response.data.response;
  } catch (error) {
    console.error('Ollama API error:', error.message);
    throw new Error(`Failed to generate test cases with Ollama: ${error.message}`);
  }
}

async function callAI(prompt) {
  if (useChatGPT) {
    return callChatGPT(prompt);
  }
  if (useGemini) {
    return callGemini(prompt);
  }
  return callOllama(prompt);
}

/**
 * Parse Ollama response into structured test cases
 * @param {String} response - Raw response from Ollama
 * @param {Object} api - API details for reference
 * @returns {Array} Parsed test cases
 */
function parseTestCases(response, api) {
  try {
    const testCases = [];

    // Split response into individual test cases
    const lines = response.split('\n').filter((line) => line.trim().length > 0);

    let currentTest = null;

    lines.forEach((line) => {
      line = line.trim();

      // Look for test type indicators
      if (
        line.includes('Test Case') ||
        line.includes('Positive Test') ||
        line.includes('Negative Test') ||
        line.includes('Invalid Payload') ||
        line.includes('Missing Auth') ||
        line.includes('Status Code')
      ) {
        // Save previous test if exists
        if (currentTest) {
          testCases.push(currentTest);
        }

        // Start new test
        currentTest = {
          id: `test-${Date.now()}-${Math.random()}`,
          api_id: api.id,
          type: extractTestType(line),
          description: line,
          expected_result: '',
          status: 'pending',
          actual_result: '',
          response_time: 0,
          passed: null
        };
      } else if (currentTest && line.includes('Expected') && !currentTest.expected_result) {
        currentTest.expected_result = line;
      }
    });

    // Add the last test
    if (currentTest) {
      testCases.push(currentTest);
    }

    // Return at most 5 test cases
    return testCases.slice(0, 5);
  } catch (error) {
    console.error('Error parsing test cases:', error.message);
    return generateDefaultTestCases(api).slice(0, 5);
  }
}

/**
 * Extract test type from a line of text
 * @param {String} line - Text line
 * @returns {String} Test type
 */
function extractTestType(line) {
  if (line.includes('Positive')) return 'Positive Test';
  if (line.includes('Negative')) return 'Negative Test';
  if (line.includes('Invalid') || line.includes('Payload')) return 'Invalid Payload';
  if (line.includes('Auth') || line.includes('Authorization')) return 'Auth Failure';
  if (line.includes('Status')) return 'Status Code Validation';
  return 'General Test';
}

/**
 * Generate default test cases if Ollama is not available
 * @param {Object} api - API endpoint details
 * @returns {Array} Default test cases
 */
function generateDefaultTestCases(api) {
  const defaultTests = [
    {
      id: `test-${Date.now()}-1`,
      api_id: api.id,
      type: 'Positive Test',
      description: 'Test successful API call with valid parameters',
      expected_result: 'Should return 200 OK with valid response',
      status: 'pending',
      actual_result: '',
      response_time: 0,
      passed: null
    },
    {
      id: `test-${Date.now()}-2`,
      api_id: api.id,
      type: 'Negative Test',
      description: 'Test API call with invalid parameters',
      expected_result: 'Should return 400 Bad Request or similar error',
      status: 'pending',
      actual_result: '',
      response_time: 0,
      passed: null
    },
    {
      id: `test-${Date.now()}-3`,
      api_id: api.id,
      type: 'Invalid Payload',
      description: 'Test API with malformed request body',
      expected_result: 'Should return 400 or 422 error',
      status: 'pending',
      actual_result: '',
      response_time: 0,
      passed: null
    },
    {
      id: `test-${Date.now()}-4`,
      api_id: api.id,
      type: 'Auth Failure',
      description: 'Test API without proper authentication',
      expected_result: 'Should return 401 Unauthorized',
      status: 'pending',
      actual_result: '',
      response_time: 0,
      passed: null
    },
    {
      id: `test-${Date.now()}-5`,
      api_id: api.id,
      type: 'Status Code Validation',
      description: 'Verify correct status codes are returned',
      expected_result: 'Status codes should match API specification',
      status: 'pending',
      actual_result: '',
      response_time: 0,
      passed: null
    }
  ];

  return defaultTests;
}

// Export functions
module.exports = {
  generateTestCases,
  createTestGenerationPrompt,
  callAI,
  callOllama,
  parseTestCases,
  generateDefaultTestCases
};
