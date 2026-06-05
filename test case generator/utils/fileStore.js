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
  const outputFolder = process.env.OUTPUT_FOLDER || 'output';
  const folderPath = path.resolve(outputFolder);
  const filePath = path.join(folderPath, `${ticketId.replace(/[^A-Za-z0-9_-]/g, '_')}-testcases.txt`);
  const fileContents = formatTestCasesAsText(testCases);

  await fs.promises.mkdir(folderPath, { recursive: true });
  await fs.promises.writeFile(filePath, fileContents, 'utf8');

  return filePath;
}

module.exports = {
  saveTestCasesToFile
};
