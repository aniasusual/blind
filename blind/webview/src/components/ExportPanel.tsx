import { useState } from 'react';
import { useStore } from '../store/useStore';
import './ExportPanel.css';

export const ExportPanel = () => {
  const { events, projectFiles, currentEventIndex } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const exportToJSON = () => {
    try {
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        metadata: {
          totalEvents: events.length,
          currentEventIndex,
          files: Object.keys(projectFiles).length,
        },
        events,
        projectFiles,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `blind-trace-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('Exported successfully');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus('Export failed');
      setTimeout(() => setExportStatus(''), 3000);
      console.error('Export failed:', error);
    }
  };

  const exportCurrentView = () => {
    try {
      if (currentEventIndex < 0) {
        setExportStatus('No event selected');
        setTimeout(() => setExportStatus(''), 3000);
        return;
      }

      const currentEvent = events[currentEventIndex];
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        type: 'current-view',
        currentEvent,
        eventIndex: currentEventIndex,
        totalEvents: events.length,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `blind-snapshot-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('Snapshot exported');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus('Snapshot failed');
      setTimeout(() => setExportStatus(''), 3000);
      console.error('Snapshot export failed:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      const exportData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        metadata: {
          totalEvents: events.length,
          currentEventIndex,
          files: Object.keys(projectFiles).length,
        },
        events,
        projectFiles,
      };

      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setExportStatus('Copied to clipboard');
      setTimeout(() => setExportStatus(''), 3000);
    } catch (error) {
      setExportStatus('Copy failed');
      setTimeout(() => setExportStatus(''), 3000);
      console.error('Copy failed:', error);
    }
  };

  const getTraceStats = () => {
    const functionCalls = events.filter(
      (e) => e.event_type === 'function_call' || e.event_type === 'method_call'
    ).length;
    const returns = events.filter(
      (e) => e.event_type === 'function_return' || e.event_type === 'method_return'
    ).length;
    const uniqueFiles = new Set(events.map((e) => e.file_path)).size;
    const uniqueFunctions = new Set(events.map((e) => e.function_name)).size;

    return { functionCalls, returns, uniqueFiles, uniqueFunctions };
  };

  const stats = getTraceStats();

  return (
    <div className="export-panel">
      <button
        className="export-toggle-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Export options"
      >
        <span className="export-text">Export</span>
        <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {isExpanded && (
        <div className="export-content">
          {/* Stats */}
          <div className="export-stats">
            <div className="stat-item">
              <span className="stat-label">Events:</span>
              <span className="stat-value">{events.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Calls:</span>
              <span className="stat-value">{stats.functionCalls}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Files:</span>
              <span className="stat-value">{stats.uniqueFiles}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Functions:</span>
              <span className="stat-value">{stats.uniqueFunctions}</span>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="export-buttons">
            <button
              className="export-btn export-full"
              onClick={exportToJSON}
              disabled={events.length === 0}
              title="Export complete trace as JSON file"
            >
              <span>Export Full Trace</span>
            </button>

            <button
              className="export-btn export-snapshot"
              onClick={exportCurrentView}
              disabled={currentEventIndex < 0}
              title="Export current event snapshot"
            >
              <span>Export Snapshot</span>
            </button>

            <button
              className="export-btn export-clipboard"
              onClick={copyToClipboard}
              disabled={events.length === 0}
              title="Copy trace to clipboard"
            >
              <span>Copy to Clipboard</span>
            </button>
          </div>

          {/* Status Message */}
          {exportStatus && (
            <div className={`export-status ${exportStatus.includes('successfully') || exportStatus.includes('Copied') || exportStatus.includes('exported') ? 'success' : 'error'}`}>
              {exportStatus}
            </div>
          )}

          {/* Info */}
          <div className="export-info">
            <p className="info-text">
              Export formats include all events, file metadata, and execution state. Use these
              files for sharing, analysis, or importing later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
