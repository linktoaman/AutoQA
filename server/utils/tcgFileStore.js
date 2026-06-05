const fs = require('fs');
const path = require('path');

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
    .join('\n' + '-'.repeat(60) + '\n');
}

async function saveTestCasesToFile(ticketId, testCases) {
  const outputFolder = process.env.TCG_OUTPUT_FOLDER || path.join(__dirname, '../../tcg-output');
  
  try {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${ticketId}-${timestamp}.txt`;
    const filepath = path.join(outputFolder, filename);

    const text = formatTestCasesAsText(testCases);
    fs.writeFileSync(filepath, text, 'utf8');

    return {
      filename,
      filepath,
      message: 'Test cases saved successfully'
    };
  } catch (error) {
    console.error('Error saving test cases:', error);
    throw new Error(`Failed to save test cases: ${error.message}`);
  }
}

module.exports = {
  formatTestCasesAsText,
  saveTestCasesToFile
};
