import { useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { FlowCanvas } from './components/FlowCanvas';
import { useStore } from './store/useStore';
import { useVSCode } from './hooks/useVSCode';
import { Message, TraceEvent, FileMetadata, CrossFileCall } from './types';
import './App.css';

console.log('📦 App.tsx loaded');

function App() {
  console.log('🎨 App component rendering');
  const { addEvent, addFileMetadata, addCrossFileCall, isPaused } = useStore();

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
      <Toolbar />
      <div className="main-content">
        <FlowCanvas />
      </div>
    </div>
  );
}

export default App;
