const ticketForm = document.getElementById('ticket-form');
const ticketInput = document.getElementById('ticketId');
const statusEl = document.getElementById('status');
const resultsSection = document.getElementById('results');
const outputEl = document.getElementById('output');
const downloadBtn = document.getElementById('downloadBtn');

let currentText = '';

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function formatTestCasesAsText(testCases) {
  if (!Array.isArray(testCases)) {
    return String(testCases);
  }

  return testCases
    .map((testCase, index) => {
      const lines = [];
      const title = testCase.title || `Test Case ${index + 1}`;
      const testCaseId = testCase.testCaseId ? ` (${testCase.testCaseId})` : '';
      const type = testCase.type ? `Type: ${testCase.type}` : null;

      lines.push(`Test Case ${index + 1}${testCaseId}`);
      lines.push(`Title: ${title}`);
      if (type) lines.push(type);
      lines.push('');

      if (testCase.preconditions) {
        lines.push('Preconditions:');
        lines.push(testCase.preconditions.trim());
        lines.push('');
      }

      if (Array.isArray(testCase.steps) && testCase.steps.length > 0) {
        lines.push('Steps:');
        testCase.steps.forEach((step, stepIndex) => {
          lines.push(`${stepIndex + 1}. ${step}`);
        });
        lines.push('');
      } else if (testCase.steps) {
        lines.push('Steps:');
        lines.push(String(testCase.steps).trim());
        lines.push('');
      }

      if (testCase.expectedResult) {
        lines.push('Expected Result:');
        lines.push(testCase.expectedResult.trim());
        lines.push('');
      }

      return lines.join('\n');
    })
    .join('\n' + '-'.repeat(56) + '\n');
}

function enableDownload(text) {
  currentText = text;
  downloadBtn.disabled = !text;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

ticketForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const ticketId = ticketInput.value.trim();
  if (!ticketId) {
    setStatus('Please enter a JIRA ticket ID.', true);
    return;
  }

  setStatus('Generating test cases…', false);
  resultsSection.classList.add('hidden');
  outputEl.textContent = '';
  enableDownload('');

  try {
    const response = await fetch(`/api/generate-testcases?ticketId=${encodeURIComponent(ticketId)}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || response.statusText || 'Unable to generate test cases');
    }

    const formatted = formatTestCasesAsText(payload.testCases);
    outputEl.textContent = formatted || 'No test cases returned.';
    resultsSection.classList.remove('hidden');
    enableDownload(formatted);
    setStatus('Test cases generated successfully.', false);
  } catch (error) {
    setStatus(`Error: ${error.message}`, true);
    console.error(error);
  }
});

downloadBtn.addEventListener('click', () => {
  if (!currentText) {
    return;
  }
  downloadText('jira-testcases.txt', currentText);
});
