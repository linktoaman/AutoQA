// ============================================
// QAgent Frontend Application
// ============================================
// This is the main frontend JavaScript file.
// It handles all user interactions and communicates with the backend.

// ============================================
// Global State
// ============================================
const state = {
  currentSessionId: null,
  currentTestResultsId: null,
  currentReportFilename: null,
  uploadedApis: [],
  isTestRunning: false
};

// ============================================
// API Communication Functions
// ============================================

/**
 * Upload a Postman collection to the server
 * @param {File} file - The JSON file to upload
 * @returns {Promise<Object>} Response from server
 */
async function uploadCollection(file) {
  try {
    const formData = new FormData();
    formData.append('collection', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}

/**
 * Run tests for a session
 * @param {String} sessionId - The session ID
 * @returns {Promise<Object>} Response from server
 */
async function runTests(sessionId) {
  try {
    const response = await fetch('/api/test/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId: sessionId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Test execution failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Test execution error:', error);
    throw error;
  }
}

/**
 * Generate HTML report from test results
 * @param {String} testResultsId - The test results ID
 * @returns {Promise<Object>} Response from server
 */
async function generateReport(testResultsId) {
  try {
    const response = await fetch('/api/report/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ testResultsId: testResultsId })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Report generation failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Report generation error:', error);
    throw error;
  }
}

// ============================================
// UI Update Functions
// ============================================

/**
 * Display a status message to the user
 * @param {String} message - The message to display
 * @param {String} type - Type: 'success', 'error', or 'info'
 */
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('uploadStatus');
  const messageEl = document.createElement('div');
  messageEl.className = `status-message status-${type}`;
  messageEl.textContent = message;

  statusDiv.innerHTML = '';
  statusDiv.appendChild(messageEl);

  // Auto-remove after 5 seconds if it's an info message
  if (type === 'info') {
    setTimeout(() => {
      messageEl.remove();
    }, 5000);
  }
}

/**
 * Display list of APIs
 * @param {Array} apis - Array of API objects
 */
function displayApis(apis) {
  const apiListDiv = document.getElementById('apiList');
  apiListDiv.innerHTML = '';

  apis.forEach((api) => {
    const apiItemEl = document.createElement('div');
    apiItemEl.className = 'api-item';
    apiItemEl.innerHTML = `
      <div>
        <div class="api-item-name">${api.name}</div>
        <div style="font-size: 0.85em; color: #666; margin-top: 5px;">${api.url}</div>
      </div>
      <span class="api-item-method method-${api.method}">${api.method}</span>
    `;
    apiListDiv.appendChild(apiItemEl);
  });
}

/**
 * Add a log entry
 * @param {String} message - Log message
 * @param {String} type - Type: 'info', 'success', 'error'
 */
function addLog(message, type = 'info') {
  const logsDiv = document.getElementById('logs');
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${type}`;

  // Add timestamp
  const timestamp = new Date().toLocaleTimeString();
  logEntry.textContent = `[${timestamp}] ${message}`;

  logsDiv.appendChild(logEntry);

  // Auto-scroll to bottom
  logsDiv.scrollTop = logsDiv.scrollHeight;
}

/**
 * Update progress bar
 * @param {Number} percentage - Percentage (0-100)
 */
let progressPollingAbort = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateProgress(percentage) {
  const progressFill = document.getElementById('progressFill');
  const progressPercentage = document.getElementById('progressPercentage');
  const rounded = Math.max(0, Math.min(100, Math.round(percentage)));
  progressFill.style.width = `${rounded}%`;
  if (progressPercentage) {
    progressPercentage.textContent = `${rounded}%`;
  }
}

/**
 * Update progress text
 * @param {String} text - Progress text
 */
function updateProgressText(text) {
  const progressText = document.getElementById('progressText');
  progressText.textContent = text;
}

async function pollProgress(sessionId, stopStages = ['completed']) {
  progressPollingAbort = false;
  let progress = null;

  while (!progressPollingAbort) {
    try {
      const response = await fetch(`/api/test/progress/${sessionId}`);
      if (!response.ok) {
        throw new Error('Unable to fetch progress');
      }

      const data = await response.json();
      progress = data.progress;

      if (progress) {
        updateProgress(progress.percentage);
        updateProgressText(`${progress.message} (${Math.round(progress.percentage)}%)`);
      }

      if (
        stopStages.includes(progress.stage) ||
        progress.percentage >= 100 ||
        progress.stage === 'error'
      ) {
        break;
      }
    } catch (error) {
      console.error('Progress polling error:', error);
      updateProgressText('Waiting for backend progress...');
    }

    await sleep(1200);
  }

  return progress;
}

function stopProgressPolling() {
  progressPollingAbort = true;
}

/**
 * Display test results
 * @param {Object} summary - Results summary
 */
function displayResults(summary) {
  document.getElementById('totalTests').textContent = summary.totalTests;
  document.getElementById('passedTests').textContent = summary.passedTests;
  document.getElementById('failedTests').textContent = summary.failedTests;

  const passRate = summary.totalTests > 0
    ? Math.round((summary.passedTests / summary.totalTests) * 100)
    : 0;
  document.getElementById('passRate').textContent = `${passRate}%`;
}

// ============================================
// Section Navigation
// ============================================

/**
 * Show a specific section and hide others
 * @param {String} sectionId - The section ID to show
 */
function showSection(sectionId) {
  const sections = document.querySelectorAll('.step');
  sections.forEach((section) => {
    section.style.display = 'none';
  });

  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = 'block';
  }
}

// ============================================
// Event Handlers
// ============================================

/**
 * Handle file selection
 */
function handleFileSelect(file) {
  if (!file) return;

  // Validate file type
  if (!file.name.endsWith('.json')) {
    showStatus('Please upload a JSON file', 'error');
    return;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showStatus('File is too large (max 10MB)', 'error');
    return;
  }

  // Reset UI
  document.getElementById('apiList').innerHTML = '';
  document.getElementById('uploadStatus').innerHTML = '';

  // Show loading message
  updateProgressText('Uploading and parsing collection...');
  updateProgress(30);

  // Upload file
  uploadCollection(file)
    .then((response) => {
      if (response.status === 'success') {
        state.currentSessionId = response.sessionId;
        state.uploadedApis = response.apis;

        showStatus(`✓ Successfully parsed ${response.totalApis} APIs!`, 'success');
        displayApis(response.apis);

        // Enable run button
        document.getElementById('runTestsBtn').disabled = false;

        updateProgress(100);
      } else {
        throw new Error(response.message);
      }
    })
    .catch((error) => {
      showStatus(`✗ Error: ${error.message}`, 'error');
      updateProgress(0);
      document.getElementById('runTestsBtn').disabled = true;
    });
}

/**
 * Handle test execution
 */
async function handleRunTests() {
  if (!state.currentSessionId) {
    showStatus('Please upload a collection first', 'error');
    return;
  }

  // Update UI
  state.isTestRunning = true;
  document.getElementById('runTestsBtn').disabled = true;
  showSection('testingSection');

  // Clear logs
  document.getElementById('logs').innerHTML = '';
  addLog('Initializing test execution...', 'info');

  updateProgressText(`Starting tests for ${state.uploadedApis.length} APIs...`);
  addLog(`Found ${state.uploadedApis.length} APIs in collection`, 'info');

  let progressPromise;
  try {
    progressPromise = pollProgress(state.currentSessionId, ['tests_complete', 'completed', 'error']);

    // Run tests
    addLog('Generating test cases with AI...', 'info');
    const response = await runTests(state.currentSessionId);

    const finalProgress = await progressPromise;
    stopProgressPolling();

    if (finalProgress) {
      updateProgress(finalProgress.percentage);
      updateProgressText(`${finalProgress.message} (${Math.round(finalProgress.percentage)}%)`);
    }

    if (response.status === 'success') {
      state.currentTestResultsId = response.testResultsId;

      // Display results
      addLog('✓ Test execution completed!', 'success');
      addLog(`Total tests run: ${response.summary.totalTests}`, 'info');
      addLog(`Passed: ${response.summary.passedTests}`, 'success');
      addLog(`Failed: ${response.summary.failedTests}`, 'error');
      addLog(`Pass rate: ${response.summary.passRate}%`, 'info');

      // Show results section
      setTimeout(() => {
        displayResults(response.summary);
        showSection('resultsSection');
        state.isTestRunning = false;
      }, 1000);
    } else {
      throw new Error(response.message);
    }
  } catch (error) {
    stopProgressPolling();
    addLog(`✗ Error: ${error.message}`, 'error');
    console.error('Test execution error:', error);

    // Show error and allow retry
    setTimeout(() => {
      showSection('uploadSection');
      state.isTestRunning = false;
      document.getElementById('runTestsBtn').disabled = false;
    }, 2000);
  }
}

/**
 * Handle viewing report
 */
async function handleViewReport() {
  if (!state.currentTestResultsId) {
    showStatus('No test results available', 'error');
    return;
  }

  try {
    addLog('Generating detailed HTML report...', 'info');
    updateProgressText('Generating HTML report...');
    console.log('[View Report] Starting report generation', { testResultsId: state.currentTestResultsId });

    const progressPromise = pollProgress(state.currentSessionId, ['completed', 'error']);

    // Generate report
    const response = await generateReport(state.currentTestResultsId);
    const finalProgress = await progressPromise;
    stopProgressPolling();

    console.log('[View Report] Generation response:', response);

    if (finalProgress) {
      updateProgress(finalProgress.percentage);
      updateProgressText(`${finalProgress.message} (${Math.round(finalProgress.percentage)}%)`);
    }

    if (response.status === 'success') {
      state.currentReportFilename = response.reportFilename;
      addLog('✓ Report generated successfully!', 'success');

      // Display report in modal
      const reportWindow = document.getElementById('reportWindow');
      const reportFrame = document.getElementById('reportFrame');
      const reportUrl = `/api/report/view/${response.reportFilename}`;
      console.log('[View Report] Loading report', { url: reportUrl, filename: response.reportFilename });
      
      // Add error handling for iframe
      reportFrame.onerror = () => {
        console.error('[View Report] iframe failed to load:', { url: reportUrl });
        addLog('✗ Failed to load report. Please try again.', 'error');
      };
      
      reportFrame.onload = () => {
        console.log('[View Report] iframe loaded successfully');
      };
      
      reportFrame.src = reportUrl;
      reportWindow.style.display = 'flex';
      
      addLog('✓ Report window opened. Report is loading...', 'success');
    } else {
      throw new Error(response.message || 'Failed to generate report');
    }
  } catch (error) {
    stopProgressPolling();
    console.error('[View Report] Error:', error);
    addLog(`✗ Report generation error: ${error.message}`, 'error');
  }
}

/**
 * Handle starting new test
 */
function handleNewTest() {
  // Reset state
  state.currentTestResultsId = null;
  state.currentReportFilename = null;

  // Reset UI
  document.getElementById('uploadStatus').innerHTML = '';
  document.getElementById('apiList').innerHTML = '';
  document.getElementById('logs').innerHTML = '';

  // Show upload section
  showSection('uploadSection');

  // Clear file input
  document.getElementById('fileInput').value = '';

  // Disable run button
  document.getElementById('runTestsBtn').disabled = true;

  addLog('Ready to upload a new collection', 'info');
}

/**
 * Handle closing report modal
 */
function handleCloseReport() {
  const reportWindow = document.getElementById('reportWindow');
  reportWindow.style.display = 'none';
}

// ============================================
// Event Listeners
// ============================================

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // File upload handling
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const chooseFileBtn = document.getElementById('chooseFileBtn');

  // Click to select file
  chooseFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change
  fileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files[0]);
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    handleFileSelect(e.dataTransfer.files[0]);
  });

  // Run tests button
  const runTestsBtn = document.getElementById('runTestsBtn');
  runTestsBtn.addEventListener('click', handleRunTests);

  // View report button
  const viewReportBtn = document.getElementById('viewReportBtn');
  viewReportBtn.addEventListener('click', handleViewReport);

  // New test button
  const newTestBtn = document.getElementById('newTestBtn');
  newTestBtn.addEventListener('click', handleNewTest);

  // Close report button
  const closeReportBtn = document.getElementById('closeReportBtn');
  closeReportBtn.addEventListener('click', handleCloseReport);

  // Close report when clicking outside modal
  const reportWindow = document.getElementById('reportWindow');
  reportWindow.addEventListener('click', (e) => {
    if (e.target === reportWindow) {
      handleCloseReport();
    }
  });

  // Initial log
  addLog('QAgent ready! Upload a Postman collection to begin.', 'info');
});

// ============================================
// Export for testing
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    state,
    uploadCollection,
    runTests,
    generateReport,
    handleFileSelect,
    handleRunTests,
    handleViewReport,
    handleNewTest
  };
}
