# Complete Setup & Testing Guide

## ✅ Everything is Ready!

Your new file-based execution flow visualizer is complete and compiled. Here's how to test it:

## Quick Start (5 Minutes)

### 1. Launch Extension Development Host

```bash
# In VS Code, open the blind project
cd /Users/animeshdhillon/myProjects/blind/blind

# Press F5 (or Run → Start Debugging)
# A new "Extension Development Host" window opens
```

### 2. Start the Trace Server

In the Extension Development Host window:
```
Cmd+Shift+P → "Blind: Start Trace Server"
```

You'll see: "Blind trace server started on port 9876"

### 3. Open the Flow Visualizer

```
Cmd+Shift+P → "Blind: Show Flow Visualizer"
```

A new panel opens with the empty state screen.

### 4. Run the Example

Open a terminal in the Extension Development Host:

```bash
cd /Users/animeshdhillon/myProjects/blind/blind/examples/multi_file_example
python -m blind main.py
```

### 5. Watch the Magic! 🎉

You should now see:

**In the Terminal:**
```
[Blind Tracer] Starting tracer...
[Blind Tracer] Project root: .../multi_file_example
[Blind Tracer] Connected to VS Code at localhost:9876
Running calculator example...
5 + 3 = 8
...
```

**In the Flow Visualizer:**

1. **Project Summary Bar** appears showing:
   - 3 files
   - 2 cross-file calls
   - ~45 lines executed

2. **Cross-File Calls Section** shows:
   - main.py → calculator.py
   - calculator.py → utils.py

3. **File Blocks** appear in sequence:
   - **main.py** with complete code
   - Arrow down
   - **calculator.py** with complete code
   - Arrow down
   - **utils.py** with complete code

4. **Executed lines highlighted in green**

5. **Click any line** → jumps to that line in VS Code

## What You'll See

### Visual Layout

```
┌─────────────────────────────────────────────────┐
│ 🗑️ Clear  ⏸️ Pause  💾 Export                  │
│                    3 files • 45 lines • 150 events│
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ PROJECT SUMMARY                                  │
│ Files: 3  |  Cross-File Calls: 2  |  Lines: 45  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ CROSS-FILE EXECUTION FLOW                        │
│ main.py → calculator.py                          │
│ calculator.py → utils.py                         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ main.py                    [32 lines • 15 executed] │
├─────────────────────────────────────────────────┤
│  1 │ from calculator import *         (GREEN)   │
│  2 │                                             │
│  3 │ def main():                       (GREEN)   │
│  4 │     print("Running...")           (GREEN)   │
│ ... (complete file shown)                        │
│ Coverage: 47%                                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ calculator.py              [36 lines • 20 executed] │
├─────────────────────────────────────────────────┤
│  1 │ from utils import validate       (GREEN)   │
│  3 │ def add(a, b):                    (GREEN)   │
│  4 │     validate_number(a)            (GREEN)   │
│ ... (complete file shown)                        │
│ Coverage: 56%                                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ utils.py                   [30 lines • 10 executed] │
├─────────────────────────────────────────────────┤
│  1 │ def validate_number(value):      (GREEN)   │
│  2 │     if not isinstance(...):       (GREEN)   │
│ ... (complete file shown)                        │
│ Coverage: 33%                                    │
└─────────────────────────────────────────────────┘
```

## Features to Test

### 1. Line Clicking
- Click any line in a file
- VS Code should open that file at that line

### 2. File Selection
- Click anywhere on a file block
- File Details Panel appears on right side
- Shows: path, lines, coverage, events, timestamp

### 3. Clear Data
- Click "Clear" button
- Confirm dialog appears
- All data clears

### 4. Pause/Resume
- Click "Pause" button
- Run more code → nothing appears (paused)
- Click "Resume" → new events appear

### 5. Export
- Click "Export" button
- Save dialog opens
- JSON file with all project data saved

## Debugging

### Check Consoles

**1. Python Terminal**
```bash
[Blind Tracer] Connected to VS Code
[Blind Tracer] Tracing started
# Should see all execution
[Blind Tracer] Tracing stopped
[Blind Tracer] Captured X events
```

