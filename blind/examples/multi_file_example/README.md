# Multi-File Execution Flow Example

This example demonstrates Blind's project-wide execution flow visualization across multiple files.

## Project Structure

```
multi_file_example/
├── main.py          # Entry point
├── utils.py         # Utility functions
├── calculator.py    # Calculator operations
└── README.md        # This file
```

## What This Demonstrates

1. **Cross-file function calls**: How execution flows from `main.py` → `calculator.py` → `utils.py`
2. **Complete file visualization**: See entire source code of each file with executed lines highlighted
3. **Project-wide tracking**: Understand the execution order across all files
4. **Live execution flow**: Watch the graph build in real-time as code executes

## How to Run

### 1. Start the Trace Server

In VS Code:
- Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
- Run: `Blind: Start Trace Server`
- You should see: "Blind trace server started on port 9876"

### 2. Open the Flow Visualizer

- Open Command Palette
- Run: `Blind: Show Flow Visualizer`
- A new panel opens showing the execution flow canvas

### 3. Run the Example

From this directory, run:

```bash
python -m blind.python main.py
```

## What You'll See

### In the Terminal:
```
[Blind Tracer] Starting tracer...
[Blind Tracer] Project root: /path/to/examples/multi_file_example
[Blind Tracer] Connecting to localhost:9876
[Blind Tracer] Running: main.py
------------------------------------------------------------
Running calculator example...
5 + 3 = 8
10 - 4 = 6
6 * 7 = 42
------------------------------------------------------------
[Blind Tracer] Captured X events
[Blind Tracer] Traced Y functions
```

### In the Flow Visualizer:

You'll see **three file blocks** appear in sequence:

```
┌─────────────────────────────────┐
│ main.py                         │
│ ─────────────────────────────── │
│  1 │ from calculator import *   │ ← Highlighted (executed)
│  2 │                            │
│  3 │ def main():                │ ← Highlighted
│  4 │     print("Running...")    │ ← Highlighted
│  5 │     result = add(5, 3)     │ ← Highlighted
│ ...                             │
└─────────────────────────────────┘
         │
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
┌─────────────────────┐   ┌─────────────────────┐
│ calculator.py       │   │ utils.py            │
│ ─────────────────── │   │ ─────────────────── │
│ Complete code with  │   │ Complete code with  │
│ executed lines      │   │ executed lines      │
│ highlighted         │   │ highlighted         │
└─────────────────────┘   └─────────────────────┘
```

**Key Features:**
- **Complete file code**: Every file shows its entire source code
- **Execution highlighting**: Lines that were executed are highlighted
- **Cross-file arrows**: Arrows show when execution moves between files
- **Live updates**: Watch the visualization build as code runs
- **Click to navigate**: Click any line to jump to it in VS Code

## Understanding the Visualization

### File Blocks
Each file in your project that was executed gets its own block showing:
- File name and relative path
- Complete source code with line numbers
- Visual highlighting of executed lines
- Function boundaries and class definitions

### Execution Flow
- **Arrows between files**: Show the order files were called
- **Arrow labels**: Show which function made the cross-file call
- **Timeline**: Files appear in the order they were first accessed

### Interactive Features
- **Zoom & Pan**: Navigate large projects easily
- **Click lines**: Jump to source code in VS Code
- **Expand/Collapse**: Focus on specific files
- **Export**: Save execution trace for later analysis

## Try It Yourself

Modify the example to see how it tracks your changes:

1. Add a new function in `calculator.py`
2. Call it from `main.py`
3. Run the tracer again
4. See your new function appear in the flow!

## Next Steps

- Try with your own project
- Run a Flask/Django app and see the request flow
- Debug complex codebases by visualizing execution
- Share execution flows with your team