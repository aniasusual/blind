# Blind - User Guide
## Understanding Your Code's Execution Story

---

## Quick Start

1. **Open Blind Visualizer**
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Blind: Show Execution Flow Visualizer"

2. **Start Trace Server**
   - Press `Cmd+Shift+P` again
   - Type "Blind: Start Trace Server"
   - Status bar shows "Blind: Running"

3. **Run Your Python Code**
   ```bash
   python -m blind your_script.py
   ```

4. **Watch Execution in Real-Time!**

---

## Understanding the Interface

### Layout Overview

```
┌──────────────────────────────────────────────────────────┐
│ Left Panel       │ Center Panel      │ Right Panel       │
│ Function Tree    │ Code Context      │ Inspector         │
│                  │                   │                   │
│ 🎯 main()        │ 43 │ def add():   │ Event #42         │
│  ├─📖 load()     │ 44 │   result = x │ Type: function_call│
│  ├─⚙️ process()  │ 45 │ ▶ return sum │ Variables:        │
│  │  └─✓ check() │ 46 │   print(...)  │   x = 5           │
│  └─💾 save()     │ 47 │              │   y = 3           │
├──────────────────────────────────────────────────────────┤
│               Timeline (Bottom)                          │
│  |◄  ◄  ▶  ►  ►|    Event 42 / 500    Speed: 1x 2x     │
│  [====================|===========================]       │
└──────────────────────────────────────────────────────────┘
```

---

## Left Panel: Function Call Tree

### What It Shows
The **complete hierarchy** of function calls in your program.

### Visual Guide

#### Icons
- 🎯 **Entry Point** - Where your program starts (main, <module>)
- ⚙️ **Method** - Class method calls
- 📖 **Load/Read** - File reading, configuration loading
- 💾 **Save/Write** - File writing, data saving
- 🔄 **Process** - Data transformation, processing
- ✓ **Validate** - Validation, checking functions
- 🧹 **Cleanup** - Cleanup, deletion operations
- 📦 **Other** - Everything else

#### Colors & States
- **Gray** - Not executed yet (future events)
- **Green tint** - Already executed
- **Blue highlight** - Currently active event ◀

#### Badges
- **×5** - Function was called 5 times (loops, recursion)

### How to Use
- **Click any function** → Jump to that event
- **Scan the tree** → Understand program flow
- **Look for ×N badges** → Find loops/hot paths

---

## Center Panel: Code Context

### What It Shows
**7 lines of code** around the current execution point:
- 3 lines before
- **Current line** (blue highlight)
- 3 lines after

### Visual Guide

#### Heat Map (Background Colors)
- **Bright green** - Line executed many times (hot path!)
- **Faint green** - Executed a few times
- **No color** - Executed once
- **Blue** - Current line (overrides heat map)

#### Indicators
- **◀** - Current execution point
- **×5** - Line executed 5 times

### How to Use
- **Read the code** - Minimal context, no clutter
- **Check heat map** - See hot paths at a glance
- **Click "Jump to Code"** - Open full file in VS Code

---

## Right Panel: Inspector

### What It Shows
**Detailed information** about the current event:

#### Sections
1. **Execution Location** - File, function, line number
2. **Code Context** - Surrounding code lines
3. **Event Details** - Type, depth, scope, module
4. **Arguments** - Function parameters (for function_call events)
5. **Return Value** - What the function returned (for function_return events)
6. **Local Variables** - Current variable values
7. **Full File Path** - Complete path for reference

### How to Use
- **Check variables** - See current state
- **Inspect arguments** - Understand what was passed
- **View return values** - See what functions returned
- **Jump to code** - Click button to open in VS Code

---

## Bottom Panel: Timeline

### What It Shows
**Playback controls** and **execution progress**.

### Controls

