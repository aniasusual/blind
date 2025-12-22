import { useState, useCallback, useMemo } from 'react';
import { TraceEvent } from '../types';

export interface TreeFilters {
  searchQuery: string;
  showOnlyHotPath: boolean;
  hideStdlib: boolean;
  eventTypes: Set<string>;
  selectedFiles: Set<string>;
}

const DEFAULT_EVENT_TYPES = new Set([
  'function_call',
  'method_call',
  'function_return',
  'method_return',
]);

export const useTreeFilters = () => {
  const [filters, setFilters] = useState<TreeFilters>({
    searchQuery: '',
    showOnlyHotPath: false,
    hideStdlib: false,
    eventTypes: DEFAULT_EVENT_TYPES,
    selectedFiles: new Set(),
  });

  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const toggleHotPath = useCallback(() => {
    setFilters((prev) => ({ ...prev, showOnlyHotPath: !prev.showOnlyHotPath }));
  }, []);

  const toggleHideStdlib = useCallback(() => {
    setFilters((prev) => ({ ...prev, hideStdlib: !prev.hideStdlib }));
  }, []);

  const toggleEventType = useCallback((eventType: string) => {
    setFilters((prev) => {
      const newEventTypes = new Set(prev.eventTypes);
      if (newEventTypes.has(eventType)) {
        newEventTypes.delete(eventType);
      } else {
        newEventTypes.add(eventType);
      }
      return { ...prev, eventTypes: newEventTypes };
    });
  }, []);

  const toggleFile = useCallback((filePath: string) => {
    setFilters((prev) => {
      const newSelectedFiles = new Set(prev.selectedFiles);
      if (newSelectedFiles.has(filePath)) {
        newSelectedFiles.delete(filePath);
      } else {
        newSelectedFiles.add(filePath);
      }
      return { ...prev, selectedFiles: newSelectedFiles };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      showOnlyHotPath: false,
      hideStdlib: false,
      eventTypes: DEFAULT_EVENT_TYPES,
      selectedFiles: new Set(),
    });
  }, []);

  const shouldShowEvent = useCallback(
    (event: TraceEvent, executionCount: number): boolean => {
      // Search query filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const functionName = event.function_name?.toLowerCase() || '';
        const className = event.class_name?.toLowerCase() || '';
        const fileName = event.file_path?.toLowerCase() || '';

        if (
          !functionName.includes(query) &&
          !className.includes(query) &&
          !fileName.includes(query)
        ) {
          return false;
        }
      }

      // Event type filter
      if (!filters.eventTypes.has(event.event_type)) {
        return false;
      }

      // Stdlib filter
      if (filters.hideStdlib) {
        const filePath = event.file_path || '';
        if (
          filePath.includes('/lib/python') ||
          filePath.includes('/site-packages/') ||
          filePath.includes('\\lib\\python') ||
          filePath.includes('\\site-packages\\')
        ) {
          return false;
        }
      }

      // Hot path filter (show only frequently executed functions)
      if (filters.showOnlyHotPath && executionCount < 5) {
        return false;
      }

      // File filter
      if (filters.selectedFiles.size > 0) {
        if (!filters.selectedFiles.has(event.file_path || '')) {
          return false;
        }
      }

      return true;
    },
    [filters]
  );

  const getActiveFilterCount = useCallback((): number => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.showOnlyHotPath) count++;
    if (filters.hideStdlib) count++;
    if (filters.eventTypes.size !== DEFAULT_EVENT_TYPES.size) count++;
    if (filters.selectedFiles.size > 0) count++;
    return count;
  }, [filters]);

  return {
    filters,
    setSearchQuery,
    toggleHotPath,
    toggleHideStdlib,
    toggleEventType,
    toggleFile,
    clearAllFilters,
    shouldShowEvent,
    getActiveFilterCount,
  };
};
