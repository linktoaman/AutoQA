# AutoQA - Complete File Reference

This document describes every file in the AutoQA project and its purpose.

---

## 📂 Project Structure Summary

```
AutoQA/
├── server/                           # Backend code
│   ├── index.js                      # Main server entry point
│   ├── routes/                       # API routes
│   │   ├── upload.js                 # File upload endpoints
│   │   ├── test.js                   # Test execution endpoints
│   │   └── report.js                 # Report generation endpoints
│   ├── services/                     # Business logic
│   │   ├── postmanParser.js          # Parse Postman collections
│   │   ├── ollamaService.js          # AI test generation
│   │   ├── apiExecutor.js            # Execute API tests
│   │   └── reportGenerator.js        # Generate HTML reports
│   ├── utils/                        # Utility functions
│   │   └── helpers.js                # Common helper functions
│   ├── uploads/                      # Uploaded files (auto-created)
│   └── reports/                      # Generated reports (auto-created)
│
├── client/                           # Frontend code
│   ├── index.html                    # Main HTML page
│   ├── app.js                        # Frontend JavaScript
│   └── styles.css                    # CSS styling
│
├── package.json                      # NPM dependencies
├── .env                              # Configuration file
├── README.md                         # Main documentation
├── SETUP_GUIDE.md                    # Detailed Windows setup
├── EXAMPLES.md                       # Examples and configuration
├── sample-collection.json            # Sample Postman collection
└── FILE_REFERENCE.md                 # This file
```

---

## 📄 File Descriptions

### Root Level Files

#### `package.json`
**Purpose**: Defines project metadata and dependencies  
**Edit**: Rarely needed, only to add/remove packages  
**Contains**:
- Project name, version, description
- npm scripts (npm start, etc.)
- List of required packages (dependencies)

#### `.env`
**Purpose**: Configuration file for the application  
**Edit**: To change server port, Ollama URL, or file paths  
**Contains**:
- Server port (default: 3000)
- Ollama API URL and model
- Upload and report directories

#### `README.md`
**Purpose**: Main documentation and quick start guide  
**For**: First-time users to understand what AutoQA does  
**Contains**: Features, prerequisites, quick start, usage, troubleshooting

#### `SETUP_GUIDE.md`
**Purpose**: Detailed step-by-step setup instructions for Windows  
**For**: Users setting up for the first time  
**Contains**: How to install Node.js, Ollama, and AutoQA

#### `EXAMPLES.md`
**Purpose**: Examples, configurations, and advanced usage  
**For**: Users wanting to understand internals or customize  
**Contains**: Example prompts, API responses, configurations

#### `sample-collection.json`
**Purpose**: Example Postman collection for testing  
**For**: Testing AutoQA without your own collection  
**Contains**: Public APIs (JSONPlaceholder, Random User, etc.)

---

### Backend Files

#### `server/index.js`
**Purpose**: Main Express server and entry point  
**Key Functions**:
- Creates Express app
- Configures middleware (CORS, JSON parsing)
- Sets up routes
- Starts the server on specified port

**Important Code Sections**:
- Middleware setup
- Route registration
- Error handling
- Server startup

---

#### `server/routes/upload.js`
**Purpose**: Handle Postman collection uploads  
**Endpoints**:
- `POST /api/upload` - Upload collection
- `GET /api/upload/sessions` - List all sessions
- `GET /api/upload/sessions/:sessionId` - Get session details
- `DELETE /api/upload/sessions/:sessionId` - Delete session

**Key Functions**:
- `upload.single('collection')` - Multer middleware for file upload
- Validates JSON files
- Stores session data for later retrieval

---

#### `server/routes/test.js`
**Purpose**: Handle test execution  
**Endpoints**:
- `POST /api/test/run` - Run tests for a session
- `GET /api/test/results/:testResultsId` - Get test results
- `GET /api/test/status/:testResultsId` - Get test status

**Key Functions**:
- Iterates through APIs
- Generates test cases
- Executes tests
- Saves results

---

