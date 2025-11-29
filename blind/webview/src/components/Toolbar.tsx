import { useStore } from '../store/useStore';
import { getVSCodeAPI } from '../hooks/useVSCode';

export const Toolbar = () => {
  const {
    isPaused,
    showAllLines,
    autoScroll,
    togglePause,
    setShowAllLines,
    setAutoScroll,
    clearEvents,
    events,
  } = useStore();

  const vscode = getVSCodeAPI();

  const handleClear = () => {
    clearEvents();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(events, null, 2);
    vscode?.postMessage({
      type: 'export',
      data: dataStr,
    });
  };

  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={handleClear} title="Clear graph">
        🗑️ Clear
      </button>
      <button className="toolbar-btn" onClick={togglePause} title="Pause/Resume">
        {isPaused ? '▶️ Resume' : '⏸️ Pause'}
      </button>
      <button className="toolbar-btn" onClick={handleExport} title="Export trace data">
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

      <label className="toolbar-label">
        <input
          type="checkbox"
          checked={showAllLines}
          onChange={(e) => setShowAllLines(e.target.checked)}
        />
        Show all lines
      </label>

      <div className="toolbar-stats">
        {events.length} events
      </div>
    </div>
  );
};
