// ============================================
// API Executor Service
// ============================================
// This service executes the actual API calls and collects results.

const axios = require('axios');
const https = require('https');

const allowInsecureTls = process.env.NODE_ENV !== 'production' || process.env.ALLOW_INSECURE_TLS === 'true';

function extractExpectedStatusCodes(expectedResult) {
  if (!expectedResult || typeof expectedResult !== 'string') return [];
  return Array.from(
    new Set(
      (expectedResult.match(/\b[1-5]\d{2}\b/g) || []).map(Number)
    )
  );
}

function createHttpsAgent() {
  if (!allowInsecureTls) return undefined;
  return new https.Agent({ rejectUnauthorized: false });
}

function parseFormUrlEncoded(body) {
  if (body === undefined || body === null) return '';
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_err) {
      return body;
    }
  }

  if (typeof body === 'object') {
    const params = new URLSearchParams();
    Object.entries(body).forEach(([key, value]) => {
      params.append(key, value === undefined || value === null ? '' : String(value));
    });
    return params.toString();
  }

  return String(body);
}

function isExpectedStatus(actualStatus, expectedResult, testCaseType) {
  const expectedCodes = extractExpectedStatusCodes(expectedResult);
  if (expectedCodes.length) {
    return expectedCodes.includes(actualStatus);
  }

  const normalizedType = String(testCaseType || '').toLowerCase();

  if (normalizedType.includes('positive')) {
    return actualStatus >= 200 && actualStatus < 300;
  }

  if (
    normalizedType.includes('negative') ||
    normalizedType.includes('invalid') ||
    normalizedType.includes('auth')
  ) {
    return actualStatus >= 400 && actualStatus < 600;
  }

  if (normalizedType.includes('status')) {
    return actualStatus >= 200 && actualStatus < 600;
  }

  return actualStatus >= 200 && actualStatus < 300;
}

/**
 * Execute a single test against an API
 * @param {Object} api - API endpoint details
 * @param {Object} testCase - Test case details
 * @returns {Promise<Object>} Test execution result
 */
async function executeTest(api, testCase) {
  try {
    console.log(`Executing test: ${testCase.type} for ${api.name}`);

    // Prepare request based on test type
    const requestConfig = prepareRequest(api, testCase);

    // Debug outgoing request details
    console.log('Outgoing request:', {
      method: requestConfig.method,
      url: requestConfig.url,
      headers: requestConfig.headers,
      body: requestConfig.data
    });

    // Record start time
    const startTime = Date.now();

    // Execute the API call
    const response = await axios(requestConfig);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Determine if test passed based on expected result and status code
    const passed = isExpectedStatus(response.status, testCase.expected_result, testCase.type);

    // Return test result with complete evidence
    return {
      ...testCase,
      status: 'completed',
      request: {
        method: requestConfig.method,
        url: requestConfig.url,
        headers: requestConfig.headers,
        body: requestConfig.data || null
      },
      actual_result: {
        statusCode: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.data
      },
      response_time: responseTime,
      passed: passed,
      error: null
    };
  } catch (error) {
    // Handle error response
    const responseTime = error.config?.metadata?.startTime 
      ? Date.now() - error.config.metadata.startTime 
      : 0;

    const statusCode = error.response?.status || 0;
    const passed = error.response
      ? isExpectedStatus(statusCode, testCase.expected_result, testCase.type)
      : false;

    return {
      ...testCase,
      status: 'completed',
      request: {
        method: error.config?.method || 'UNKNOWN',
        url: error.config?.url || 'UNKNOWN',
        headers: error.config?.headers || {},
        body: error.config?.data || null
      },
      actual_result: {
        statusCode: statusCode,
        statusText: error.response?.statusText || 'Unknown Error',
        headers: error.response?.headers || {},
        error: error.message,
        body: error.response?.data || null
      },
      response_time: responseTime,
      passed: passed,
      error: error.message
    };
  }
}

/**
 * Prepare axios request configuration based on test type
 * @param {Object} api - API endpoint details
 * @param {Object} testCase - Test case details
 * @returns {Object} Axios request config
 */
