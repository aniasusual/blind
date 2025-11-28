# Blind Usage Guide

Complete guide to using Blind for visual Python debugging.

## Setup

### 1. Install the Extension

The Blind extension should be installed in VS Code. If you're developing it, press **F5** to launch the Extension Development Host.

### 2. Prepare Your Python Environment

Make sure the `blind/python` directory is accessible from your Python scripts. You have several options:

#### Option A: Add to PYTHONPATH
```bash
export PYTHONPATH="/path/to/blind:$PYTHONPATH"
```

#### Option B: Run from the blind directory
```bash
cd /path/to/blind
python -m python your_script.py
```

#### Option C: Install as package (development mode)
```bash
cd /path/to/blind
pip install -e .
```

## Using the Tracer

### Method 1: Command Line Runner (Recommended)

This is the easiest way to trace any Python script without modifying it:

```bash
# Basic usage
python -m blind.python your_script.py

# With arguments
python -m blind.python your_script.py --arg1 value1

# Custom host/port
python -m blind.python --host localhost --port 9876 your_script.py
```

### Method 2: Context Manager

Add tracing to specific sections of your code:

```python
from blind.python import Tracer

def my_function():
    # Complex logic you want to trace
    result = calculate_something()
    return result

# Trace only this section
with Tracer():
    my_function()
```

### Method 3: Manual Control

For fine-grained control over when tracing starts and stops:

```python
from blind.python import start_tracing, stop_tracing

# Start tracing
tracer = start_tracing(host='localhost', port=9876)

# Your code here
my_function()
do_something_else()

# Stop tracing and get statistics
stats = stop_tracing()
print(f"Captured {stats['total_events']} events")
```

## Workflow

### Complete Workflow Example

1. **Start VS Code** and open your project

2. **Start the trace server**
   - Click status bar item "Blind: Stopped"
   - Or: `Cmd+Shift+P` → "Blind: Start Trace Server"
   - Status bar should show "Blind: Running"

3. **Open the visualizer**
   - `Cmd+Shift+P` → "Blind: Show Execution Flow Visualizer"
   - A webview panel opens on the right side

4. **Run your Python code**
   ```bash
   cd /path/to/your/project
   python -m blind.python your_script.py
   ```

5. **Watch the magic happen!**
   - The visualizer fills with colored nodes as your code executes
   - Click any node to jump to that line in your source code
   - Use the sidebar to see detailed information

6. **Analyze and debug**
   - See execution order by following the connections
   - Identify slow functions by their timing
   - Track down exceptions and error paths
   - Understand complex control flow

## Visualizer Controls

### Toolbar Buttons

- **🗑️ Clear** - Remove all nodes and reset the graph
- **⏸️ Pause** - Stop receiving new trace events (click again to resume)
- **💾 Export** - Save trace data as JSON file

### Checkboxes

- **Auto-scroll** - Automatically scroll to show newest events (enabled by default)
- **Show all lines** - Include simple line executions (disabled by default)
- **Compact view** - Reduce spacing between nodes for denser visualization

### Graph Interaction

- **Click a node** - Jump to that line in your source code + show details in sidebar
- **Scroll** - Navigate through the execution flow
- **Sidebar** - View full event details, variables, arguments, and timing

## Understanding the Graph

### Node Colors

Nodes are color-coded by type:

- **Blue** - Function/method calls
- **Green** - Function/method returns
- **Purple** - Loops (start and iterations)
- **Orange** - Conditionals (if/elif/else)
- **Red** - Exceptions
- **Cyan** - Variable assignments
- **Gray** - Simple line executions

### Node Layout

- **Vertical** - Time/execution order (top to bottom)
- **Horizontal** - Call stack depth (left = top level, right = nested)

### Node Content

Each node shows:
- Icon representing the entity type
- Function/method name (with class name if applicable)
- Entity type label
- The actual line of code
- Execution time (for returns)

### Sidebar Details

Click any node to see:
- Event ID
- Event type
- Function name
- Class name (if applicable)
- File path and line number
- Full code content
- Execution time
- All entity-specific data (arguments, variables, etc.)

