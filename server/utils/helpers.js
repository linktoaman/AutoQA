// ============================================
// Utility Functions
// ============================================
// Common utility functions used throughout the application.

const fs = require('fs');
const path = require('path');

/**
 * Check if a file exists
 * @param {String} filePath - Path to file
 * @returns {Boolean} True if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Read JSON file
 * @param {String} filePath - Path to JSON file
 * @returns {Object} Parsed JSON object
 */
function readJsonFile(filePath) {
  try {
    if (!fileExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error.message);
    throw new Error(`Failed to read JSON file: ${error.message}`);
  }
}

/**
 * Write JSON file
 * @param {String} filePath - Path to file
 * @param {Object} data - Data to write
 * @returns {Boolean} True if successful
 */
function writeJsonFile(filePath, data) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error.message);
    throw new Error(`Failed to write JSON file: ${error.message}`);
  }
}

/**
 * Delete file
 * @param {String} filePath - Path to file
 * @returns {Boolean} True if successful
 */
function deleteFile(filePath) {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error.message);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Generate unique ID
 * @returns {String} Unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate email format
 * @param {String} email - Email address
 * @returns {Boolean} True if valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {String} url - URL string
 * @returns {Boolean} True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {Boolean} True if empty
 */
function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

/**
 * Get file extension
 * @param {String} filename - Filename
 * @returns {String} File extension
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Validate file is JSON
 * @param {String} filename - Filename
 * @returns {Boolean} True if JSON file
 */
function isJsonFile(filename) {
  return getFileExtension(filename) === '.json';
}

/**
 * Truncate string to specific length
 * @param {String} str - String to truncate
 * @param {Number} length - Max length
 * @returns {String} Truncated string
 */
function truncate(str, length = 100) {
  if (!str) return '';
  return str.length > length ? str.substring(0, length) + '...' : str;
}

/**
 * Format time in milliseconds to readable format
 * @param {Number} ms - Milliseconds
 * @returns {String} Formatted time
 */
function formatTime(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format date to readable format
 * @param {Date|String} date - Date object or ISO string
 * @returns {String} Formatted date
 */
function formatDate(date) {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString();
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Sanitize filename
 * @param {String} filename - Original filename
 * @returns {String} Sanitized filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
function deepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error('Error cloning object:', error.message);
    return obj;
  }
}

/**
 * Merge objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object
 * @returns {Object} Merged object
 */
function mergeObjects(target, source) {
  const result = { ...target };

  Object.keys(source).forEach((key) => {
    if (source[key] !== null && source[key] !== undefined) {
      result[key] = source[key];
    }
  });

  return result;
}

/**
 * Sleep for specified milliseconds
 * @param {Number} ms - Milliseconds
 * @returns {Promise} Resolved promise after delay
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Export all utility functions
module.exports = {
  fileExists,
  readJsonFile,
  writeJsonFile,
  deleteFile,
  generateId,
  isValidEmail,
  isValidUrl,
  isEmpty,
  getFileExtension,
  isJsonFile,
  truncate,
  formatTime,
  formatDate,
  sanitizeFilename,
  deepClone,
  mergeObjects,
  sleep
};
