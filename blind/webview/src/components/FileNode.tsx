import { memo, useMemo } from 'react';
import { Handle, Position } from 'reactflow';
import { ProjectFile, TraceEvent } from '../types';
import { useStore } from '../store/useStore';
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
  const { events, currentEventIndex } = useStore();

  const coverage = file.totalLines > 0
    ? Math.round((file.executedLines.size / file.totalLines) * 100)
    : 0;

  // Get coverage color
  const getCoverageColor = () => {
    if (coverage > 70) return '#4aff9e';
    if (coverage > 40) return '#ffb84a';
    return '#ff4a4a';
  };

  // Build a map of line numbers to their execution sequence and event info
  const lineExecutionInfo = useMemo(() => {
    const info = new Map<number, { sequence: number; event: TraceEvent; isActive: boolean }[]>();

    // Get events up to current playback index (or all if not playing back)
    const visibleEvents = currentEventIndex >= 0
      ? events.slice(0, currentEventIndex + 1)
      : events;

    visibleEvents.forEach((event, index) => {
      if (event.file_path === file.filePath) {
        const lineNumber = event.line_number;
        if (!info.has(lineNumber)) {
          info.set(lineNumber, []);
        }
        info.get(lineNumber)!.push({
          sequence: index + 1,
          event,
          isActive: index === currentEventIndex,
        });
      }
    });

    return info;
  }, [events, currentEventIndex, file.filePath]);

  // Get the current active line
  const currentEvent = currentEventIndex >= 0 ? events[currentEventIndex] : null;
  const currentActiveLine = currentEvent?.file_path === file.filePath
    ? currentEvent.line_number
    : null;

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
        {file.lines.map((line, index) => {
          const lineNumber = index + 1;
          const execInfo = lineExecutionInfo.get(lineNumber);
          const isExecuted = execInfo && execInfo.length > 0;
          const isActive = lineNumber === currentActiveLine;
          const sequences = execInfo ? execInfo.map(e => e.sequence) : [];

          return (
            <div
              key={lineNumber}
              className={`code-line ${isExecuted ? 'executed' : ''} ${isActive ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onLineClick(lineNumber);
              }}
              title={isExecuted ? `Executed ${sequences.length} time(s): #${sequences.join(', #')}` : undefined}
            >
              <span className="line-number">{lineNumber}</span>
              <span className="line-content">{line || ' '}</span>
              {isExecuted && (
                <span className="execution-sequences">
                  {sequences.map((seq, i) => (
                    <span
                      key={i}
                      className={`sequence-badge ${execInfo![i].isActive ? 'active-sequence' : ''}`}
                    >
                      #{seq}
                    </span>
                  ))}
                </span>
              )}
            </div>
          );
        })}
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