# Testing the New React Flow + Monaco Setup

##🎉 What's New

We've completely rebuilt the visualizer with:
- **React Flow** - Professional graph visualization with pan/zoom/drag
- **Monaco Editor** - VS Code's editor built into each node
- **Bidirectional sync** - Edit code in nodes and it updates the actual files
- **Modern architecture** - Built for future AI agent integration

## Testing Steps

### 1. Build the Extension

```bash
cd /Users/animeshdhillon/myProjects/blind/blind
npm run compile
```

### 2. Launch Extension Development Host

- Press **F5** in VS Code
- This opens a new window with the extension loaded

### 3. Start Trace Server

In the Extension Development Host window:
- Press `Cmd+Shift+P`
- Type: "Blind: Start Trace Server"
- Press Enter
- You should see a status bar item change to "Blind: Running"

### 4. Open the Visualizer

- Press `Cmd+Shift+P`
- Type: "Blind: Show Execution Flow Visualizer"
- Press Enter
- A webview panel opens showing the React Flow canvas

### 5. Run Sample Python Script

Open a terminal and run:

```bash
cd /Users/animeshdhillon/myProjects/blind/blind
PYTHONPATH=/Users/animeshdhillon/myProjects/blind/blind:$PYTHONPATH python3 -m python examples/sample.py
```

### 6. Watch the Magic! ✨

You should see:
- **Animated nodes** appearing in the graph as code executes
- **Color-coded nodes**:
  - Blue = Function calls
  - Green = Returns
  - Purple = Loops
  - Orange = Conditionals
  - Red = Exceptions
  - Cyan = Variable assignments

- **Interactive features**:
  - Pan by dragging the canvas
  - Zoom with mouse wheel
  - Drag nodes to rearrange
  - Mini-map in bottom right
  - Legend showing node types

### 7. Click on a Node

When you click any node:
- The node gets highlighted with a blue border
- Your editor should jump to that line of code in the source file

### 8. Expand a Node and Edit Code

- Click the **⛶ (expand)** button on any function node
- The node expands showing a Monaco editor with the code
- Click the **✏️ (edit)** button
- **Edit the code** directly in the node
- Click **💾 Save**
- The actual file should be updated!

### 9. Test the Features

**Toolbar buttons**:
- **🗑️ Clear** - Reset the graph
- **⏸️ Pause** - Stop receiving new events
- **💾 Export** - Save trace data as JSON

**Checkboxes**:
- **Auto-scroll** - Automatically show newest nodes
- **Show all lines** - Include simple line executions

**Pan & Zoom**:
- Drag anywhere to pan
- Mouse wheel to zoom
- Controls in bottom-left for zoom/fit/lock

## What to Look For

### ✅ Success Indicators

1. **Nodes appear as code runs** - real-time streaming
2. **Clicking nodes jumps to source** - bidirectional navigation
3. **Can expand nodes** - Monaco editor shows up
4. **Can edit code** - changes save to files
5. **Pan/zoom works smoothly** - React Flow canvas
6. **Mini-map shows overview** - helpful for large traces
7. **Legend shows node types** - color reference

### ❌ Potential Issues

If visualizer is empty:
- Check trace server is running (status bar)
- Check Python script runs successfully
- Check terminal shows "Connected to VS Code"
- Check Developer Console for errors (`Help` → `Toggle Developer Tools`)

If nodes don't appear:
- Try checking "Show all lines"
- Make sure script actually executes functions

If code edit doesn't save:
- Check file permissions
- Check Developer Console for errors
- Try editing a simpler file

## Next Steps

Once basic flow works, we can add:
1. **AI Agent Integration** - Claude API for code analysis
2. **Time Travel Debugging** - Replay executions
3. **Hot Reload** - Re-run without restarting
4. **Collaborative Features** - Share traces
5. **Advanced Filtering** - Focus on specific code paths

## Architecture Overview

```
Extension (TypeScript)
  ├── TraceServer - Receives events from Python
  ├── FlowVisualizerPanelNew - Manages webview
  └── Webview (React + Vite)
      ├── React Flow - Graph visualization
      ├── Monaco Editor - Code editing in nodes
      ├── Zustand - State management
      └── VS Code API - Bidirectional communication

Python Tracer
  ├── sys.settrace - Captures execution
  ├── Socket client - Sends to VS Code
  └── AST analysis - Identifies code patterns
```

## Development Tips

**Watch mode** for development:
```bash
npm run watch
```

This runs:
- `watch:esbuild` - Rebuilds extension on change
- `watch:tsc` - Type checks on change
- `watch:webview` - Hot reload for React (use separately if needed)

**Rebuild just the webview**:
```bash
npm run build:webview
```

**Check the built files**:
```bash
ls -lah dist/webview/assets/
```

You should see:
- `main.js` (~373KB) - React app with all dependencies
- `main.css` (~12KB) - Styles

## Debugging

**VS Code Extension**:
- In Extension Development Host, press `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
- Check Console tab for errors

**React Webview**:
- In Developer Tools, look for messages from webview
- Check Network tab to verify assets load

**Python Tracer**:
- Check terminal output for connection messages
- Verify socket connection succeeds

---

Happy testing! 🚀
