# Blind - Setup Instructions

## Prerequisites

- Python 3.8+
- Node.js 16+
- VS Code

## Installation

### 1. Clone and Setup

```bash
cd /Users/animeshdhillon/myProjects/blind/blind

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python package in editable mode
pip install -e .

# Install Node dependencies
npm install

# Install webview dependencies
cd webview
npm install
cd ..
```

### 2. Build the Extension

```bash
# Build webview
npm run build:webview

# Compile extension
npm run compile
```

## Running the Extension

### Development Mode

1. Open the project in VS Code
2. Press **F5** to launch Extension Development Host
3. In the Extension Development Host:
   - Press **Cmd+Shift+P**
   - Run: `Blind: Start Trace Server`
   - Run: `Blind: Show Flow Visualizer`

### Test with Example

```bash
# Activate venv (if not already)
source venv/bin/activate

# Run the multi-file example
cd examples/multi_file_example
python -m blind main.py
```

## Usage

### Basic Usage

```bash
# Make sure venv is activated
source venv/bin/activate

# Run your Python script with blind tracer
python -m blind your_script.py
```

### Environment Variables

```bash
# Set custom host/port
export BLIND_TRACER_HOST=localhost
export BLIND_TRACER_PORT=9876

python -m blind your_script.py
```

## Quick Commands

```bash
# Activate venv
source activate_venv.sh

# Build webview only
npm run build:webview

# Build everything
npm run compile

# Watch mode (development)
npm run watch

# Type checking
npm run check-types

# Lint
npm run lint
```

## Architecture

```
blind/
├── python/              # Python tracer package
│   ├── __init__.py
│   ├── __main__.py     # Entry point
│   └── tracer.py       # Execution tracer
├── src/                # VS Code extension (TypeScript)
│   ├── extension.ts
│   ├── TraceServer.ts
│   └── FlowVisualizerPanelNew.ts
├── webview/            # React frontend
│   └── src/
│       ├── App.tsx
│       ├── store/
│       └── components/
├── examples/           # Example projects
└── venv/              # Virtual environment (local only)
```

## Troubleshooting

### Module not found: blind

```bash
# Reinstall in editable mode
source venv/bin/activate
pip install -e .
```

### Port already in use

```bash
# Kill process on port 9876
lsof -ti:9876 | xargs kill -9
```

### Extension not loading

```bash
# Rebuild everything
npm run compile
npm run build:webview
```

## Next Steps

See [COMPLETE_SETUP_GUIDE.md](COMPLETE_SETUP_GUIDE.md) for detailed testing instructions and feature overview.
