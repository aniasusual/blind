# Blind - Multi-Language Execution Flow Visualizer

**Transform debugging from reading static code into watching live execution flows.**

Blind captures every function call, loop iteration, conditional branch, and exception in real-time, visualizing your code's execution as an interactive, animated graph.

![Blind Execution Flow Visualizer](https://img.shields.io/badge/version-1.0.0-blue)
![Python Support](https://img.shields.io/badge/Python-✅_Full_Support-green)
![More Languages](https://img.shields.io/badge/JS%2FGo%2FJava-🔜_Planned-yellow)

---

## 🎯 What is Blind?

Blind is a VS Code extension that provides **x-ray vision into your code's execution**. Instead of setting breakpoints and stepping through code line-by-line while mentally reconstructing the execution path, you see the entire flow as a clickable, color-coded graph.

### Currently Supporting
- ✅ **Python** - Full support with `sys.settrace()`
- 🔜 **JavaScript/TypeScript** - Planned (V8 Inspector Protocol)
- 🔜 **Go** - Planned (Runtime instrumentation)
- 🔜 **Java** - Planned (Java Agent API)

---

## ⚡ Quick Start

### 1. Start Trace Server
```
Cmd+Shift+P → "Blind: Start Trace Server"
```

### 2. Open Visualizer
```
Cmd+Shift+P → "Blind: Show Execution Flow Visualizer"
```

### 3. Install Python Tracer
```bash
pip install -e .
```

### 4. Run Your Code with Tracing
```bash
python -m blind your_script.py
```

**That's it!** Watch your execution flow visualized in real-time.

---

## 🎨 Features

### Comprehensive Tracing (Python)
- **Function & Method Calls** - Track every invocation
- **Line-by-Line Execution** - See every line that runs
- **Loop Detection** - Visualize iterations and flow
- **Conditional Branches** - Track if/elif/else paths
- **Exception Handling** - See where exceptions occur
- **Variable Tracking** - Capture variable states
- **Cross-File Flows** - Visualize execution across files

### Interactive Visualization
- **Project-Wide Graph** - See all files and their relationships
- **Timeline Playback** - Replay execution at any speed (0.5×-4×)
- **Click to Navigate** - Jump directly to source code
- **Call Stack Panel** - Real-time call stack visualization
- **Event Inspector** - Detailed event metadata and variables
- **Code Coverage** - See which lines executed (color-coded)

### Performance Tracking
- **Execution Timing** - Function-level performance metrics
- **Event Frequency** - Identify hot paths
- **Critical Path Analysis** - See most-called functions
- **Call Stack Depth** - Track recursion and nesting

---

## 📖 Documentation

### **[📘 COMPLETE DEVELOPER GUIDE](COMPLETE_GUIDE.md)**

**Everything you need to understand, modify, and extend Blind - no AI assistance needed.**

This comprehensive guide includes:

- **Architecture Deep Dive** - How every component works internally
- **Component Breakdown** - Detailed explanation of Python tracer, VS Code extension, and React visualizer
- **Data Flow** - Complete flow from Python execution → TCP → Extension → React
- **Key Concepts** - Event sourcing, project-wide tracking, language-agnostic protocol
- **Development Guide** - Setting up, building, testing, debugging
- **Extension Guide** - How to add features, new event types, new languages
- **Troubleshooting** - Common issues and solutions
- **Code Examples** - Real implementations of every major feature

**Read this guide to understand the entire codebase and work independently.**

---

## 🏗️ Architecture

Blind uses a **language-agnostic architecture**:

```
┌─────────────────────────────────────────┐
│   VS Code Extension (Node.js)          │
│   ┌──────────────┐  ┌───────────────┐  │
│   │ TCP Server   │  │  React        │  │
│   │  :9876       │◄─┤  Visualizer   │  │
│   └──────────────┘  └───────────────┘  │
└───────────┬─────────────────────────────┘
            │ JSON over TCP
            ▼
┌─────────────────────────────────────────┐
│  Language-Specific Tracers              │
│  ┌──────────┐  ┌──────────┐            │
│  │  Python  │  │    JS    │  ...       │
│  │ (✅ Now)  │  │ (🔜 Soon) │            │
│  └──────────┘  └──────────┘            │
└─────────────────────────────────────────┘
```

### Key Design Principles

1. **Language-Agnostic Core** - Extension doesn't care about language
2. **Native Runtime Hooks** - Each tracer uses language's native APIs (not debuggers)
3. **Universal Protocol** - Standardized JSON event format
4. **Separate Packages** - Each language has its own tracer package
5. **Real-Time Streaming** - Events sent immediately, not buffered

**Why not use existing debuggers?**
- Debuggers pause execution (we need continuous flow)
- Debuggers are language-specific (we need universal protocol)
- Debuggers focus on breakpoints (we capture everything)

---

## 📦 Project Structure

```
blind/
├── COMPLETE_GUIDE.md          # 📘 Complete developer documentation
├── README.md                   # This file
│
├── src/                        # VS Code Extension (TypeScript)
│   ├── extension.ts            # Entry point
│   ├── TraceServer.ts          # TCP server (port 9876)
│   └── FlowVisualizerPanelNew.ts  # Webview manager
│
├── webview/                    # React Visualizer
│   └── src/
│       ├── components/         # UI components
│       │   ├── FlowCanvas.tsx  # Main graph visualization
│       │   ├── FileNode.tsx    # File display node
│       │   ├── Timeline.tsx    # Playback controls
│       │   ├── CallStack.tsx   # Call stack panel
│       │   └── Inspector.tsx   # Event details
│       └── store/
│           └── useStore.ts     # State management (Zustand)
│
└── tracers/
    ├── python/                 # Python tracer (✅ available)
    │   ├── tracer.py           # sys.settrace() implementation
    │   └── __main__.py         # CLI entry point
    │
    ├── javascript/             # JavaScript tracer (🔜 planned)
    ├── go/                     # Go tracer (🔜 planned)
    └── java/                   # Java tracer (🔜 planned)
```

---

## 🔧 Development

### Setup
```bash
# Install dependencies
npm install
cd webview && npm install && cd ..

# Install Python tracer
pip install -e .

# Build
npm run compile  # Builds both extension and webview
```

### Development Mode
```bash
# Watch mode (auto-rebuild)
npm run watch

# Press F5 in VS Code to launch Extension Development Host
```

### Testing
```bash
# Start extension (F5 in VS Code)
# In Extension Development Host:
Cmd+Shift+P → "Blind: Start Trace Server"
Cmd+Shift+P → "Blind: Show Execution Flow Visualizer"

# Run sample
python -m blind examples/sample.py
```

**For detailed development instructions, see [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md)**

---

## 🎯 Usage Examples

### Command Line
```bash
# Basic usage
python -m blind your_script.py

# With arguments
python -m blind my_script.py --arg1 value1

# Custom host/port
python -m blind --host localhost --port 9876 script.py

# Help
python -m blind --help
```

### Programmatic API
```python
from blind import start_tracing, stop_tracing

# Start tracing
tracer = start_tracing()

# Your code here
result = my_function()

# Stop and get stats
stats = stop_tracing()
print(f"Captured {stats['total_events']} events")
```

### Context Manager
```python
from blind import Tracer

with Tracer(host='localhost', port=9876):
    # Your code here
    my_function()
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Option 1: Use extension's helper
VS Code will show "Try to Kill Port" button

# Option 2: Manual kill
lsof -i :9876
kill -9 <PID>
```

### No Events Appearing
1. ✅ Check trace server is running (status bar shows "Blind: Running")
2. ✅ Check visualizer is open
3. ✅ Check Python tracer is installed: `python -m blind --help`
4. ✅ Check your script runs without errors

### Webview Not Loading
```bash
# Rebuild webview
npm run build:webview

# Reload extension
Cmd+R in Extension Development Host
```

**For more troubleshooting, see [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md#troubleshooting)**

---

## 🚀 Extending Blind

### Adding a New Event Type
See [COMPLETE_GUIDE.md - Adding a New Event Type](COMPLETE_GUIDE.md#adding-a-new-event-type)

### Adding a New Language
See [COMPLETE_GUIDE.md - Adding a New Language Tracer](COMPLETE_GUIDE.md#adding-a-new-language-tracer)

### Adding a New Visualization
See [COMPLETE_GUIDE.md - Adding a New Visualization](COMPLETE_GUIDE.md#adding-a-new-visualization)

---

## 📋 Requirements

- **VS Code** 1.106.1 or higher
- **Python** 3.8 or higher (for Python tracing)
- **Node.js** 18+ (for development)

---

## 🎓 Learning Resources

1. **Start here:** [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md) - Everything you need to know
2. **Python Tracing:** Read `tracers/python/tracer.py` with guide as reference
3. **Extension:** Read `src/TraceServer.ts` and `src/FlowVisualizerPanelNew.ts`
4. **React App:** Read `webview/src/components/FlowCanvas.tsx`
5. **State Management:** Read `webview/src/store/useStore.ts`

---

## 📊 Technical Details

### Technologies Used
- **Extension:** TypeScript, Node.js, VS Code API
- **Visualizer:** React 19, React Flow 11, Zustand, Vite
- **Python Tracer:** Python 3.8+, `sys.settrace()`, AST parsing
- **Communication:** TCP sockets, JSON over newlines
- **Build:** esbuild (extension), Vite (webview)

### Key Libraries
- `react-flow` - Graph visualization
- `zustand` - State management
- `immer` - Immutable state updates
- `@monaco-editor/react` - Code editor (optional)

### Protocol Version
**Blind Protocol v1.0.0** - Language-agnostic trace event format

---

## 📝 Release Notes

### 1.0.0 (Current)

Major architectural update:
- ✅ **Multi-language support architecture**
- ✅ **Python tracer with full execution tracing**
- ✅ **Real-time graph visualization**
- ✅ **Timeline playback with speed control**
- ✅ **Project-wide file tracking**
- ✅ **Cross-file call visualization**
- ✅ **Code coverage tracking**
- ✅ **Call stack panel**
- ✅ **Event inspector with variables**
- ✅ **Comprehensive developer documentation**

### 0.0.1

Initial release with basic Python tracing

---

## 🤝 Contributing

We welcome contributions! Before contributing:

1. Read [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md) to understand the architecture
2. Check existing issues or create a new one
3. Follow the code style and patterns in the guide
4. Test your changes thoroughly
5. Submit a PR with clear description

### Areas for Contribution
- 🎯 Implementing JavaScript/TypeScript tracer
- 🎯 Implementing Go tracer
- 🎯 Implementing Java tracer
- 🎯 Performance optimizations
- 🎯 New visualizations
- 🎯 Bug fixes
- 🎯 Documentation improvements

---

## 📄 License

[MIT License](LICENSE)

---

## 🙏 Acknowledgments

- Python's `sys.settrace()` for enabling comprehensive tracing
- React Flow for excellent graph visualization
- VS Code team for the extension API
- Zustand for simple state management

---

## 📬 Support

- **Documentation:** [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md)
- **Issues:** [GitHub Issues](https://github.com/yourusername/blind/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/blind/discussions)

---

**Blind** - See how your code really runs. 👁️

*Made with ❤️ for developers who want to understand their code better.*
