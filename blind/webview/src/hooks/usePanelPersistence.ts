import { useEffect, useCallback } from 'react';

interface PanelSizes {
  callTreePanel: number;
  codeContextPanel: number;
  inspectorPanel: number;
  timelinePanel: number;
}

const STORAGE_KEY = 'blind-panel-sizes';

const DEFAULT_SIZES: PanelSizes = {
  callTreePanel: 25,
  codeContextPanel: 45,
  inspectorPanel: 30,
  timelinePanel: 15,
};

export const usePanelPersistence = () => {
  // Load panel sizes from localStorage
  const loadPanelSizes = useCallback((): PanelSizes => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate that all keys exist
        if (
          typeof parsed.callTreePanel === 'number' &&
          typeof parsed.codeContextPanel === 'number' &&
          typeof parsed.inspectorPanel === 'number' &&
          typeof parsed.timelinePanel === 'number'
        ) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to load panel sizes from localStorage:', error);
    }
    return DEFAULT_SIZES;
  }, []);

  // Save panel sizes to localStorage
  const savePanelSizes = useCallback((sizes: PanelSizes) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
    } catch (error) {
      console.warn('Failed to save panel sizes to localStorage:', error);
    }
  }, []);

  // Create a debounced save function
  const debouncedSave = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout | null = null;
      return (sizes: PanelSizes) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          savePanelSizes(sizes);
        }, 500); // Save after 500ms of no changes
      };
    })(),
    [savePanelSizes]
  );

  return {
    loadPanelSizes,
    savePanelSizes: debouncedSave,
    defaultSizes: DEFAULT_SIZES,
  };
};
