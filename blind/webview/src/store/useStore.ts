import { create } from 'zustand';
import { TraceEvent, ProjectFile, CrossFileCall } from '../types';

// Enhanced App State for project-wide tracking
interface EnhancedAppState {
  // Original state
  events: TraceEvent[];
  isPaused: boolean;
  showAllLines: boolean;
  autoScroll: boolean;
  selectedNodeId: string | null;

  // Project-wide state
  projectFiles: Map<string, ProjectFile>;
  fileExecutionOrder: string[];
  crossFileCalls: CrossFileCall[];
  selectedFile: string | null;

  // Playback state
  currentEventIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;

  // Original actions
  addEvent: (event: TraceEvent) => void;
  clearEvents: () => void;
  togglePause: () => void;
  setShowAllLines: (show: boolean) => void;
  setAutoScroll: (auto: boolean) => void;
  setSelectedNode: (id: string | null) => void;

  // New project-wide actions
  addFileMetadata: (filePath: string, relativePath: string, code: string, lines: string[], totalLines: number, timestamp: number) => void;
  addCrossFileCall: (call: CrossFileCall) => void;
  markLineExecuted: (filePath: string, lineNumber: number) => void;
  setSelectedFile: (filePath: string | null) => void;
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

export const useStore = create<EnhancedAppState>()((set, get) => ({
  // Original state
  events: [],
  isPaused: false,
  showAllLines: false,
  autoScroll: true,
  selectedNodeId: null,

  // Project-wide state
  projectFiles: new Map(),
  fileExecutionOrder: [],
  crossFileCalls: [],
  selectedFile: null,

  // Playback state
  currentEventIndex: -1,
  isPlaying: false,
  playbackSpeed: 1,

  // Original actions
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
    set({ events: [], selectedNodeId: null }),

  togglePause: () =>
    set((state) => ({ isPaused: !state.isPaused })),

  setShowAllLines: (show: boolean) =>
    set({ showAllLines: show }),

  setAutoScroll: (auto: boolean) =>
    set({ autoScroll: auto }),

  setSelectedNode: (id: string | null) =>
    set({ selectedNodeId: id }),

  // New project-wide actions
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

      const newFileExecutionOrder = [...state.fileExecutionOrder, filePath];

      set({
        projectFiles: newProjectFiles,
        fileExecutionOrder: newFileExecutionOrder,
      });
    }
  },

  addCrossFileCall: (call: CrossFileCall) => {
    const state = get();
    set({ crossFileCalls: [...state.crossFileCalls, call] });
  },

  markLineExecuted: (filePath: string, lineNumber: number) => {
    const state = get();
    const file = state.projectFiles.get(filePath);
    if (file) {
      const newProjectFiles = new Map(state.projectFiles);
      const newExecutedLines = new Set(file.executedLines);
      newExecutedLines.add(lineNumber);

      newProjectFiles.set(filePath, {
        ...file,
        executedLines: newExecutedLines,
      });

      set({ projectFiles: newProjectFiles });
    }
  },

  setSelectedFile: (filePath: string | null) =>
    set({ selectedFile: filePath }),

  clearProjectData: () =>
    set({
      events: [],
      projectFiles: new Map(),
      fileExecutionOrder: [],
      crossFileCalls: [],
      selectedNodeId: null,
      selectedFile: null,
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