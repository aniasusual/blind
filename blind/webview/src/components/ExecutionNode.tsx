import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import Editor from '@monaco-editor/react';
import { FlowNodeData } from '../types';
import { getVSCodeAPI } from '../hooks/useVSCode';

const ENTITY_ICONS: Record<string, string> = {
  function_call: '📞',
  function_return: '↩️',
  method_call: '🔵',
  method_return: '↩️',
  line_execution: '➡️',
  loop_start: '🔁',
  loop_iteration: '🔄',
  conditional_if: '❓',
  conditional_elif: '❔',
  conditional_else: '⚡',
  exception_raised: '❌',
  variable_assignment: '📝',
  import_module: '📦',
};

export const ExecutionNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
  const { event, code } = data;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState(code);
  const vscode = getVSCodeAPI();

  const icon = ENTITY_ICONS[event.event_type] || '⚪';
  const displayName = event.class_name
    ? `${event.class_name}.${event.function_name}`
    : event.function_name;

  const handleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleEdit = useCallback(() => {
    setIsEditing(!isEditing);
  }, [isEditing]);

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setEditedCode(value);
    }
  }, []);

  const handleSave = useCallback(() => {
    vscode?.postMessage({
      type: 'codeChanged',
      data: {
        nodeId: event.event_id,
        filePath: event.file_path,
        lineNumber: event.line_number,
        newCode: editedCode,
      },
    });
    setIsEditing(false);
  }, [editedCode, event, vscode]);

  const handleCancel = useCallback(() => {
    setEditedCode(code);
    setIsEditing(false);
  }, [code]);

  const handleNodeClick = useCallback(() => {
    vscode?.postMessage({
      type: 'nodeClicked',
      data: {
        filePath: event.file_path,
        line: event.line_number,
      },
    });
  }, [event, vscode]);

  return (
    <div
      className={`execution-node ${event.event_type} ${selected ? 'selected' : ''} ${
        isExpanded ? 'expanded' : ''
      }`}
      onClick={handleNodeClick}
    >
      <Handle type="target" position={Position.Top} />

      <div className="node-header">
        <span className="node-icon">{icon}</span>
        <span className="node-title">{displayName}</span>
        <div className="node-actions">
          {!isExpanded && (
            <button
              className="action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
              title="Expand"
            >
              ⛶
            </button>
          )}
          {isExpanded && (
            <>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                title={isEditing ? 'View' : 'Edit'}
              >
                {isEditing ? '👁️' : '✏️'}
              </button>
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpand();
                }}
                title="Collapse"
              >
                ⛶
              </button>
            </>
          )}
        </div>
      </div>

      <div className="node-meta">{event.event_type.replace(/_/g, ' ')}</div>

      {!isExpanded ? (
        <div className="node-content">{event.line_content}</div>
      ) : (
        <div className="node-editor">
          <Editor
            height="200px"
            defaultLanguage="python"
            value={editedCode}
            onChange={handleCodeChange}
            options={{
              readOnly: !isEditing,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              fontSize: 12,
              wordWrap: 'on',
              theme: 'vs-dark',
            }}
          />
          {isEditing && (
            <div className="editor-actions">
              <button className="save-btn" onClick={handleSave}>
                💾 Save
              </button>
              <button className="cancel-btn" onClick={handleCancel}>
                ✖️ Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {event.execution_time && (
        <div className="node-timing">⏱️ {(event.execution_time * 1000).toFixed(2)}ms</div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

ExecutionNode.displayName = 'ExecutionNode';