**2. VS Code Debug Console**
(In your main VS Code window, not Extension Host)
```
[Blind] File registered: main.py (32 lines)
[Blind] File registered: calculator.py (36 lines)
[Blind] Cross-file call: main.py → calculator.py
```

**3. Webview DevTools**
(Right-click in Flow Visualizer → "Open Webview Developer Tools")
```
📁 File registered: {file_path: "...", code: "..."}
🔀 Cross-file call: {from_file: "main.py", to_file: "calculator.py"}
📊 Adding trace event: {event_type: "function_call", ...}
```

### Common Issues

**"Module not found: blind"**
```bash
# Install in development mode
cd /Users/animeshdhillon/myProjects/blind/blind
pip install -e .
```

**"Port 9876 already in use"**
```bash
# Kill process using port
lsof -ti:9876 | xargs kill -9

# Or use different port
python -m blind main.py --port 9877
```

**"No files showing"**
- Check Debug Console for "[Blind] File registered" messages
- Open Webview DevTools and check for errors
- Verify trace server is running (status bar)

**"Lines not highlighting"**
- Check that `projectFiles` Map is populated (React DevTools)
- Verify `executedLines` Set has data
- Look for console errors

## Test with Your Own Project

```bash
# Navigate to your Python project
cd /path/to/your/project

# Make sure blind is installed
pip install -e /Users/animeshdhillon/myProjects/blind/blind

# Start trace server & visualizer in Extension Host

# Run your code
python -m blind your_script.py

# Watch your project's execution flow!
```

## Environment Variables

Create `.env` in your project:

```bash
BLIND_TRACER_HOST=localhost
BLIND_TRACER_PORT=9876
```

Or set directly:

```bash
export BLIND_TRACER_HOST=localhost
export BLIND_TRACER_PORT=9876
python -m blind your_script.py
```

## Build Commands Reference

```bash
# Build webview only
npm run build:webview

# Build everything (webview + extension)
npm run compile

# Watch mode (for development)
npm run watch

# Type checking
npm run check-types

# Linting
npm run lint
```

## Architecture Summary

### Data Flow

```
Python Script Runs
    ↓
Tracer captures execution
    ↓
Three message types sent:
    1. file_metadata (complete file code)
    2. cross_file_call (file transitions)
    3. trace events (line execution)
    ↓
VS Code TraceServer receives
    ↓
Routes to FlowVisualizerPanel
    ↓
React App receives via postMessage
    ↓
Store updated (projectFiles, crossFileCalls, events)
    ↓
UI re-renders showing:
    - File blocks with code
    - Executed lines highlighted
    - Cross-file arrows
    - Project summary
```

### Key Files

**Backend (Python):**
- `python/tracer.py` - Captures execution
- `python/__main__.py` - Entry point

**Extension (TypeScript):**
- `src/TraceServer.ts` - Receives messages
- `src/FlowVisualizerPanelNew.ts` - Panel management

**Frontend (React):**
- `webview/src/App.tsx` - Message handling
- `webview/src/store/useStore.ts` - State management
- `webview/src/components/FlowCanvas.tsx` - Main view
- `webview/src/components/FileBlock.tsx` - File display

## What's New

✅ **File-Based Visualization**
- Complete file code displayed
- Not just function nodes

✅ **Execution Highlighting**
- Green highlight for executed lines
- Coverage percentage per file

✅ **Cross-File Flow**
- Visual arrows between files
- Dedicated cross-file calls section

✅ **Project Summary**
- Total files, lines, events
- At-a-glance metrics

✅ **Interactive Navigation**
- Click line → jump to VS Code
- Select file → view details

✅ **Better Export**
- Exports complete project data
- Includes all files and events

## Success Criteria

Your setup is working if you see:

✅ Trace server starts successfully
✅ Flow visualizer opens
✅ Running example shows 3 file blocks
✅ Lines are highlighted in green
✅ Cross-file calls appear
✅ Clicking lines opens VS Code
✅ Coverage % is calculated
✅ No errors in any console

---

## 🎉 Congratulations!

You now have a **production-ready project-wide execution flow visualizer**!

Your vision of "watching code flow across files in real-time with complete context" is now reality.

**Next:** Try it with a real Flask/Django/FastAPI app and watch request flow across your entire codebase! 🚀