# QAgent Examples and Configuration Guide

This file contains example prompts, configurations, and troubleshooting information.

---

## 🧠 Ollama Integration Examples

### How QAgent Uses Ollama

QAgent sends API details to Ollama and asks it to generate test cases. Here's how it works:

### Example Prompt Sent to Ollama

```
Generate 5 simple test cases for this API endpoint:

Name: Get User Profile
Method: GET
URL: https://api.example.com/users/123
Description: Retrieves user profile information

Generate test cases in a simple format. Each test case should have:
- Type: (e.g., "Positive Test", "Negative Test", "Invalid Payload", "Missing Auth", "Status Code Validation")
- Description: Brief description of what this test does
- Expected Result: What should happen

Keep responses short and practical. Return exactly 5 test cases.
```

### Example Ollama Response

```
Test Case 1
Type: Positive Test
Description: Test successful API call with valid user ID
Expected Result: Should return 200 OK with user profile data

Test Case 2
Type: Negative Test
Description: Test API with invalid user ID format
Expected Result: Should return 400 Bad Request

Test Case 3
Type: Invalid Payload
Description: Test with missing required headers
Expected Result: Should return 400 error

Test Case 4
Type: Auth Failure
Description: Test without authorization token
Expected Result: Should return 401 Unauthorized

Test Case 5
Type: Status Code Validation
Description: Verify proper HTTP status codes
Expected Result: Status codes should match API specification
```

---

## 📋 Example Test Results

### Typical Test Execution Output

```
Executing test: Positive Test for Get User Profile
  → Response time: 245ms
  → Status code: 200
  → Result: PASSED

Executing test: Negative Test for Get User Profile
  → Response time: 123ms
  → Status code: 400
  → Result: PASSED

Executing test: Invalid Payload for Get User Profile
  → Response time: 89ms
  → Status code: 400
  → Result: PASSED

Executing test: Auth Failure for Get User Profile
  → Response time: 95ms
  → Status code: 401
  → Result: PASSED

Executing test: Status Code Validation for Get User Profile
  → Response time: 198ms
  → Status code: 200
  → Result: PASSED
```

---

## ⚙️ Configuration Examples

### Changing Port Number

**File: `.env`**

```env
# Default configuration
PORT=3000

# Change to use port 8080
PORT=8080

# Change to use port 3001
PORT=3001
```

Then restart QAgent: `npm start`

### Using Different Ollama Model

**File: `.env`**

```env
# Default model
OLLAMA_MODEL=gemma4:e4b

# Use different models:
OLLAMA_MODEL=llama2
OLLAMA_MODEL=neural-chat
OLLAMA_MODEL=gemma4:e4b
```

Note: You need to have the model installed in Ollama first.

### Change Report Location

**File: `.env`**

```env
# Default
REPORTS_DIR=./server/reports

# Change to custom location
REPORTS_DIR=C:\Reports\QAgent
```

### Change Upload Folder

**File: `.env`**

```env
# Default
UPLOADS_DIR=./server/uploads

# Change to custom location
UPLOADS_DIR=C:\Uploads\Collections
```

---

## 📊 Example HTML Report Structure

### What the Report Contains

```
QAgent Test Report
├── Header
│   ├── Title: "QAgent Test Report"
│   └── Subtitle: "Automated API Testing Results"
│
├── Statistics
│   ├── Total Tests: 45
│   ├── Passed: 42
│   ├── Failed: 3
│   └── Pass Rate: 93%
│
├── Test Results by API
│   ├── API 1: Get Users
│   │   ├── Method: GET
│   │   ├── URL: /users
│   │   └── Tests: 5 passed, 0 failed
│   │
│   ├── API 2: Create User
│   │   ├── Method: POST
│   │   ├── URL: /users
│   │   └── Tests: 5 passed, 0 failed
│   │
│   └── API 3: Delete User
│       ├── Method: DELETE
│       ├── URL: /users/{id}
│       └── Tests: 3 passed, 1 failed
│
└── Footer
    ├── Generated Date/Time
    └── QAgent Version Info
```

---

## 🔍 API Response Format

### Successful Upload Response

```json
{
  "status": "success",
  "message": "Collection uploaded and parsed successfully",
  "sessionId": "session-1704067200000",
  "totalApis": 5,
  "apis": [
    {
      "id": "api-1704067200000-0.123456",
      "name": "Get Users",
      "method": "GET",
      "url": "https://api.example.com/users",
      "description": "Get list of all users"
    },
    {
      "id": "api-1704067200000-0.234567",
      "name": "Create User",
      "method": "POST",
      "url": "https://api.example.com/users",
      "description": "Create a new user"
    }
  ]
}
```

### Test Execution Response

```json
{
  "status": "success",
  "message": "Tests executed successfully",
  "testResultsId": "results-1704067300000",
  "summary": {
    "totalApis": 2,
    "totalTests": 10,
    "passedTests": 9,
    "failedTests": 1,
    "passRate": 90
  }
}
```

### Report Generation Response

```json
{
  "status": "success",
  "message": "Report generated successfully",
  "reportId": "report-1704067400000",
  "reportFilename": "report-1704067400000.html",
  "stats": {
    "totalApis": 2,
    "totalTests": 10,
    "passedTests": 9,
    "failedTests": 1,
    "passRate": 90
  }
}
```

---

## 🧪 Test Case Types Explained

