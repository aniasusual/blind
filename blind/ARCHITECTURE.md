# Blind - Architecture Documentation

## Overview

Blind is a VS Code extension that transforms debugging from reading static code into watching live execution flows with real-time visualization and code editing capabilities.

## Technology Stack

### Frontend (Webview)
- **React 19** - Modern UI framework
- **React Flow 11** - Professional graph visualization with pan/zoom/drag
- **Monaco Editor** - VS Code's own editor (code viewing & editing in nodes)
- **Zustand** - Lightweight state management
- **Immer** - Immutable state updates
- **Vite** - Fast build tool with HMR

### Backend (VS Code Extension)
- **TypeScript** - Type-safe extension development
- **VS Code Extension API** - Core extension functionality
- **WebSocket Server** - Real-time communication with Python tracer
- **File System Watcher** - Sync file changes to webview

### Python Tracer
- **sys.settrace** - Python execution tracing
- **AST** - Abstract syntax tree analysis
- **Socket Client** - Send events to VS Code
- **JSON** - Event serialization

## Project Structure

```
blind/
├── src/                          # Extension source (TypeScript)
│   ├── extension.ts              # Extension entry point
│   ├── TraceServer.ts            # WebSocket server for Python tracer
│   ├── FlowVisualizerPanelNew.ts # Webview panel manager
│   └── FlowVisualizerPanel.ts    # (Old vanilla JS version - deprecated)
│
├── webview/                      # React webview source
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExecutionNode.tsx    # Custom React Flow node with Monaco
│   │   │   ├── FlowCanvas.tsx       # Main React Flow canvas
│   │   │   └── Toolbar.tsx          # Control toolbar
│   │   ├── hooks/
│   │   │   └── useVSCode.ts         # VS Code API communication
│   │   ├── store/
│   │   │   └── useStore.ts          # Zustand state management
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript type definitions
│   │   ├── App.tsx                  # Main React app
│   │   ├── App.css                  # Styles
│   │   └── main.tsx                 # React entry point
│   ├── index.html               # HTML template
│   ├── vite.config.ts           # Vite configuration
│   └── tsconfig.json            # TypeScript config for webview
│
├── python/                       # Python tracer
│   ├── __init__.py              # Package initialization
│   ├── __main__.py              # CLI entry point
│   └── tracer.py                # Execution tracer implementation
│
├── examples/
│   └── sample.py                # Example Python script for testing
│
└── dist/                         # Built files
    ├── extension.js             # Compiled extension
    └── webview/                 # Built React app
        └── assets/
            ├── main.js          # Bundled React app (~373KB)
            └── main.css         # Bundled styles (~12KB)
```

## Data Flow

### 1. Execution Tracing Flow

```
Python Script
    ↓ (runs with sys.settrace)
Python Tracer (tracer.py)
    ↓ (captures events)
Socket Connection (port 9876)
    ↓ (JSON over TCP)
TraceServer (Extension)
    ↓ (forwards to webview)
React Webview
    ↓ (renders with React Flow)
Interactive Graph Visualization
```

### 2. Code Editing Flow

```
User clicks "Edit" on Node
    ↓
Monaco Editor in Node
    ↓ (user types)
WebviewpostMessage('codeChanged')
    ↓
Extension receives message
    ↓
vscode.workspace.applyEdit()
    ↓
File Updated on Disk
    ↓
Extension sends 'fileUpdated' back
    ↓
Webview updates affected nodes
```

### 3. Navigation Flow

```
User clicks Node
    ↓
Webview.postMessage('nodeClicked')
    ↓
Extension opens file
    ↓
vscode.window.showTextDocument()
    ↓
Editor jumps to line
    ↓
User sees source code
```

## Key Components

### ExecutionNode (React Component)

Custom React Flow node with:
- **Collapsed state**: Shows function name, type, single line of code
- **Expanded state**: Shows full Monaco editor with code
- **Edit mode**: Monaco becomes editable, Save/Cancel buttons appear
- **Event handlers**: Click to navigate, expand/collapse, edit/save

Features:
- Color-coded by event type
- Execution timing display
- Icon for entity type
- Bidirectional sync with files

### FlowCanvas (React Component)

Main visualization canvas using React Flow:
- **Auto-layout**: Positions nodes based on call stack depth and time
- **Edge rendering**: Connects parent→child executions
- **Mini-map**: Overview of entire execution
- **Controls**: Zoom, fit view, lock
- **Legend**: Color guide for node types

### TraceServer (TypeScript Class)

WebSocket server that:
- Listens on port 9876
- Accepts connections from Python tracer
- Parses JSON events
- Forwards to active webview panel
- Maintains event buffer for statistics

### useStore (Zustand Store)

Global state management:
```typescript
{
  events: TraceEvent[],        // All captured events
  isPaused: boolean,           // Pause new events
  showAllLines: boolean,       // Filter simple lines
  autoScroll: boolean,         // Auto-scroll to new
  selectedNodeId: string | null, // Current selection
}
```

## Message Protocol

### Python → Extension (TraceServer)

```json
{
  "event_type": "function_call",
  "timestamp": 1234567890.123,
  "event_id": 1,
  "file_path": "/path/to/file.py",
  "line_number": 42,
  "function_name": "fibonacci",
  "class_name": null,
  "module_name": "__main__",
  "line_content": "def fibonacci(n):",
  "call_stack_depth": 0,
  "parent_event_id": null,
  "scope_id": "__main__::fibonacci::0",
  "entity_data": {
    "arguments": {"n": "5"},
    "is_method": false
  },
  "execution_time": null
}
```

