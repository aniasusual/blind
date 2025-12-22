import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useVSCode } from '../hooks/useVSCode';
import { ValueTooltip } from './ValueTooltip';
import './CodeContext.css';

export const CodeContext = () => {
  const { events, currentEventIndex, projectFiles } = useStore();
  const { postMessage } = useVSCode(() => {});

  const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;

  // Helper to format values for inline display
  const formatInlineValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') {
      // Handle Python object representations
      if (value.startsWith('<') && value.endsWith('>')) {
        if (value.includes('function ')) {
          const match = value.match(/function\s+(\w+)/);
          return match ? `<fn ${match[1]}>` : '<function>';
        }
        if (value.includes('method ')) {
          const match = value.match(/method\s+(\w+)/);
          return match ? `<method ${match[1]}>` : '<method>';
        }
        return '<object>';
      }
      return value.length > 30 ? `"${value.substring(0, 27)}..."` : `"${value}"`;
    }
    if (typeof value === 'object') {
      const str = JSON.stringify(value);
      return str.length > 30 ? str.substring(0, 27) + '...' : str;
    }
    return String(value);
  };

  // Get function arguments for current event
  const functionArguments = useMemo(() => {
    if (!currentEvent || !currentEvent.arguments) return null;

    return Object.entries(currentEvent.arguments)
      .filter(([key]) => !key.startsWith('__'))
      .map(([name, value]) => ({
        name,
        value: formatInlineValue(value),
        fullValue: value,
      }));
  }, [currentEvent]);

  // Get local variables for current event
  const localVariables = useMemo(() => {
    if (!currentEvent || !currentEvent.variables) return null;

    return Object.entries(currentEvent.variables)
      .filter(([key, value]) => {
        // Filter out private/dunder variables
        if (key.startsWith('__')) return false;

        // Filter out function/method/class references (not useful runtime values)
        if (typeof value === 'string') {
          if (value.startsWith('<function ') ||
              value.startsWith('<method ') ||
              value.startsWith('<class ') ||
              value.startsWith('<module ') ||
              value.includes('built-in')) {
            return false;
          }
        }

        return true;
      })
      .map(([name, value]) => ({
        name,
        value: formatInlineValue(value),
        fullValue: value,
      }));
  }, [currentEvent]);

  // Get code context (lines before and after current line)
  const codeContext = useMemo(() => {
    if (!currentEvent) return null;

    const file = projectFiles.get(currentEvent.file_path);
    if (!file) return null;

    const lineIndex = currentEvent.line_number - 1;
    const contextLines = 7; // Show 7 lines before and after (15 total)

    const startLine = Math.max(0, lineIndex - contextLines);
    const endLine = Math.min(file.lines.length - 1, lineIndex + contextLines);

    const lines = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push({
        number: i + 1,
        content: file.lines[i],
        isCurrent: i === lineIndex,
      });
    }

    return lines;
  }, [currentEvent, projectFiles]);

  // Calculate execution frequency heat map for visible lines
  const lineExecutionCounts = useMemo(() => {
    if (!currentEvent || !codeContext) return new Map<number, number>();

    const counts = new Map<number, number>();
    const visibleEvents = events.slice(0, currentEventIndex + 1);

    visibleEvents.forEach((event) => {
      if (event.file_path === currentEvent.file_path) {
        const count = counts.get(event.line_number) || 0;
        counts.set(event.line_number, count + 1);
      }
    });

    return counts;
  }, [currentEvent, codeContext, events, currentEventIndex]);

  // Get max count for heat map normalization
  const maxCount = useMemo(() => {
    return Math.max(...Array.from(lineExecutionCounts.values()), 1);
  }, [lineExecutionCounts]);

  // Get heat map color intensity (0-1)
  const getHeatIntensity = (lineNumber: number): number => {
    const count = lineExecutionCounts.get(lineNumber) || 0;
    return count / maxCount;
  };

  // Handle jump to code
  const handleJumpToCode = () => {
    if (!currentEvent) return;

    postMessage({
      type: 'nodeClicked',
      data: {
        filePath: currentEvent.file_path,
        line: currentEvent.line_number,
      },
    });
  };

  if (!currentEvent) {
    return (
      <div className="code-context-panel">
        <div className="code-context-header">
          <h3>Code Context</h3>
        </div>
        <div className="code-context-empty">
          <div className="empty-icon">{'</>'}</div>
          <p>No code to display</p>
          <span className="empty-hint">Select an event to see the code</span>
        </div>
      </div>
    );
  }

  const fileName = currentEvent.file_path.split('/').pop() || currentEvent.file_path;
  const functionDisplay = currentEvent.function_name === '<module>'
    ? `${fileName} (module-level)`
    : `${currentEvent.function_name}()`;

  return (
    <div className="code-context-panel">
      <div className="code-context-header">
        <div className="header-left">
          <h3>Code Context</h3>
          <span className="event-badge">Event #{currentEventIndex + 1}</span>
        </div>
        <button className="jump-button" onClick={handleJumpToCode}>
          Jump to Code
        </button>
      </div>

      <div className="code-context-info">
        <div className="info-row">
          <div className="info-details">
            <span className="info-label">Location</span>
            <span className="info-value">{fileName}:{currentEvent.line_number}</span>
          </div>
        </div>
        <div className="info-row">
          <div className="info-details">
            <span className="info-label">Function</span>
            <span className="info-value">{functionDisplay}</span>
          </div>
        </div>
        <div className="info-row">
          <div className="info-details">
            <span className="info-label">Event Type</span>
            <span className="info-value event-type">{currentEvent.event_type}</span>
          </div>
        </div>
      </div>

      <div className="code-context-content">
        {/* Function Arguments Section */}
        {functionArguments && functionArguments.length > 0 && (
          <div className="inline-section arguments-section">
            <div className="inline-header">
              <span className="inline-title">Arguments ({functionArguments.length})</span>
            </div>
            <div className="inline-items">
              {functionArguments.map((arg, idx) => (
                <ValueTooltip
                  key={idx}
                  name={arg.name}
                  value={arg.fullValue}
                  displayValue={arg.value}
                >
                  <div className="inline-item">
                    <span className="item-name">{arg.name}</span>
                    <span className="item-arrow">──→</span>
                    <span className="item-value">{arg.value}</span>
                  </div>
                </ValueTooltip>
              ))}
            </div>
          </div>
        )}

        {codeContext && codeContext.length > 0 ? (
          <div className="code-lines">
            {codeContext.map((line) => {
              const heatIntensity = getHeatIntensity(line.number);
              const executionCount = lineExecutionCounts.get(line.number) || 0;

              return (
                <div
                  key={line.number}
                  className={`code-line ${line.isCurrent ? 'current-line' : ''}`}
                  style={{
                    background: heatIntensity > 0 && !line.isCurrent
                      ? `rgba(74, 255, 158, ${heatIntensity * 0.15})`
                      : undefined
                  }}
                  title={executionCount > 0 ? `Executed ${executionCount} time(s)` : undefined}
                >
                  <span className="line-number">{line.number}</span>
                  <span className="line-pipe">│</span>
                  <span className="line-content">{line.content || ' '}</span>
                  {line.isCurrent && <span className="current-arrow">◀</span>}
                  {!line.isCurrent && executionCount > 1 && (
                    <span className="execution-badge">×{executionCount}</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-code">
            <p>Code not available for this file</p>
          </div>
        )}

        {/* Local Variables Section */}
        {localVariables && localVariables.length > 0 && (
          <div className="inline-section variables-section">
            <div className="inline-header">
              <span className="inline-title">Local Variables ({localVariables.length})</span>
            </div>
            <div className="inline-items">
              {localVariables.map((variable, idx) => (
                <ValueTooltip
                  key={idx}
                  name={variable.name}
                  value={variable.fullValue}
                  displayValue={variable.value}
                >
                  <div className="inline-item">
                    <span className="item-name">{variable.name}</span>
                    <span className="item-arrow">──→</span>
                    <span className="item-value">{variable.value}</span>
                  </div>
                </ValueTooltip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Execution Metadata */}
      <div className="code-context-footer">
        <div className="footer-section">
          <span className="footer-label">Call Depth:</span>
          <span className="footer-value">
            {currentEvent.call_stack_depth}
            <span className="depth-indicator">
              {' '}{'→'.repeat(Math.min(currentEvent.call_stack_depth, 5))}
              {currentEvent.call_stack_depth > 5 && '...'}
            </span>
          </span>
        </div>
        {currentEvent.timestamp !== undefined && (
          <div className="footer-section">
            <span className="footer-label">Timestamp:</span>
            <span className="footer-value">{currentEvent.timestamp.toFixed(6)}s</span>
          </div>
        )}
      </div>
    </div>
  );
};
