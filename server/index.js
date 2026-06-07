// ============================================
// QAgent - Main Server File (index.js)
// ============================================
// This is the main entry point for the Express server.
// It sets up the server, configures middleware, and defines routes.

// Import required packages
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import our custom routes
const uploadRoutes = require('./routes/upload');
const testRoutes = require('./routes/test');
const reportRoutes = require('./routes/report');
const automationRoutes = require('./routes/automation');
const tcgRoutes = require('./routes/tcg/testCaseRoutes');

// ============================================
// Initialize Express App
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// Middleware Configuration
// ============================================
// Enable CORS (Cross-Origin Resource Sharing) to allow frontend to communicate with backend
app.use(cors());

// Parse incoming JSON requests
app.use(express.json({ limit: '50mb' }));

// Parse incoming form data
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the client folder
// This makes our HTML, CSS, and JS files accessible
app.use(express.static(path.join(__dirname, '../client')));

// ============================================
// Routes Setup
// ============================================
// These routes handle:
// 1. Uploading Postman collections
// 2. Running API tests
// 3. Generating and viewing reports
// 4. Generating test cases from JIRA

app.use('/api/upload', uploadRoutes);
app.use('/api/test', testRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/automation', automationRoutes);
app.use('/api/tcg', tcgRoutes);

// ============================================
// Health Check Endpoint
// ============================================
// Simple endpoint to verify server is running
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'QAgent Server is running!',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// Serve Frontend
// ============================================
// When user visits root URL, serve the unified landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index-unified.html'));
});

// QAgent - API Testing Interface
app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Test Case Generator Interface
app.get('/tcg', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/tcg.html'));
});

app.get('/automation', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/automation.html'));
});

// Explicit Home route (alternate to `/`) so users can visit `/home`
app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index-unified.html'));
});

// ============================================
// Error Handling Middleware
// ============================================
// Catches any errors that occur in routes and sends back a response
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// ============================================
// Start Server
// ============================================
// Listen on the PORT specified in .env or default 3000
app.listen(PORT, () => {
  const selectedProvider = process.env.AI_PROVIDER || 'ollama';
  const providerEndpoint = selectedProvider === 'ollama'
    ? process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate'
    : selectedProvider === 'gemini'
      ? process.env.GEMINI_API_URL || `https://gemini.googleapis.com/v1/models/${process.env.GEMINI_MODEL || 'gemini-1.5-mini'}:generate`
      : '';

  console.log(`
╔════════════════════════════════════════════════════╗
║  QAgent + Test Case Generator Started! 🚀         ║
╠════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                  ║
║  Environment: ${process.env.NODE_ENV || 'development'}                       ║
║  AI Provider: ${selectedProvider}${providerEndpoint ? ` (${providerEndpoint})` : ''}             ║
║                                                    ║
║  Features:                                         ║
║  - API Testing (QAgent) - /api/test               ║
║  - Automation Testing - /api/automation          ║
║  - Report Generation - /api/report                ║
║  - Test Case Generation (TCG) - /api/tcg          ║
╚════════════════════════════════════════════════════╝
  `);
});

// Export app for testing purposes
module.exports = app;
