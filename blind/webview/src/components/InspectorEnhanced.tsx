import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useVSCode } from '../hooks/useVSCode';
import './InspectorEnhanced.css';

interface CollapsibleSectionProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleSection = ({ title, count, children, defaultExpanded = true }: CollapsibleSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="inspector-section">
      <div
        className="section-title-collapsible"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="section-toggle">{isExpanded ? '▼' : '▶'}</span>
        <span className="section-title-text">{title}</span>
        {count !== undefined && <span className="section-count">{count}</span>}
      </div>
      {isExpanded && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  );
};

export const InspectorEnhanced = () => {
  const { events, currentEventIndex, projectFiles } = useStore();
  const { postMessage } = useVSCode(() => {});

  const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;

  // Build call stack from current event
  const callStack = useMemo(() => {
    if (!currentEvent || currentEventIndex < 0) return [];

    const stack = [];
    const currentDepth = currentEvent.call_stack_depth;

    // Find active calls at each depth
    const depthMap = new Map<number, typeof currentEvent>();

    for (let i = currentEventIndex; i >= 0; i--) {
      const event = events[i];
      const depth = event.call_stack_depth;

      if ((event.event_type === 'function_call' || event.event_type === 'method_call') &&
          !depthMap.has(depth) &&
          depth <= currentDepth) {
        depthMap.set(depth, event);
      }

      if (depthMap.size === currentDepth + 1) break;
    }

    // Convert to sorted array
    const depths = Array.from(depthMap.keys()).sort((a, b) => a - b);
    depths.forEach(depth => {
      const event = depthMap.get(depth)!;
      const fileName = event.file_path.split('/').pop() || event.file_path;
      stack.push({
        depth,
        event,
        fileName,
        isCurrentFrame: event.event_id === currentEvent.event_id,
      });
    });

    return stack;
  }, [events, currentEventIndex, currentEvent]);

  // Helper to get display type
  const getDisplayType = (value: any): string => {
    if (typeof value === 'string' && value.startsWith('<') && value.endsWith('>')) {
      // Extract type from Python repr
      if (value.includes('function ')) return 'function';
      if (value.includes('method ')) return 'method';
      if (value.includes('class ')) return 'class';
      if (value.includes('module ')) return 'module';
      if (value.includes('built-in')) return 'builtin';

      const typeMatch = value.match(/<(\w+)\s/);
      if (typeMatch) return typeMatch[1].toLowerCase();
    }
    return typeof value;
  };

  // Removed function arguments, return value, and variables - they are now shown in Code Context panel

  // Format value for display
  function formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (typeof value === 'string') {
      // Check if it's a Python object representation
      if (value.startsWith('<') && value.endsWith('>')) {
        // Extract meaningful info from Python object repr
        // e.g., "<function validate_number at 0x1013e8ca0>" -> "function: validate_number"
        // e.g., "<class 'str'>" -> "class: str"
        // e.g., "<module 'os' from '/usr/lib/python3.9/os.py'>" -> "module: os"

        if (value.includes('function ')) {
          const match = value.match(/function\s+(\w+)/);
          if (match) return `<function ${match[1]}>`;
        }

        if (value.includes('method ')) {
          const match = value.match(/method\s+(\w+)/);
          if (match) return `<method ${match[1]}>`;
        }

        if (value.includes('class ')) {
          const match = value.match(/class\s+'([^']+)'/);
          if (match) return `<class ${match[1]}>`;
        }

        if (value.includes('module ')) {
          const match = value.match(/module\s+'([^']+)'/);
          if (match) return `<module ${match[1]}>`;
        }

        if (value.includes('built-in')) {
          return '<built-in>';
        }

        // For other object reprs, try to extract the type
        const typeMatch = value.match(/<(\w+)\s/);
        if (typeMatch) return `<${typeMatch[1]} object>`;

        // If we can't parse it, just return it as-is but truncated
        return value.length > 50 ? value.substring(0, 50) + '...' : value;
      }

      // Regular string value
      return value.length > 100 ? `"${value.substring(0, 97)}..."` : `"${value}"`;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'boolean') {
      return String(value);
    }

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
      case 'method': return '#dcdcaa';
      case 'class': return '#4ec9b0';
      case 'module': return '#569cd6';
      case 'builtin': return '#c586c0';
      case 'list': return '#4ec9b0';
      case 'dict': return '#4ec9b0';
      case 'tuple': return '#4ec9b0';
      case 'set': return '#4ec9b0';
      default: return '#cccccc';
    }
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
      <div className="inspector-panel-enhanced">
        <div className="inspector-header">
          <h3>Inspector</h3>
        </div>
        <div className="inspector-empty">
          <p>No event selected</p>
          <span className="empty-hint">Navigate execution to inspect events</span>
        </div>
      </div>
    );
  }

  // Removed unused variables

  return (
    <div className="inspector-panel-enhanced">
      <div className="inspector-header">
        <h3>Inspector</h3>
        <span className="inspector-badge">Event #{currentEventIndex + 1}</span>
      </div>

      <div className="inspector-content">
        {/* Call Stack Section */}
        <CollapsibleSection title="CALL STACK" count={callStack.length} defaultExpanded={true}>
          <div className="call-stack-list">
            {callStack.length === 0 ? (
              <div className="no-data">No call stack</div>
            ) : (
              callStack.map((frame, index) => (
                <div
                  key={index}
                  className={`stack-frame-item ${frame.isCurrentFrame ? 'current-frame' : ''}`}
                  style={{ paddingLeft: `${frame.depth * 12 + 12}px` }}
                >
                  <div className="frame-depth-indicator">
                    <span className="depth-badge">{frame.depth}</span>
                  </div>
                  <div className="frame-info">
                    <div className="frame-function">
                      {frame.event.function_name === '<module>'
                        ? `${frame.fileName} (module)`
                        : `${frame.event.function_name}()`}
                    </div>
                    <div className="frame-location">
                      {frame.fileName}:{frame.event.line_number}
                    </div>
                  </div>
                  {frame.isCurrentFrame && <span className="current-frame-marker">◀</span>}
                </div>
              ))
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
};
