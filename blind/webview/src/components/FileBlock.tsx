import { memo } from 'react';
import { ProjectFile } from '../types';
import './FileBlock.css';

interface FileBlockProps {
  file: ProjectFile;
  isSelected: boolean;
  onSelect: () => void;
  onLineClick: (filePath: string, lineNumber: number) => void;
}

export const FileBlock = memo(({ file, isSelected, onSelect, onLineClick }: FileBlockProps) => {
  const handleLineClick = (lineNumber: number) => {
    onLineClick(file.filePath, lineNumber);
  };

  return (
    <div
      className={`file-block ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* File Header */}
      <div className="file-header">
        <div className="file-name">{file.relativePath}</div>
        <div className="file-stats">
          <span className="stat">{file.totalLines} lines</span>
          <span className="stat">{file.executedLines.size} executed</span>
          <span className="stat">{file.events.length} events</span>
        </div>
      </div>

      {/* Code Content */}
      <div className="file-code">
        {file.lines.map((line, index) => {
          const lineNumber = index + 1;
          const isExecuted = file.executedLines.has(lineNumber);

          return (
            <div
              key={lineNumber}
              className={`code-line ${isExecuted ? 'executed' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleLineClick(lineNumber);
              }}
            >
              <span className="line-number">{lineNumber}</span>
              <span className="line-content">{line || ' '}</span>
            </div>
          );
        })}
      </div>

      {/* Execution Summary */}
      <div className="file-footer">
        <div className="execution-coverage">
          Coverage: {file.executedLines.size > 0
            ? Math.round((file.executedLines.size / file.totalLines) * 100)
            : 0}%
        </div>
      </div>
    </div>
  );
});

FileBlock.displayName = 'FileBlock';