import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import './Inspector.css';

export const Inspector = () => {
  const { events, currentEventIndex } = useStore();

  const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;

  // Calculate timing information
  const timingInfo = useMemo(() => {
    if (!currentEvent || currentEventIndex < 0) {
      return null;
    }

    const startTime = events[0]?.timestamp || 0;
    const currentTime = currentEvent.timestamp || 0;
    const elapsedTime = currentTime - startTime;

    // Find previous event in same file
    let timeSincePrevious = 0;
    for (let i = currentEventIndex - 1; i >= 0; i--) {
      if (events[i].file_path === currentEvent.file_path) {
        timeSincePrevious = currentTime - (events[i].timestamp || 0);
        break;
      }
    }

    // Calculate execution frequency for this line
    const lineExecutions = events
      .slice(0, currentEventIndex + 1)
      .filter(e => e.file_path === currentEvent.file_path && e.line_number === currentEvent.line_number)
      .length;

    return {
      absoluteTime: currentTime,
      elapsedTime,
      timeSincePrevious,
      lineExecutions,
    };
  }, [events, currentEventIndex, currentEvent]);

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

  if (!currentEvent) {
    return (
      <div className="inspector-panel">
        <div className="inspector-header">
          <h3>Inspector</h3>
        </div>
        <div className="inspector-empty">
          <p>No event selected</p>
          <span className="empty-hint">Start playback to inspect</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inspector-panel">
      <div className="inspector-header">
        <h3>Inspector</h3>
        <span className="inspector-badge">Event #{currentEventIndex + 1}</span>
      </div>

      <div className="inspector-content">
        {/* Timing Section */}
        {timingInfo && (
          <div className="inspector-section">
            <div className="section-title">
              <span className="section-icon">⏱️</span>
              <span>Timing</span>
            </div>
            <div className="section-content">
              <div className="info-item">
                <span className="item-label">Absolute Time:</span>
                <span className="item-value">{timingInfo.absoluteTime.toFixed(6)}s</span>
              </div>
              <div className="info-item">
                <span className="item-label">Elapsed Time:</span>
                <span className="item-value">{timingInfo.elapsedTime.toFixed(6)}s</span>
              </div>
              <div className="info-item">
                <span className="item-label">Since Previous:</span>
                <span className="item-value">{timingInfo.timeSincePrevious.toFixed(6)}s</span>
              </div>
              <div className="info-item">
                <span className="item-label">Line Executions:</span>
                <span className="item-value">{timingInfo.lineExecutions}x</span>
              </div>
            </div>
          </div>
        )}

        {/* Event Details Section */}
        <div className="inspector-section">
          <div className="section-title">
            <span className="section-icon">📋</span>
            <span>Event Details</span>
          </div>
          <div className="section-content">
            <div className="info-item">
              <span className="item-label">Type:</span>
              <span className="item-value event-type-badge">{currentEvent.event_type}</span>
            </div>
            <div className="info-item">
              <span className="item-label">Function:</span>
              <span className="item-value code-value">{currentEvent.function_name}()</span>
            </div>
            <div className="info-item">
              <span className="item-label">Line:</span>
              <span className="item-value">{currentEvent.line_number}</span>
            </div>
            {currentEvent.parent_event_id !== undefined && currentEvent.parent_event_id >= 0 && (
              <div className="info-item">
                <span className="item-label">Parent Event:</span>
                <span className="item-value">#{currentEvent.parent_event_id + 1}</span>
              </div>
            )}
          </div>
        </div>

        {/* File Details Section */}
        <div className="inspector-section">
          <div className="section-title">
            <span className="section-icon">📄</span>
            <span>File</span>
          </div>
          <div className="section-content">
            <div className="info-item">
              <span className="item-label">Path:</span>
              <span className="item-value file-path" title={currentEvent.file_path}>
                {currentEvent.file_path.split('/').pop()}
              </span>
            </div>
            <div className="info-item full-path">
              <span className="full-path-value">{currentEvent.file_path}</span>
            </div>
          </div>
        </div>

        {/* Variables Section */}
        {variables.length > 0 && (
          <div className="inspector-section">
            <div className="section-title">
              <span className="section-icon">🔍</span>
              <span>Variables</span>
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

        {variables.length === 0 && (
          <div className="inspector-section">
            <div className="section-title">
              <span className="section-icon">🔍</span>
              <span>Variables</span>
            </div>
            <div className="section-content">
              <div className="no-data">No variables captured</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};