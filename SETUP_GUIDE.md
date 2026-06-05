# QAgent - Detailed Setup Guide for Windows

This guide will help you set up QAgent step-by-step on Windows.

---

## ✅ Prerequisites Checklist

- [ ] Windows 10/11 (any version)
- [ ] Administrator access (for installing software)
- [ ] Internet connection (to download dependencies)
- [ ] About 500MB free disk space

---

## 📥 Step 1: Install Node.js

### What is Node.js?
Node.js is a JavaScript runtime that allows you to run JavaScript on your computer.

### Installation Steps

1. Go to https://nodejs.org/
2. Download the **LTS (Long Term Support)** version
3. Run the installer (`.msi` file)
4. Click "Next" through all prompts
5. Accept the license agreement
6. Choose "Add to PATH" (should be default)
7. Click "Install"
8. Wait for installation to complete
9. Click "Finish"

### Verify Installation

1. Open Command Prompt (press `Win + R`, type `cmd`, press Enter)
2. Type: `node --version`
3. Press Enter
4. You should see a version number like `v18.0.0`

If you see an error, try:
- Restarting Command Prompt
- Restarting your computer
- Reinstalling Node.js

---

## 🦙 Step 2: Install Ollama

### What is Ollama?
Ollama is a local Large Language Model (LLM) that runs on your computer. It's used to generate test cases using AI.

### Installation Steps

1. Go to https://ollama.ai/
2. Click "Download" button
3. Download the Windows version
4. Run the installer (`.exe` file)
5. Click "Install"
6. Wait for installation
7. Click "Finish"
8. Ollama will launch automatically

### Verify Installation

1. Look for Ollama in your system tray (bottom right)
2. It should show a running status

### Download the Model

1. Open Command Prompt
2. Type: `ollama run gemma4:e4b`
3. Press Enter
4. Wait for the model to download (first time only, ~2-5 GB)
5. You'll see: `>>> ` prompt when ready
6. Type: `exit` to close
7. Keep Ollama running in the background

---

## 📦 Step 3: Set Up QAgent Project

### Clone or Download

1. Download QAgent project
2. Extract it to a location like `C:\Users\YourUsername\Documents\QAgent`
3. Note the path for later

### Open Command Prompt in Project Directory

1. Go to your QAgent folder
2. Right-click in empty space
3. Click "Open PowerShell here" (or "Open Command Prompt here")
4. Or manually:
   - Open Command Prompt
   - Type: `cd C:\Users\YourUsername\Documents\QAgent`
   - Press Enter

### Install Dependencies

1. In the Command Prompt, type: `npm install`
2. Press Enter
3. Wait for all packages to install (2-3 minutes)
4. You should see:
   ```
   added 100+ packages in 2m
   ```

---

## 🚀 Step 4: Start Services

### Terminal 1: Start Ollama

1. Open a new Command Prompt
2. Ollama usually starts automatically in the background
3. Verify it's running by going to Command Prompt and typing:
   ```
   curl http://localhost:11434/api/tags
   ```
4. If it responds with JSON, Ollama is running ✓

### Terminal 2: Start QAgent Server

1. Open a new Command Prompt
2. Navigate to QAgent folder: `cd C:\path\to\QAgent`
3. Type: `npm start`
4. Press Enter
5. Wait for the message:
   ```
   ╔════════════════════════════════════╗
   ║  QAgent Server Started! 🚀         ║
   ╠════════════════════════════════════╣
   ║  Server: http://localhost:3000     ║
   ║  Environment: development          ║
   ║  Ollama: http://localhost:11434... ║
   ╚════════════════════════════════════╝
   ```

---

## 🌐 Step 5: Access QAgent

1. Open your browser (Chrome, Edge, Firefox, etc.)
2. Go to: `http://localhost:3000`
3. You should see the QAgent interface
4. It's ready to use!

---

## 📝 How to Use QAgent

### 1. Get a Postman Collection

#### Option A: Export from Postman
1. Open Postman
2. Select your collection
3. Click three dots (...)
4. Click "Export"
5. Choose JSON format
6. Save the file

#### Option B: Use Sample Collection
We've included `sample-collection.json` in the QAgent folder. You can use this to test.

### 2. Upload Collection

