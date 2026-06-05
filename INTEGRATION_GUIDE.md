# AutoQA - Unified Platform

> **Unified platform for API Testing and Test Case Generation using local Ollama LLM**

## 🎯 Overview

AutoQA is a comprehensive QA automation platform that combines two powerful features:

1. **AutoQA - API Testing**: Upload Postman collections and run comprehensive API tests with AI-powered validation
2. **Test Case Generator (TCG)**: Generate structured test cases from JIRA user stories using AI analysis

Both features are integrated into a single, easy-to-use platform powered by local Ollama LLM.

---

## ✨ Features

### AutoQA - API Testing
- 📤 Upload Postman collections
- 🧪 Run automated API tests
- 📊 Generate comprehensive test reports
- 🤖 AI-powered response validation
- ✅ Positive & negative test scenarios
- 📈 Real-time progress tracking

### Test Case Generator (TCG)
- 🔗 JIRA integration
- 📋 Automatic acceptance criteria parsing
- 🤖 AI-generated test cases
- ✅ Positive & negative test scenarios
- 💾 Export test cases to file
- 🔄 Response caching

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 14.0
- Ollama running locally (http://localhost:11434)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/linktoaman/AutoQA.git
cd AutoQA

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Ollama Configuration
OLLAMA_API_URL=http://localhost:11434/api/generate
OLLAMA_MODEL=mistral

# JIRA Configuration (for Test Case Generator)
JIRA_BASE_URL=https://your-jira-instance.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token

# Output Configuration
TCG_OUTPUT_FOLDER=./tcg-output
```

### Running the Server

```bash
# Development
npm run dev

# Production
npm start
```

The server will start on `http://localhost:3000`

---

## 📖 Usage Guide

### Dashboard
- **URL**: `http://localhost:3000/`
- Main landing page with access to both features

### AutoQA - API Testing
- **URL**: `http://localhost:3000/app`
- Upload a Postman collection
- View parsed APIs
- Run tests and view detailed reports

### Test Case Generator
- **URL**: `http://localhost:3000/tcg`
- Enter a JIRA ticket ID (e.g., JIRA-123)
- Generate test cases from JIRA story
- View and export test cases

---

## 🏗️ Project Structure

```
AutoQA/
├── client/
│   ├── index.html                    # AutoQA Frontend
│   ├── index-unified.html            # Unified Dashboard
│   ├── tcg.html                      # Test Case Generator Frontend
│   ├── app.js                        # AutoQA Frontend Logic
│   └── styles.css                    # AutoQA Styles
│
├── server/
│   ├── index.js                      # Main Server Entry Point
│   ├── routes/
│   │   ├── upload.js                 # Postman Upload Route
│   │   ├── test.js                   # Test Execution Route
│   │   ├── report.js                 # Report Generation Route
│   │   └── tcg/
│   │       └── testCaseRoutes.js      # Test Case Generator Routes
│   │
│   ├── services/
│   │   ├── apiExecutor.js            # API Test Executor
│   │   ├── postmanParser.js          # Postman Collection Parser
│   │   ├── reportGenerator.js        # HTML Report Generator
│   │   ├── ollamaService.js          # Ollama Integration (AutoQA)
│   │   └── tcg/
│   │       ├── jiraService.js        # JIRA Integration
│   │       └── ollamaService.js      # Ollama Integration (TCG)
│   │
│   ├── controllers/
│   │   └── tcg/
│   │       └── testCaseController.js # Test Case Controller
│   │
│   └── utils/
│       ├── helpers.js                # Utility Functions
│       ├── progressTracker.js        # Progress Tracking
│       ├── tcgCache.js               # TCG Caching
│       └── tcgFileStore.js           # TCG File Storage
│
├── .env                              # Environment Variables
├── .gitignore                        # Git Ignore File
├── package.json                      # Project Dependencies
└── README.md                         # Documentation
```

---

## 🔌 API Endpoints

### AutoQA Endpoints

**Upload Postman Collection**
```
POST /api/upload
Content-Type: multipart/form-data
Body: file (JSON)
```

**Run Tests**
```
POST /api/test/run
Content-Type: application/json
Body: { sessionId, results }
```

**View Report**
```
GET /api/report/view/:reportFilename
```

**List Reports**
```
GET /api/report/list
```

---

### Test Case Generator Endpoints

**Generate Test Cases**
```
GET /api/tcg/generate-testcases?ticketId=JIRA-123
```

**Verify JIRA Credentials**
```
GET /api/tcg/verify-jira
```

---

## ⚙️ Configuration Guide

### Ollama Setup

```bash
# Install Ollama (if not already installed)
# https://ollama.ai

# Pull a model
ollama pull mistral

# Run Ollama
ollama serve
```

### JIRA Setup

1. Get your JIRA instance URL
2. Create an API token: https://id.atlassian.com/manage/api-tokens
3. Add to `.env`:
   ```
   JIRA_BASE_URL=https://your-instance.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-token
   ```

---

## 🛠️ Development

### Adding New Routes

1. Create route file in `server/routes/`
2. Import in `server/index.js`
3. Add middleware: `app.use('/api/path', routeHandler)`

### Adding New Services

1. Create service in `server/services/`
2. Export functions
3. Import and use in routes/controllers

### Frontend Updates

1. Edit HTML files in `client/`
2. Update JavaScript in `client/app.js` or `tcg.html`
3. Update styles in `client/styles.css`

---

## 📝 Examples

### Running AutoQA Tests

```javascript
// Upload a Postman collection and run tests
const formData = new FormData();
formData.append('file', postmanCollectionFile);

const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  body: formData
});
```

### Generating Test Cases

```javascript
// Generate test cases from JIRA
const response = await fetch('/api/tcg/generate-testcases?ticketId=JIRA-123');
const data = await response.json();
console.log(data.testCases);
```

---

## 🐛 Troubleshooting

### Ollama Connection Error
- Ensure Ollama is running: `ollama serve`
- Check `OLLAMA_API_URL` in `.env`
- Verify model is installed: `ollama list`

### JIRA Connection Error
- Verify credentials in `.env`
- Check JIRA instance URL format
- Ensure API token is valid

### Port Already in Use
```bash
# Change port in .env
PORT=3001
```

---

## 📊 Performance Tips

- Keep Postman collection size under 10MB
- Limit JIRA description size (truncated to 1000 chars)
- Use caching for repeated test case generation
- Monitor Ollama memory usage for large prompts

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🔗 Links

- [GitHub Repository](https://github.com/linktoaman/AutoQA)
- [Ollama](https://ollama.ai)
- [Postman](https://www.postman.com)
- [JIRA](https://www.atlassian.com/software/jira)

---

## 📞 Support

For issues and questions:
- GitHub Issues: https://github.com/linktoaman/AutoQA/issues
- Email: your-email@example.com

---

## 🙏 Acknowledgments

Built with:
- Node.js & Express
- Ollama LLM
- Axios HTTP Client
- Multer File Upload

---

**Happy Testing! 🎉**
