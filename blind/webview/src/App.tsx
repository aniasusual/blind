import { useEffect } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { FunctionCallTree } from './components/FunctionCallTree';
import { CodeContext } from './components/CodeContext';
import { Timeline } from './components/Timeline';
import { InspectorEnhanced } from './components/InspectorEnhanced';
import { useStore } from './store/useStore';
import { useVSCode } from './hooks/useVSCode';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Message, TraceEvent, FileMetadata, CrossFileCall } from './types';
import './App.css';

console.log('📦 App.tsx loaded');

function App() {
  console.log('🎨 App component rendering');
  const { addEvent, addFileMetadata, addCrossFileCall, isPaused } = useStore();

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  const handleMessage = (message: Message) => {
    console.log('📨 Received message:', message.type, message);
    switch (message.type) {
      case 'traceData':
        console.log('📊 Adding trace event:', message.data);
        if (!isPaused) {
          addEvent(message.data as TraceEvent);
        }
        break;

      case 'fileMetadata':
        // Handle file metadata - complete file code and info
        console.log('📁 File registered:', message.data);
        const fileData = message.data as FileMetadata;
        addFileMetadata(
          fileData.file_path,
          fileData.relative_path,
          fileData.code,
          fileData.lines,
          fileData.total_lines,
          fileData.timestamp
        );
        break;

      case 'crossFileCall':
        // Handle cross-file execution flow
        console.log('🔀 Cross-file call:', message.data);
        addCrossFileCall(message.data as CrossFileCall);
        break;

      case 'fileUpdated':
        // Handle file updates from VS Code
        console.log('File updated:', message.data);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const { postMessage } = useVSCode(handleMessage);

  useEffect(() => {
    console.log('✅ App mounted, sending ready message');
    // Notify VS Code that webview is ready
    postMessage({ type: 'ready' });
  }, [postMessage]);

  console.log('🎨 App returning JSX');
  return (
    <div className="app">
      <Group id="main-group" orientation="vertical">
        {/* Main Content Area - Three Panels */}
        <Panel id="content-panel" defaultSize={85} minSize={40}>
          <Group id="horizontal-group" orientation="horizontal">
            {/* Left Panel: Function Call Tree */}
            <Panel id="call-tree-panel" defaultSize={25} minSize={15}>
              <FunctionCallTree />
            </Panel>

            <Separator className="resize-handle horizontal" />

            {/* Center Panel: Code Context */}
            <Panel id="code-context-panel" defaultSize={45} minSize={20}>
              <CodeContext />
            </Panel>

            <Separator className="resize-handle horizontal" />

            {/* Right Panel: Inspector */}
            <Panel id="inspector-panel" defaultSize={30} minSize={15}>
              <InspectorEnhanced />
            </Panel>
          </Group>
        </Panel>

        <Separator className="resize-handle vertical" />

        {/* Bottom Panel: Timeline */}
        <Panel id="timeline-panel" defaultSize={15} minSize={8}>
          <Timeline />
        </Panel>
      </Group>
    </div>
  );
}

export default App;