## Example Session

Let's trace a simple fibonacci calculator:

### 1. Create the script

```python
# fibonacci.py
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(f"Fibonacci(5) = {fibonacci(5)}")
```

### 2. Start tracing

```bash
# Terminal
python -m blind.python fibonacci.py
```

### 3. What you'll see in the visualizer

The graph will show:
1. Main script execution starting
2. First call to `fibonacci(5)`
3. Recursive calls branching out:
   - `fibonacci(4)` + `fibonacci(3)`
   - `fibonacci(3)` + `fibonacci(2)` + `fibonacci(2)` + `fibonacci(1)`
   - ... and so on
4. Each return value flowing back up
5. Final print statement

Each node shows execution time, so you can see which recursive calls took longest!

## Tips and Tricks

### 1. Filtering Noise

By default, simple line executions are hidden. If you need them:
- Check "Show all lines" in the toolbar

### 2. Performance

For large applications:
- Use the context manager to trace only specific sections
- Keep "Show all lines" disabled
- Use "Compact view" for dense graphs

### 3. Debugging Exceptions

When an exception occurs:
- Look for red nodes (exception_raised)
- Follow the stack backward to see what led to it
- Check the sidebar for exception type and message

### 4. Understanding Recursion

Recursive functions show clearly in the graph:
- Each recursive call appears horizontally (deeper stack)
- You can see the recursion tree structure
- Return nodes flow back up the tree

### 5. Analyzing Performance

- Look for nodes with high execution times
- Compare timing across multiple runs
- Use "Blind: Show Statistics" to see aggregate metrics

### 6. Exporting Data

Export trace data for:
- Sharing with teammates
- Post-mortem analysis
- Automated testing/CI integration

## Troubleshooting

### "Failed to connect" Error

**Problem:** Python tracer can't connect to VS Code

**Solutions:**
1. Make sure trace server is running (status bar shows "Blind: Running")
2. Check port 9876 is not blocked
3. Try stopping and restarting the server
4. Verify localhost connectivity

### No Events Appearing

**Problem:** Visualizer stays empty

**Solutions:**
1. Ensure trace server is started BEFORE running Python
2. Verify your Python script actually runs (check terminal output)
3. Check for import errors in Python
4. Try "Show all lines" to see if any events are captured

### Import Errors

**Problem:** `ModuleNotFoundError: No module named 'blind'`

**Solutions:**
1. Add blind directory to PYTHONPATH:
   ```bash
   export PYTHONPATH="/path/to/blind:$PYTHONPATH"
   ```
2. Or run from the blind directory:
   ```bash
   cd /path/to/blind
   python -m python your_script.py
   ```

### Too Many Events

**Problem:** Graph becomes too cluttered

**Solutions:**
1. Disable "Show all lines"
2. Enable "Compact view"
3. Use context manager to trace only specific sections
4. Use "Clear" button to reset between runs

### Slow Performance

**Problem:** Extension or graph becomes slow

**Solutions:**
1. Tracing adds overhead - this is normal
2. For very large traces (>10K events), use filtering
3. Don't trace production code
4. Consider tracing smaller sections

## Advanced Usage

### Custom Host/Port

```bash
python -m blind.python --host 192.168.1.100 --port 8888 script.py
```

### Programmatic Configuration

```python
from blind.python import ExecutionTracer

tracer = ExecutionTracer(host='localhost', port=9876)
tracer.start_tracing()

# Your code
my_function()

tracer.stop_tracing()
stats = tracer.get_statistics()
```

### Excluding Files

Modify the tracer to exclude specific files:

```python
from blind.python import ExecutionTracer

tracer = ExecutionTracer()
tracer.exclude_files.add('/path/to/file.py')
tracer.start_tracing()
```

## Next Steps

- Check out [examples/sample.py](examples/sample.py) for a comprehensive demo
- Experiment with your own code
- Share feedback and feature requests!

---

Happy debugging with Blind! 🔍
