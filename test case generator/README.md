# JIRA Test Case Generator

Generate structured test cases from JIRA user stories using a local Ollama LLM.

## Features

- Fetches JIRA story details using the JIRA REST API
- Extracts summary, description, and acceptance criteria
- Sends structured prompt to local Ollama API
- Generates functional, negative, edge, and API test cases
- Returns JSON-formatted test cases
- Includes caching and file persistence
- Supports CLI and HTTP API

## Project Structure

- `app.js` - Express app bootstrap
- `index.js` - CLI entry point
- `routes/testRoutes.js` - API routes
- `controllers/testCaseController.js` - request orchestration
- `services/jiraService.js` - JIRA API integration
- `services/ollamaService.js` - Ollama LLM integration
- `utils/cache.js` - in-memory caching
- `utils/fileStore.js` - save generated test cases

## Setup

1. Copy `.env.example` to `.env`
2. Fill in `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`
3. Optionally set `OLLAMA_MODEL` and `OUTPUT_FOLDER`
4. Install dependencies:

```bash
npm install
```

## Run API Server

```bash
npm start
```

Then call:

```bash
http://localhost:3000/api/generate-testcases?ticketId=PROJ-123
```

Verify JIRA credentials and connectivity:

```bash
http://localhost:3000/api/verify-jira
```

## Run Web UI

Open your browser to:

```bash
http://localhost:3000/
```

Enter the JIRA ticket number and click Generate. Use the Download button to save the test cases as plain text.

## Run CLI

```bash
npm run cli -- PROJ-123
```

## Sample Prompt Sent to Ollama

```text
You are a test case generator. Using the JIRA story summary, description, and acceptance criteria, generate a set of structured JSON test cases.

Requirements:
- Return valid JSON array only.
- Provide functional test cases, negative test cases, edge cases, and API scenarios if applicable.
- Use this shape for each test case:
  {
    "testCaseId": "",
    "title": "",
    "preconditions": "",
    "steps": [],
    "expectedResult": "",
    "type": "functional | negative | edge"
  }

Respond with the final JSON array only, without any markdown fences or explanatory text.

JIRA Ticket: PROJ-123
Summary:
User can create a new account.

Description:
As a user, I want to register for the service using email and password so that I can access personalized features.

Acceptance Criteria:
- User must provide a valid email address.
- Password must be at least 10 characters.
- Confirmation email is sent after registration.
```

## Example Ollama Response

```json
[
  {
    "testCaseId": "TC-001",
    "title": "Create account with valid credentials",
    "preconditions": "User is on the registration page.",
    "steps": [
      "Enter a valid email address.",
      "Enter a password with at least 10 characters.",
      "Submit the registration form."
    ],
    "expectedResult": "Account is created and confirmation email is sent.",
    "type": "functional"
  },
  {
    "testCaseId": "TC-002",
    "title": "Attempt registration with invalid email",
    "preconditions": "User is on the registration page.",
    "steps": [
      "Enter an invalid email address.",
      "Enter a valid password.",
      "Submit the registration form."
    ],
    "expectedResult": "The system displays an error and prevents account creation.",
    "type": "negative"
  }
]
```
