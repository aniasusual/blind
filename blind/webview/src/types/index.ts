// Supported Languages
export type Language = 'python' | 'javascript' | 'typescript' | 'go' | 'java' | 'rust' | 'cpp';

// Trace Event Types (Language-Agnostic Protocol)
export interface TraceEvent {
  // Protocol version and language
  language: Language;
  protocol_version?: string;

  // Event identification
  event_type: string;
  timestamp: number;
  event_id: number;

  // Location (universal across languages)
  file_path: string;
  line_number: number;
  column_number?: number;

  // Context (universal across languages)
  function_name: string;
  class_name: string | null;
  module_name: string;
  line_content: string;

  // Stack trace
  call_stack_depth: number;
  parent_event_id: number | null;
  scope_id: string;

  // Language-specific data (flexible)
  entity_data: Record<string, any>;

  // Performance metrics (optional)
  execution_time?: number;
  memory_delta?: number;

  // Relationships
  calls_to?: number[];
  called_from?: number;

  // Runtime data (optional)
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
