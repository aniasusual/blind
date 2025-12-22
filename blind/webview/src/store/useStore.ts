import { create } from 'zustand';
import { TraceEvent, ProjectFile, CrossFileCall } from '../types';

// App State for execution flow tracking
interface AppState {
  // Core state
  events: TraceEvent[];
  isPaused: boolean;
  projectFiles: Map<string, ProjectFile>;
  crossFileCalls: CrossFileCall[];

  // Playback state
  currentEventIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;

  // Core actions
  addEvent: (event: TraceEvent) => void;
  clearEvents: () => void;
  togglePause: () => void;

  // File metadata actions
  addFileMetadata: (filePath: string, relativePath: string, code: string, lines: string[], totalLines: number, timestamp: number) => void;
  addCrossFileCall: (call: CrossFileCall) => void;
  clearProjectData: () => void;

  // Playback actions
  setCurrentEventIndex: (index: number) => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
}

export const useStore = create<AppState>()((set, get) => ({
  // Core state
  events: [],
  isPaused: false,
  projectFiles: new Map(),
  crossFileCalls: [],

  // Playback state
  currentEventIndex: -1,
  isPlaying: false,
  playbackSpeed: 1,

  // Core actions
  addEvent: (event: TraceEvent) => {
    const state = get();
    const newEvents = [...state.events, event];

    // Also mark the line as executed in the file
    const newProjectFiles = new Map(state.projectFiles);
    if (newProjectFiles.has(event.file_path)) {
      const file = newProjectFiles.get(event.file_path)!;
      const newExecutedLines = new Set(file.executedLines);
      newExecutedLines.add(event.line_number);
      const newFileEvents = [...file.events, event];

      newProjectFiles.set(event.file_path, {
        ...file,
        executedLines: newExecutedLines,
        events: newFileEvents,
      });
    }

    set({ events: newEvents, projectFiles: newProjectFiles });
  },

  clearEvents: () =>
    set({ events: [] }),

  togglePause: () =>
    set((state) => ({ isPaused: !state.isPaused })),

  // File metadata actions
  addFileMetadata: (filePath: string, relativePath: string, code: string, lines: string[], totalLines: number, timestamp: number) => {
    const state = get();
    if (!state.projectFiles.has(filePath)) {
      const newProjectFiles = new Map(state.projectFiles);
      newProjectFiles.set(filePath, {
        filePath,
        relativePath,
        code,
        lines,
        totalLines,
        executedLines: new Set(),
        events: [],
        firstSeen: timestamp,
      });

      set({
        projectFiles: newProjectFiles,
      });
    }
  },

  addCrossFileCall: (call: CrossFileCall) => {
    const state = get();
    set({ crossFileCalls: [...state.crossFileCalls, call] });
  },

  clearProjectData: () =>
    set({
      events: [],
      projectFiles: new Map(),
      crossFileCalls: [],
      currentEventIndex: -1,
      isPlaying: false,
    }),

  // Playback actions
  setCurrentEventIndex: (index: number) => {
    const state = get();
    const maxIndex = state.events.length - 1;
    const clampedIndex = Math.max(-1, Math.min(index, maxIndex));
    set({ currentEventIndex: clampedIndex });
  },

  togglePlayback: () =>
    set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaybackSpeed: (speed: number) =>
    set({ playbackSpeed: speed }),

  stepForward: () => {
    const state = get();
    const newIndex = Math.min(state.currentEventIndex + 1, state.events.length - 1);
    set({ currentEventIndex: newIndex });
  },

  stepBackward: () => {
    const state = get();
    const newIndex = Math.max(state.currentEventIndex - 1, -1);
    set({ currentEventIndex: newIndex });
  },

  goToStart: () =>
    set({ currentEventIndex: -1, isPlaying: false }),

  goToEnd: () => {
    const state = get();
    set({ currentEventIndex: state.events.length - 1, isPlaying: false });
  },
}));
