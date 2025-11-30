# Project-Wide Execution Flow Architecture

## Vision

Transform Blind from a single-script tracer into a **comprehensive project-wide execution flow visualizer** that shows how code flows across multiple files in real-time, making debugging and code comprehension visual rather than text-based.

## Key Changes

### 1. **File-Level Organization** (Previously: Event-by-event)

The tracer now organizes execution data by **files** rather than just individual events:

- **Complete file code storage**: Each file's entire source code is captured and sent to VS Code
- **File execution order tracking**: Track the sequence in which files are accessed during execution
- **Line execution markers**: Know exactly which lines in each file were executed
- **File-specific event lists**: Events are organized per-file for better analysis

### 2. **Cross-File Flow Tracking** (NEW)

The tracer now detects and reports when execution flows between files:

```python
# When code flows from file A → B → C, the tracer sends:
{
    'type': 'cross_file_call',
    'from_file': '/path/to/A.py',
    'to_file': '/path/to/B.py',
    'from_event_id': 123,
    'to_event_id': 124,
    'timestamp': 1234567890.123
}
```

### 3. **Project Root Context** (NEW)

The tracer is now **project-aware**:

```python
# Automatically detects project root from script location
project_root = os.path.dirname(os.path.abspath(script_path))

# All file paths are relativized to project root
relative_path = os.path.relpath(filepath, self.project_root)
```

### 4. **File Metadata Broadcasting** (NEW)

When a new file is encountered during execution, the tracer sends complete file metadata:

```python
{
    'type': 'file_metadata',
    'file_path': '/absolute/path/to/file.py',
    'relative_path': 'src/utils/helper.py',
    'code': '... entire file contents ...',
    'lines': ['line 1', 'line 2', ...],
    'total_lines': 150,
    'timestamp': 1234567890.123
}
```

## New Data Structures

### ExecutionTracer Class

```python
class ExecutionTracer:
    def __init__(self, host, port, project_root=None):
        # Project-wide tracking
        self.project_files: Dict[str, Dict]  # filepath → {code, lines, metadata}
        self.file_execution_order: List[str]  # Order of files accessed
        self.file_events: Dict[str, List[TraceEvent]]  # filepath → events
        self.cross_file_calls: List[Dict]  # Track calls between files
        self.current_file: Optional[str]  # Track current execution file
```

### Key Methods

1. **`register_file(filepath)`**: Captures complete file code and metadata
2. **`send_file_metadata(filepath)`**: Broadcasts file data to VS Code
3. **`track_cross_file_call(from_file, to_file, ...)`**: Records cross-file transitions
4. **`mark_line_executed(filepath, line_number)`**: Marks executed lines

## Message Types

The tracer now sends **3 types of messages** to VS Code:

### 1. Trace Events (existing, enhanced)
```json
{
    "event_type": "function_call",
    "file_path": "/path/to/file.py",
    "line_number": 42,
    "line_content": "def process_data():",
    ...
}
```

### 2. File Metadata (NEW)
```json
{
    "type": "file_metadata",
    "file_path": "/Users/user/project/app.py",
    "relative_path": "app.py",
    "code": "import requests\n\ndef main():\n    ...",
    "lines": ["import requests", "", "def main():", ...],
    "total_lines": 150
}
```

### 3. Cross-File Calls (NEW)
```json
{
    "type": "cross_file_call",
    "from_file": "/Users/user/project/app.py",
    "to_file": "/Users/user/project/utils.py",
    "from_event_id": 123,
    "to_event_id": 124
}
```

## Execution Flow Example

Let's say a user runs a Flask app with this structure:
```
project/
  app.py          # Entry point
  routes.py       # Route handlers
  database.py     # DB operations
  utils.py        # Helper functions
```

### What happens:

1. **User runs**: `python -m blind.python app.py`

2. **Tracer starts**:
   - Detects project root: `/Users/user/project/`
   - Connects to VS Code on port 9876

3. **`app.py` executes**:
   ```
   → File metadata sent: {type: 'file_metadata', file_path: 'app.py', code: '...'}
   → Event: function_call main()
   → Event: line_execution (import routes)
   ```

4. **Cross-file call detected** (`app.py` → `routes.py`):
   ```
   → Cross-file call: {from_file: 'app.py', to_file: 'routes.py'}
   → File metadata sent for routes.py
   → Event: function_call setup_routes()
   ```

5. **routes.py calls database.py**:
   ```
   → Cross-file call: {from_file: 'routes.py', to_file: 'database.py'}
   → File metadata sent for database.py
   → Event: function_call get_user()
   ```

6. **VS Code extension receives**:
   - Complete code for all 4 files
   - Sequence of execution across files
   - Which lines in each file were executed
   - Flow connections between files

## Visualization Goal

The VS Code extension should render:

```
┌─────────────────────┐       ┌──────────────────────┐
│   app.py            │──────▶│   routes.py          │
│                     │       │                      │
│ 1  import routes    │       │ 1  def setup_routes│
│ 2  import database  │       │ 2      @app.route  │
│ 3                   │       │ 3      def index():│
│ 4  def main():  ◀──── Highlight executed lines   │
│ 5      setup()      │       │ 4          return  │
│ 6      run()        │       └──────────────────────┘
└─────────────────────┘                │
         │                             │
         ▼                             ▼
┌─────────────────────┐       ┌──────────────────────┐
│   database.py       │       │   utils.py           │
│                     │       │                      │
│ Highlighted lines   │       │ Highlighted lines    │
│ show execution path │       │ show what ran        │
└─────────────────────┘       └──────────────────────┘
```

## Environment Configuration

Users can now configure the tracer via environment variables:

```bash
# .env file
BLIND_TRACER_HOST=localhost
BLIND_TRACER_PORT=9876
```

Or command-line arguments (which override env vars):
```bash
python -m blind.python app.py --host localhost --port 9876
```

## Next Steps for VS Code Extension

1. **Update TraceServer.ts** to handle:
   - `file_metadata` messages
   - `cross_file_call` messages

2. **Update type definitions** (`webview/src/types/index.ts`):
   ```typescript
   interface FileMetadata {
       type: 'file_metadata';
       file_path: string;
       relative_path: string;
       code: string;
       lines: string[];
       total_lines: number;
   }

   interface CrossFileCall {
       type: 'cross_file_call';
       from_file: string;
       to_file: string;
       from_event_id: number;
       to_event_id: number;
   }
   ```

3. **Update visualization** to show:
   - File blocks (not just function nodes)
   - Complete file code with executed lines highlighted
   - Cross-file arrows showing execution flow
   - File execution order

4. **Create file-based graph layout**:
   - Each file = a container/swimlane
   - Functions within files
   - Arrows showing cross-file calls

## Benefits

✅ **See the big picture**: Understand how your entire project executes, not just one script
✅ **Cross-file debugging**: Follow execution across multiple files visually
✅ **Code coverage visualization**: See which lines actually ran
✅ **Execution flow mapping**: Understand complex codebases in minutes
✅ **Real-time updates**: Watch the graph build as code executes

## Technical Improvements

- **Automatic file detection**: No manual file specification needed
- **Smart filtering**: Excludes stdlib and site-packages automatically
- **Performance**: Only reads files once, caches content
- **Relative paths**: Clean display using project-relative paths
- **Extensible**: Easy to add new message types and tracking features

---

This architecture transforms Blind from a function tracer into a **project-wide execution flow visualizer** - exactly what you envisioned! 🚀