#### `server/routes/report.js`
**Purpose**: Handle report generation and retrieval  
**Endpoints**:
- `POST /api/report/generate` - Generate HTML report
- `GET /api/report/list` - List all reports
- `GET /api/report/view/:filename` - View report
- `GET /api/report/download/:filename` - Download report
- `DELETE /api/report/:filename` - Delete report

**Key Functions**:
- Calls reportGenerator service
- Saves HTML files
- Manages report files

---

#### `server/services/postmanParser.js`
**Purpose**: Parse Postman collection JSON files  
**Exports**:
- `parsePostmanCollection()` - Main parsing function
- `extractApiDetails()` - Extract single API details
- `validateApis()` - Validate parsed APIs

**What It Does**:
- Reads Postman collection structure
- Extracts API endpoints
- Collects headers, methods, URLs, body data
- Validates API data completeness

**Key Data Extracted**:
- API name
- HTTP method (GET, POST, PUT, DELETE)
- URL/endpoint
- Headers (especially Authorization)
- Request body

---

#### `server/services/ollamaService.js`
**Purpose**: Generate test cases using Ollama AI  
**Exports**:
- `generateTestCases()` - Main test generation function
- `createTestGenerationPrompt()` - Create prompt for Ollama
- `callOllama()` - Call Ollama API
- `parseTestCases()` - Parse Ollama response
- `generateDefaultTestCases()` - Fallback test generation

**What It Does**:
- Communicates with Ollama
- Sends API details to Ollama
- Receives AI-generated test cases
- Parses structured response
- Falls back to default tests if Ollama unavailable

**Test Types Generated**:
1. Positive Test
2. Negative Test
3. Invalid Payload
4. Auth Failure
5. Status Code Validation

---

#### `server/services/apiExecutor.js`
**Purpose**: Execute actual API calls and collect results  
**Exports**:
- `executeTest()` - Execute single test
- `executeTests()` - Execute multiple tests
- `prepareRequest()` - Prepare Axios request config
- `performSecurityChecks()` - Basic security validation
- `calculateStats()` - Calculate test statistics

**What It Does**:
- Calls actual APIs using Axios
- Measures response time
- Captures response status and body
- Validates test results
- Performs security checks (basic)

**Test Type Handling**:
- Positive Test: Uses original request
- Negative Test: Minimal/empty data
- Invalid Payload: Malformed JSON
- Auth Failure: Removes auth headers
- Status Code: Standard request

---

#### `server/services/reportGenerator.js`
**Purpose**: Generate beautiful HTML reports  
**Exports**:
- `generateHtmlReport()` - Generate HTML from results
- `saveReport()` - Save HTML to file
- `getReports()` - List all reports
- `readReport()` - Read report content

**What It Does**:
- Takes test results
- Generates styled HTML
- Includes statistics, charts
- Saves to file system
- Retrieves existing reports

**Report Contains**:
- Header with title
- Statistics cards (total, passed, failed, pass rate)
- Results by API
- Test details
- Response times
- Status badges

---

#### `server/utils/helpers.js`
**Purpose**: Common utility functions  
**Exports**:
- File I/O functions (read, write, delete)
- Validation functions (email, URL, JSON)
- Data manipulation (merge, clone, truncate)
- String formatting (time, date, sanitize)
- Common checks (isEmpty, fileExists)

**Commonly Used Functions**:
- `readJsonFile()` - Read JSON file safely
- `writeJsonFile()` - Write JSON file safely
- `isJsonFile()` - Check if file is JSON
- `isEmpty()` - Check if value is empty
- `generateId()` - Create unique ID

---

### Frontend Files

#### `client/index.html`
**Purpose**: Main HTML page structure  
**Contains**:
- Upload form and area
- Testing progress section
- Results display section
- Report viewer modal
- Links to CSS and JavaScript

**Sections**:
1. Header with title
2. Step 1: Upload section
3. Step 2: Testing progress
4. Step 3: Results summary
5. Footer

---

#### `client/app.js`
**Purpose**: Frontend JavaScript application logic  
**Exports**:
- `uploadCollection()` - Upload file to server
- `runTests()` - Start test execution
- `generateReport()` - Generate HTML report
- Event handlers for UI interactions

**Key Functions**:
- File upload handling (drag & drop)
- Progress tracking
- Status messages
- Report modal display
- Session management

