# Blind - Visual Python Execution Flow Debugger

Transform debugging from reading static code into watching live execution flows. Blind captures every function call, loop iteration, conditional branch, and exception in real-time, visualizing your Python code's execution as an interactive, animated graph.

## What is Blind?

Blind is a VS Code extension that provides **x-ray vision into your Python code's execution**. Instead of setting breakpoints and stepping through code line-by-line while mentally reconstructing the execution path, you see the entire flow as a clickable, color-coded graph where you can:

- **See what actually runs** - Watch your code execute in real-time
- **Understand execution order** - Follow the exact path through your codebase
- **Measure performance** - See timing for every function and method call
- **Jump to problems** - Click any node to jump directly to that line in your code
- **Debug visually** - Understand complex codebases in minutes, not hours

## Features

### Comprehensive Tracing
- **Function & Method Calls** - Track every function and method invocation
- **Line-by-Line Execution** - See every line that executes (optional)
- **Loop Detection** - Visualize loop iterations and flow
- **Conditional Branches** - Track if/elif/else paths taken
- **Exception Handling** - See where exceptions are raised and caught
- **Variable Assignments** - Track variable changes
- **Class Instantiation** - Follow object creation
- **Import Tracking** - See module imports

### Entity Types
Each Python construct is color-coded and displayed with distinct icons:

- 📞 **Function Calls** (Blue) - Regular function invocations
- 🔵 **Method Calls** (Blue) - Class method invocations
- ↩️ **Returns** (Green) - Function/method returns with values
- 🔁 **Loops** (Purple) - Loop starts and iterations
- ❓ **Conditionals** (Orange) - If/elif/else branches
- ❌ **Exceptions** (Red) - Raised exceptions
- 📝 **Assignments** (Cyan) - Variable assignments
- 📦 **Imports** (Gray) - Module imports

### Interactive Graph Visualization
- **Hierarchical Layout** - Call stack depth shown horizontally
- **Real-time Updates** - Graph builds as code executes
- **Click to Navigate** - Click any node to jump to source code
- **Detail Sidebar** - See full event details, variables, and timing
- **Performance Metrics** - Execution time for every function
- **Pause/Resume** - Control trace data flow
- **Export** - Save trace data as JSON

### Smart Filtering
- **Hide Simple Lines** - Show only interesting events by default
- **Compact View** - Reduce vertical spacing
- **Auto-scroll** - Follow execution automatically

## Quick Start

### 1. Start the Trace Server

Click the status bar item that says "Blind: Stopped" or run command:
```
Cmd+Shift+P → "Blind: Start Trace Server"
```

### 2. Open the Visualizer

Run command:
```
Cmd+Shift+P → "Blind: Show Execution Flow Visualizer"
```

### 3. Run Your Python Code

Navigate to your Python script and run it with the Blind tracer:

```bash
cd /path/to/your/project
python -m blind.python your_script.py
```

Or use programmatically:

```python
from blind.python import Tracer

with Tracer():
    # Your code here
    result = my_function()
```

### 4. Watch the Execution Flow

The visualizer shows your code's execution in real-time! Click any node to jump to that line in your source file.

## Commands

- **Blind: Show Execution Flow Visualizer** - Open the flow visualizer panel
- **Blind: Start Trace Server** - Start listening for Python traces
- **Blind: Stop Trace Server** - Stop the trace server
- **Blind: Toggle Trace Server** - Toggle server on/off (click status bar)
- **Blind: Show Trace Statistics** - View execution statistics
- **Blind: Clear Event Buffer** - Clear captured events

## Examples

See [examples/sample.py](examples/sample.py) for a demonstration script showing:
- Function calls and recursion
- Class methods
- Loops and conditionals
- Exception handling
- List comprehensions

## Architecture

### Components

1. **Python Tracer** - Uses `sys.settrace()` for comprehensive tracing, analyzes AST to detect entity types
2. **Trace Server** - TCP server in VS Code extension that receives and buffers trace events
3. **Flow Visualizer** - Interactive webview panel with real-time graph rendering

### Data Flow

```
Python Code → sys.settrace() → Tracer → TCP Socket →
VS Code Extension → Trace Server → Webview → Interactive Graph
```

## Requirements

- VS Code 1.106.1 or higher
- Python 3.7 or higher

## Known Issues

- Large execution flows (>10,000 events) may impact performance
- Standard library functions are excluded from tracing by default
- Tracing adds overhead - not recommended for production use

## Release Notes

### 0.0.1

Initial release:
- Comprehensive Python execution tracing
- Real-time graph visualization
- Entity-specific coloring and icons
- Click-to-navigate source code
- Performance metrics

---

**Blind** - See how your code really runs.
