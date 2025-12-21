import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useStore } from '../store/useStore';
import { FileNode } from './FileNode';
import { useVSCode } from '../hooks/useVSCode';
import './FlowCanvas.css';

const nodeTypes = {
  fileNode: FileNode,
};

export const FlowCanvas = () => {
  const {
    projectFiles,
    fileExecutionOrder,
    crossFileCalls,
    selectedFile,
    setSelectedFile,
    selectedEdge,
    setSelectedEdge,
    events,
    currentEventIndex,
  } = useStore();

  const { postMessage } = useVSCode(() => {});

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Handle edge click
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge.id);
  }, [setSelectedEdge]);

  // Convert project files to React Flow nodes
  useEffect(() => {
    if (fileExecutionOrder.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Track edge information: counts, function names, and sequences
    const edgeCallCounts = new Map<string, number>();
    const edgeCallSequences = new Map<string, number[]>();
    const edgeFunctionNames = new Map<string, Set<string>>();

    crossFileCalls.forEach((call, index) => {
      const key = `${call.from_file}->${call.to_file}`;
      edgeCallCounts.set(key, (edgeCallCounts.get(key) || 0) + 1);

      if (!edgeCallSequences.has(key)) {
        edgeCallSequences.set(key, []);
      }
      edgeCallSequences.get(key)!.push(index);

      // Track function names that caused this edge
      if (call.from_event_id !== undefined && call.to_event_id !== undefined) {
        const fromEvent = events[call.from_event_id];
        const toEvent = events[call.to_event_id];

        if (!edgeFunctionNames.has(key)) {
          edgeFunctionNames.set(key, new Set());
        }

        // Add the function that made the call (filter out <module>)
        if (fromEvent?.function_name && fromEvent.function_name !== '<module>') {
          edgeFunctionNames.get(key)!.add(fromEvent.function_name);
        }
        // Also track the target function (filter out <module>)
        if (toEvent?.function_name && toEvent.function_name !== '<module>') {
          edgeFunctionNames.get(key)!.add(toEvent.function_name);
        }
      }
    });

    // Calculate max call count for color scaling
    const maxCallCount = Math.max(...Array.from(edgeCallCounts.values()), 1);

    // Identify loops (edges called multiple times with increasing frequency)
    const isLoop = (key: string): boolean => {
      const count = edgeCallCounts.get(key) || 0;
      return count > 2; // Consider it a loop if called more than 2 times
    };

    // Identify critical path (most frequently traversed edges)
    const isCriticalPath = (callCount: number): boolean => {
      const ratio = callCount / maxCallCount;
      return ratio > 0.8; // Top 20% are critical path
    };

    // Get color based on call frequency
    const getEdgeColor = (callCount: number): string => {
      const ratio = callCount / maxCallCount;
      if (ratio > 0.7) return '#4aff9e'; // Green - hot path
      if (ratio > 0.4) return '#ffb84a'; // Orange - moderate
      return '#4a9eff'; // Blue - cold path
    };

    // Get stroke width based on call count
    const getStrokeWidth = (callCount: number): number => {
      const ratio = callCount / maxCallCount;
      return 1 + (ratio * 3); // 1-4px range
    };

    // Create nodes for each file
    fileExecutionOrder.forEach((filePath, index) => {
      const file = projectFiles.get(filePath);
      if (!file) return;

      newNodes.push({
        id: filePath,
        type: 'fileNode',
        position: { x: 400, y: index * 400 },
        data: {
          file,
          isSelected: selectedFile === filePath,
          onSelect: () => setSelectedFile(filePath),
          onLineClick: (lineNumber: number) => {
            postMessage({
              type: 'nodeClicked',
              data: {
                filePath,
                line: lineNumber,
              },
            });
          },
        },
      });
    });

    // Create edges ONLY for cross-file calls (actual function calls between files)
    const processedEdges = new Set<string>();

    crossFileCalls.forEach((call) => {
      const edgeKey = `${call.from_file}->${call.to_file}`;

      // Only add one edge per unique file pair
      if (processedEdges.has(edgeKey)) return;
      processedEdges.add(edgeKey);

      const callCount = edgeCallCounts.get(edgeKey) || 1;
      const hasLoop = isLoop(edgeKey);
      const onCriticalPath = isCriticalPath(callCount);
      const functionNames = edgeFunctionNames.get(edgeKey);

      // Build label with function names and indicators
      let label = '';

      // Show function name(s) that caused the call
      if (functionNames && functionNames.size > 0) {
        const funcArray = Array.from(functionNames).filter(name => name && name.trim());

        if (funcArray.length === 0) {
          // No meaningful function names, just show call count
          label = callCount > 1 ? `${callCount} calls` : 'call';
        } else if (funcArray.length === 1) {
          // Single function - show it
          label = funcArray[0];
          if (callCount > 1) {
            label += ` (${callCount}×)`;
          }
        } else if (funcArray.length === 2) {
          // Two functions - show both
          label = `${funcArray[0]} → ${funcArray[1]}`;
          if (callCount > 1) {
            label += ` (${callCount}×)`;
          }
        } else {
          // Multiple functions - show first one + count
          label = `${funcArray[0]} +${funcArray.length - 1} more`;
          if (callCount > 1) {
            label += ` (${callCount}×)`;
          }
        }
      } else {
        // No function names available, just show call count
        label = callCount > 1 ? `${callCount} calls` : 'cross-file call';
      }

      // Add indicators
      if (hasLoop) label += ' [LOOP]';
      if (onCriticalPath) label += ' [CRITICAL]';

      const edgeId = `${call.from_file}-${call.to_file}`;
      const isSelected = selectedEdge === edgeId;

      // Determine source/target positions based on file positions
      const sourceIndex = fileExecutionOrder.indexOf(call.from_file);
      const targetIndex = fileExecutionOrder.indexOf(call.to_file);

      let sourceHandle = 'bottom';
      let targetHandle = 'top';

      // If target is before source (backward call), use side handles
      if (targetIndex < sourceIndex) {
        sourceHandle = 'left';
        targetHandle = 'right';
      }
      // If target is after source but not adjacent, use side handles for clarity
      else if (targetIndex - sourceIndex > 1) {
        sourceHandle = 'right';
        targetHandle = 'left';
      }

      newEdges.push({
        id: edgeId,
        source: call.from_file,
        target: call.to_file,
        sourceHandle,
        targetHandle,
        type: 'smoothstep',
        animated: false,
        selected: isSelected,
        style: {
          stroke: isSelected ? '#0e639c' : getEdgeColor(callCount),
          strokeWidth: isSelected ? getStrokeWidth(callCount) + 2 : getStrokeWidth(callCount),
          strokeDasharray: hasLoop ? '5,5' : undefined,
        },
        label,
        labelStyle: {
          fill: onCriticalPath ? '#ffeb3b' : '#e0e0e0',
          fontWeight: onCriticalPath ? 700 : 600,
          fontSize: 11,
        },
        labelBgStyle: {
          fill: '#1e1e1e',
          fillOpacity: 0.95,
          padding: 8,
        },
        labelBgPadding: [8, 4] as [number, number],
        labelBgBorderRadius: 4,
        data: {
          callCount,
          hasLoop,
          onCriticalPath,
          functionNames: functionNames ? Array.from(functionNames) : [],
          sequences: edgeCallSequences.get(edgeKey) || [],
        },
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [projectFiles, fileExecutionOrder, crossFileCalls, selectedFile, selectedEdge, events, setSelectedFile, postMessage, setNodes, setEdges]);

  // Animate edges during playback with enhanced styling
  useEffect(() => {
    if (currentEventIndex < 0 || events.length === 0) {
      // Reset all edges to not animated
      setEdges((prevEdges) =>
        prevEdges.map((edge) => ({
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            filter: undefined,
          }
        }))
      );
      return;
    }

    const currentEvent = events[currentEventIndex];
    const previousEvent = currentEventIndex > 0 ? events[currentEventIndex - 1] : null;

    // If there's a file transition, animate the edge
    if (previousEvent && currentEvent.file_path !== previousEvent.file_path) {
      const sourceFile = previousEvent.file_path;
      const targetFile = currentEvent.file_path;

      setEdges((prevEdges) =>
        prevEdges.map((edge) => {
          // Animate the edge that matches the file transition
          const isActiveEdge = edge.source === sourceFile && edge.target === targetFile;

          return {
            ...edge,
            animated: isActiveEdge,
            style: {
              ...edge.style,
              stroke: isActiveEdge ? '#00ff88' : edge.style?.stroke,
              strokeWidth: isActiveEdge ? (Number(edge.style?.strokeWidth) || 2) + 3 : edge.style?.strokeWidth,
              filter: isActiveEdge ? 'drop-shadow(0 0 8px #00ff88) drop-shadow(0 0 12px #00ff88)' : undefined,
            },
          };
        })
      );
    } else {
      // No file transition, turn off all animations
      setEdges((prevEdges) =>
        prevEdges.map((edge) => ({
          ...edge,
          animated: false,
          style: {
            ...edge.style,
            filter: undefined,
          }
        }))
      );
    }
  }, [currentEventIndex, events, setEdges]);

  // Calculate total stats
  const stats = useMemo(() => {
    const files = Array.from(projectFiles.values());
    return {
      totalFiles: files.length,
      totalLinesExecuted: files.reduce((sum, file) => sum + file.executedLines.size, 0),
      totalEvents: files.reduce((sum, file) => sum + file.events.length, 0),
      crossFileCalls: crossFileCalls.length,
    };
  }, [projectFiles, crossFileCalls]);

  if (fileExecutionOrder.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h2>Project-Wide Execution Flow Visualizer</h2>
        <p>Start the trace server and run your Python code</p>
        <div className="empty-steps">
          <div className="step">
            <span className="step-number">1</span>
            <span>Start Trace Server: <code>Blind: Start Trace Server</code></span>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <span>Run your code: <code>python -m blind your_script.py</code></span>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <span>Watch execution flow across all files!</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
          position="bottom-left"
          style={{ bottom: '140px' }}
          nodeColor={(node) => {
            const file = projectFiles.get(node.id);
            if (!file) return '#2d2d2d';
            const coverage = file.totalLines > 0
              ? (file.executedLines.size / file.totalLines)
              : 0;
            // Color based on coverage
            if (coverage > 0.7) return '#4aff9e';
            if (coverage > 0.4) return '#ffb84a';
            return '#ff4a4a';
          }}
          maskColor="rgba(0, 0, 0, 0.7)"
        />

        {/* Stats Panel */}
        <Panel position="top-left" className="stats-panel">
          <div className="panel-stat">
            <span className="stat-label">Files:</span>
            <span className="stat-value">{stats.totalFiles}</span>
          </div>
          <div className="panel-stat">
            <span className="stat-label">Lines Executed:</span>
            <span className="stat-value">{stats.totalLinesExecuted}</span>
          </div>
          <div className="panel-stat">
            <span className="stat-label">Events:</span>
            <span className="stat-value">{stats.totalEvents}</span>
          </div>
          <div className="panel-stat">
            <span className="stat-label">Cross-File Calls:</span>
            <span className="stat-value">{stats.crossFileCalls}</span>
          </div>
        </Panel>

        {/* Legend Panel */}
        <Panel position="top-right" className="legend-panel">
          <h4>Coverage Legend</h4>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#4aff9e' }} />
            <span>High (&gt;70%)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ffb84a' }} />
            <span>Medium (40-70%)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ff4a4a' }} />
            <span>Low (&lt;40%)</span>
          </div>
          <h4 style={{ marginTop: '16px' }}>Edge Indicators</h4>
          <div className="legend-item">
            <span style={{ fontSize: '10px', fontWeight: 700 }}>[CRITICAL]</span>
            <span>Critical Path (top 20%)</span>
          </div>
          <div className="legend-item">
            <span style={{ fontSize: '10px', fontWeight: 700 }}>[LOOP]</span>
            <span>Loop (3+ calls)</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};