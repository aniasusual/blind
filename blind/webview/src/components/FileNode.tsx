import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { ProjectFile } from '../types';
import './FileNode.css';

interface FileNodeProps {
  data: {
    file: ProjectFile;
    isSelected: boolean;
    onSelect: () => void;
    onLineClick: (lineNumber: number) => void;
  };
}

export const FileNode = memo(({ data }: FileNodeProps) => {
  const { file, isSelected, onSelect, onLineClick } = data;

  const coverage = file.totalLines > 0
    ? Math.round((file.executedLines.size / file.totalLines) * 100)
    : 0;

  // Get coverage color
  const getCoverageColor = () => {
    if (coverage > 70) return '#4aff9e';
    if (coverage > 40) return '#ffb84a';
    return '#ff4a4a';
  };

  return (
    <div
      className={`file-node ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <Handle type="target" position={Position.Top} />

      {/* File Header */}
      <div className="file-node-header">
        <div className="file-node-title">
          <span className="file-icon">📄</span>
          <span className="file-name">{file.relativePath}</span>
        </div>
        <div className="file-node-stats">
          <span className="stat-badge">{file.totalLines} lines</span>
          <span
            className="stat-badge coverage-badge"
            style={{ background: getCoverageColor() }}
          >
            {coverage}% coverage
          </span>
        </div>
      </div>

      {/* File Code Preview */}
      <div className="file-node-code">
        {file.lines.slice(0, 20).map((line, index) => {
          const lineNumber = index + 1;
          const isExecuted = file.executedLines.has(lineNumber);

          return (
            <div
              key={lineNumber}
              className={`code-line ${isExecuted ? 'executed' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onLineClick(lineNumber);
              }}
            >
              <span className="line-number">{lineNumber}</span>
              <span className="line-content">{line || ' '}</span>
            </div>
          );
        })}
        {file.lines.length > 20 && (
          <div className="code-line-more">
            ... {file.lines.length - 20} more lines
          </div>
        )}
      </div>

      {/* File Footer */}
      <div className="file-node-footer">
        <span className="footer-stat">
          {file.executedLines.size} / {file.totalLines} lines executed
        </span>
        <span className="footer-stat">
          {file.events.length} events
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

FileNode.displayName = 'FileNode';