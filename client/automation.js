const state = {
  automationSessionId: null,
  automationResultsId: null,
  selectedFile: null,
  fileContent: null,
  isExecuting: false,
  summary: {
    scripts: 0,
    steps: 0,
    passed: 0,
    failed: 0
  }
};

const elements = {
  manualTestCases: document.getElementById('manualTestCases'),
  uploadArea: document.getElementById('uploadArea'),
  fileInput: document.getElementById('fileInput'),
  chooseFileBtn: document.getElementById('chooseFileBtn'),
  selectedFileInfo: document.getElementById('selectedFileInfo'),
  runAutomationBtn: document.getElementById('runAutomationBtn'),
  generateReportBtn: document.getElementById('generateReportBtn'),
  scriptPreview: document.getElementById('scriptPreview'),
  executionLogs: document.getElementById('executionLogs'),
  screenshotGallery: document.getElementById('screenshotGallery'),
  scriptCount: document.getElementById('scriptCount'),
  stepCount: document.getElementById('stepCount'),
  passedCount: document.getElementById('passedCount'),
  failedCount: document.getElementById('failedCount'),
  workflowStatus: document.getElementById('workflowStatus'),
  actionMessage: document.getElementById('actionMessage')
};

function setStatus(message, type = 'ready') {
  elements.workflowStatus.textContent = message;
  const colorMap = {
    ready: 'rgba(59, 130, 246, 0.12)',
    running: 'rgba(16, 185, 129, 0.12)',
    error: 'rgba(239, 68, 68, 0.12)',
    success: 'rgba(34, 197, 94, 0.12)'
  };
  elements.workflowStatus.style.background = colorMap[type] || colorMap.ready;
  elements.actionMessage.textContent = message;
}

function addLog(message, level = 'info') {
  const logLine = document.createElement('div');
  logLine.className = 'log-line';
  logLine.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
  elements.executionLogs.prepend(logLine);
}

function updateSummary(summary) {
  state.summary = summary;
  elements.scriptCount.textContent = summary.scripts || 1;
  elements.stepCount.textContent = summary.steps || 0;
  elements.passedCount.textContent = summary.passed || 0;
  elements.failedCount.textContent = summary.failed || 0;
}

function updateScriptPreview(script) {
  elements.scriptPreview.textContent = script || 'Your generated Selenium script will appear here after conversion.';
}

function updateScreenshotGallery(screenshots = []) {
  elements.screenshotGallery.innerHTML = '';
  if (!screenshots.length) {
    elements.screenshotGallery.innerHTML = '<div class="upload-note">Screenshots will appear here after automation execution.</div>';
    return;
  }

  screenshots.forEach((screenshot) => {
    const tile = document.createElement('div');
    tile.className = 'screenshot-tile';

    const img = document.createElement('img');
    img.src = screenshot.imageData || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjkwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxNjAiIGhlaWdodD0iOTAiIGZpbGw9IiNkZWVmZmYiLz48dGV4dCB4PSI4MCIgeT0iNTAiIGZvbnQtc2l6ZT0iMTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM0NzU1NjkiPkNhcHR1cmU8L3RleHQ+PC9zdmc+';
    img.alt = screenshot.caption || 'Automation screenshot';
    img.addEventListener('click', () => openScreenshotModal(screenshot));

    const meta = document.createElement('div');
    meta.className = 'screenshot-meta';
    meta.innerHTML = `<strong>${screenshot.caption || screenshot.filename}</strong><div class="screen-caption">${screenshot.details || 'Result screenshot from the automation run.'}</div>`;

    tile.appendChild(img);
    tile.appendChild(meta);
    elements.screenshotGallery.appendChild(tile);
  });
}

function openScreenshotModal(screenshot) {
  const modal = document.getElementById('screenshotModal');
  const modalImage = document.getElementById('modalImage');
  const modalTitle = document.getElementById('modalTitle');

  modalTitle.textContent = screenshot.caption || screenshot.filename || 'Screenshot Preview';
  modalImage.src = screenshot.imageData || '';
  modalImage.alt = screenshot.caption || screenshot.filename || 'Screenshot Preview';
  modal.classList.add('active');
}

function closeScreenshotModal() {
  const modal = document.getElementById('screenshotModal');
  const modalImage = document.getElementById('modalImage');
  modal.classList.remove('active');
  modalImage.src = '';
}

function resetState() {
  state.automationSessionId = null;
  state.automationResultsId = null;
  state.selectedFile = null;
  state.fileContent = null;
  state.isExecuting = false;
  updateSummary({ scripts: 0, steps: 0, passed: 0, failed: 0 });
  updateScriptPreview('Your generated Selenium script will appear here after conversion.');
  elements.selectedFileInfo.textContent = 'No file selected';
  updateScreenshotGallery([]);
  elements.executionLogs.innerHTML = '';
  elements.generateReportBtn.disabled = true;
  setStatus('Ready', 'ready');
}