function prepareRequest(api, testCase) {
  // Normalize headers into lowercase keys so content-type detection is reliable
  const headers = {};
  Object.entries(api.headers || {}).forEach(([key, value]) => {
    headers[key.toLowerCase()] = value;
  });

  // Base configuration
  let config = {
    method: api.method,
    url: api.url,
    headers: headers,
    timeout: 30000, // 30 second timeout
    validateStatus: () => true, // Don't throw on any status
    httpsAgent: createHttpsAgent()
  };

  function setRequestBody(body) {
    const contentType = (config.headers['content-type'] || '').toLowerCase();

    if (contentType.includes('application/x-www-form-urlencoded')) {
      config.data = parseFormUrlEncoded(body);
      config.headers['content-type'] = 'application/x-www-form-urlencoded';
    } else if (contentType.includes('application/json')) {
      if (typeof body === 'string') {
        try {
          config.data = JSON.parse(body);
        } catch (_err) {
          config.data = body;
        }
      } else {
        config.data = body;
      }
      config.headers['content-type'] = 'application/json';
    } else {
      if (typeof body === 'string') {
        try {
          config.data = JSON.parse(body);
          config.headers['content-type'] = config.headers['content-type'] || 'application/json';
        } catch (_err) {
          config.data = body;
        }
      } else if (body !== undefined && body !== null) {
        config.data = body;
        config.headers['content-type'] = config.headers['content-type'] || 'application/json';
      }
    }
  }

  // Modify request based on test type
  switch (testCase.type) {
    case 'Invalid Payload':
      // Send malformed body
      config.data = '{ invalid json }';
      config.headers['content-type'] = 'application/json';
      break;

    case 'Auth Failure':
      // Remove auth headers if present
      delete config.headers['authorization'];
      delete config.headers['cookie'];
      break;

    case 'Positive Test':
      // Use original body if exists
      if (api.body) {
        setRequestBody(api.body);
      }
      break;

    case 'Negative Test':
      // Send request with minimal/empty data if no payload was provided
      if (config.method !== 'GET') {
        if (api.body) {
          setRequestBody(api.body);
        } else {
          config.data = {};
          config.headers['content-type'] = config.headers['content-type'] || 'application/json';
        }
      }
      break;

    default:
      // Use original configuration
      if (api.body) {
        setRequestBody(api.body);
      }
  }

  // Record start time for response time calculation
  config.metadata = {
    startTime: Date.now()
  };

  return config;
}

/**
 * Execute multiple tests
 * @param {Object} api - API endpoint details
 * @param {Array} testCases - Array of test cases
 * @returns {Promise<Array>} Array of test results
 */
async function executeTests(api, testCases) {
  const results = [];

  // Execute tests one by one to avoid overwhelming the server
  for (const testCase of testCases) {
    try {
      const result = await executeTest(api, testCase);
      results.push(result);

      // Add small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error executing test ${testCase.id}:`, error.message);
      results.push({
        ...testCase,
        status: 'error',
        passed: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Perform basic security checks on API response
 * @param {Object} response - API response object
 * @param {Object} api - API endpoint details
 * @returns {Object} Security check results
 */
function performSecurityChecks(response, api) {
  const checks = {
    sqlInjectionVulnerable: false,
    exposedSensitiveData: false,
    missingSecurityHeaders: [],
    warnings: []
  };

  // Check for SQL injection vulnerability indicators
  const responseText = JSON.stringify(response);
  if (
    responseText.includes('SQL') ||
    responseText.includes('syntax error') ||
    responseText.includes('mysql_fetch')
  ) {
    checks.sqlInjectionVulnerable = true;
    checks.warnings.push('Potential SQL injection vulnerability detected');
  }

  // Check for exposed sensitive data
  if (
    responseText.includes('password') ||
    responseText.includes('secret') ||
    responseText.includes('token')
  ) {
    checks.exposedSensitiveData = true;
    checks.warnings.push('Sensitive data may be exposed in response');
  }

  // Check for missing security headers
  const headers = response.headers || {};
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Strict-Transport-Security'
  ];

  requiredHeaders.forEach((header) => {
    if (!headers[header.toLowerCase()]) {
      checks.missingSecurityHeaders.push(header);
    }
  });

  return checks;
}

/**
 * Calculate statistics from test results
 * @param {Array} results - Array of test results
 * @returns {Object} Statistics
 */
function calculateStats(results) {
  const stats = {
    total: results.length,
    passed: 0,
    failed: 0,
    errors: 0,
    avgResponseTime: 0,
    maxResponseTime: 0,
    minResponseTime: Infinity
  };

  results.forEach((result) => {
    if (result.passed === true) {
      stats.passed++;
    } else if (result.passed === false && !result.error) {
      stats.failed++;
    } else if (result.error) {
      stats.errors++;
    }

    if (result.response_time) {
      stats.avgResponseTime += result.response_time;
      stats.maxResponseTime = Math.max(stats.maxResponseTime, result.response_time);
      stats.minResponseTime = Math.min(stats.minResponseTime, result.response_time);
    }
  });

  // Calculate average
  if (results.length > 0) {
    stats.avgResponseTime = Math.round(stats.avgResponseTime / results.length);
  }

  if (stats.minResponseTime === Infinity) {
    stats.minResponseTime = 0;
  }

  stats.passRate = results.length > 0 ? Math.round((stats.passed / results.length) * 100) : 0;

  return stats;
}

// Export functions
module.exports = {
  executeTest,
  executeTests,
  prepareRequest,
  performSecurityChecks,
  calculateStats
};
