import { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Panel,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ExecutionNode } from './ExecutionNode';
import { useStore } from '../store/useStore';
import { TraceEvent, FlowNodeData } from '../types';

const nodeTypes = {
  execution: ExecutionNode,
};

const NODE_WIDTH = 300;
const NODE_HEIGHT = 120;
const VERTICAL_SPACING = 150;
const HORIZONTAL_SPACING = 350;

const FlowCanvasInner = () => {
  const { events, showAllLines, autoScroll, selectedNodeId, setSelectedNode } = useStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const yPositionRef = useRef(50);

  // Convert events to nodes
  const createNode = useCallback(
    (event: TraceEvent, index: number): Node<FlowNodeData> => {
      const x = 50 + event.call_stack_depth * HORIZONTAL_SPACING;
      const y = yPositionRef.current;
      yPositionRef.current += VERTICAL_SPACING;

      return {
        id: `node-${event.event_id}`,
        type: 'execution',
        position: { x, y },
        data: {
          event,
          code: event.line_content,
          isEditing: false,
          isExpanded: false,
        },
        draggable: true,
      };
    },
    []
  );

  // Create edge between parent and child nodes
  const createEdge = useCallback((fromId: number, toId: number): Edge => {
    return {
      id: `edge-${fromId}-${toId}`,
      source: `node-${fromId}`,
      target: `node-${toId}`,
      type: 'smoothstep',
      animated: false,
      style: { stroke: '#555' },
    };
  }, []);

  // Update nodes and edges when events change
  useEffect(() => {
    const filteredEvents = events.filter((event) => {
      if (!showAllLines && event.event_type === 'line_execution') {
        const astType = event.entity_data?.ast_info?.type;
        return astType !== 'simple_statement';
      }
      return true;
    });

    yPositionRef.current = 50;
    const newNodes = filteredEvents.map((event, index) => createNode(event, index));
    const newEdges: Edge[] = [];

    filteredEvents.forEach((event) => {
      if (event.parent_event_id !== null) {
        // Check if parent node exists
        const parentExists = newNodes.some(
          (n) => n.id === `node-${event.parent_event_id}`
        );
        if (parentExists) {
          newEdges.push(createEdge(event.parent_event_id, event.event_id));
        }
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [events, showAllLines, createNode, createEdge, setNodes, setEdges]);

  // Auto-scroll to latest node
  useEffect(() => {
    if (autoScroll && nodes.length > 0 && reactFlowWrapper.current) {
      const lastNode = nodes[nodes.length - 1];
      if (lastNode) {
        // Scroll to the last node
        const element = document.getElementById(lastNode.id);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [nodes, autoScroll]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  if (events.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔍</div>
        <h2>Execution Flow Visualizer</h2>
        <p>Start the trace server and run your Python code</p>
        <p className="empty-hint">
          Use: <code>python -m python examples/sample.py</code>
        </p>
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const eventType = (node.data as FlowNodeData).event.event_type;
            const colorMap: Record<string, string> = {
              function_call: '#2d5a8e',
              method_call: '#2d5a8e',
              function_return: '#2d5a4e',
              method_return: '#2d5a4e',
              loop_start: '#6e3d5a',
              loop_iteration: '#6e3d5a',
              conditional_if: '#5a4e2d',
              conditional_elif: '#5a4e2d',
              conditional_else: '#5a4e2d',
              exception_raised: '#7a2d2d',
              variable_assignment: '#2d5a5a',
            };
            return colorMap[eventType] || '#4a4a4a';
          }}
        />
        <Panel position="top-left" className="legend">
          <div className="legend-title">Legend</div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#2d5a8e' }} />
            <span>Function Call</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#2d5a4e' }} />
            <span>Return</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#6e3d5a' }} />
            <span>Loop</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#5a4e2d' }} />
            <span>Conditional</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#7a2d2d' }} />
            <span>Exception</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const FlowCanvas = () => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
};