**Event Listeners**:
- File input changes
- Drag and drop
- Button clicks
- Modal interactions

---

#### `client/styles.css`
**Purpose**: Visual styling of the application  
**Contains**:
- CSS Grid and Flexbox layouts
- Color gradients
- Responsive design
- Animations
- Component styles

**Color Scheme**:
- Primary: Purple gradient (#667eea to #764ba2)
- Success: Green gradient (#11998e to #38ef7d)
- Error: Pink gradient (#f093fb to #f5576c)

**Responsive Breakpoints**:
- Desktop: Full width
- Tablet (768px): Adjusted grid
- Mobile (480px): Single column

---

#### `sample-collection.json`
**Purpose**: Example Postman collection for testing  
**Contains**: 9 Public APIs
- JSONPlaceholder (GET/POST/PUT/DELETE)
- Random User Generator API
- OpenMeteo Weather API

**Why It's Useful**:
- No authentication required
- Free and always available
- Tests both GET and POST methods
- Great for learning and demo

---

## 🔄 Data Flow Diagram

```
User → Browser
  ↓
  Upload Postman Collection (JSON)
  ↓
Frontend (app.js) → POST /api/upload
  ↓
Backend (upload.js) → Parse (postmanParser.js)
  ↓
Store session data in /uploads
  ↓
User clicks "Run Tests"
  ↓
Frontend → POST /api/test/run
  ↓
Backend (test.js) iterates APIs
  ├→ ollamaService.js (generate test cases)
  ├→ apiExecutor.js (execute tests)
  └→ Store results in /uploads
  ↓
User clicks "View Report"
  ↓
Frontend → POST /api/report/generate
  ↓
Backend (reportGenerator.js)
  ├→ Generate HTML
  └→ Save to /reports
  ↓
Frontend → GET /api/report/view/:filename
  ↓
Display HTML report in modal
```

---

## 🎯 Common Modifications

### Change Server Port
**File**: `.env`
**Change**: `PORT=3000` → `PORT=8080`

### Use Different Ollama Model
**File**: `.env`
**Change**: `OLLAMA_MODEL=gemma4:e4b` → `OLLAMA_MODEL=mistral`

### Change UI Colors
**File**: `client/styles.css`
**Find**: `#667eea` (primary color)
**Replace**: With your color code

### Add New Test Type
**File**: `server/services/ollamaService.js`
**Modify**: `generateDefaultTestCases()` function

### Change Report Style
**File**: `server/services/reportGenerator.js`
**Modify**: HTML template in `generateHtmlReport()` function

---

## 📦 Dependencies Explanation

| Package | Purpose | Version |
|---------|---------|---------|
| express | Web framework | ^4.18.2 |
| axios | HTTP client | ^1.6.0 |
| multer | File uploads | ^1.4.5 |
| dotenv | Config management | ^16.3.1 |
| cors | CORS support | ^2.8.5 |

---

## 🔐 File Permissions

Most important file restrictions:

- `/server/uploads/` - Writable, user files stored here
- `/server/reports/` - Writable, generated reports here
- `/client/` - Public, served to browser
- `.env` - Keep secure, contains configuration

---

## 💾 File Size Reference

Typical file sizes after installation:

```
node_modules/           ~200 MB
.env                    ~300 B
package.json            ~500 B
server/                 ~200 KB
client/                 ~100 KB
sample-collection.json  ~10 KB
README.md               ~15 KB

Total: ~200 MB (mostly node_modules)
```

---

## 🚀 Build and Run

### Installation
```bash
npm install              # Install all dependencies
```

### Development
```bash
npm start                # Start development server
```

### File Generation
AutoQA creates these during runtime:

```
server/uploads/
  ├── collection-[TIMESTAMP].json    # Original upload
  ├── session-[TIMESTAMP].json        # Parsed session
  ├── results-[TIMESTAMP].json        # Test results
  └── report-metadata-[TIMESTAMP].json # Report metadata

server/reports/
  └── report-[TIMESTAMP].html         # Generated report
```

---

**This is a complete guide to every file in AutoQA. Happy coding! 🚀**
