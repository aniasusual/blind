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

  console.log(`[CallStack] Rendering with ${events.length} events, currentIndex: ${currentEventIndex}`);

  // Build call stack for current event
  const callStack = useMemo(() => {
    if (currentEventIndex < 0 || events.length === 0) {
      return [];
    }

    const currentEvent = events[currentEventIndex];
    console.log('[CallStack] Current event:', {
      type: currentEvent.event_type,
      func: currentEvent.function_name,
      line: currentEvent.line_number,
      parent_id: currentEvent.parent_event_id,
      event_id: currentEvent.event_id,
    });

    const stack: StackFrame[] = [];

    // Build call stack based on call_stack_depth
    // Group events by depth and find the active function calls
    const callEvents = events.slice(0, currentEventIndex + 1).filter(e => e.event_type === 'function_call');
    console.log('[CallStack] Found function_call events:', callEvents.length);

    if (callEvents.length > 0) {
      console.log('[CallStack] Sample call event:', {
        type: callEvents[0].event_type,
        func: callEvents[0].function_name,
        depth: callEvents[0].call_stack_depth,
        parent_id: callEvents[0].parent_event_id,
      });
    }

    // Build stack by collecting all 'function_call' events up to current depth
    const currentDepth = currentEvent.call_stack_depth;

    // Find active calls at each depth level
    const depthMap = new Map<number, TraceEvent>();

    for (let i = currentEventIndex; i >= 0; i--) {
      const event = events[i];
      const depth = event.call_stack_depth;

      // Only consider 'function_call' events
      if (event.event_type === 'function_call' && !depthMap.has(depth) && depth <= currentDepth) {
        depthMap.set(depth, event);
      }

      // Stop if we've found all depths
      if (depthMap.size === currentDepth + 1) {
        break;
      }
    }

    // Convert to sorted stack
    const depths = Array.from(depthMap.keys()).sort((a, b) => a - b);
    depths.forEach(depth => {
      const event = depthMap.get(depth)!;
      stack.push({
        event,
        depth,
      });
    });

    console.log('[CallStack] Built stack with', stack.length, 'frames');

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

          const displayName = frame.event.function_name === '<module>'
            ? `${fileName} (module)`
            : `${frame.event.function_name}()`;

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
                  {displayName}
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