# QAgent - Simple AI-Powered API Testing Application

A beginner-friendly, local AI API testing application built with Node.js and Ollama. Upload your Postman collection, and let QAgent automatically generate test cases using AI and execute them.

---

## 🎯 Features

✅ **Upload Postman Collections** - Upload your Postman collection JSON files  
✅ **AI Test Generation** - Generates test cases automatically using Ollama  
✅ **Automatic Test Execution** - Runs all generated test cases  
✅ **Beautiful HTML Reports** - Clean, visual test reports with detailed results  
✅ **Simple Web Interface** - Easy-to-use frontend with drag-and-drop upload  
✅ **Local Only** - Everything runs on your machine, no cloud required  

---

## 📋 Prerequisites

Before you start, make sure you have:

1. **Node.js** (v14 or higher)
   - Download from: https://nodejs.org/

2. **Ollama** (local LLM)
   - Download from: https://ollama.ai/
   - Install and pull the model: `ollama run gemma4:e4b`

3. **Postman Collection Export**
   - Export your Postman collection as a JSON file

---

## 🚀 Quick Start

### Step 1: Clone or Download the Project

```bash
cd QAgent
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- Express.js (web framework)
- Axios (HTTP client)
- Multer (file upload handler)
- CORS (cross-origin support)
- Dotenv (configuration)

### Step 3: Start Ollama

In a new terminal/command prompt:

```bash
ollama serve
```

Keep this running. You should see:
```
Listening on 127.0.0.1:11434
```

### Step 4: Start QAgent Server

In another terminal:

```bash
npm start
```

You should see:
```
╔════════════════════════════════════╗
║  QAgent Server Started! 🚀         ║
╠════════════════════════════════════╣
║  Server: http://localhost:3000     ║
║  Environment: development          ║
║  Ollama: http://localhost:11434... ║
╚════════════════════════════════════╝
```

### Step 5: Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

---

## 📖 How to Use

### 1. Upload Postman Collection
- Click the upload area or drag-and-drop your Postman collection JSON file
- The app will parse all APIs from the collection
- You'll see a list of all detected APIs

### 2. Run Tests
- Click the "Run Tests" button
- QAgent will:
  - Generate test cases for each API using Ollama
  - Execute each test case
  - Collect results

### 3. View Results
- See the summary with total tests, passed/failed counts
- Click "View Detailed Report" to see the HTML report
- The report includes:
  - API details
  - Test results for each API
  - Response times
  - Status codes

### 4. Generate New Reports
- Run tests again with a new collection
- Each test run creates a unique session

---

## 📁 Project Structure

```
QAgent/
│
├── server/
│   ├── index.js                    # Main server file
│   ├── routes/
│   │   ├── upload.js               # File upload routes
│   │   ├── test.js                 # Test execution routes
│   │   └── report.js               # Report generation routes
│   ├── services/
│   │   ├── postmanParser.js        # Parse Postman collections
│   │   ├── ollamaService.js        # AI test case generation
│   │   ├── apiExecutor.js          # Execute API tests
│   │   └── reportGenerator.js      # Generate HTML reports
│   ├── utils/
│   │   └── helpers.js              # Utility functions
│   ├── uploads/                    # Uploaded files stored here
│   └── reports/                    # Generated HTML reports
│
├── client/
│   ├── index.html                  # Main HTML page
│   ├── app.js                      # Frontend JavaScript
│   └── styles.css                  # Styling
│
├── package.json                    # Dependencies
├── .env                            # Configuration
├── README.md                       # This file
└── SETUP_GUIDE.md                  # Detailed setup guide
```

---

## ⚙️ Configuration

Edit `.env` file to customize settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Ollama Configuration
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=gemma4:e4b

# File paths
UPLOADS_DIR=./server/uploads
REPORTS_DIR=./server/reports
```

---

## 🔄 API Endpoints

### Upload API
- `POST /api/upload` - Upload Postman collection
- `GET /api/upload/sessions` - List uploaded sessions
- `GET /api/upload/sessions/:sessionId` - Get session details
- `DELETE /api/upload/sessions/:sessionId` - Delete session

### Test API
- `POST /api/test/run` - Run tests for a session
- `GET /api/test/results/:testResultsId` - Get test results
- `GET /api/test/status/:testResultsId` - Get test status

### Report API
- `POST /api/report/generate` - Generate HTML report
- `GET /api/report/list` - List all reports
- `GET /api/report/view/:reportFilename` - View report
- `GET /api/report/download/:reportFilename` - Download report
- `DELETE /api/report/:reportFilename` - Delete report

---

## 🧪 Supported Test Types

QAgent generates these test types for each API:

1. **Positive Test** - Tests successful API call with valid parameters
2. **Negative Test** - Tests API with invalid parameters
3. **Invalid Payload** - Tests with malformed request body
4. **Auth Failure** - Tests without proper authentication
5. **Status Code Validation** - Verifies correct status codes

---

## 📊 Example Workflow

