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
  } = useStore();

  const { postMessage } = useVSCode(() => {});

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Convert project files to React Flow nodes
  useEffect(() => {
    if (fileExecutionOrder.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create nodes for each file
    fileExecutionOrder.forEach((filePath, index) => {
      const file = projectFiles.get(filePath);
      if (!file) return;

      const coverage = file.totalLines > 0
        ? Math.round((file.executedLines.size / file.totalLines) * 100)
        : 0;

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

      // Create edge to next file
      if (index < fileExecutionOrder.length - 1) {
        const nextFilePath = fileExecutionOrder[index + 1];
        newEdges.push({
          id: `${filePath}-${nextFilePath}`,
          source: filePath,
          target: nextFilePath,
          animated: true,
          style: { stroke: '#666', strokeWidth: 2 },
          label: 'execution flow',
        });
      }
    });

    // Add cross-file call edges
    crossFileCalls.forEach((call, index) => {
      const edgeId = `cross-${call.from_file}-${call.to_file}-${index}`;
      // Only add if not already in execution flow
      const existingEdge = newEdges.find(
        e => e.source === call.from_file && e.target === call.to_file
      );

      if (!existingEdge) {
        newEdges.push({
          id: edgeId,
          source: call.from_file,
          target: call.to_file,
          animated: false,
          style: { stroke: '#4a9eff', strokeWidth: 1, strokeDasharray: '5,5' },
          label: 'function call',
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [projectFiles, fileExecutionOrder, crossFileCalls, selectedFile, setSelectedFile, postMessage, setNodes, setEdges]);

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
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap
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
        </Panel>
      </ReactFlow>
    </div>
  );
};