import { useState } from 'react';
import { TreeFilters } from '../hooks/useTreeFilters';
import './FilterPanel.css';

interface FilterPanelProps {
  filters: TreeFilters;
  onSearchChange: (query: string) => void;
  onToggleHotPath: () => void;
  onToggleHideStdlib: () => void;
  onToggleEventType: (eventType: string) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  availableFiles: string[];
  onToggleFile: (filePath: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onSearchChange,
  onToggleHotPath,
  onToggleHideStdlib,
  onToggleEventType,
  onClearAll,
  activeFilterCount,
  availableFiles,
  onToggleFile,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFileFilter, setShowFileFilter] = useState(false);

  const eventTypeOptions = [
    { type: 'function_call', label: 'Function Calls' },
    { type: 'method_call', label: 'Method Calls' },
    { type: 'function_return', label: 'Returns' },
    { type: 'line', label: 'Line Events' },
  ];

  return (
    <div className="filter-panel">
      {/* Search Bar - Always Visible */}
      <div className="filter-search-bar">
        <input
          type="text"
          className="filter-search-input"
          placeholder="Search functions, classes, files..."
          value={filters.searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {filters.searchQuery && (
          <button
            className="clear-search-btn"
            onClick={() => onSearchChange('')}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Toggle Button */}
      <div className="filter-toggle-row">
        <button
          className="filter-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          title="Toggle advanced filters"
        >
          <span className="toggle-icon">{isExpanded ? '▼' : '▶'}</span>
          <span className="toggle-text">Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-count-badge">{activeFilterCount}</span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button className="clear-all-btn" onClick={onClearAll} title="Clear all filters">
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters - Expandable */}
      {isExpanded && (
        <div className="filter-advanced">
          {/* Quick Toggles */}
          <div className="filter-section">
            <div className="filter-section-title">Quick Filters</div>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={filters.showOnlyHotPath}
                onChange={onToggleHotPath}
              />
              <span>Hot Path Only (5+ calls)</span>
            </label>
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={filters.hideStdlib}
                onChange={onToggleHideStdlib}
              />
              <span>Hide Standard Library</span>
            </label>
          </div>

          {/* Event Types */}
          <div className="filter-section">
            <div className="filter-section-title">Event Types</div>
            <div className="filter-event-types">
              {eventTypeOptions.map((option) => (
                <label key={option.type} className="filter-checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.eventTypes.has(option.type)}
                    onChange={() => onToggleEventType(option.type)}
                  />
                  <span>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* File Filter */}
          {availableFiles.length > 0 && (
            <div className="filter-section">
              <div
                className="filter-section-title clickable"
                onClick={() => setShowFileFilter(!showFileFilter)}
              >
                <span className="toggle-icon">{showFileFilter ? '▼' : '▶'}</span>
                Files
                {filters.selectedFiles.size > 0 && (
                  <span className="filter-count-badge-small">
                    {filters.selectedFiles.size}
                  </span>
                )}
              </div>
              {showFileFilter && (
                <div className="filter-file-list">
                  {availableFiles.map((filePath) => {
                    const fileName = filePath.split('/').pop() || filePath;
                    return (
                      <label key={filePath} className="filter-checkbox-label">
                        <input
                          type="checkbox"
                          checked={filters.selectedFiles.has(filePath)}
                          onChange={() => onToggleFile(filePath)}
                        />
                        <span title={filePath}>{fileName}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
