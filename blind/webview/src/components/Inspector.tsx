import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { useVSCode } from '../hooks/useVSCode';
import './Inspector.css';

export const Inspector = () => {
  const { events, currentEventIndex, projectFiles } = useStore();
  const { postMessage } = useVSCode(() => {});

  const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;

  // Get code context (lines before and after current line)
  const codeContext = useMemo(() => {
    if (!currentEvent) return null;

    const file = projectFiles.get(currentEvent.file_path);
    if (!file) return null;

    const lineIndex = currentEvent.line_number - 1;
    const contextLines = 2; // Show 2 lines before and after

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

  // Get function arguments (for function_call events)
  const functionArguments = useMemo(() => {
    if (!currentEvent || !currentEvent.arguments) {
      return [];
    }

    return Object.entries(currentEvent.arguments)
      .filter(([key]) => !key.startsWith('__'))
      .map(([name, value]) => ({
        name,
        value: formatValue(value),
        type: typeof value,
      }));
  }, [currentEvent]);

  // Get return value (for function_return events)
  const returnValue = useMemo(() => {
    if (!currentEvent || currentEvent.return_value === undefined) {
      return null;
    }

    return {
      value: formatValue(currentEvent.return_value),
      type: typeof currentEvent.return_value,
    };
  }, [currentEvent]);

  // Get variables from current event
  const variables = useMemo(() => {
    if (!currentEvent || !currentEvent.variables) {
      return [];
    }

    return Object.entries(currentEvent.variables)
      .filter(([key]) => !key.startsWith('__'))
      .map(([name, value]) => ({
        name,
        value: formatValue(value),
        type: typeof value,
      }));
  }, [currentEvent]);

  // Format value for display
  function formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value, null, 2);
        return str.length > 100 ? str.substring(0, 100) + '...' : str;
      } catch {
        return String(value);
      }
    }
    return String(value);
  }

  // Get type color
  function getTypeColor(type: string): string {
    switch (type) {
      case 'string': return '#ce9178';
      case 'number': return '#b5cea8';
      case 'boolean': return '#569cd6';
      case 'object': return '#4ec9b0';
      case 'function': return '#dcdcaa';
      default: return '#cccccc';
    }
  }

  // Get event type badge color
  function getEventTypeColor(eventType: string): string {
    if (eventType.includes('call')) return '#4aff9e';
    if (eventType.includes('return')) return '#ffeb3b';
    if (eventType.includes('exception')) return '#ff4a4a';
    if (eventType.includes('loop')) return '#b084eb';
    if (eventType.includes('conditional')) return '#ffb84a';
    return '#4a9eff';
  }

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
      <div className="inspector-panel">
        <div className="inspector-header">
          <h3>Inspector</h3>
        </div>
        <div className="inspector-empty">
          <div className="empty-icon">INSPECTOR</div>
          <p>No event selected</p>
          <span className="empty-hint">Start playback to inspect execution</span>
        </div>
      </div>
    );
  }

  const fileName = currentEvent.file_path.split('/').pop() || currentEvent.file_path;
  const isFunctionCall = currentEvent.event_type.includes('call');
  const isFunctionReturn = currentEvent.event_type.includes('return');

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <h3>Inspector</h3>
        <span className="inspector-badge">Event #{currentEventIndex + 1}</span>
      </div>

      <div className="inspector-content">
        {/* Execution Location Section */}
        <div className="inspector-section">
          <div className="section-title">
            <span>EXECUTION LOCATION</span>
          </div>
          <div className="section-content">
            <div className="info-item">
              <span className="item-label">File:</span>
              <span className="item-value file-name" title={currentEvent.file_path}>
                {fileName}
              </span>
            </div>
            <div className="info-item">
              <span className="item-label">Function:</span>
              <span className="item-value code-value">
                {currentEvent.function_name}
                {currentEvent.function_name !== '<module>' && '()'}
              </span>
            </div>
            {currentEvent.class_name && (
              <div className="info-item">
                <span className="item-label">Class:</span>
                <span className="item-value code-value">{currentEvent.class_name}</span>
              </div>
            )}
            <div className="info-item">
              <span className="item-label">Line:</span>
              <span className="item-value">{currentEvent.line_number}</span>
            </div>
            <button className="jump-to-code-btn" onClick={handleJumpToCode}>
              <span className="btn-icon">▸</span>
              Jump to Code
            </button>
          </div>
        </div>

        {/* Code Context Section */}
        {codeContext && codeContext.length > 0 && (
          <div className="inspector-section">
            <div className="section-title">
              <span>CODE CONTEXT</span>
            </div>
            <div className="section-content code-context-content">
              <div className="code-lines">
                {codeContext.map((line, index) => (
                  <div
                    key={index}
                    className={`code-line ${line.isCurrent ? 'current-line' : ''}`}
                  >
                    <span className="line-number">{line.number}</span>
                    <span className="line-pipe">│</span>
                    <span className="line-content">{line.content}</span>
                    {line.isCurrent && <span className="current-indicator">◄</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Event Details Section */}
        <div className="inspector-section">
          <div className="section-title">
            <span>EVENT DETAILS</span>
          </div>
          <div className="section-content">
            <div className="info-item">
              <span className="item-label">Type:</span>
              <span
                className="event-type-badge"
                style={{ backgroundColor: getEventTypeColor(currentEvent.event_type) }}
              >
                {currentEvent.event_type}
              </span>
            </div>
            <div className="info-item">
              <span className="item-label">Depth:</span>
              <span className="item-value">
                {currentEvent.call_stack_depth}
                <span className="depth-indicator">
                  {' '}{'→'.repeat(Math.min(currentEvent.call_stack_depth, 5))}
                  {currentEvent.call_stack_depth > 5 && '...'}
                </span>
              </span>
            </div>
            <div className="info-item">
              <span className="item-label">Scope:</span>
              <span className="item-value code-value">{currentEvent.scope_id}</span>
            </div>
            {currentEvent.module_name && (
              <div className="info-item">
                <span className="item-label">Module:</span>
                <span className="item-value code-value">{currentEvent.module_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Function Arguments Section (only for function_call events) */}
        {isFunctionCall && functionArguments.length > 0 && (
          <div className="inspector-section">
            <div className="section-title">
              <span>ARGUMENTS</span>
              <span className="variable-count">{functionArguments.length}</span>
            </div>
            <div className="section-content variables-content">
              {functionArguments.map((arg, index) => (
                <div key={index} className="variable-item">
                  <div className="variable-header">
                    <span className="variable-name">{arg.name}</span>
                    <span
                      className="variable-type"
                      style={{ color: getTypeColor(arg.type) }}
                    >
                      {arg.type}
                    </span>
                  </div>
                  <div className="variable-value">
                    {arg.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Return Value Section (only for function_return events) */}
        {isFunctionReturn && returnValue && (
          <div className="inspector-section">
            <div className="section-title">
              <span>RETURN VALUE</span>
            </div>
            <div className="section-content">
              <div className="return-value-container">
                <div className="return-type" style={{ color: getTypeColor(returnValue.type) }}>
                  {returnValue.type}
                </div>
                <div className="return-value">
                  {returnValue.value}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Variables Section */}
        {variables.length > 0 && (
          <div className="inspector-section">
            <div className="section-title">
              <span>LOCAL VARIABLES</span>
              <span className="variable-count">{variables.length}</span>
            </div>
            <div className="section-content variables-content">
              {variables.map((variable, index) => (
                <div key={index} className="variable-item">
                  <div className="variable-header">
                    <span className="variable-name">{variable.name}</span>
                    <span
                      className="variable-type"
                      style={{ color: getTypeColor(variable.type) }}
                    >
                      {variable.type}
                    </span>
                  </div>
                  <div className="variable-value">
                    {variable.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full File Path (at bottom for reference) */}
        <div className="inspector-section">
          <div className="section-content">
            <div className="full-path-container">
              <span className="full-path-label">Full Path:</span>
              <span className="full-path-value" title={currentEvent.file_path}>
                {currentEvent.file_path}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