function highlightUploadArea(active) {
  if (active) {
    elements.uploadArea.classList.add('drag-over');
  } else {
    elements.uploadArea.classList.remove('drag-over');
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function handleFileSelection(file) {
  if (!file) return;
  state.selectedFile = file;
  elements.selectedFileInfo.textContent = `${file.name} • ${Math.round(file.size / 1024)} KB`;
  addLog(`Selected file: ${file.name}`);
  try {
    state.fileContent = await readFileAsDataURL(file);
    addLog('File content loaded successfully.');
  } catch (error) {
    addLog('Unable to read file content.', 'error');
    console.error(error);
  }
}

async function prepareAutomation() {
  const manualText = elements.manualTestCases.value.trim();
  if (!manualText && !state.selectedFile) {
    throw new Error('Please paste manual test cases or upload a file before running automation.');
  }

  const requestBody = {
    manualTestCases: manualText,
    fileName: state.selectedFile?.name || null,
    fileType: state.selectedFile?.type || null,
    fileContent: state.fileContent || null
  };

  setStatus('Generating automation script...', 'running');
  addLog('Preparing automation payload.');

  const response = await fetch('/api/automation/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to prepare automation script.');
  }

  const data = await response.json();
  state.automationSessionId = data.sessionId;
  updateScriptPreview(data.generatedScript);
  updateSummary({ scripts: 1, steps: 0, passed: 0, failed: 0 });
  addLog('Automation script generated successfully.');
  return data.sessionId;
}

async function runAutomation(sessionId) {
  setStatus('Executing automation script...', 'running');
  addLog('Sending script to Selenium MCP server for execution.');

  const response = await fetch('/api/automation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Failed to execute automation.');
  }

  const data = await response.json();
  state.automationResultsId = data.resultsId;
  updateSummary({ scripts: 1, steps: data.summary.totalSteps, passed: data.summary.passedSteps, failed: data.summary.failedSteps });
  updateScreenshotGallery(data.screenshots || []);
  data.logs?.forEach((entry) => addLog(entry));
  elements.generateReportBtn.disabled = false;
  setStatus('Execution complete', 'success');
  addLog('Automation run completed successfully.');
}

async function handleGenerateAndRun() {
  if (state.isExecuting) return;
  state.isExecuting = true;
  elements.runAutomationBtn.disabled = true;
  elements.generateReportBtn.disabled = true;
  try {
    const sessionId = await prepareAutomation();
    await runAutomation(sessionId);
  } catch (error) {
    addLog(error.message, 'error');
    setStatus('Execution failed', 'error');
    console.error(error);
  } finally {
    state.isExecuting = false;
    elements.runAutomationBtn.disabled = false;
  }
}

async function handleGenerateReport() {
  if (!state.automationResultsId) {
    addLog('No automation results available to report.', 'error');
    return;
  }

  elements.generateReportBtn.disabled = true;
  setStatus('Generating HTML report...', 'running');
  addLog('Creating automation report.');

  const response = await fetch('/api/automation/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resultsId: state.automationResultsId })
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    addLog(errorBody.message || 'Failed to generate report.', 'error');
    setStatus('Report generation failed', 'error');
    elements.generateReportBtn.disabled = false;
    return;
  }

  const data = await response.json();
  addLog('Report generated successfully. Opening report preview.');
  setStatus('Report ready', 'success');
  window.open(`/api/report/view/${data.reportFilename}`, '_blank');
  elements.generateReportBtn.disabled = false;
}

function attachEventListeners() {
  elements.chooseFileBtn.addEventListener('click', () => elements.fileInput.click());

  elements.fileInput.addEventListener('change', async (event) => {
    if (event.target.files.length) {
      await handleFileSelection(event.target.files[0]);
    }
  });

  elements.uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    highlightUploadArea(true);
  });

  const closeModalBtn = document.getElementById('closeModalBtn');
  const screenshotModal = document.getElementById('screenshotModal');

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeScreenshotModal);
  }

  if (screenshotModal) {
    screenshotModal.addEventListener('click', (event) => {
      if (event.target === screenshotModal) {
        closeScreenshotModal();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && screenshotModal.classList.contains('active')) {
        closeScreenshotModal();
      }
    });
  }

  elements.uploadArea.addEventListener('dragleave', () => {
    highlightUploadArea(false);
  });

  elements.uploadArea.addEventListener('drop', async (event) => {
    event.preventDefault();
    highlightUploadArea(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      await handleFileSelection(file);
    }
  });

  elements.runAutomationBtn.addEventListener('click', handleGenerateAndRun);
  elements.generateReportBtn.addEventListener('click', handleGenerateReport);
}

window.addEventListener('DOMContentLoaded', () => {
  attachEventListeners();
  resetState();
});
