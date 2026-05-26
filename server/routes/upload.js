// ============================================
// Upload Routes
// ============================================
// Handles file upload endpoints for Postman collections.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Import services
const { readJsonFile, writeJsonFile } = require('../utils/helpers');
const { parsePostmanCollection, validateApis } = require('../services/postmanParser');

// Configure file upload
const uploadsDir = process.env.UPLOADS_DIR || './server/uploads';

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create filename with timestamp
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `collection-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only allow JSON files
    if (file.mimetype !== 'application/json' && !file.originalname.endsWith('.json')) {
      return cb(new Error('Only JSON files are allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * POST /api/upload - Upload a Postman collection
 * Accepts multipart/form-data with a file
 */
router.post('/', upload.single('collection'), (req, res) => {
  try {
    console.log('Upload request received');

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    // Read the uploaded file
    const filePath = req.file.path;
    console.log(`File uploaded to: ${filePath}`);

    // Parse JSON
    let collection;
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      collection = JSON.parse(fileContent);
    } catch (parseError) {
      // Delete invalid file
      fs.unlinkSync(filePath);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid JSON file',
        error: parseError.message
      });
    }

    // Parse Postman collection
    let apis;
    try {
      apis = parsePostmanCollection(collection);
      validateApis(apis);
    } catch (parseError) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        status: 'error',
        message: parseError.message
      });
    }

    // Save parsed APIs for later use
    const sessionId = `session-${Date.now()}`;
    const sessionFile = path.join(uploadsDir, `${sessionId}.json`);
    writeJsonFile(sessionFile, {
      sessionId: sessionId,
      uploadedFile: req.file.filename,
      collection: collection,
      apis: apis,
      uploadedAt: new Date().toISOString(),
      totalApis: apis.length
    });

    console.log(`✓ Collection parsed successfully: ${apis.length} APIs found`);

    // Return success response
    res.json({
      status: 'success',
      message: 'Collection uploaded and parsed successfully',
      sessionId: sessionId,
      totalApis: apis.length,
      apis: apis.map((api) => ({
        id: api.id,
        name: api.name,
        method: api.method,
        url: api.url,
        description: api.description
      }))
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Clean up uploaded file if there's an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore deletion errors
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Upload failed',
      error: error.message
    });
  }
});

/**
 * GET /api/upload/sessions - Get list of uploaded sessions
 */
router.get('/sessions', (req, res) => {
  try {
    // Read all session files
    const files = fs.readdirSync(uploadsDir);
    const sessions = [];

    files.forEach((file) => {
      if (file.startsWith('session-') && file.endsWith('.json')) {
        try {
          const sessionData = readJsonFile(path.join(uploadsDir, file));
          sessions.push({
            sessionId: sessionData.sessionId,
            uploadedFile: sessionData.uploadedFile,
            totalApis: sessionData.totalApis,
            uploadedAt: sessionData.uploadedAt
          });
        } catch (error) {
          console.error(`Error reading session ${file}:`, error.message);
        }
      }
    });

    res.json({
      status: 'success',
      sessions: sessions,
      total: sessions.length
    });
  } catch (error) {
    console.error('Error reading sessions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to read sessions',
      error: error.message
    });
  }
});

/**
 * GET /api/upload/sessions/:sessionId - Get details of a specific session
 */
router.get('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionFile = path.join(uploadsDir, `${sessionId}.json`);

    // Security: validate sessionId format
    if (!sessionId.startsWith('session-')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid session ID'
      });
    }

    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    const sessionData = readJsonFile(sessionFile);

    res.json({
      status: 'success',
      session: sessionData
    });
  } catch (error) {
    console.error('Error reading session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to read session',
      error: error.message
    });
  }
});

/**
 * DELETE /api/upload/sessions/:sessionId - Delete a session
 */
router.delete('/sessions/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionFile = path.join(uploadsDir, `${sessionId}.json`);

    // Security: validate sessionId format
    if (!sessionId.startsWith('session-')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid session ID'
      });
    }

    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({
        status: 'error',
        message: 'Session not found'
      });
    }

    fs.unlinkSync(sessionFile);

    res.json({
      status: 'success',
      message: 'Session deleted'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete session',
      error: error.message
    });
  }
});

// Export router
module.exports = router;
