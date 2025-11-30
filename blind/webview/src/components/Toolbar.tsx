import { useStore } from '../store/useStore';
import { getVSCodeAPI } from '../hooks/useVSCode';

export const Toolbar = () => {
  const {
    isPaused,
    autoScroll,
    togglePause,
    setAutoScroll,
    clearProjectData,
    events,
    projectFiles,
    fileExecutionOrder,
  } = useStore();

  const vscode = getVSCodeAPI();

  const handleClear = () => {
    if (confirm('Clear all execution data? This cannot be undone.')) {
      clearProjectData();
    }
  };

  const handleExport = () => {
    // Export project-wide data
    const exportData = {
      files: Array.from(projectFiles.values()).map(file => ({
        ...file,
        executedLines: Array.from(file.executedLines),
      })),
      fileExecutionOrder,
      events,
      timestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    vscode?.postMessage({
      type: 'export',
      data: dataStr,
    });
  };

  const totalLinesExecuted = Array.from(projectFiles.values())
    .reduce((sum, file) => sum + file.executedLines.size, 0);

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={handleClear} title="Clear all data">
        🗑️ Clear
      </button>
      <button className="toolbar-btn" onClick={togglePause} title="Pause/Resume">
        {isPaused ? '▶️ Resume' : '⏸️ Pause'}
      </button>
      <button className="toolbar-btn" onClick={handleExport} title="Export project data">
        💾 Export
      </button>

      <div className="separator" />

      <label className="toolbar-label">
        <input
          type="checkbox"
          checked={autoScroll}
          onChange={(e) => setAutoScroll(e.target.checked)}
        />
        Auto-scroll
      </label>

      <div className="separator" />

      <div className="toolbar-stats">
        <span className="stat-item">{fileExecutionOrder.length} files</span>
        <span className="stat-separator">•</span>
        <span className="stat-item">{totalLinesExecuted} lines executed</span>
        <span className="stat-separator">•</span>
        <span className="stat-item">{events.length} events</span>
      </div>
    </div>
  );
};
