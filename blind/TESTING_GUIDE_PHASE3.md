# Phase 3 Testing Guide

## Quick Test Workflow

### 1. Basic Functionality Test (5 minutes)

**Start the extension:**
```bash
# In VS Code, press F5 to launch Extension Development Host
# Then: Cmd+Shift+P → "Blind: Show Execution Flow Visualizer"
```

**Run a sample trace:**
```bash
# Create test file: test_app.py
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

def main():
    print(factorial(5))
    print(fibonacci(6))

if __name__ == "__main__":
    main()

# Run with Blind:
python -m blind test_app.py
```

### 2. Test Filtering (3 minutes)

**In the Call Hierarchy panel (left):**

1. **Search Test**
   - Type "factorial" in search box
   - ✅ Should show only factorial calls
   - Clear search (✕ button)
   - ✅ All calls should reappear

2. **Hot Path Test**
   - Click "Filters" to expand
   - Check "Hot Path Only (5+ calls)"
   - ✅ Should show only frequently called functions
   - ✅ fibonacci(n-1) and fibonacci(n-2) should show (called many times)
   - ✅ Tree stats should show "X / Y calls" (X < Y)

3. **Hide Stdlib Test**
   - Check "Hide Standard Library"
   - ✅ Should hide Python built-in functions
   - ✅ Your code functions remain visible

4. **Event Type Filter Test**
   - Uncheck "Returns"
   - ✅ Return events should disappear from tree
   - Re-check "Returns"
   - ✅ Returns should reappear

5. **Clear All Test**
   - With multiple filters active
   - Click "Clear All"
   - ✅ All filters should reset
   - ✅ Active filter count badge should disappear

### 3. Test Export (2 minutes)

**In the Timeline panel (bottom):**

1. **Export Full Trace**
   - Click "💾 Export" button
   - Click "📦 Export Full Trace"
   - ✅ Should download `blind-trace-<timestamp>.json`
   - ✅ Status message: "✓ Exported successfully"
   - Open file and verify it contains events

2. **Export Snapshot**
   - Navigate to an interesting event (use N key)
   - Click "💾 Export"
   - Click "📸 Export Snapshot"
   - ✅ Should download `blind-snapshot-<timestamp>.json`
   - ✅ Status message: "✓ Snapshot exported"
   - Open file and verify it contains current event

3. **Copy to Clipboard**
   - Click "💾 Export"
   - Click "📋 Copy to Clipboard"
   - ✅ Status message: "✓ Copied to clipboard"
   - Paste into a text editor
   - ✅ Should see JSON trace data

### 4. Test Performance (2 minutes)

**Create a larger test file:**
```python
# test_large.py
def nested_calls(depth):
    if depth == 0:
        return 1
    return nested_calls(depth - 1) + nested_calls(depth - 1)

def many_calls():
    for i in range(50):
        nested_calls(4)

if __name__ == "__main__":
    many_calls()
```

**Run it:**
```bash
python -m blind test_large.py
```

**Performance Checks:**
- ✅ Tree loads without freezing
- ✅ Scrolling is smooth
- ✅ Search updates instantly
- ✅ Filter toggles are quick
- ✅ No lag when navigating

### 5. Test Keyboard Shortcuts (1 minute)

With a trace loaded:

- Press **Space** → ✅ Should play/pause
- Press **N** → ✅ Should step to next event
- Press **P** → ✅ Should step to previous event
- Press **→** → ✅ Should step forward
- Press **←** → ✅ Should step backward
- Press **Home** → ✅ Should jump to start
- Press **End** → ✅ Should jump to end

All shortcuts should work WITHOUT clicking anything first!

### 6. Integration Test (Full Workflow)

**Scenario: Debug a performance issue**

```python
# test_performance.py
import time

def slow_function():
    time.sleep(0.1)
    return 42

def fast_function():
    return 1 + 1

def process_data():
    for i in range(10):
        slow_function()
        fast_function()

if __name__ == "__main__":
    process_data()
```

**Workflow:**
```
1. Run: python -m blind test_performance.py
2. Enable "Hot Path Only" filter
   → ✅ slow_function appears (called 10 times)
3. Search "slow"
   → ✅ Only slow_function shows
4. Click on slow_function
   → ✅ Code context shows the function
   → ✅ Inspector shows execution details
5. Export snapshot
   → ✅ Downloads JSON with slow_function state
6. Copy to clipboard
   → ✅ Can paste trace into documentation
```

---

## Expected Results Summary

### ✅ Filtering Works
- Search updates instantly
- Hot Path shows 5+ call functions
- Hide Stdlib removes Python internals
- Event type filters toggle correctly
- File filters work (if multiple files)
- Clear All resets everything
- Active filter count badge accurate

### ✅ Export Works
- Full trace downloads complete JSON
- Snapshot downloads current event
- Clipboard copy works
- Status messages appear and dismiss
- Stats display correct counts

### ✅ Performance is Good
- No lag with 1,000+ events
- Smooth scrolling
- Instant search results
- Quick filter updates
- No UI freezing

### ✅ Keyboard Shortcuts Work
- All 7 shortcuts respond
- No conflicts with input fields
- Works immediately without clicking

### ✅ UI is Polished
- Animations are smooth
- Buttons have hover effects
- Status messages are clear
- Layout is consistent
- Icons are visible

---

## Known Issues to Expect

### Not Issues (By Design)
1. **Filters don't persist** - Reset on refresh (feature for Phase 4)
2. **No regex search** - Simple substring only (can be added later)
3. **Export only JSON** - No CSV or HTML yet (can be added)
4. **No import** - Can't re-load exported traces yet (Phase 4)

### Edge Cases
1. **Empty trace** - Should show "No function calls recorded"
2. **No event selected** - Snapshot export disabled
3. **Private browsing** - Panel persistence might not work (localStorage blocked)

---

## If Something Doesn't Work

### Build Issues
```bash
# Rebuild webview
npm run build:webview

# Should output:
# ✓ built in ~400ms
# JS: 254.25 kB (gzipped: 78.13 kB)
# CSS: 32.41 kB (gzipped: 5.39 kB)
```

### Extension Issues
```bash
# In VS Code
# Press F5 to reload extension
# Check Debug Console for errors
```

### Webview Issues
```bash
# Open webview dev tools
# Right-click webview → "Inspect"
# Check Console for errors
```

---

## Success Criteria

Phase 3 is working correctly if:

- ✅ All filters work individually
- ✅ Filters combine correctly
- ✅ Search is instant
- ✅ Export creates valid JSON
- ✅ Clipboard copy works
- ✅ Performance is smooth with 1,000+ events
- ✅ Keyboard shortcuts all respond
- ✅ UI is polished and responsive
- ✅ No console errors
- ✅ Build completes successfully

---

## Next Steps After Testing

1. **If all tests pass:**
   - ✅ Phase 3 is complete!
   - Ready for user acceptance testing
   - Can proceed to Phase 4 or release

2. **If issues found:**
   - Document the issue
   - Check console for errors
   - Report what doesn't work
   - We'll fix and re-test

---

## Quick Verification Commands

```bash
# 1. Check build
npm run build:webview

# 2. Check TypeScript
cd webview && npm run type-check

# 3. Run extension
# Press F5 in VS Code

# 4. Create test trace
echo "def test(): print('hello')" > test.py
echo "if __name__ == '__main__': test()" >> test.py
python -m blind test.py
```

---

**Expected total testing time: ~15 minutes**

**Critical tests: Filtering, Export, Performance**

**If those three work, Phase 3 is successful!** ✅
