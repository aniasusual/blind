import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { TraceEvent } from '../types';
import { useTreeFilters } from '../hooks/useTreeFilters';
import { FilterPanel } from './FilterPanel';
import './FunctionCallTree.css';

interface CallTreeNode {
  event: TraceEvent;
  eventIndex: number;
  children: CallTreeNode[];
  isExpanded: boolean;
  executionCount: number; // How many times this function was called
  id: string; // Unique ID for this node
}

export const FunctionCallTree = () => {
  const { events, currentEventIndex, setCurrentEventIndex, projectFiles } = useStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Initialize filtering
  const {
    filters,
    setSearchQuery,
    toggleHotPath,
    toggleHideStdlib,
    toggleEventType,
    toggleFile,
    clearAllFilters,
    shouldShowEvent,
    getActiveFilterCount,
  } = useTreeFilters();

  // Get available files for filtering
  const availableFiles = useMemo(() => {
    const files = new Set<string>();
    events.forEach((event) => {
      if (event.file_path) {
        files.add(event.file_path);
      }
    });
    return Array.from(files).sort();
  }, [events]);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Build call tree from events with filtering
  const callTree = useMemo(() => {
    if (events.length === 0) return null;

    // Find root events (top-level calls with depth 0 or no parent)
    const rootNodes: CallTreeNode[] = [];
    const nodeMap = new Map<number, CallTreeNode>();

    // Calculate execution counts first (for filtering)
    const functionCounts = new Map<string, number>();
    events.forEach((event) => {
      if (event.event_type === 'function_call' || event.event_type === 'method_call') {
        const key = `${event.file_path}:${event.function_name}`;
        functionCounts.set(key, (functionCounts.get(key) || 0) + 1);
      }
    });

    // First pass: Create nodes for function_call events that pass filters
    events.forEach((event, index) => {
      if (event.event_type === 'function_call' || event.event_type === 'method_call') {
        const key = `${event.file_path}:${event.function_name}`;
        const executionCount = functionCounts.get(key) || 1;

        // Apply filters
        if (!shouldShowEvent(event, executionCount)) {
          return;
        }

        const nodeId = `${event.event_id}-${index}`;
        const node: CallTreeNode = {
          event,
          eventIndex: index,
          children: [],
          isExpanded: true, // Start expanded by default
          executionCount,
          id: nodeId,
        };
        nodeMap.set(event.event_id, node);
      }
    });

    // Second pass: Build tree structure using parent_event_id
    nodeMap.forEach((node) => {
      if (node.event.parent_event_id !== null && node.event.parent_event_id !== undefined) {
        const parentNode = nodeMap.get(node.event.parent_event_id);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // No parent found or parent filtered out, treat as root
          rootNodes.push(node);
        }
      } else {
        // No parent, this is a root node
        rootNodes.push(node);
      }
    });

    return rootNodes;
  }, [events, shouldShowEvent]);

  // Check if an event is in the current execution path
  const isInCurrentPath = (eventIndex: number): boolean => {
    if (currentEventIndex < 0) return false;
    return eventIndex <= currentEventIndex;
  };

  // Check if this is the currently active event
  const isCurrentEvent = (eventIndex: number): boolean => {
    return eventIndex === currentEventIndex;
  };

  // Get icon for event type - removed for cleaner UI
  const getIcon = (event: TraceEvent): string => {
    return '';
  };

  // Get file name from path
  const getFileName = (filePath: string): string => {
    return filePath.split('/').pop() || filePath;
  };

  // Render a tree node
  const renderNode = (node: CallTreeNode, depth: number = 0): JSX.Element => {
    const inPath = isInCurrentPath(node.eventIndex);
    const isCurrent = isCurrentEvent(node.eventIndex);
    const fileName = getFileName(node.event.file_path);
    const hasChildren = node.children.length > 0;
    const icon = getIcon(node.event);
    const isNodeExpanded = expandedNodes.has(node.id) !== false; // Default to expanded if not in set

    // Display name
    const displayName = node.event.function_name === '<module>'
      ? `${fileName} (module)`
      : node.event.function_name;

    const handleToggleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleNode(node.id);
    };

    const handleNodeClick = () => {
      setCurrentEventIndex(node.eventIndex);
    };

    return (
      <div key={node.id} className="tree-node-wrapper">
        <div
          className={`tree-node ${isCurrent ? 'current' : ''} ${inPath ? 'in-path' : 'not-executed'}`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={handleNodeClick}
        >
          {hasChildren && (
            <span className="tree-toggle" onClick={handleToggleClick}>
              {isNodeExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span className="tree-spacer"></span>}

          <span className="tree-icon">{icon}</span>

          <div className="tree-content">
            <span className="tree-function-name">{displayName}</span>
            <span className="tree-location">
              {fileName}:{node.event.line_number}
            </span>
            {node.executionCount > 1 && (
              <span className="tree-execution-count">×{node.executionCount}</span>
            )}
          </div>

          {isCurrent && <span className="tree-current-indicator">◀</span>}
        </div>

        {isNodeExpanded && hasChildren && (
          <div className="tree-children">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!callTree || callTree.length === 0) {
    return (
      <div className="function-call-tree">
        <div className="tree-header">
          <h3>Call Hierarchy</h3>
        </div>
        <div className="tree-empty">
          <p>No function calls recorded</p>
          <span className="empty-hint">Start playback to see execution flow</span>
        </div>
      </div>
    );
  }

  const totalCalls = events.filter((e) => e.event_type.includes('call')).length;
  const visibleNodes = callTree?.reduce((count, node) => {
    const countNodes = (n: CallTreeNode): number => {
      return 1 + n.children.reduce((sum, child) => sum + countNodes(child), 0);
    };
    return count + countNodes(node);
  }, 0) || 0;

  return (
    <div className="function-call-tree">
      <div className="tree-header">
        <h3>Call Hierarchy</h3>
        <span className="tree-stats">
          {visibleNodes} / {totalCalls} calls
        </span>
      </div>

      <FilterPanel
        filters={filters}
        onSearchChange={setSearchQuery}
        onToggleHotPath={toggleHotPath}
        onToggleHideStdlib={toggleHideStdlib}
        onToggleEventType={toggleEventType}
        onClearAll={clearAllFilters}
        activeFilterCount={getActiveFilterCount()}
        availableFiles={availableFiles}
        onToggleFile={toggleFile}
      />

      <div className="tree-container">
        {callTree.map((node) => renderNode(node, 0))}
      </div>
    </div>
  );
};
