# Troubleshooting Guide

## Issue: No Graph Displayed

### Step 1: Check Extension Development Host is Running

1. In your main VS Code window, press **F5**
2. A new window should open with title **"[Extension Development Host]"**
3. If not, check the terminal for errors

### Step 2: Check Trace Server Started

In the Extension Development Host window:
1. Look at the **bottom status bar**
2. You should see a status item (may be small text)
3. Open Command Palette: `Cmd+Shift+P`
4. Type: "Blind: Start Trace Server"
5. Press Enter
6. Check terminal in main VS Code for messages

### Step 3: Open Developer Tools

In the Extension Development Host:
1. Go to menu: **Help** → **Toggle Developer Tools**
2. Click the **Console** tab
3. Look for any RED errors
4. Look for messages about the webview loading

### Step 4: Open the Visualizer

1. In Extension Development Host, press `Cmd+Shift+P`
2. Type: "Blind: Show Execution Flow Visualizer"
3. Press Enter
4. A panel should open on the side

**Check in Developer Tools Console for:**
- ✅ "Webview is ready" - Good!
- ❌ CSP errors - Content Security Policy blocking scripts
- ❌ 404 errors - Files not found
- ❌ Module errors - JavaScript loading issues

### Step 5: Check Webview Content

In Developer Tools:
1. Click the **Elements** tab
2. Look for an iframe with "webview" in the src
3. Click on that iframe
4. Check if the HTML has a `<div id="root">` element
5. Check if that div has any children (React components)

### Step 6: Run Python Script

```bash
cd /Users/animeshdhillon/myProjects/blind/blind
PYTHONPATH=/Users/animeshdhillon/myProjects/blind/blind:$PYTHONPATH python3 -m python examples/sample.py
```

**Expected output:**
```
[Blind Tracer] Starting tracer...
[Blind Tracer] Connecting to localhost:9876
[Blind Tracer] Running: examples/sample.py
------------------------------------------------------------
[Blind Tracer] Connected to VS Code at localhost:9876
[Blind Tracer] Tracing started
=== Blind Execution Flow Tracer Demo ===
...
```

**If you see "Failed to connect":**
- Trace server is not running
- Port 9876 is blocked
- Check main VS Code terminal for trace server logs

### Step 7: Check if Events Arrive

In Developer Tools Console, you should see messages as events arrive:
- Check for "traceData" messages
- Check state updates in React DevTools if installed

## Common Issues

### Issue 1: Webview Shows Empty White Screen

**Symptoms:**
- Visualizer opens but shows nothing
- No empty state message
- Just blank

**Cause:** JavaScript not loading or CSP blocking

**Fix:**
1. Check Developer Tools Console for errors
2. Rebuild: `npm run compile`
3. Reload Extension Development Host: `Cmd+R`
4. Try again

### Issue 2: Empty State Shows But No Nodes

**Symptoms:**
- See "Execution Flow Visualizer" message
- See "Start the trace server..." text
- Python runs but nodes don't appear

**Cause:** Events not reaching webview

**Fix:**
1. Check trace server is running (status bar)
2. Check Python output shows "Connected to VS Code"
3. Check Developer Tools Console for "traceData" messages
4. Try clicking "Show all lines" checkbox

### Issue 3: CSP Errors in Console

**Symptoms:**
```
Refused to load script ... violates Content Security Policy
```

**Cause:** Our CSP is too strict

**Fix:**
Already fixed in latest code. Make sure you rebuilt:
```bash
npm run compile
```

### Issue 4: Module Loading Errors

**Symptoms:**
```
Failed to load module script
The server responded with a non-JavaScript MIME type
```

**Cause:** Script tag needs `type="module"`

**Fix:**
Already fixed in latest code. Rebuild and reload.

### Issue 5: React Not Rendering

**Symptoms:**
- No errors in console
- `<div id="root">` is empty
- No React components visible

**Possible causes:**
1. React not loading
2. Vite build issue
3. Path resolution problem

**Debug steps:**
```bash
# Check if main.js exists and is not empty
ls -lah dist/webview/assets/main.js

# Should be around 365-375KB
# If 0KB or missing, rebuild:
npm run build:webview

# Check the content starts with JS code
head -20 dist/webview/assets/main.js
```

### Issue 6: Trace Server Won't Start

**Symptoms:**
- Command runs but nothing happens
- Status bar doesn't change

**Fix:**
1. Check main VS Code Debug Console for errors
2. Try stopping and starting:
   - `Cmd+Shift+P` → "Blind: Stop Trace Server"
   - `Cmd+Shift+P` → "Blind: Start Trace Server"
3. Check if port 9876 is in use:
   ```bash
   lsof -i :9876
   ```

## Debug Checklist

Run through this checklist:

```
□ Extension Development Host launched (F5)
□ No errors in main VS Code Debug Console
□ Trace server started (check status bar)
□ Visualizer panel opened
□ Developer Tools opened in Extension Development Host
□ No CSP errors in Console
□ No 404 errors in Console
□ Webview iframe exists in Elements tab
□ <div id="root"> exists and has children
□ Python script runs without errors
□ Python shows "Connected to VS Code"
□ Python shows "Tracing started"
□ Developer Tools shows "Webview is ready"
□ Sample.py completes successfully
```

If all checked and still no graph:

## Nuclear Option: Clean Rebuild

```bash
# Clean everything
rm -rf dist/
rm -rf node_modules/
rm -rf webview/node_modules/

# Reinstall
npm install

# Rebuild
npm run compile

# Reload Extension Development Host
# Press F5 again to restart
```

## Still Not Working?

### Collect Debug Info

In Developer Tools Console, run:
```javascript
// Check if VS Code API is available
console.log('vscode API:', typeof acquireVsCodeApi);

// Check if root exists
console.log('root element:', document.getElementById('root'));

// Check if React loaded
console.log('React:', typeof React);

// Check window.location
console.log('location:', window.location.href);
```

Copy all output and the full console log.

### Check File Permissions

```bash
ls -la dist/webview/assets/
# All files should be readable (r-- in permissions)

ls -la dist/extension.js
# Should be readable
```

## Manual Verification Steps

### 1. Verify WebView HTML Loads

Add temporary logging to `FlowVisualizerPanelNew.ts`:

```typescript
private _getHtmlForWebview(webview: vscode.Webview): string {
    const html = `<!DOCTYPE html>...`;
    console.log('Generated HTML:', html); // ADD THIS
    return html;
}
```

Rebuild and check if HTML is logged correctly.

### 2. Verify React App Starts

Add to `webview/src/main.tsx`:

```typescript
console.log('🚀 React app starting...');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('✅ React app rendered');
```

Rebuild webview and check console.

### 3. Verify Events Received

Add to `webview/src/App.tsx`:

```typescript
const handleMessage = (message: Message) => {
    console.log('📨 Received message:', message.type, message.data); // ADD THIS
    switch (message.type) {
      case 'traceData':
        console.log('📊 Adding event:', message.data); // ADD THIS
        // ...
    }
};
```

---

If none of this helps, please share:
1. Complete Developer Tools Console output
2. Main VS Code Debug Console output
3. Python terminal output
4. Screenshots of the empty visualizer
