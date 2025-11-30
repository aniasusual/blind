// Trace Event Types
export interface TraceEvent {
  event_type: string;
  timestamp: number;
  event_id: number;
  file_path: string;
  line_number: number;
  function_name: string;
  class_name: string | null;
  module_name: string;
  line_content: string;
  call_stack_depth: number;
  parent_event_id: number | null;
  scope_id: string;
  entity_data: Record<string, any>;
  execution_time?: number;
  memory_delta?: number;
  calls_to?: number[];
  called_from?: number;
  variables?: Record<string, any>;
  arguments?: Record<string, any>;
  return_value?: any;
}

// File Metadata - sent when a new file is encountered during execution
export interface FileMetadata {
  type: 'file_metadata';
  file_path: string;
  relative_path: string;
  code: string;
  lines: string[];
  total_lines: number;
  timestamp: number;
}

// Cross-File Call - sent when execution flows from one file to another
export interface CrossFileCall {
  type: 'cross_file_call';
  from_file: string;
  to_file: string;
  from_event_id: number;
  to_event_id: number;
  timestamp: number;
}

// Project File Data - for storing complete file information
export interface ProjectFile {
  filePath: string;
  relativePath: string;
  code: string;
  lines: string[];
  totalLines: number;
  executedLines: Set<number>;
  events: TraceEvent[];
  firstSeen: number;
}

// VS Code API Types
export interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

// Message Types
export type MessageType =
  | 'traceData'
  | 'fileMetadata'
  | 'crossFileCall'
  | 'codeChanged'
  | 'fileUpdated'
  | 'nodeClicked'
  | 'ready'
  | 'error';

export interface Message {
  type: MessageType;
  data?: any;
}

// Node Data for React Flow
export interface FlowNodeData {
  event: TraceEvent;
  code: string;
  isEditing: boolean;
  isExpanded: boolean;
}

// Store State
export interface AppState {
  events: TraceEvent[];
  isPaused: boolean;
  showAllLines: boolean;
  autoScroll: boolean;
  selectedNodeId: string | null;
  addEvent: (event: TraceEvent) => void;
  clearEvents: () => void;
  togglePause: () => void;
  setShowAllLines: (show: boolean) => void;
  setAutoScroll: (auto: boolean) => void;
  setSelectedNode: (id: string | null) => void;
}