### 1. Positive Test
Tests the API with valid inputs and expects success.

```
Example:
API: GET /users/123
Input: Valid user ID (123)
Expected: 200 OK, user data returned
```

### 2. Negative Test
Tests the API with invalid inputs and expects appropriate error.

```
Example:
API: GET /users/999999
Input: Non-existent user ID
Expected: 404 Not Found or error response
```

### 3. Invalid Payload Test
Tests POST/PUT APIs with malformed data.

```
Example:
API: POST /users
Input: Malformed JSON body
Expected: 400 Bad Request
```

### 4. Auth Failure Test
Tests if API properly rejects unauthorized access.

```
Example:
API: GET /admin/users (protected)
Input: No authorization header
Expected: 401 Unauthorized or 403 Forbidden
```

### 5. Status Code Validation
Verifies that API returns correct status codes.

```
Example:
API: DELETE /users/123
Input: Valid request
Expected: 200 OK or 204 No Content
```

---

## 🐛 Common Error Messages and Solutions

### "No valid APIs found in collection"

**Cause**: Collection is empty or has invalid structure

**Solution**:
1. Make sure Postman collection has at least one request
2. Export as JSON from Postman (not as backup)
3. Use the sample collection to verify setup works

### "Ollama API error"

**Cause**: Ollama not running or not accessible

**Solution**:
```powershell
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If error, start Ollama
ollama serve

# Make sure model is installed
ollama run gemma4:e4b
```

### "Port 3000 already in use"

**Cause**: Another application using port 3000

**Solution**:
1. Edit `.env`
2. Change `PORT=3000` to `PORT=3001`
3. Save and restart
4. Visit `http://localhost:3001`

### "Tests not running"

**Cause**: Various reasons (Ollama, network, API not accessible)

**Solution**:
1. Check server logs for error details
2. Make sure Ollama is running
3. Try with sample collection first
4. Check if APIs are accessible from your machine

---

## 📈 Performance Tips

### Optimize Test Speed

1. **Reduce API Count**
   - Start with 5-10 APIs
   - Gradually increase

2. **Check API Response Times**
   - Slow APIs = slow tests
   - Consider timeout settings

3. **Use Faster Model**
   - Smaller Ollama models are faster
   - Trade-off with quality

### Monitor Resource Usage

```powershell
# Check Node.js processes
tasklist | findstr node

# Check Ollama processes
tasklist | findstr ollama
```

---

## 🔐 Security Best Practices

### 1. API Key Handling

Include API keys in Postman collection headers:

```json
{
  "key": "Authorization",
  "value": "Bearer YOUR_API_KEY_HERE"
}
```

QAgent will use them in tests.

### 2. File Upload Security

- Only JSON files accepted
- Max file size: 10MB
- Files validated before processing

### 3. Local Operation

- All processing on your machine
- No data sent to cloud
- Your APIs remain private

---

## 📝 Log File Locations

### QAgent Server Logs

Check Command Prompt running QAgent server:

```
[Timestamp] GET /api/health - 200 OK
[Timestamp] POST /api/upload - 201 Created
[Timestamp] POST /api/test/run - 200 OK
[Timestamp] POST /api/report/generate - 200 OK
```

### Ollama Logs

Check Command Prompt running Ollama:

```
time=2024-01-01T12:00:00.000Z level=INFO msg="listening on [::]:11434"
```

---

## 🎯 Example Use Cases

### Use Case 1: Test Internal API

```
1. Export Postman collection from your internal API
2. Make sure API is running and accessible
3. Include authentication headers in Postman
4. Upload collection to QAgent
5. Generate and run tests
6. Review report
```

### Use Case 2: Regression Testing

```
1. Create Postman collection of critical APIs
2. Export to JSON
3. Upload to QAgent
4. Run tests regularly
5. Compare reports over time
6. Catch breaking changes early
```

### Use Case 3: API Documentation Review

```
1. Convert API documentation to Postman collection
2. Export to JSON
3. Upload to QAgent
4. Run tests to verify documentation accuracy
5. Report shows which endpoints work as documented
```

---

## 💾 Data Persistence

### Session Storage

Uploaded collections are stored in: `server/uploads/`

Files created:
- `collection-[TIMESTAMP].json` - Original upload
- `session-[TIMESTAMP].json` - Parsed session
- `results-[TIMESTAMP].json` - Test results

### Report Storage

Generated reports stored in: `server/reports/`

Files created:
- `report-[TIMESTAMP].html` - HTML report

### Cleanup

To clean up old files:

```powershell
# Delete old uploads (Windows)
cd server/uploads
del collection-*.json

# Delete old reports
cd ../reports
del report-*.html
```

---

## 🔄 Workflow Automation

### Batch Testing Script

Save as `test-batch.js`:

```javascript
const api = require('./client/app.js');

async function batchTest(collections) {
  for (const collectionFile of collections) {
    console.log(`Testing: ${collectionFile}`);
    
    // Upload, run tests, generate report
    // Your automation logic here
  }
}

// Run: node test-batch.js
```

---

## 📚 Additional Resources

- **Node.js Docs**: https://nodejs.org/docs/
- **Ollama Github**: https://github.com/ollama/ollama
- **Express.js Guide**: https://expressjs.com/
- **Postman Docs**: https://postman.com/api-documentation/

---

**Ready to get started? See README.md for quick start guide!**
