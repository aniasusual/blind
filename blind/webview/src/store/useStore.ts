import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { AppState, TraceEvent } from '../types';

export const useStore = create<AppState>()(
  immer((set) => ({
    events: [],
    isPaused: false,
    showAllLines: false,
    autoScroll: true,
    selectedNodeId: null,

    addEvent: (event: TraceEvent) =>
      set((state) => {
        state.events.push(event);
      }),

    clearEvents: () =>
      set((state) => {
        state.events = [];
        state.selectedNodeId = null;
      }),

    togglePause: () =>
      set((state) => {
        state.isPaused = !state.isPaused;
      }),

    setShowAllLines: (show: boolean) =>
      set((state) => {
        state.showAllLines = show;
      }),

    setAutoScroll: (auto: boolean) =>
      set((state) => {
        state.autoScroll = auto;
      }),

    setSelectedNode: (id: string | null) =>
      set((state) => {
        state.selectedNodeId = id;
      }),
  }))
);
