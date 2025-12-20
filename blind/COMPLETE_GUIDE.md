# Blind - Complete Developer Guide

**A VS Code extension for real-time execution flow visualization**

This guide contains everything you need to understand, modify, and extend the Blind codebase without AI assistance.

---

## Table of Contents

1. [What is Blind?](#what-is-blind)
2. [Quick Start](#quick-start)
3. [Architecture Overview](#architecture-overview)
4. [Component Deep Dive](#component-deep-dive)
5. [Data Flow & Communication](#data-flow--communication)
6. [Key Concepts](#key-concepts)
7. [Development Guide](#development-guide)
8. [Building & Testing](#building--testing)
9. [How to Extend](#how-to-extend)
10. [Troubleshooting](#troubleshooting)

---

## What is Blind?

Blind transforms debugging from reading static code into watching live execution flows. When you run Python code, Blind:

1. **Captures** every function call, line execution, loop, conditional, and exception
2. **Streams** events in real-time to VS Code via TCP
3. **Visualizes** the execution as an interactive graph with timeline playback
4. **Shows** exactly what runs, in what order, with timing and variable data

### Current Status
- ✅ **Python** - Full support with `sys.settrace()`
- 🔜 **JavaScript/TypeScript** - Planned (V8 Inspector Protocol)
- 🔜 **Go** - Planned (Runtime instrumentation)
- 🔜 **Java** - Planned (Java Agent API)

### Why This Architecture?

**Traditional Debuggers:**
- Require breakpoints
- Pause execution
- Manual stepping
- Single-language specific

**Blind:**
- No breakpoints needed
- Runs at near-full speed
- Automatic capture
- Language-agnostic protocol

We use native runtime hooks (`sys.settrace()` for Python) rather than debuggers because:
1. **Performance** - No pausing, continuous execution
2. **Complete Capture** - Everything is recorded, not just breakpoint locations
3. **Universal Protocol** - Same event format works for all languages
4. **Custom Data** - We control exactly what gets captured

---

## Quick Start

### 1. Install the Extension

From VS Code, install the extension in development mode:

```bash
# Clone and open in VS Code
cd /path/to/blind
code .

# Press F5 to launch Extension Development Host
```

### 2. Install Python Tracer

```bash
# From project root
pip install -e .

# Verify installation
python -m blind --help
```

### 3. Use Blind

```bash
# Start trace server in VS Code
Cmd+Shift+P → "Blind: Start Trace Server"

# Open visualizer
Cmd+Shift+P → "Blind: Show Execution Flow Visualizer"

# Run your Python code with tracing
python -m blind your_script.py
```

The visualizer shows execution in real-time! Use the timeline to replay and explore.

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     VS Code Extension (Node.js)             │
│  ┌──────────────────────┐        ┌──────────────────────┐  │
│  │   TraceServer.ts     │        │ FlowVisualizerPanel │  │
│  │  (TCP Server :9876)  │◄──────►│    (Webview Host)   │  │
│  └──────────────────────┘        └──────────────────────┘  │
│            ▲                                │                │
│            │                                ▼                │
│            │                    ┌─────────────────────────┐ │
│            │                    │   React App (Webview)   │ │
│            │                    │   - FlowCanvas          │ │
│            │                    │   - Timeline            │ │
│            │                    │   - Inspector           │ │
│            │                    └─────────────────────────┘ │
└────────────┼───────────────────────────────────────────────┘
             │
             │ TCP (JSON over newlines)
             │ localhost:9876
             │
    ┌────────▼──────────┐
    │  Python Tracer    │
    │  sys.settrace()   │
    │                   │
    │  ┌─────────────┐  │
    │  │ Your Script │  │
    │  └─────────────┘  │
    └───────────────────┘
```

### Three Main Components

1. **Python Tracer** (`tracers/python/`)
   - Hooks into Python execution with `sys.settrace()`
   - Captures events (calls, returns, lines, exceptions)
   - Sends JSON events to TCP server

2. **VS Code Extension** (`src/`)
   - TCP server receiving trace events
   - Webview panel hosting React app
   - Bridges events from TCP to React

3. **React Visualizer** (`webview/src/`)
   - Interactive flow graph with React Flow
   - Timeline playback controls
   - Event inspection panels

---

## Component Deep Dive

### 1. Python Tracer (`tracers/python/tracer.py`)

#### How `sys.settrace()` Works

Python's `sys.settrace()` lets you install a callback that gets called for every execution event:

```python
def trace_function(frame, event, arg):
    """
    Called by Python for each execution event

    frame: Current stack frame (contains locals, code object, etc.)
    event: 'call', 'line', 'return', 'exception'
    arg: Depends on event type (return value, exception, etc.)
    """
    # Your tracing logic here
    return trace_function  # Continue tracing

sys.settrace(trace_function)
```

#### ExecutionTracer Class

**Initialization:**
```python
class ExecutionTracer:
    def __init__(self, host='localhost', port=9876, project_root=None):
        self.socket = None  # TCP socket to extension
        self.event_counter = 0  # Unique event IDs
        self.project_root = project_root or os.getcwd()

        # Project-wide tracking
        self.project_files = {}  # filepath → {code, lines, metadata}
        self.file_execution_order = []  # Order files accessed
        self.cross_file_calls = []  # File-to-file transitions
```

**Connecting to Extension:**
```python
def connect(self):
    """Establish TCP connection to VS Code extension"""
    self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    self.socket.connect((self.host, self.port))
    print(f"[Blind] Connected to {self.host}:{self.port}")
```

**Main Trace Logic:**
```python
def trace_function(self, frame, event, arg):
    """Called by Python for each execution event"""

    # Get location info from frame
    filename = frame.f_code.co_filename
    line_no = frame.f_lineno
    function_name = frame.f_code.co_name

    # Filter unwanted files (stdlib, site-packages)
    if self._should_filter(filename):
        return self.trace_function

    # Register file on first encounter
    if filename not in self.project_files:
        self.register_file(filename)

    # Detect cross-file calls
    if self.last_file and self.last_file != filename:
        self.track_cross_file_call(self.last_file, filename)

    # Determine event type
    entity_type = self._detect_entity_type(frame, event, arg)

    # Create trace event
    trace_event = TraceEvent(
        event_type=entity_type.value,
        timestamp=time.time(),
        event_id=self.event_counter,
        file_path=filename,
        line_number=line_no,
        function_name=function_name,
        class_name=self._get_class_name(frame),
        module_name=frame.f_globals.get('__name__', '__main__'),
        line_content=self._get_line_content(filename, line_no),
        call_stack_depth=len(inspect.stack()) - 1,
        parent_event_id=self.parent_event_id,
        scope_id=self._generate_scope_id(frame),
        entity_data=self._capture_entity_data(frame, event, arg),
        variables=self._capture_variables(frame),
        arguments=self._capture_arguments(frame) if event == 'call' else None
    )

    self.event_counter += 1
    self.send_event(trace_event)

    return self.trace_function
```

**Entity Type Detection:**

Uses Python's AST (Abstract Syntax Tree) to identify statement types:

```python
def _detect_entity_type(self, frame, event, arg):
    """Analyze code to determine event type"""

    if event == 'call':
        # Check if it's a method call
        if self._is_method_call(frame):
            return EntityType.METHOD_CALL
        return EntityType.FUNCTION_CALL

    elif event == 'return':
        if self._is_method_call(frame):
            return EntityType.METHOD_RETURN
        return EntityType.FUNCTION_RETURN

    elif event == 'line':
        # Parse the line to detect type
        line_content = self._get_line_content(filename, line_no)

        try:
            # Parse just this line
            tree = ast.parse(line_content)
            node = tree.body[0]

            if isinstance(node, ast.For) or isinstance(node, ast.While):
                return EntityType.LOOP_START
            elif isinstance(node, ast.If):
                return EntityType.CONDITIONAL_IF
            elif isinstance(node, ast.Assign):
                return EntityType.VARIABLE_ASSIGNMENT
            elif isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                return EntityType.IMPORT_MODULE
            elif isinstance(node, ast.ListComp):
                return EntityType.COMPREHENSION
            # ... more cases
        except:
            pass

        return EntityType.LINE_EXECUTION

    elif event == 'exception':
        return EntityType.EXCEPTION_RAISED
```

**File Registration:**

When a file is first seen, read and send its complete source:

```python
def register_file(self, filepath):
    """Register new file and send metadata to extension"""

    # Read complete source
    with open(filepath, 'r') as f:
        code = f.read()

    lines = code.split('\n')

    # Store file info
    self.project_files[filepath] = {
        'code': code,
        'lines': lines,
        'total_lines': len(lines),
        'executed_lines': set(),
        'first_seen': time.time()
    }

    self.file_execution_order.append(filepath)

    # Send to extension
    metadata = {
        'type': 'file_metadata',
        'file_path': filepath,
        'relative_path': os.path.relpath(filepath, self.project_root),
        'code': code,
        'lines': lines,
        'total_lines': len(lines),
        'timestamp': time.time()
    }

    self.send_message(json.dumps(metadata) + '\n')
```

**Cross-File Call Tracking:**

```python
def track_cross_file_call(self, from_file, to_file):
    """Track when execution moves between files"""

    call_info = {
        'type': 'cross_file_call',
        'from_file': from_file,
        'to_file': to_file,
        'from_event_id': self.event_counter - 1,
        'to_event_id': self.event_counter,
        'timestamp': time.time()
    }

    self.cross_file_calls.append(call_info)
    self.send_message(json.dumps(call_info) + '\n')
```

**Sending Events:**

```python
def send_event(self, event):
    """Send trace event to extension via TCP"""

    if not self.socket:
        return

    try:
        # Convert dataclass to dict, then to JSON
        event_dict = asdict(event)
        json_str = json.dumps(event_dict)

        # Send with newline delimiter
        self.socket.sendall((json_str + '\n').encode('utf-8'))
    except Exception as e:
        print(f"[Blind] Error sending event: {e}")
        self.disconnect()
```

#### Command-Line Interface (`__main__.py`)

```python
def main():
    # Parse arguments
    parser = argparse.ArgumentParser()
    parser.add_argument('script', help='Python script to trace')
    parser.add_argument('--host', default='localhost')
    parser.add_argument('--port', type=int, default=9876)
    args = parser.parse_args()

    # Start tracing
    tracer = start_tracing(args.host, args.port, project_root)

    try:
        # Execute the script
        with open(args.script) as f:
            code = compile(f.read(), args.script, 'exec')
            exec(code, {'__name__': '__main__'})
    finally:
        # Stop and show stats
        stats = stop_tracing()
        print(f"Captured {stats['total_events']} events")
```

---

### 2. VS Code Extension (`src/`)

#### Extension Activation (`extension.ts`)

```typescript
export function activate(context: vscode.ExtensionContext) {
    // Create trace server (singleton)
    const traceServer = new TraceServer();

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('blind.showFlowVisualizer', () => {
            // Create or reveal webview panel
            FlowVisualizerPanel.createOrShow(context.extensionUri, traceServer);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('blind.startTraceServer', () => {
            traceServer.start();
        })
    );

    // ... more commands

    // Auto-start server when visualizer opens
    traceServer.setAutoStart(true);
}
```

#### TraceServer (`TraceServer.ts`)

**Core Responsibilities:**
1. Listen for TCP connections on port 9876
2. Parse incoming JSON events
3. Route events to active webview panel
4. Track statistics

**Server Setup:**

```typescript
class TraceServer {
    private server: net.Server | null = null;
    private clients: Set<net.Socket> = new Set();
    private isRunning = false;
    private totalEvents = 0;
    private panel: FlowVisualizerPanel | null = null;

    start(): void {
        if (this.isRunning) return;

        this.server = net.createServer((socket) => {
            this.handleConnection(socket);
        });

        this.server.listen(9876, 'localhost', () => {
            console.log('Trace server listening on port 9876');
            this.isRunning = true;
            this.updateStatusBar();
        });

        this.server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                vscode.window.showErrorMessage(
                    'Port 9876 is already in use',
                    'Try to Kill Port'
                ).then(selection => {
                    if (selection === 'Try to Kill Port') {
                        this.killPort();
                    }
                });
            }
        });
    }

    private handleConnection(socket: net.Socket): void {
        console.log('Python tracer connected');
        this.clients.add(socket);

        let buffer = '';

        socket.on('data', (data) => {
            buffer += data.toString();

            // Process complete messages (newline-delimited)
            let lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line

            for (const line of lines) {
                if (line.trim()) {
                    this.handleMessage(line);
                }
            }
        });

        socket.on('close', () => {
            this.clients.delete(socket);
            console.log('Python tracer disconnected');
        });

        socket.on('error', (err) => {
            console.error('Socket error:', err);
            this.clients.delete(socket);
        });
    }

    private handleMessage(jsonStr: string): void {
        try {
            const message = JSON.parse(jsonStr);

            // Route based on message type
            if (message.type === 'file_metadata') {
                this.handleFileMetadata(message);
            } else if (message.type === 'cross_file_call') {
                this.handleCrossFileCall(message);
            } else {
                // Regular trace event
                this.handleTraceEvent(message);
            }
        } catch (err) {
            console.error('Error parsing message:', err);
        }
    }

    private handleTraceEvent(event: TraceEvent): void {
        this.totalEvents++;
        this.updateStatusBar();

        // Send to active webview
        if (this.panel) {
            this.panel.sendTraceData(event);
        }
    }

    private handleFileMetadata(metadata: any): void {
        if (this.panel) {
            this.panel.sendMessage({
                type: 'fileMetadata',
                data: metadata
            });
        }
    }

    private handleCrossFileCall(call: any): void {
        if (this.panel) {
            this.panel.sendMessage({
                type: 'crossFileCall',
                data: call
            });
        }
    }
}
```

**Port Cleanup:**

```typescript
stop(): Promise<void> {
    return new Promise((resolve) => {
        if (!this.isRunning) {
            resolve();
            return;
        }

        // Close all clients
        this.clients.forEach(client => client.destroy());
        this.clients.clear();

        // Close server
        if (this.server) {
            this.server.close(() => {
                console.log('Trace server stopped');
                this.server = null;
                this.isRunning = false;
                resolve();
            });

            // Force release port
            this.server.unref();
        }
    });
}
```

#### FlowVisualizerPanel (`FlowVisualizerPanelNew.ts`)

**Webview Management:**

```typescript
class FlowVisualizerPanel {
    private static currentPanel?: FlowVisualizerPanel;
    private panel: vscode.WebviewPanel;
    private traceServer: TraceServer;

    static createOrShow(extensionUri: vscode.Uri, traceServer: TraceServer) {
        // Singleton pattern - only one panel at a time
        if (FlowVisualizerPanel.currentPanel) {
            FlowVisualizerPanel.currentPanel.panel.reveal();
            return;
        }

        // Create new webview panel
        const panel = vscode.window.createWebviewPanel(
            'blindFlowVisualizer',
            'Blind Execution Flow',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'dist', 'webview')
                ]
            }
        );

        FlowVisualizerPanel.currentPanel = new FlowVisualizerPanel(
            panel,
            extensionUri,
            traceServer
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        traceServer: TraceServer
    ) {
        this.panel = panel;
        this.traceServer = traceServer;

        // Set HTML content
        this.panel.webview.html = this.getHtmlForWebview();

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => this.handleWebviewMessage(message)
        );

        // Cleanup on close
        this.panel.onDidDispose(() => {
            FlowVisualizerPanel.currentPanel = undefined;
        });

        // Register with trace server
        this.traceServer.setPanel(this);
    }

    private getHtmlForWebview(): string {
        const webview = this.panel.webview;

        // Get URIs for built React app
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'main.js')
        );
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', 'assets', 'main.css')
        );

        // Generate nonce for CSP
        const nonce = this.getNonce();

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy"
                  content="default-src 'none';
                           style-src ${webview.cspSource} 'unsafe-inline';
                           script-src 'nonce-${nonce}';
                           font-src ${webview.cspSource};
                           img-src ${webview.cspSource} data:;">
            <link rel="stylesheet" href="${styleUri}">
            <title>Blind Execution Flow</title>
        </head>
        <body>
            <div id="root"></div>
            <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        </html>`;
    }

    private handleWebviewMessage(message: any): void {
        switch (message.type) {
            case 'nodeClicked':
                this.handleNodeClick(message.data);
                break;
            case 'codeChanged':
                this.handleCodeChange(message.data);
                break;
            case 'export':
                this.handleExport(message.data);
                break;
            case 'ready':
                console.log('Webview ready');
                break;
        }
    }

    private async handleNodeClick(data: { filePath: string; line: number }): Promise<void> {
        // Open file in editor
        const doc = await vscode.workspace.openTextDocument(data.filePath);
        const editor = await vscode.window.showTextDocument(doc);

        // Jump to line
        const position = new vscode.Position(data.line - 1, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
            new vscode.Range(position, position),
            vscode.TextEditorRevealType.InCenter
        );
    }

    sendTraceData(event: TraceEvent): void {
        this.panel.webview.postMessage({
            type: 'traceData',
            data: event
        });
    }

    sendMessage(message: any): void {
        this.panel.webview.postMessage(message);
    }
}
```

---

### 3. React Visualizer (`webview/src/`)

#### State Management (`store/useStore.ts`)

**Zustand Store:**

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface EnhancedAppState {
    // Events
    events: TraceEvent[];

    // Project files
    projectFiles: Map<string, ProjectFile>;
    fileExecutionOrder: string[];
    crossFileCalls: CrossFileCall[];

    // Playback
    currentEventIndex: number;
    isPlaying: boolean;
    playbackSpeed: number;

    // UI state
    isPaused: boolean;
    selectedFile: string | null;

    // Actions
    addEvent: (event: TraceEvent) => void;
    addFileMetadata: (metadata: FileMetadata) => void;
    addCrossFileCall: (call: CrossFileCall) => void;
    setCurrentEventIndex: (index: number) => void;
    togglePlayback: () => void;
    stepForward: () => void;
    stepBackward: () => void;
}

export const useStore = create<EnhancedAppState>()(
    immer((set, get) => ({
        events: [],
        projectFiles: new Map(),
        fileExecutionOrder: [],
        crossFileCalls: [],
        currentEventIndex: -1,
        isPlaying: false,
        playbackSpeed: 1,
        isPaused: false,
        selectedFile: null,

        addEvent: (event) => set((state) => {
            state.events.push(event);

            // Track executed line in file
            const file = state.projectFiles.get(event.file_path);
            if (file) {
                file.executedLines.add(event.line_number);
                file.events.push(event);
            }
        }),

        addFileMetadata: (metadata) => set((state) => {
            const projectFile: ProjectFile = {
                filePath: metadata.file_path,
                relativePath: metadata.relative_path,
                code: metadata.code,
                lines: metadata.lines,
                totalLines: metadata.total_lines,
                executedLines: new Set(),
                events: [],
                firstSeen: metadata.timestamp
            };

            state.projectFiles.set(metadata.file_path, projectFile);
            state.fileExecutionOrder.push(metadata.file_path);
        }),

        addCrossFileCall: (call) => set((state) => {
            state.crossFileCalls.push(call);
        }),

        setCurrentEventIndex: (index) => set({ currentEventIndex: index }),

        togglePlayback: () => set((state) => {
            state.isPlaying = !state.isPlaying;
        }),

        stepForward: () => set((state) => {
            if (state.currentEventIndex < state.events.length - 1) {
                state.currentEventIndex++;
            } else {
                state.isPlaying = false;
            }
        }),

        stepBackward: () => set((state) => {
            if (state.currentEventIndex > 0) {
                state.currentEventIndex--;
            }
        })
    }))
);
```

#### Main App (`App.tsx`)

```typescript
function App() {
    const vscode = useVSCode();
    const addEvent = useStore(state => state.addEvent);
    const addFileMetadata = useStore(state => state.addFileMetadata);
    const addCrossFileCall = useStore(state => state.addCrossFileCall);

    useEffect(() => {
        // Listen for messages from extension
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.type) {
                case 'traceData':
                    addEvent(message.data);
                    break;
                case 'fileMetadata':
                    addFileMetadata(message.data);
                    break;
                case 'crossFileCall':
                    addCrossFileCall(message.data);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        // Tell extension we're ready
        vscode.postMessage({ type: 'ready' });

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    return (
        <div className="app">
            <FlowCanvas />
            <div className="panels">
                <CallStack />
                <Inspector />
            </div>
            <Timeline />
        </div>
    );
}
```

#### Flow Canvas (`components/FlowCanvas.tsx`)

**Converting Files to Nodes:**

```typescript
function FlowCanvas() {
    const projectFiles = useStore(state => state.projectFiles);
    const fileExecutionOrder = useStore(state => state.fileExecutionOrder);
    const crossFileCalls = useStore(state => state.crossFileCalls);
    const currentEventIndex = useStore(state => state.currentEventIndex);

    // Convert project files to React Flow nodes
    const nodes = useMemo(() => {
        const flowNodes: Node[] = [];

        fileExecutionOrder.forEach((filePath, index) => {
            const file = projectFiles.get(filePath);
            if (!file) return;

            // Calculate coverage color
            const coverage = file.totalLines > 0
                ? file.executedLines.size / file.totalLines
                : 0;

            const color = coverage > 0.7 ? '#4aff9e'
                : coverage > 0.4 ? '#ffb84a'
                : '#ff4a4a';

            flowNodes.push({
                id: filePath,
                type: 'fileNode',
                position: { x: index * 400, y: 0 },
                data: {
                    file,
                    color,
                    coverage: Math.round(coverage * 100)
                }
            });
        });

        return flowNodes;
    }, [projectFiles, fileExecutionOrder]);

    // Convert cross-file calls to edges
    const edges = useMemo(() => {
        const flowEdges: Edge[] = [];

        // Count calls between files
        const callCounts = new Map<string, number>();

        crossFileCalls.forEach(call => {
            const key = `${call.from_file}->${call.to_file}`;
            callCounts.set(key, (callCounts.get(key) || 0) + 1);
        });

        // Create edges with thickness based on frequency
        callCounts.forEach((count, key) => {
            const [from, to] = key.split('->');

            flowEdges.push({
                id: key,
                source: from,
                target: to,
                type: 'smoothstep',
                animated: false,
                style: {
                    stroke: '#666',
                    strokeWidth: Math.min(count, 10)
                },
                label: count > 1 ? `${count}×` : undefined
            });
        });

        return flowEdges;
    }, [crossFileCalls]);

    // Animate current edge during playback
    useEffect(() => {
        if (currentEventIndex >= 0) {
            const currentEvent = events[currentEventIndex];
            // Highlight active edge...
        }
    }, [currentEventIndex]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={{ fileNode: FileNode }}
            fitView
        >
            <Background />
            <Controls />
            <MiniMap
                position="bottom-left"
                style={{ bottom: '140px' }}
            />
        </ReactFlow>
    );
}
```

#### File Node (`components/FileNode.tsx`)

```typescript
function FileNode({ data }: { data: { file: ProjectFile } }) {
    const vscode = useVSCode();
    const currentEventIndex = useStore(state => state.currentEventIndex);
    const events = useStore(state => state.events);

    const { file } = data;

    // Find current line in this file
    const currentLine = useMemo(() => {
        if (currentEventIndex < 0) return null;

        const currentEvent = events[currentEventIndex];
        if (currentEvent.file_path === file.filePath) {
            return currentEvent.line_number;
        }
        return null;
    }, [currentEventIndex, events, file.filePath]);

    // Build execution sequence for each line
    const lineSequences = useMemo(() => {
        const sequences = new Map<number, number[]>();

        file.events.forEach((event, index) => {
            const line = event.line_number;
            if (!sequences.has(line)) {
                sequences.set(line, []);
            }
            sequences.get(line)!.push(index + 1);
        });

        return sequences;
    }, [file.events]);

    const handleLineClick = (lineNumber: number) => {
        vscode.postMessage({
            type: 'nodeClicked',
            data: {
                filePath: file.filePath,
                line: lineNumber
            }
        });
    };

    return (
        <div className="file-node">
            <div className="file-header">
                <span className="file-name">{file.relativePath}</span>
                <span className="coverage">
                    {Math.round((file.executedLines.size / file.totalLines) * 100)}%
                </span>
            </div>

            <div className="code-container">
                {file.lines.map((line, index) => {
                    const lineNumber = index + 1;
                    const isExecuted = file.executedLines.has(lineNumber);
                    const isCurrent = lineNumber === currentLine;
                    const sequences = lineSequences.get(lineNumber) || [];

                    return (
                        <div
                            key={lineNumber}
                            className={`code-line ${isExecuted ? 'executed' : ''} ${isCurrent ? 'current' : ''}`}
                            onClick={() => handleLineClick(lineNumber)}
                        >
                            <span className="line-number">{lineNumber}</span>
                            {sequences.length > 0 && (
                                <span className="sequence">
                                    {sequences.join(',')}
                                </span>
                            )}
                            <span className="line-content">{line}</span>
                        </div>
                    );
                })}
            </div>

            {/* Handles for connections */}
            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
            <Handle type="target" position={Position.Left} />
            <Handle type="source" position={Position.Right} />
        </div>
    );
}
```

#### Timeline (`components/Timeline.tsx`)

```typescript
function Timeline() {
    const events = useStore(state => state.events);
    const currentEventIndex = useStore(state => state.currentEventIndex);
    const isPlaying = useStore(state => state.isPlaying);
    const playbackSpeed = useStore(state => state.playbackSpeed);
    const setCurrentEventIndex = useStore(state => state.setCurrentEventIndex);
    const togglePlayback = useStore(state => state.togglePlayback);
    const stepForward = useStore(state => state.stepForward);
    const stepBackward = useStore(state => state.stepBackward);

    // Auto-advance during playback
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            stepForward();
        }, 1000 / playbackSpeed);

        return () => clearInterval(interval);
    }, [isPlaying, playbackSpeed, stepForward]);

    const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;

    return (
        <div className="timeline">
            <div className="timeline-controls">
                <button onClick={() => setCurrentEventIndex(0)}>⏮</button>
                <button onClick={stepBackward}>⏪</button>
                <button onClick={togglePlayback}>
                    {isPlaying ? '⏸' : '▶'}
                </button>
                <button onClick={stepForward}>⏩</button>
                <button onClick={() => setCurrentEventIndex(events.length - 1)}>⏭</button>

                <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                >
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                </select>
            </div>

            <input
                type="range"
                min={0}
                max={events.length - 1}
                value={currentEventIndex}
                onChange={(e) => setCurrentEventIndex(Number(e.target.value))}
                className="timeline-slider"
            />

            {currentEvent && (
                <div className="current-event-info">
                    Event {currentEventIndex + 1} of {events.length}
                    {' | '}
                    {currentEvent.event_type}
                    {' in '}
                    {currentEvent.function_name}
                    {' @ line '}
                    {currentEvent.line_number}
                </div>
            )}
        </div>
    );
}
```

#### Call Stack (`components/CallStack.tsx`)

```typescript
function CallStack() {
    const events = useStore(state => state.events);
    const currentEventIndex = useStore(state => state.currentEventIndex);

    const callStack = useMemo(() => {
        if (currentEventIndex < 0) return [];

        const currentEvent = events[currentEventIndex];
        const currentDepth = currentEvent.call_stack_depth;

        // Build stack by finding active calls at each depth
        const depthMap = new Map<number, TraceEvent>();

        for (let i = currentEventIndex; i >= 0; i--) {
            const event = events[i];
            const depth = event.call_stack_depth;

            if (event.event_type === 'function_call' &&
                !depthMap.has(depth) &&
                depth <= currentDepth) {
                depthMap.set(depth, event);
            }

            if (depthMap.size === currentDepth + 1) break;
        }

        // Convert to array sorted by depth
        return Array.from(depthMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([depth, event]) => ({ depth, event }));
    }, [events, currentEventIndex]);

    return (
        <div className="call-stack">
            <h3>Call Stack</h3>
            {callStack.length === 0 ? (
                <p>No execution started</p>
            ) : (
                <div className="stack-frames">
                    {callStack.map(({ depth, event }) => (
                        <div
                            key={depth}
                            className={`stack-frame depth-${depth}`}
                        >
                            <span className="depth-indicator">
                                {'→'.repeat(depth)}
                            </span>
                            <span className="function-name">
                                {event.function_name}
                            </span>
                            <span className="location">
                                {event.file_path}:{event.line_number}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
```

#### Inspector (`components/Inspector.tsx`)

```typescript
function Inspector() {
    const events = useStore(state => state.events);
    const currentEventIndex = useStore(state => state.currentEventIndex);

    const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;

    if (!currentEvent) {
        return <div className="inspector">No event selected</div>;
    }

    // Calculate timing metrics
    const elapsedFromStart = currentEventIndex > 0
        ? currentEvent.timestamp - events[0].timestamp
        : 0;

    const timeSincePrev = currentEventIndex > 0
        ? currentEvent.timestamp - events[currentEventIndex - 1].timestamp
        : 0;

    // Count executions of this line
    const lineExecutionCount = events
        .slice(0, currentEventIndex + 1)
        .filter(e =>
            e.file_path === currentEvent.file_path &&
            e.line_number === currentEvent.line_number
        ).length;

    return (
        <div className="inspector">
            <h3>Event Inspector</h3>

            <section className="timing">
                <h4>Timing</h4>
                <div className="metric">
                    <label>Timestamp:</label>
                    <span>{new Date(currentEvent.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
                <div className="metric">
                    <label>Elapsed:</label>
                    <span>{elapsedFromStart.toFixed(3)}s</span>
                </div>
                <div className="metric">
                    <label>Since Prev:</label>
                    <span>{timeSincePrev.toFixed(6)}s</span>
                </div>
                <div className="metric">
                    <label>Line Executions:</label>
                    <span>{lineExecutionCount}×</span>
                </div>
            </section>

            <section className="event-details">
                <h4>Event Details</h4>
                <div className="metric">
                    <label>Type:</label>
                    <span className={`badge ${currentEvent.event_type}`}>
                        {currentEvent.event_type}
                    </span>
                </div>
                <div className="metric">
                    <label>Function:</label>
                    <span>{currentEvent.function_name}</span>
                </div>
                <div className="metric">
                    <label>Line:</label>
                    <span>{currentEvent.line_number}</span>
                </div>
                <div className="metric">
                    <label>Depth:</label>
                    <span>{currentEvent.call_stack_depth}</span>
                </div>
            </section>

            {currentEvent.variables && Object.keys(currentEvent.variables).length > 0 && (
                <section className="variables">
                    <h4>Variables</h4>
                    {Object.entries(currentEvent.variables).map(([name, value]) => (
                        <div key={name} className="variable">
                            <span className="var-name">{name}:</span>
                            <span className="var-value">{JSON.stringify(value)}</span>
                        </div>
                    ))}
                </section>
            )}

            {currentEvent.arguments && Object.keys(currentEvent.arguments).length > 0 && (
                <section className="arguments">
                    <h4>Arguments</h4>
                    {Object.entries(currentEvent.arguments).map(([name, value]) => (
                        <div key={name} className="argument">
                            <span className="arg-name">{name}:</span>
                            <span className="arg-value">{JSON.stringify(value)}</span>
                        </div>
                    ))}
                </section>
            )}
        </div>
    );
}
```

---

## Data Flow & Communication

### Complete Flow: Python → Extension → React

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PYTHON EXECUTION                                         │
│                                                              │
│ your_script.py runs                                         │
│    ↓                                                         │
│ sys.settrace(ExecutionTracer.trace_function)               │
│    ↓                                                         │
│ Every line/call/return triggers trace_function             │
│    ↓                                                         │
│ TraceEvent created with all metadata                       │
│    ↓                                                         │
│ JSON.dumps(event) + '\n'                                   │
│    ↓                                                         │
│ socket.send() to localhost:9876                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ TCP (newline-delimited JSON)
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. VS CODE EXTENSION (TraceServer)                         │
│                                                              │
│ net.Server listening on :9876                              │
│    ↓                                                         │
│ socket.on('data') receives chunks                          │
│    ↓                                                         │
│ Buffer.split('\n') to get complete messages                │
│    ↓                                                         │
│ JSON.parse(message)                                        │
│    ↓                                                         │
│ Route by type:                                             │
│   - file_metadata → handleFileMetadata()                   │
│   - cross_file_call → handleCrossFileCall()               │
│   - else → handleTraceEvent()                              │
│    ↓                                                         │
│ FlowVisualizerPanel.sendMessage()                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ VS Code postMessage()
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. REACT WEBVIEW                                           │
│                                                              │
│ window.addEventListener('message')                         │
│    ↓                                                         │
│ event.data contains message                                │
│    ↓                                                         │
│ Switch on message.type:                                    │
│   case 'traceData':                                        │
│     useStore.addEvent(message.data)                       │
│         ↓                                                   │
│         state.events.push(event)                          │
│         state.projectFiles.get(event.file_path)           │
│             .executedLines.add(event.line_number)         │
│    ↓                                                         │
│   case 'fileMetadata':                                     │
│     useStore.addFileMetadata(message.data)                │
│         ↓                                                   │
│         Create ProjectFile {code, lines, ...}             │
│         state.projectFiles.set(path, file)                │
│    ↓                                                         │
│   case 'crossFileCall':                                    │
│     useStore.addCrossFileCall(message.data)               │
│         ↓                                                   │
│         state.crossFileCalls.push(call)                   │
│    ↓                                                         │
│ State change triggers re-render                            │
│    ↓                                                         │
│ Components update:                                         │
│   - FlowCanvas recalculates nodes/edges                   │
│   - FileNode highlights new executed lines                │
│   - CallStack rebuilds stack                              │
│   - Inspector shows event details                         │
│   - Timeline updates progress                             │
└─────────────────────────────────────────────────────────────┘
```

### Message Protocols

#### Python → Extension (TCP)

**Regular Trace Event:**
```json
{
  "language": "python",
  "protocol_version": "1.0.0",
  "event_type": "function_call",
  "timestamp": 1640000000.123,
  "event_id": 42,
  "file_path": "/path/to/file.py",
  "line_number": 10,
  "function_name": "my_function",
  "class_name": null,
  "module_name": "__main__",
  "line_content": "def my_function(x, y):",
  "call_stack_depth": 0,
  "parent_event_id": null,
  "scope_id": "__main__::my_function::0",
  "entity_data": { "is_method": false },
  "variables": { "x": "5", "y": "10" },
  "arguments": { "x": "5", "y": "10" }
}
```

**File Metadata:**
```json
{
  "type": "file_metadata",
  "file_path": "/path/to/file.py",
  "relative_path": "src/file.py",
  "code": "def my_function():\n    return 42",
  "lines": ["def my_function():", "    return 42"],
  "total_lines": 2,
  "timestamp": 1640000000.100
}
```

**Cross-File Call:**
```json
{
  "type": "cross_file_call",
  "from_file": "/path/to/a.py",
  "to_file": "/path/to/b.py",
  "from_event_id": 10,
  "to_event_id": 11,
  "timestamp": 1640000000.150
}
```

#### Extension ↔ React (postMessage)

**Extension → React:**
```typescript
// Single trace event
{ type: 'traceData', data: TraceEvent }

// File registration
{ type: 'fileMetadata', data: FileMetadata }

// Cross-file transition
{ type: 'crossFileCall', data: CrossFileCall }

// Code edit confirmation
{ type: 'fileUpdated', data: { filePath: string, success: boolean } }
```

**React → Extension:**
```typescript
// Webview ready
{ type: 'ready' }

// Jump to source
{ type: 'nodeClicked', data: { filePath: string, line: number } }

// Edit code
{ type: 'codeChanged', data: { filePath: string, newCode: string } }

// Export data
{ type: 'export', data: { events: TraceEvent[] } }

// Error
{ type: 'error', data: { message: string } }
```

---

## Key Concepts

### 1. Event Sourcing

Blind uses **event sourcing** - everything is captured as immutable events:

```typescript
// Events are never modified, only appended
const events: TraceEvent[] = [];

// Want to see state at event 42?
const stateAtEvent42 = replayEvents(events.slice(0, 43));

// Time-travel debugging
const stateAtAnyPoint = (index: number) => replayEvents(events.slice(0, index + 1));
```

This enables:
- **Time travel** - Jump to any point in execution
- **Replay** - Reconstruct exact state at any time
- **Analysis** - Aggregate statistics over entire run

### 2. Project-Wide Tracking

Unlike traditional debuggers that focus on single files, Blind tracks the **entire project**:

```typescript
// Files are first-class citizens
interface ProjectFile {
    filePath: string
    code: string  // Complete source
    lines: string[]
    executedLines: Set<number>  // Which lines ran
    events: TraceEvent[]  // Events in this file
}

// Execution flows between files
interface CrossFileCall {
    from_file: string
    to_file: string
    from_event_id: number
    to_event_id: number
}
```

This enables:
- **Cross-file visualization** - See how files call each other
- **Coverage tracking** - Know which lines/files were executed
- **Flow analysis** - Understand execution paths through codebase

### 3. Language-Agnostic Protocol

The protocol is designed to work with **any language**:

```typescript
// Every event specifies its language
interface TraceEvent {
    language: 'python' | 'javascript' | 'go' | ...
    protocol_version: '1.0.0'
    // ... rest of fields
}

// Language-specific data goes in entity_data
entity_data: {
    // Python-specific
    is_generator?: boolean
    is_async?: boolean

    // JavaScript-specific
    is_promise?: boolean
    is_async_await?: boolean
}
```

**Why this works:**
- **Universal fields** - All languages have files, lines, functions
- **Flexible metadata** - `entity_data` holds language-specific info
- **Same transport** - TCP + JSON works everywhere
- **Same visualizer** - React app doesn't care about language

**Adding a new language:**
1. Create tracer (e.g., `tracers/javascript/`)
2. Hook into language runtime (e.g., V8 Inspector for JS)
3. Send events matching the protocol
4. Done! Visualizer works automatically

### 4. Reactive State Management

Uses **Zustand** with **Immer** for predictable state updates:

```typescript
// Zustand gives us a global store
const useStore = create<State>((set) => ({
    events: [],

    addEvent: (event) => set((state) => {
        // Immer lets us write "mutative" code
        // but it's actually creating new immutable state
        state.events.push(event);
    })
}));

// Components subscribe to only what they need
function MyComponent() {
    // Re-renders only when events change
    const events = useStore(state => state.events);

    // Doesn't re-render when currentIndex changes
    return <div>{events.length} events</div>;
}
```

**Benefits:**
- **Performance** - Components only re-render when their data changes
- **Simplicity** - No prop drilling, direct access to store
- **Type safety** - TypeScript knows store shape
- **DevTools** - Redux DevTools work with Zustand

### 5. React Flow for Visualization

**React Flow** provides the graph visualization:

```typescript
// Nodes = Files
const nodes: Node[] = [
    {
        id: '/path/to/file.py',
        type: 'fileNode',  // Custom component
        position: { x: 0, y: 0 },
        data: { file: ProjectFile }
    }
];

// Edges = Cross-file calls
const edges: Edge[] = [
    {
        id: 'file1->file2',
        source: '/path/to/file1.py',
        target: '/path/to/file2.py',
        animated: true,  // During playback
        style: { strokeWidth: 5 }  // Based on call frequency
    }
];

<ReactFlow nodes={nodes} edges={edges} />
```

**Features we use:**
- **Custom nodes** - FileNode shows code, not just labels
- **Handles** - Connection points on each side of node
- **Edge styling** - Thickness = frequency, color = type
- **Animation** - Edges animate during playback
- **MiniMap** - Overview of entire graph
- **Controls** - Zoom, pan, fit view

### 6. Playback System

The timeline enables **time-travel debugging**:

```typescript
// Current position in execution
const currentEventIndex: number;

// Auto-advance during playback
useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
        setCurrentEventIndex(index => {
            if (index >= events.length - 1) {
                setIsPlaying(false);
                return index;
            }
            return index + 1;
        });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
}, [isPlaying, playbackSpeed]);

// Components derive their view from currentEventIndex
const visibleEvents = events.slice(0, currentEventIndex + 1);
const currentEvent = events[currentEventIndex];
```

**This enables:**
- **Forward/backward stepping** - One event at a time
- **Speed control** - 0.5×, 1×, 2×, 4× playback
- **Jump to any point** - Scrub timeline slider
- **Auto-advance** - Watch execution unfold

---

## Development Guide

### Setting Up Development Environment

**1. Prerequisites:**
```bash
# Node.js 18+ (for extension)
node --version

# Python 3.8+ (for tracer)
python3 --version

# VS Code (obviously)
code --version
```

**2. Install Dependencies:**
```bash
# Extension dependencies
npm install

# Webview dependencies
cd webview && npm install && cd ..

# Python tracer
pip install -e .
```

**3. Build Everything:**
```bash
# Build webview React app
npm run build:webview

# Build extension
npm run compile

# Or watch mode (auto-rebuild)
npm run watch
```

**4. Launch Extension:**
```bash
# In VS Code, press F5
# This opens Extension Development Host
```

### Project Structure

```
blind/
├── src/                    # Extension source (TypeScript)
│   ├── extension.ts        # Entry point
│   ├── TraceServer.ts      # TCP server
│   └── FlowVisualizerPanelNew.ts  # Webview manager
│
├── webview/                # React app source
│   ├── src/
│   │   ├── main.tsx        # React entry
│   │   ├── App.tsx         # Root component
│   │   ├── components/     # UI components
│   │   ├── store/          # Zustand state
│   │   ├── hooks/          # Custom hooks
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── vite.config.ts      # Vite config
│
├── tracers/
│   └── python/             # Python tracer
│       ├── __init__.py
│       ├── __main__.py     # CLI entry
│       └── tracer.py       # Core logic
│
├── dist/                   # Build output
│   ├── extension.js        # Bundled extension
│   └── webview/            # Built React app
│
├── package.json            # Extension manifest
├── tsconfig.json           # TypeScript config
├── pyproject.toml          # Python package config
└── esbuild.js              # Build script
```

### Making Changes

**Modifying Extension (src/):**
```bash
# Start watch mode
npm run watch:esbuild

# Make changes to src/*.ts
# Extension auto-rebuilds

# Reload extension in Dev Host
Cmd+R (in Extension Development Host)
```

**Modifying React App (webview/src/):**
```bash
# Start watch mode
npm run watch:webview

# Make changes to webview/src/*.tsx
# Vite dev server auto-reloads

# Refresh webview
Cmd+R (in webview panel)
```

**Modifying Python Tracer (tracers/python/):**
```bash
# Tracer is installed in editable mode
# Changes take effect immediately

# Test with sample script
python -m blind examples/sample.py
```

### Adding a New Component

**1. Create Component:**
```tsx
// webview/src/components/MyComponent.tsx
import { useStore } from '../store/useStore';

export function MyComponent() {
    const data = useStore(state => state.someData);

    return (
        <div className="my-component">
            {/* Your UI */}
        </div>
    );
}
```

**2. Add Styles:**
```css
/* webview/src/index.css */
.my-component {
    /* Your styles */
}
```

**3. Use in App:**
```tsx
// webview/src/App.tsx
import { MyComponent } from './components/MyComponent';

function App() {
    return (
        <div>
            <MyComponent />
            {/* ... */}
        </div>
    );
}
```

### Adding State to Store

```typescript
// webview/src/store/useStore.ts
interface EnhancedAppState {
    // Add your state
    myNewState: string;

    // Add action
    setMyNewState: (value: string) => void;
}

export const useStore = create<EnhancedAppState>()(
    immer((set) => ({
        // Initialize state
        myNewState: '',

        // Implement action
        setMyNewState: (value) => set((state) => {
            state.myNewState = value;
        })
    }))
);
```

### Adding Extension Command

**1. Register Command:**
```typescript
// src/extension.ts
export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('blind.myCommand', () => {
            // Your command logic
            vscode.window.showInformationMessage('My command executed!');
        })
    );
}
```

**2. Add to package.json:**
```json
{
    "contributes": {
        "commands": [
            {
                "command": "blind.myCommand",
                "title": "Blind: My Command"
            }
        ]
    }
}
```

**3. Test:**
```bash
# Reload extension (Cmd+R in Dev Host)
# Run command
Cmd+Shift+P → "Blind: My Command"
```

---

## Building & Testing

### Building for Distribution

**1. Build Webview:**
```bash
cd webview
npm run build
# Output: ../dist/webview/
```

**2. Build Extension:**
```bash
npm run package
# Output: dist/extension.js (production mode)
```

**3. Package Extension:**
```bash
# Install vsce if needed
npm install -g @vscode/vsce

# Package as .vsix
vsce package

# Output: blind-1.0.0.vsix
```

**4. Install Packaged Extension:**
```bash
code --install-extension blind-1.0.0.vsix
```

### Testing

**Manual Testing:**
```bash
# 1. Launch Extension Development Host
Press F5 in VS Code

# 2. In Dev Host, start trace server
Cmd+Shift+P → "Blind: Start Trace Server"

# 3. Open visualizer
Cmd+Shift+P → "Blind: Show Execution Flow Visualizer"

# 4. Run sample script
python -m blind examples/sample.py

# 5. Verify:
# - Events appear in visualizer
# - Timeline works
# - Click on lines jumps to code
# - Playback works
```

**Testing Python Tracer:**
```bash
# Test basic tracing
python -m blind examples/sample.py

# Test with different scripts
python -m blind /path/to/your/script.py

# Test programmatic API
python -c "
from blind import start_tracing, stop_tracing
start_tracing()
print('Hello')
stats = stop_tracing()
print(stats)
"
```

**Unit Tests:**
```bash
# Run extension tests
npm test

# Run specific test file
npm test -- --grep "TraceServer"
```

### Debugging

**Extension Debugging:**
```bash
# Already in debug mode when you press F5

# Set breakpoints in src/*.ts
# Use Debug Console in VS Code
# Inspect variables, step through code
```

**React Debugging:**
```bash
# Open Chrome DevTools in webview
Cmd+Shift+P → "Developer: Open Webview Developer Tools"

# Use React DevTools (if installed)
# Inspect components, state, props
```

**Python Debugging:**
```python
# Add print statements in tracer.py
def trace_function(self, frame, event, arg):
    print(f"[DEBUG] Event: {event}, Line: {frame.f_lineno}")
    # ...

# Or use pdb
import pdb; pdb.set_trace()
```

**Network Debugging:**
```bash
# Monitor TCP connections
lsof -i :9876

# Test TCP server manually
nc localhost 9876
{"test": "message"}
^C

# Check if events are being sent
tcpdump -i lo0 -A port 9876
```

---

## How to Extend

### Adding a New Event Type

**1. Add to Python tracer:**
```python
# tracers/python/tracer.py
class EntityType(Enum):
    # Add your type
    MY_NEW_TYPE = "my_new_type"

def _detect_entity_type(self, frame, event, arg):
    # Add detection logic
    if self._is_my_new_type(frame):
        return EntityType.MY_NEW_TYPE
    # ...
```

**2. Handle in React:**
```typescript
// webview/src/components/Inspector.tsx
function getEventIcon(type: string) {
    switch (type) {
        case 'my_new_type':
            return '🎯';
        // ...
    }
}

function getEventColor(type: string) {
    switch (type) {
        case 'my_new_type':
            return '#ff00ff';
        // ...
    }
}
```

### Adding a New Language Tracer

**1. Create tracer directory:**
```bash
mkdir -p tracers/javascript
cd tracers/javascript
```

**2. Create tracer:**
```javascript
// tracers/javascript/tracer.js
const net = require('net');

class JavaScriptTracer {
    constructor(host = 'localhost', port = 9876) {
        this.host = host;
        this.port = port;
        this.socket = null;
        this.eventCounter = 0;
    }

    connect() {
        this.socket = net.connect(this.port, this.host);
    }

    sendEvent(event) {
        const json = JSON.stringify({
            language: 'javascript',
            protocol_version: '1.0.0',
            ...event
        });
        this.socket.write(json + '\n');
    }

    // Hook into V8 Inspector Protocol
    startTracing() {
        const inspector = require('inspector');
        const session = new inspector.Session();
        session.connect();

        session.on('Debugger.paused', (message) => {
            // Extract event from debugger info
            const event = this.createEventFromDebugger(message);
            this.sendEvent(event);
        });

        session.post('Debugger.enable');
        session.post('Debugger.setPauseOnExceptions', { state: 'all' });
    }
}
```

**3. Test:**
```javascript
const tracer = new JavaScriptTracer();
tracer.connect();
tracer.startTracing();

// Your code runs with tracing
myFunction();
```

**4. Extension already works!**
The extension doesn't need changes - it just receives events and displays them.

### Adding a New Visualization

**1. Create component:**
```tsx
// webview/src/components/MyVisualization.tsx
import { useStore } from '../store/useStore';

export function MyVisualization() {
    const events = useStore(state => state.events);

    // Process events for your visualization
    const data = useMemo(() => {
        // Your data processing
        return processEvents(events);
    }, [events]);

    return (
        <div className="my-visualization">
            {/* Render your visualization */}
        </div>
    );
}
```

**2. Add to layout:**
```tsx
// webview/src/App.tsx
import { MyVisualization } from './components/MyVisualization';

function App() {
    return (
        <div className="app">
            <FlowCanvas />
            <MyVisualization />  {/* Add here */}
            <Timeline />
        </div>
    );
}
```

### Adding Configuration Options

**1. Add to package.json:**
```json
{
    "contributes": {
        "configuration": {
            "title": "Blind",
            "properties": {
                "blind.myOption": {
                    "type": "boolean",
                    "default": true,
                    "description": "My option description"
                }
            }
        }
    }
}
```

**2. Read in extension:**
```typescript
const config = vscode.workspace.getConfiguration('blind');
const myOption = config.get<boolean>('myOption', true);
```

**3. Use in React:**
```tsx
// Send config to webview
panel.webview.postMessage({
    type: 'config',
    data: { myOption }
});

// Receive in React
const [config, setConfig] = useState({});

useEffect(() => {
    const handler = (event) => {
        if (event.data.type === 'config') {
            setConfig(event.data.data);
        }
    };
    window.addEventListener('message', handler);
}, []);
```

---

## Troubleshooting

### Common Issues

**1. Port 9876 Already in Use**
```bash
# Find process using port
lsof -i :9876

# Kill process
kill -9 <PID>

# Or use extension's "Try to Kill Port" option
```

**2. Python Tracer Not Connecting**
```bash
# Check if server is running
Cmd+Shift+P → "Blind: Start Trace Server"

# Check status bar shows "Blind: Running"

# Test connection manually
nc localhost 9876
# If connection refused, server isn't running
```

**3. No Events in Visualizer**
```bash
# Check if tracer is actually sending events
# Add debug print in tracer.py:
def send_event(self, event):
    print(f"Sending event: {event.event_type}")
    # ...

# Check if extension is receiving
# Open extension logs:
Help → Toggle Developer Tools → Console

# Should see: "Received trace event: ..."
```

**4. Webview Not Loading**
```bash
# Check if webview is built
ls dist/webview/assets/
# Should see main.js and main.css

# Rebuild webview
npm run build:webview

# Check console for errors
Cmd+Shift+P → "Developer: Open Webview Developer Tools"
```

**5. Extension Not Activating**
```bash
# Check extension host logs
Help → Toggle Developer Tools → Console

# Look for activation errors
# Common issue: Missing dependencies
npm install
```

**6. React State Not Updating**
```bash
# Check if events are being added
# Add debug in useStore:
addEvent: (event) => set((state) => {
    console.log('Adding event:', event);
    state.events.push(event);
})

# Check if components are subscribed correctly
const events = useStore(state => state.events);
console.log('Current events:', events.length);
```

### Performance Issues

**Too Many Events:**
```typescript
// Limit events stored
const MAX_EVENTS = 10000;

addEvent: (event) => set((state) => {
    state.events.push(event);

    // Keep only recent events
    if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(-MAX_EVENTS);
    }
})
```

**Slow Rendering:**
```typescript
// Memoize expensive calculations
const nodes = useMemo(() => {
    return calculateNodes(projectFiles);
}, [projectFiles]);

// Use React.memo for components
export const FileNode = React.memo(({ data }) => {
    // ...
});

// Virtualize long lists
import { FixedSizeList } from 'react-window';
```

**Memory Issues:**
```bash
# Increase Node.js memory limit
NODE_OPTIONS=--max-old-space-size=4096 code .

# Or in launch.json:
"runtimeArgs": ["--max-old-space-size=4096"]
```

### Debugging Tips

**Enable Verbose Logging:**
```typescript
// src/TraceServer.ts
const DEBUG = true;

if (DEBUG) console.log('Received event:', event);
```

```python
# tracers/python/tracer.py
DEBUG = True

if DEBUG:
    print(f"[DEBUG] Tracing {filename}:{line_no}")
```

**Inspect State:**
```tsx
// webview/src/App.tsx
useEffect(() => {
    console.log('Current state:', useStore.getState());
}, []);
```

**Test Components in Isolation:**
```tsx
// Create test wrapper
function TestWrapper({ children }) {
    return (
        <div style={{ padding: '20px' }}>
            {children}
        </div>
    );
}

// Test component
<TestWrapper>
    <Inspector />
</TestWrapper>
```

**Mock Data:**
```typescript
// Generate test events
const mockEvents: TraceEvent[] = Array.from({ length: 100 }, (_, i) => ({
    language: 'python',
    protocol_version: '1.0.0',
    event_type: 'function_call',
    timestamp: Date.now() / 1000,
    event_id: i,
    file_path: '/test.py',
    line_number: i + 1,
    function_name: `func_${i}`,
    // ...
}));

// Add to store
mockEvents.forEach(e => useStore.getState().addEvent(e));
```

---

## Conclusion

You now have a complete understanding of the Blind codebase:

1. **Architecture** - Three-layer system: Python tracer → TCP server → React visualizer
2. **Components** - How each part works internally
3. **Data Flow** - How events travel through the system
4. **Key Concepts** - Event sourcing, project-wide tracking, language-agnostic protocol
5. **Development** - How to build, test, and extend
6. **Troubleshooting** - Common issues and solutions

**Next Steps:**
- Read specific component files with this guide as reference
- Make small changes to understand how parts interact
- Add your own features following the extension patterns
- Consider implementing a tracer for another language

**Key Files to Study:**
1. `tracers/python/tracer.py` - Python tracing implementation
2. `src/TraceServer.ts` - Event receiving and routing
3. `webview/src/store/useStore.ts` - State management
4. `webview/src/components/FlowCanvas.tsx` - Main visualization

This guide gives you everything you need to work on Blind independently. Happy coding! 🎯
