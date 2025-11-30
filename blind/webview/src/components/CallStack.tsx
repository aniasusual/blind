import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { TraceEvent } from '../types';
import './CallStack.css';

interface StackFrame {
  event: TraceEvent;
  depth: number;
}

export const CallStack = () => {
  const { events, currentEventIndex } = useStore();

  // Build call stack for current event
  const callStack = useMemo(() => {
    if (currentEventIndex < 0 || events.length === 0) {
      return [];
    }

    const currentEvent = events[currentEventIndex];
    const stack: StackFrame[] = [];
    const eventMap = new Map<number, TraceEvent>();

    // Build event map for quick lookup
    events.slice(0, currentEventIndex + 1).forEach((event, index) => {
      eventMap.set(index, event);
    });

    // Build stack by traversing parent relationships
    let depth = 0;
    let currentIdx = currentEventIndex;
    const visited = new Set<number>();

    while (currentIdx >= 0 && !visited.has(currentIdx)) {
      visited.add(currentIdx);
      const event = eventMap.get(currentIdx);

      if (!event) break;

      // Only include 'call' events in the stack
      if (event.event_type === 'call') {
        stack.unshift({
          event,
          depth,
        });
        depth++;
      }

      // Move to parent event
      if (event.parent_event_id !== undefined && event.parent_event_id >= 0) {
        currentIdx = event.parent_event_id;
      } else {
        break;
      }
    }

    return stack;
  }, [events, currentEventIndex]);

  const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;

  if (!currentEvent) {
    return (
      <div className="call-stack-panel">
        <div className="call-stack-header">
          <h3>Call Stack</h3>
          <span className="stack-count">0 frames</span>
        </div>
        <div className="call-stack-empty">
          <p>No execution started</p>
          <span className="empty-hint">Press play to start</span>
        </div>
      </div>
    );
  }

  return (
    <div className="call-stack-panel">
      <div className="call-stack-header">
        <h3>Call Stack</h3>
        <span className="stack-count">{callStack.length} frame{callStack.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="call-stack-list">
        {callStack.map((frame, index) => {
          const isCurrentFrame = frame.event.line_number === currentEvent.line_number &&
                                 frame.event.file_path === currentEvent.file_path;
          const fileName = frame.event.file_path.split('/').pop() || frame.event.file_path;

          return (
            <div
              key={index}
              className={`stack-frame ${isCurrentFrame ? 'active-frame' : ''}`}
              style={{ paddingLeft: `${frame.depth * 12 + 12}px` }}
              title={frame.event.file_path}
            >
              <div className="frame-indicator">
                {isCurrentFrame ? '▶' : '○'}
              </div>
              <div className="frame-content">
                <div className="frame-function">
                  {frame.event.function_name}()
                </div>
                <div className="frame-location">
                  <span className="frame-file">{fileName}</span>
                  <span className="frame-separator">:</span>
                  <span className="frame-line">{frame.event.line_number}</span>
                </div>
              </div>
              <div className="frame-depth">#{frame.depth}</div>
            </div>
          );
        })}
      </div>

      {/* Current Event Info */}
      <div className="current-event-info">
        <div className="info-row">
          <span className="info-label">Event Type:</span>
          <span className="info-value event-type-badge">{currentEvent.event_type}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Sequence:</span>
          <span className="info-value">#{currentEventIndex + 1}</span>
        </div>
        {currentEvent.timestamp !== undefined && (
          <div className="info-row">
            <span className="info-label">Timestamp:</span>
            <span className="info-value">{currentEvent.timestamp.toFixed(3)}s</span>
          </div>
        )}
      </div>
    </div>
  );
};