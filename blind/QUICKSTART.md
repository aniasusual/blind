# Blind Quick Start

Get up and running with Blind in 2 minutes!

## 🚀 Quick Setup

### 1. Start the Trace Server
In VS Code, click the status bar item (bottom left):
```
"Blind: Stopped" → Click to start
```

Status should change to: `Blind: Running (0 clients, 0 events)`

### 2. Open the Visualizer
Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux), then:
```
> Blind: Show Execution Flow Visualizer
```

### 3. Run Your Python Code
In your terminal:
```bash
cd /path/to/blind
python -m python examples/sample.py
```

**That's it!** Watch the execution flow appear in real-time! 🎉

## 📝 Trace Your Own Code

### Method 1: Command Line (No Code Changes)
```bash
python -m blind.python your_script.py
```

### Method 2: Add to Your Code
```python
from blind.python import Tracer

with Tracer():
    your_function()
```

## 🎮 Using the Visualizer

- **Click any node** → Jumps to that line in your code
- **🗑️ Clear** → Reset the graph
- **⏸️ Pause** → Stop/resume trace data
- **Auto-scroll** → Keep latest events visible
- **Show all lines** → See every line execution

## 🎨 Node Colors

- 📞 **Blue** - Functions/methods
- ↩️ **Green** - Returns  
- 🔁 **Purple** - Loops
- ❓ **Orange** - Conditionals (if/else)
- ❌ **Red** - Exceptions
- 📝 **Cyan** - Variable assignments

## 💡 Pro Tips

1. **Stack depth** = horizontal position (left = top level, right = nested calls)
2. **Time** = vertical position (top to bottom)
3. Click nodes to see **full details** in the sidebar
4. Use **Compact view** for dense graphs
5. **Export** trace data as JSON for analysis

## 🐛 Troubleshooting

**No events showing?**
- Make sure trace server is running (status bar)
- Check that your Python script executes successfully
- Try checking "Show all lines"

**Import error?**
```bash
export PYTHONPATH="/path/to/blind:$PYTHONPATH"
```

## 📚 Learn More

- [README.md](README.md) - Full documentation
- [USAGE.md](USAGE.md) - Detailed usage guide
- [examples/sample.py](examples/sample.py) - Demo script

---

**Blind** - See how your code really runs! 🔍