### Input: Sample Postman Collection

```json
{
  "info": {
    "name": "Sample API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Users",
      "request": {
        "method": "GET",
        "url": "https://api.example.com/users",
        "header": [
          {"key": "Authorization", "value": "Bearer token"}
        ]
      }
    },
    {
      "name": "Create User",
      "request": {
        "method": "POST",
        "url": "https://api.example.com/users",
        "body": {"raw": "{\"name\": \"John\"}"}
      }
    }
  ]
}
```

### Output: HTML Report

The report includes:
- Total APIs tested: 2
- Test results for each API
- Response times
- Pass/fail status
- Visual statistics

---

## 🐛 Troubleshooting

### Ollama not responding
```
Error: Failed to connect to Ollama
```
**Solution:**
1. Make sure Ollama is running: `ollama serve`
2. Check if it's accessible: `curl http://localhost:11434/api/tags`
3. Make sure you've pulled the model: `ollama run gemma4:e4b`

### Server won't start
```
Error: Port 3000 is already in use
```
**Solution:**
1. Change the PORT in `.env` to a different number
2. Or kill the process using port 3000

### File upload fails
```
Error: Only JSON files are allowed
```
**Solution:**
1. Make sure your Postman collection is exported as JSON
2. Check the file size (max 10MB)
3. Ensure the file has a valid JSON structure

### Tests not running
```
Error: No valid APIs found in collection
```
**Solution:**
1. Make sure your collection has at least one request
2. Verify the collection format is valid
3. Check that requests have valid URLs

---

## 💡 Tips & Best Practices

1. **Test Scope**
   - Start with 10-20 APIs for quick testing
   - Larger collections will take longer

2. **Authentication**
   - Include authentication headers in your Postman collection
   - QAgent will use them in tests

3. **API Design**
   - Ensure APIs are accessible from your machine
   - No firewall blocks

4. **Performance**
   - Each API takes 2-5 minutes to test (depends on API response time)
   - Be patient during test execution

5. **Report Sharing**
   - Reports are saved in `/server/reports/`
   - You can download and share them

---

## 🔒 Security Considerations

- **Local Only** - All processing happens locally
- **No Cloud** - No data sent to external services
- **File Validation** - Only JSON files accepted
- **Sandboxed** - File upload restricted to `/uploads` directory
- **CORS** - Restricted to localhost by default

---

## 📝 File Descriptions

### Backend Files

**server/index.js**
- Main Express server
- Sets up routes and middleware
- Initializes the app

**server/services/postmanParser.js**
- Parses Postman collection JSON
- Extracts API details
- Validates collection structure

**server/services/ollamaService.js**
- Communicates with Ollama
- Generates test cases using AI
- Fallback test generation if Ollama fails

**server/services/apiExecutor.js**
- Executes actual API calls
- Validates responses
- Collects test results

**server/services/reportGenerator.js**
- Generates beautiful HTML reports
- Saves reports to files
- Formats test results

**server/utils/helpers.js**
- File I/O utilities
- Data validation functions
- Common helper functions

### Frontend Files

**client/index.html**
- Main HTML page
- Form elements for upload
- Container for results display

**client/app.js**
- Frontend JavaScript
- Handles user interactions
- Communicates with backend API

**client/styles.css**
- Modern CSS styling
- Responsive design
- Beautiful UI components

---

## 📦 Dependencies

- **express** (v4.18.2) - Web framework
- **axios** (v1.6.0) - HTTP client
- **multer** (v1.4.5) - File upload handler
- **dotenv** (v16.3.1) - Configuration management
- **cors** (v2.8.5) - Cross-origin support

---

## 🤝 Contributing

This is a beginner-friendly project. Feel free to:
- Report bugs
- Suggest improvements
- Add features
- Improve documentation

---

## 📄 License

MIT License - Feel free to use for personal and commercial projects

---

## ❓ FAQ

**Q: Can I use it with cloud APIs?**
A: Yes! Any API accessible from your machine can be tested.

**Q: Is my data safe?**
A: Yes! Everything stays on your machine. No cloud upload.

**Q: Can I test APIs that require API keys?**
A: Yes! Include the API key in the Authorization header in your Postman collection.

**Q: How long do tests take?**
A: Depends on the number of APIs and their response times. Typically 2-5 seconds per API.

**Q: Can I modify test cases?**
A: Currently, test cases are generated by Ollama. You can manually edit them in the report.

**Q: What if Ollama is not available?**
A: QAgent has fallback test cases. It will still generate and run tests without Ollama.

---

## 🚀 Next Steps

1. Download and install all prerequisites
2. Run `npm install`
3. Start Ollama and the server
4. Visit http://localhost:3000
5. Upload a Postman collection
6. Run tests and view reports!

---

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section
2. Review the setup guide
3. Check console logs for errors
4. Ensure Ollama is running

---

**Happy Testing! 🎉**

QAgent makes API testing simple, fast, and intelligent.