#### Navigation
- **|◄** - Jump to start (event #1)
- **◄** - Step backward (previous event)
- **▶** - Play / Pause
- **►** - Step forward (next event)
- **►|** - Jump to end (last event)

#### Speed Control
- **0.5×** - Slow motion
- **1×** - Normal speed
- **2×** - Double speed
- **4×** - Fast forward

#### Progress Bar
- **Drag slider** - Scrub to any point in execution
- **Blue fill** - Shows progress

### How to Use
- **Play** → Watch execution unfold automatically
- **Step through** → Manually control execution
- **Scrub timeline** → Jump to any point instantly
- **Adjust speed** → Match your reading speed

---

## Common Workflows

### 1. "Where does my program start?"
1. Look at **left panel** (Call Tree)
2. Find the **🎯 icon** at the top
3. That's your entry point (usually `main()` or `<module>`)

### 2. "Which function calls what?"
1. Look at **left panel** (Call Tree)
2. Parent functions have **├─** children below them
3. Indentation shows nesting depth

### 3. "Where is my program spending time?"
1. Look at **center panel** (Code Context)
2. **Bright green lines** = hot paths (executed many times)
3. Check **×N badges** for execution counts

### 4. "What are the current variable values?"
1. Look at **right panel** (Inspector)
2. Scroll to "Local Variables" section
3. See all variables with their current values

### 5. "Why did this function get called?"
1. Click the function in **left panel** (Call Tree)
2. Look at its **parent** (one level up)
3. Click parent to see where it called from

### 6. "How many times does this function run?"
1. Look for **×N badge** next to function name in **left panel**
2. If no badge = called once
3. If **×15** = called 15 times (loop or recursion)

### 7. "Jump to the exact line in my editor"
1. Find the event you want in **left panel** or timeline
2. Click **"Jump to Code"** button in **center panel**
3. VS Code opens the file at the exact line

---

## Pro Tips

### Speed Up Your Debugging

1. **Use Speed Control**
   - Start at **0.5×** to understand flow
   - Switch to **4×** once you know what you're looking for

2. **Follow the Blue**
   - The **blue highlight** is your friend
   - Always shows current position in tree and code

3. **Check Heat Maps First**
   - **Bright green** = performance bottleneck
   - **Gray** = dead code (never executed)

4. **Use ×N Badges**
   - Find unexpected loops: "Why is this called 1000 times?"
   - Identify recursion: "This calls itself ×50"

5. **Collapse Noise**
   - Future feature: Collapse uninteresting function trees
   - For now: Scroll past utility functions to find your logic

---

## Keyboard Shortcuts (Future)

_Coming in Phase 2:_
- `Space` - Play/Pause
- `N` - Next event
- `P` - Previous event
- `Home` - Jump to start
- `End` - Jump to end

---

## Troubleshooting

### "I don't see any function calls"
- Make sure your Python code **calls functions**
- Module-level code (outside functions) shows as `<module>`
- Try running a program with clear function calls

### "The tree is too deep"
- This means deep recursion or many nested calls
- Use timeline to jump to specific points
- Look for **×N badges** to find repeated patterns

### "Code context is empty"
- File might not be in the workspace
- Try running code from VS Code workspace root
- Check file path in Inspector panel

### "Timeline won't play"
- Check if you're at the end (no more events)
- Press **|◄** to go to start
- Then press **▶** to play

---

## What Makes Blind Different?

### Traditional Debuggers
- ❌ Require setting breakpoints
- ❌ Pause execution constantly
- ❌ Only see one moment in time
- ❌ Must manually step through
- ❌ Lose context between sessions

### Blind
- ✅ **No breakpoints** needed - captures everything
- ✅ **Never pauses** - runs at full speed
- ✅ **See entire execution** - complete history
- ✅ **Time travel** - scrub anywhere instantly
- ✅ **Persistent** - save and replay sessions

---

## Example: Understanding a Bug

**Scenario:** "My program calculates wrong totals"

1. **Run with Blind**
   ```bash
   python -m blind my_program.py
   ```

2. **Find the calculation function**
   - Look in **left panel** for `calculate_total()`
   - See it's called **×15** times

3. **Check execution flow**
   - See it calls `apply_discount()`
   - Then calls `add_tax()`

4. **Examine variables**
   - Step to first `calculate_total()` call
   - **Right panel** shows: `price = 100`, `discount = 0.1`
   - Result: `total = 90` ✓

5. **Find the bug**
   - Step to 10th call
   - **Right panel** shows: `price = 100`, `discount = -0.1` ❌
   - Discount is negative!

6. **Jump to source**
   - Click **"Jump to Code"** in center panel
   - Fix discount calculation in VS Code
   - Re-run with Blind to verify

**Result:** Bug found in 30 seconds instead of 30 minutes!

---

## Next Steps

- **Try Blind** on your own code
- **Experiment** with playback speeds
- **Explore** the call tree hierarchy
- **Share** execution traces with teammates (future feature)

---

## Need Help?

- **GitHub Issues**: Report bugs or request features
- **Documentation**: See COMPLETE_GUIDE.md for technical details
- **Architecture**: See PHASE1_IMPLEMENTATION.md for design decisions

---

**Happy Debugging! 🐛🔍**
