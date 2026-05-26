// ============================================
// Progress Tracker Utility
// ============================================
// Tracks real-time progress of test execution and report generation.

// In-memory progress storage
const progressMap = {};

/**
 * Initialize progress tracking for a session
 * @param {String} sessionId - Session ID
 */
function initProgress(sessionId) {
  progressMap[sessionId] = {
    sessionId: sessionId,
    stage: 'initialized',
    currentApi: 0,
    totalApis: 0,
    currentTest: 0,
    totalTests: 0,
    percentage: 0,
    message: 'Starting...',
    startTime: Date.now(),
    lastUpdate: Date.now()
  };
}

/**
 * Update progress for a session
 * @param {String} sessionId - Session ID
 * @param {Object} updates - Progress updates
 */
function updateProgress(sessionId, updates) {
  if (!progressMap[sessionId]) {
    initProgress(sessionId);
  }

  const progress = progressMap[sessionId];
  
  // Update provided fields
  Object.assign(progress, updates);
  
  // Calculate percentage based on stage if not explicitly provided
  if (updates.percentage === undefined) {
    if (updates.stage === 'initialized') {
      progress.percentage = 5;
    } else if (updates.stage === 'parsing') {
      progress.percentage = 10;
    } else if (updates.stage === 'generating_tests') {
      if (updates.totalApis > 0) {
        progress.percentage = 15 + (updates.currentApi / updates.totalApis) * 40;
      }
    } else if (updates.stage === 'executing_tests') {
      if (updates.totalTests > 0) {
        progress.percentage = 55 + (updates.currentTest / updates.totalTests) * 30;
      }
    } else if (updates.stage === 'tests_complete') {
      progress.percentage = 85;
    } else if (updates.stage === 'generating_report') {
      progress.percentage = 90;
    } else if (updates.stage === 'completed') {
      progress.percentage = 100;
    }
  }

  // Ensure percentage is between 0 and 100
  progress.percentage = Math.max(0, Math.min(100, progress.percentage));
  progress.lastUpdate = Date.now();
}

/**
 * Get current progress for a session
 * @param {String} sessionId - Session ID
 * @returns {Object} Progress object
 */
function getProgress(sessionId) {
  if (!progressMap[sessionId]) {
    return {
      sessionId: sessionId,
      stage: 'not_started',
      percentage: 0,
      message: 'Not started',
      currentApi: 0,
      totalApis: 0,
      currentTest: 0,
      totalTests: 0
    };
  }

  return progressMap[sessionId];
}

/**
 * Clear progress for a session
 * @param {String} sessionId - Session ID
 */
function clearProgress(sessionId) {
  delete progressMap[sessionId];
}

/**
 * Clean up old progress entries (older than 1 hour)
 */
function cleanupOldProgress() {
  const oneHourAgo = Date.now() - 3600000;

  Object.keys(progressMap).forEach((sessionId) => {
    if (progressMap[sessionId].lastUpdate < oneHourAgo) {
      delete progressMap[sessionId];
    }
  });
}

// Cleanup old progress every 30 minutes
setInterval(cleanupOldProgress, 1800000);

module.exports = {
  initProgress,
  updateProgress,
  getProgress,
  clearProgress,
  cleanupOldProgress
};
