require('dotenv').config();
const { generateTestCasesForTicket } = require('./controllers/testCaseController');

const ticketId = process.argv[2];

if (!ticketId) {
  console.error('Usage: node index.js <JIRA_TICKET_ID>');
  process.exit(1);
}

(async () => {
  try {
    const result = await generateTestCasesForTicket(ticketId);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error generating test cases:', error.message || error);
    process.exit(1);
  }
})();
