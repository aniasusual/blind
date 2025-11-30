# New File-Based Visualization Guide

## What Changed

The visualization has been completely redesigned from **function-node based** to **file-block based** display.

### Before (Old)
- Showed individual function calls as nodes
- Limited context per node
- Hard to see overall project flow

### After (New)
- Shows complete files as blocks
- Full source code visible
- Executed lines highlighted
- Clear cross-file flow

## New Features

### 1. File Blocks
Each file is displayed as a complete block containing:
- **Header**: File name, line count, execution stats
- **Code**: Complete source code with line numbers
- **Executed Lines**: Green highlight for executed lines
- **Footer**: Coverage percentage

### 2. Execution Flow
- Files appear in execution order
- Arrows between files show flow
- Cross-file calls section shows transitions

### 3. Project Summary
- Total files traced
- Cross-file call count
- Total lines executed

### 4. File Details Panel
Click any file to see:
- Full file path
- Total lines
- Executed lines
- Coverage percentage
- Event count
- First seen timestamp

### 5. Interactive Features
- **Click line**: Jump to that line in VS Code
- **Select file**: View detailed stats
- **Hover**: Highlight executed lines
- **Scroll**: Navigate through files

## How to Build & Run

```bash
# 1. Build extension
cd /Users/animeshdhillon/myProjects/blind/blind
npm run compile

# 2. Build webview
cd webview
npm run build
cd ..

# 3. Press F5 in VS Code to launch Extension Development Host

# 4. In Extension Development Host:
#    - Start Trace Server
#    - Open Flow Visualizer
#    - Run your Python code

# 5. Watch the new file-based visualization!
```

## Visual Layout

```
┌──────────────────────────────────────────┐
│ [Project Summary Bar]                    │
│ 3 files • 2 cross-file calls • 45 lines  │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ [Cross-File Calls]                       │
│ main.py → calculator.py                  │
│ calculator.py → utils.py                 │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ main.py                  [32 lines • 15 executed]  │
├──────────────────────────────────────────┤
│  1 │ from calculator import *            │ ← Executed (green)
│  2 │                                     │
│  3 │ def main():                         │ ← Executed (green)
│  4 │     print("Running...")             │ ← Executed (green)
│  5 │     result = add(5, 3)              │ ← Executed (green)
│ ... (complete file code shown)           │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ calculator.py            [36 lines • 20 executed]  │
├──────────────────────────────────────────┤
│  1 │ from utils import validate_number   │ ← Executed (green)
│  2 │                                     │
│  3 │ def add(a, b):                      │ ← Executed (green)
│  4 │     validate_number(a)              │ ← Executed (green)
│ ... (complete file code shown)           │
└──────────────────────────────────────────┘
                    ↓
┌──────────────────────────────────────────┐
│ utils.py                 [30 lines • 10 executed]  │
├──────────────────────────────────────────┤
│  1 │ def validate_number(value):         │ ← Executed (green)
│  2 │     if not isinstance(value, ...)   │ ← Executed (green)
│ ... (complete file code shown)           │
└──────────────────────────────────────────┘
```

## Key Components

### 1. FileBlock.tsx
- Displays individual file with complete code
- Highlights executed lines
- Handles line clicks

### 2. FlowCanvas.tsx
- Main container
- Manages file list and order
- Shows cross-file calls
- Displays project summary

### 3. Enhanced Store
- `projectFiles`: Map of file data
- `fileExecutionOrder`: Execution sequence
- `crossFileCalls`: File transitions
- `selectedFile`: Currently selected file

## Color Coding

- **Green Background**: Executed lines
- **Blue Border**: Selected file
- **Gray Text**: Line numbers
- **White Text**: Code content

## Stats Display

### Toolbar
- Files count
- Lines executed count
- Total events count

### File Headers
- File name
- Total lines
- Executed lines
- Event count

### Details Panel
- Coverage %
- First seen time
- Full file path

## Benefits

✅ **See Complete Context**: View entire files, not just snippets
✅ **Visual Coverage**: Instantly see which lines ran
✅ **Project Flow**: Understand cross-file execution
✅ **Quick Navigation**: Click to jump to any line
✅ **Better Debugging**: Spot issues in context

## Next Enhancements

- [ ] Syntax highlighting for code
- [ ] Collapsible file blocks
- [ ] Filter by file type
- [ ] Search within files
- [ ] Timeline scrubber
- [ ] Heatmap view (execution frequency)

---

**Your vision is now reality!** 🎉

The visualization now shows complete project execution flow with file-level granularity, making debugging visual and intuitive.