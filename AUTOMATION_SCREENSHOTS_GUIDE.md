# QAgent Automation Testing - Screenshot Capture Setup

## Overview
The Automation Testing module now captures **real screenshots** during Selenium automation execution. Screenshots are embedded as base64-encoded images in the HTML reports and gallery.

## How Screenshot Capture Works

### Flow
1. User provides manual test cases or uploads a file
2. Ollama LLM generates a Selenium WebDriver script with screenshot capture code
3. Script is executed via Node.js child process
4. `driver.takeScreenshot()` captures PNG images at each step
5. Screenshots are saved to `server/screenshots/` directory
6. Images are converted to base64 and embedded in results
7. Screenshots appear in the UI gallery and HTML report

### Generated Script Features
The automation service automatically injects screenshot capture into generated scripts:

```javascript
async function captureScreenshot(stepName) {
  try {
    const screenshot = await driver.takeScreenshot();
    const screenshotPath = path.join(screenshotsDir, `automation-screenshot-${counter}.png`);
    fs.writeFileSync(screenshotPath, screenshot, 'base64');
    console.log(`[Screenshot ${counter}] ${stepName}`);
    counter++;
  } catch (err) {
    console.error('Failed to capture screenshot:', err.message);
  }
}
```

## Installation & Setup

### 1. Install Selenium WebDriver
```bash
npm install selenium-webdriver
```

### 2. Download ChromeDriver
- Visit: https://chromedriver.chromium.org/
- Download version **matching your Chrome version**
- Place in a known location or add to PATH

### 3. Verify Installation
```bash
chromedriver --version
google-chrome --version  # or 'chrome --version' on Windows
```

### 4. (Optional) Set Environment Variables
```bash
# Windows
setx CHROMEDRIVER_PATH "C:\path\to\chromedriver.exe"
setx CHROME_BIN "C:\Program Files\Google\Chrome\Application\chrome.exe"

# macOS/Linux
export CHROMEDRIVER_PATH=/path/to/chromedriver
export CHROME_BIN=/path/to/google-chrome
```

## Configuration

### Screenshot Directory
Screenshots are automatically saved to:
```
server/screenshots/
```

Ensure this directory has write permissions.

### Headless Execution (No GUI)
For headless mode (useful for CI/CD), the generated script can include:

```javascript
const options = new chrome.Options();
options.addArguments('--headless');
options.addArguments('--disable-gpu');
options.addArguments('--no-sandbox');
const driver = await new Builder()
  .forBrowser('chrome')
  .setChromeOptions(options)
  .build();
```

## Troubleshooting

### Screenshots Not Capturing
**Check:**
1. Is Chrome/Chromium installed? 
   ```bash
   google-chrome --version
   ```
2. Does ChromeDriver version match Chrome?
   ```bash
   chromedriver --version
   ```
3. Is `server/screenshots/` directory writable?
4. Are there Node.js permission issues?

**Solution:**
- Update ChromeDriver to match Chrome version
- Check file permissions: `chmod 777 server/screenshots/`
- Run with elevated privileges if needed

### Script Execution Timeout
If scripts timeout (60 seconds default):
1. Check for blocking selectors that don't exist
2. Add explicit waits in script:
   ```javascript
   await driver.wait(until.elementLocated(By.id('selector')), 10000);
   ```
3. Increase timeout in `automationService.js`

### Browser Not Launching
- Verify Chrome path in environment
- Check if Chrome is already running and locking the port
- Try headless mode to avoid GUI issues

## API Endpoints

### POST `/api/automation/prepare`
Generates Selenium script from test cases.
**Response includes:** `generatedScript`, `sessionId`

### POST `/api/automation/run`
Executes script and captures screenshots.
**Response includes:**
```json
{
  "summary": {
    "totalSteps": 3,
    "passedSteps": 3,
    "failedSteps": 0,
    "passRate": 100,
    "durationMs": 5520
  },
  "steps": [...],
  "screenshots": [
    {
      "filename": "automation-screenshot-1.png",
      "caption": "Step 1 - Launch browser...",
      "details": "Chrome launched successfully",
      "imageData": "data:image/png;base64,..."
    }
  ],
  "logs": [...]
}
```

### POST `/api/automation/report`
Generates HTML report with embedded screenshots.
**Response includes:** `reportFilename` (accessible via `/api/report/view/{filename}`)

## Example Usage

1. **Manual Test Case:**
   ```
   1. Open https://example.com
   2. Fill login form with credentials
   3. Click submit button
   4. Verify dashboard loads
   5. Click profile icon
   6. Verify profile page displays
   ```

2. **Generated Selenium Script (partial):**
   ```javascript
   await driver.get('https://example.com');
   await captureScreenshot('Application loaded');
   
   const username = await driver.findElement(By.id('username'));
   await username.sendKeys('user@example.com');
   
   const password = await driver.findElement(By.id('password'));
   await password.sendKeys('password123');
   await captureScreenshot('Form filled');
   
   const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
   await submitBtn.click();
   await driver.wait(until.elementLocated(By.id('dashboard')), 10000);
   await captureScreenshot('Dashboard loaded');
   ```

3. **Captured Screenshots:**
   - Step 1: Application loaded
   - Step 2: Form filled
   - Step 3: Dashboard loaded
   - (All embedded in HTML report)

## Report Output

Generated reports include:
- ✅ Execution summary with metrics
- ✅ Step-by-step logs
- ✅ Screenshot gallery with captions
- ✅ Pass/fail status
- ✅ Execution time breakdown
- ✅ Full error details if failures occur

## Best Practices

1. **Clear Selectors:** Use specific IDs or CSS classes
   ```javascript
   // Good
   By.id('login-button')
   By.css('[data-testid="submit"]')
   
   // Avoid
   By.xpath('//div[1]/button[2]')
   ```

2. **Explicit Waits:** Don't rely on fixed delays
   ```javascript
   // Good
   await driver.wait(until.elementLocated(By.id('result')), 10000);
   
   // Avoid
   await driver.sleep(5000);
   ```

3. **Strategic Screenshots:** Capture at meaningful points
   ```javascript
   await captureScreenshot('Before form submission');
   await submitForm();
   await captureScreenshot('After form submission');
   ```

4. **Error Handling:** Capture on failures
   ```javascript
   try {
     // test actions
   } catch (error) {
     await captureScreenshot('Error state');
     throw error;
   }
   ```

## Performance Notes

- Screenshot capture adds ~500ms per screenshot
- PNG compression happens automatically
- Base64 encoding suitable for reports up to 50 screenshots
- For larger test suites, consider external storage

## Future Enhancements

- [ ] S3/Cloud storage for large screenshot sets
- [ ] Video recording of full automation run
- [ ] Diff comparison with baseline screenshots
- [ ] OCR-based validation of UI elements
- [ ] Parallel execution support
- [ ] Integration with CI/CD pipelines (GitHub Actions, Jenkins)