### Webview ↔ Extension

**Webview → Extension:**
```typescript
// User clicked a node
{ type: 'nodeClicked', data: { filePath: string, line: number } }

// User edited code
{ type: 'codeChanged', data: { nodeId: number, filePath: string, lineNumber: number, newCode: string } }

// Export requested
{ type: 'export', data: string }

// Ready signal
{ type: 'ready' }
```

**Extension → Webview:**
```typescript
// New trace event
{ type: 'traceData', data: TraceEvent }

// File was updated
{ type: 'fileUpdated', data: { filePath: string, lineNumber: number, newCode: string } }
```

## Build Process

### Development

```bash
npm run watch
```

Runs three parallel watch processes:
1. `watch:esbuild` - Rebuilds extension on src/ changes
2. `watch:tsc` - Type checks extension code
3. `watch:webview` - Vite dev server for webview (hot reload)

### Production

```bash
npm run package
```

Steps:
1. Build webview: `cd webview && vite build`
   - Output: `dist/webview/assets/main.js` + `main.css`
2. Type check: `tsc --noEmit`
3. Lint: `eslint src`
4. Bundle extension: `node esbuild.js --production`
   - Output: `dist/extension.js`

## Security

### Content Security Policy

The webview has a strict CSP:
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  style-src ${webview.cspSource} 'unsafe-inline';
  script-src 'nonce-${nonce}';
  font-src ${webview.cspSource};
  img-src ${webview.cspSource} data: https:;
  connect-src ${webview.cspSource} https:;
">
```

- Scripts only from nonce-tagged sources
- Styles from extension or inline
- Fonts and images from extension
- Network requests for Monaco workers

## Performance Considerations

### Event Filtering

- By default, simple line executions are hidden
- Only events with interesting AST patterns shown
- User can toggle "Show all lines"

### Node Rendering

- React Flow uses virtualization
- Only visible nodes are in DOM
- Smooth pan/zoom even with 1000+ nodes

### Monaco Editor

- Editors lazy-loaded only when node expanded
- Read-only by default (less overhead)
- Editable only when "Edit" clicked

### State Management

- Zustand with Immer for efficient updates
- Immutable patterns prevent unnecessary re-renders
- Events appended, not replaced

## Future Enhancements

### Phase 2: AI Integration

```typescript
interface AIAgent {
  analyzeExecution(trace: TraceEvent[]): AnalysisReport;
  suggestFix(error: Exception, context: ExecutionContext): Fix[];
  optimizeFunction(function: FunctionNode): OptimizedCode;
  explainBehavior(nodes: Node[]): Explanation;
}
```

Architecture:
- Add `AIService` class in extension
- Integrate Claude API with 200K context
- Stream AI responses to chat panel
- Apply AI suggestions to code via edits

### Phase 3: Time Travel

- Store complete execution history
- Add timeline scrubber component
- Replay executions forward/backward
- Compare multiple runs side-by-side

### Phase 4: Collaboration

- Export traces as shareable URLs
- Real-time collaborative debugging sessions
- Yjs for CRDT-based sync
- WebSocket server for multi-user

### Phase 5: Advanced Features

- Hot reload: Edit + re-run without restart
- Breakpoint visualization in graph
- Memory profiling overlay
- Performance heatmap
- Test generation from traces
- CI/CD integration

## Configuration

### Extension Settings (Future)

```json
{
  "blind.traceServer.port": 9876,
  "blind.traceServer.host": "localhost",
  "blind.filtering.showAllLines": false,
  "blind.autoScroll.enabled": true,
  "blind.ai.provider": "claude",
  "blind.ai.apiKey": "sk-..."
}
```

### Python Tracer Config (Future)

```python
tracer = ExecutionTracer(
    host='localhost',
    port=9876,
    exclude_files=['/path/to/exclude'],
    exclude_modules=['django', 'flask'],
    max_events=10000,
    sampling_rate=1.0
)
```

## Testing

### Manual Testing

1. Launch Extension Development Host (F5)
2. Start trace server
3. Open visualizer
4. Run sample.py
5. Verify nodes appear, clicking works, editing works

### Unit Tests (Future)

- Extension: Mocha + VS Code test runner
- Webview: Vitest + React Testing Library
- Python: pytest

### Integration Tests (Future)

- End-to-end: Playwright
- Trace various Python patterns
- Verify correct visualization
- Test code sync accuracy

## Debugging

### Extension
- Use VS Code debugger (F5)
- Set breakpoints in `src/`
- View logs in Debug Console

### Webview
- Open Developer Tools in Extension Development Host
- Check Console for errors
- Use React DevTools

### Python Tracer
- Add print statements
- Check socket connection
- Verify JSON serialization

## Dependencies

### Extension
- `vscode` - VS Code API (peer dependency)

### Webview
- `react` ^19.2.0
- `react-dom` ^19.2.0
- `reactflow` ^11.11.4
- `monaco-editor` ^0.55.1
- `@monaco-editor/react` ^4.7.0
- `zustand` ^5.0.8
- `immer` ^11.0.1

### Python
- None (uses stdlib only)

## License

TBD

---

For setup instructions, see [TEST_GUIDE.md](./TEST_GUIDE.md)
For usage instructions, see [USAGE.md](./USAGE.md)