1. On QAgent homepage
2. Click "Choose File" or drag-and-drop your JSON file
3. Wait for parsing
4. You'll see a list of APIs from your collection

### 3. Run Tests

1. Click "Run Tests" button
2. Watch the progress in the testing section
3. QAgent will:
   - Generate test cases for each API
   - Execute each test
   - Collect results

### 4. View Results

1. See the summary stats
2. Click "View Detailed Report"
3. Beautiful HTML report opens
4. See results for each API

---

## 🔧 Troubleshooting

### Issue: "npm: command not found"
**Solution:**
- Node.js may not be installed correctly
- Restart Command Prompt
- Restart your computer
- Reinstall Node.js

### Issue: "Ollama not found"
**Solution:**
```
Error: Failed to connect to Ollama at http://localhost:11434
```
- Make sure Ollama is running
- Type in Command Prompt: `ollama list`
- If nothing happens, Ollama isn't installed
- Reinstall Ollama

### Issue: "Port 3000 already in use"
**Solution:**
- Another application is using port 3000
- Edit `.env` file and change `PORT=3000` to `PORT=3001`
- Save and restart QAgent

### Issue: "Cannot find module"
**Solution:**
- Run: `npm install` again
- Delete `node_modules` folder and run `npm install` again

### Issue: Browser shows "Cannot reach localhost:3000"
**Solution:**
1. Make sure QAgent server is running (check Command Prompt)
2. Wait 5 seconds and refresh browser (F5)
3. Try: `http://127.0.0.1:3000` instead
4. Check if firewall is blocking port 3000

### Issue: Tests won't run
**Solution:**
1. Make sure Ollama is running
2. Check Ollama has downloaded the model: `ollama list`
3. If model missing, run: `ollama run gemma4:e4b`
4. Wait for tests to generate (can take 1-2 minutes per API)

---

## 📂 Important Folders

After running tests, check these folders:

- **Uploaded Collections**: `QAgent\server\uploads\`
- **Generated Reports**: `QAgent\server\reports\`

You can open reports in any web browser.

---

## 🛑 How to Stop QAgent

### Stop QAgent Server
- In Command Prompt running QAgent
- Press: `Ctrl + C`
- Type: `Y` and press Enter

### Stop Ollama
- Right-click Ollama in system tray
- Click "Quit"

---

## ⚡ Quick Commands Reference

```powershell
# Navigate to QAgent folder
cd C:\path\to\QAgent

# Install dependencies (first time only)
npm install

# Start QAgent server
npm start

# Check Node.js version
node --version

# Check npm version
npm --version

# Check Ollama status
curl http://localhost:11434/api/tags

# Download Ollama model
ollama run gemma4:e4b

# List Ollama models
ollama list

# Start Ollama manually (if not auto-starting)
ollama serve
```

---

## 💡 Tips

1. **Keep Multiple Windows Open**
   - One for Ollama
   - One for QAgent server
   - Browser for interface
   - This helps you see logs and errors

2. **Check Logs**
   - QAgent server shows logs in Command Prompt
   - Look for errors if something doesn't work

3. **Use Sample Collection First**
   - `sample-collection.json` is ready to use
   - Great for testing and learning

4. **Large Collections**
   - Testing many APIs takes time
   - Start with 5-10 APIs
   - Then try larger collections

5. **Save Reports**
   - HTML reports are auto-saved in `/server/reports/`
   - You can share these reports with others

---

## 🔄 Typical Setup Session

```
Terminal 1:
> ollama serve
[Ollama running]

Terminal 2:
> cd C:\Users\YourUsername\Documents\QAgent
> npm start
[QAgent running on http://localhost:3000]

Browser:
Go to http://localhost:3000
Upload collection and run tests!
```

---

## ✨ You're All Set!

Your QAgent setup is complete. Follow the "How to Use" section above to start testing APIs.

Happy Testing! 🎉

---

## 📞 Need Help?

1. Check the README.md file
2. Look at console logs for error messages
3. Make sure all prerequisites are installed
4. Ensure Ollama model is downloaded

---

## 🎓 Learning Resources

- **Node.js**: https://nodejs.org/docs/
- **Ollama**: https://github.com/ollama/ollama
- **Postman**: https://learning.postman.com/
- **APIs**: https://httpbin.org/ (for testing)

---

Happy API Testing! 🚀
