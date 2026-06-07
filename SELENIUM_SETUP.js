#!/usr/bin/env node
// ============================================
// Selenium WebDriver Setup for QAgent
// ============================================
// This guide helps you set up Selenium WebDriver for real screenshot capture
// during automation testing execution.

/**
 * INSTALLATION STEPS:
 * 
 * 1. Install required npm packages:
 *    npm install selenium-webdriver
 * 
 * 2. Download ChromeDriver:
 *    - Visit: https://chromedriver.chromium.org/
 *    - Download version matching your Chrome browser version
 *    - Extract to a known location (e.g., ./chromedriver/)
 *    - Add to PATH or update Selenium configuration
 * 
 * 3. Install Chrome Browser (if not already installed):
 *    - Windows: Download from https://www.google.com/chrome/
 *    - macOS: brew install google-chrome
 *    - Linux: apt-get install google-chrome-stable
 * 
 * 4. Verify installation:
 *    - Run: chromedriver --version
 *    - Run: google-chrome --version (or chrome --version on Windows)
 * 
 * CONFIGURATION:
 * 
 * Set environment variables:
 *    CHROMEDRIVER_PATH=/path/to/chromedriver
 *    CHROME_BIN=/path/to/chrome
 * 
 * Or update the automation service to use your custom paths.
 * 
 * SCREENSHOT CAPTURE:
 * 
 * Screenshots are automatically captured during script execution.
 * They are saved to: server/screenshots/
 * And embedded as base64 in the automation report.
 * 
 * TROUBLESHOOTING:
 * 
 * - If screenshots are not captured, check:
 *   1. Chrome/Chromium is installed
 *   2. ChromeDriver version matches Chrome version
 *   3. Screenshots directory exists with write permissions
 *   4. Selenium WebDriver script includes takeScreenshot() calls
 * 
 * - For headless execution (without GUI):
 *   Update generated script to use ChromeOptions:
 *   const options = new chrome.Options();
 *   options.addArguments('--headless');
 *   options.addArguments('--disable-gpu');
 *   const driver = await new Builder()
 *     .forBrowser('chrome')
 *     .setChromeOptions(options)
 *     .build();
 */

console.log(`
╔════════════════════════════════════════════════════╗
║  QAgent - Selenium WebDriver Setup Guide          ║
╠════════════════════════════════════════════════════╣
║  Real screenshot capture requires:                 ║
║  1. Node.js selenium-webdriver package             ║
║  2. ChromeDriver executable (matching Chrome ver.) ║
║  3. Google Chrome or Chromium browser              ║
║                                                    ║
║  Install: npm install selenium-webdriver          ║
║  Verify: chromedriver --version                   ║
╚════════════════════════════════════════════════════╝
`);

module.exports = {
  setupGuide: true,
  requirements: [
    'Node.js (v14+)',
    'npm (selenium-webdriver)',
    'Google Chrome / Chromium',
    'ChromeDriver (matching Chrome version)'
  ],
  screenshotsDir: './server/screenshots',
  defaultTimeout: 60000,
  headlessMode: false,
  documentation: 'See inline comments above for complete setup instructions'
};
