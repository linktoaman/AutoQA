const { execSync } = require('child_process');
const path = require('path');

function runCommand(cmd) {
  try {
    const out = execSync(cmd, { timeout: 5000, stdio: ['ignore', 'pipe', 'pipe'] });
    return out.toString().trim();
  } catch (err) {
    return null;
  }
}

function detectChromeBinary() {
  // Check env var first
  const envPath = process.env.CHROME_BIN || process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath) {
    return { path: envPath, source: 'env' };
  }

  // Try common binary names
  const candidates = [
    'google-chrome-stable',
    'google-chrome',
    'chromium-browser',
    'chromium'
  ];

  for (const c of candidates) {
    const version = runCommand(`${c} --version`);
    if (version) return { path: c, source: 'path', version };
  }

  return null;
}

function detectChromedriver() {
  const candidates = [
    'chromedriver',
    'chromedriver.exe'
  ];
  for (const c of candidates) {
    const version = runCommand(`${c} --version`);
    if (version) return { path: c, source: 'path', version };
  }
  return null;
}

function checkSeleniumBinaries() {
  const chrome = detectChromeBinary();
  const chromedriver = detectChromedriver();

  const ok = !!(chrome && chromedriver);
  const details = {
    chrome: chrome || { path: null },
    chromedriver: chromedriver || { path: null },
    CHROME_BIN_env: process.env.CHROME_BIN || null
  };

  return { ok, details };
}

module.exports = { checkSeleniumBinaries };
