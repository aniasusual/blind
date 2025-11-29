import { useEffect } from 'react';
import { Toolbar } from './components/Toolbar';
import { FlowCanvas } from './components/FlowCanvas';
import { useStore } from './store/useStore';
import { useVSCode } from './hooks/useVSCode';
import { Message, TraceEvent } from './types';
import './App.css';

console.log('📦 App.tsx loaded');

function App() {
  console.log('🎨 App component rendering');
  const { addEvent, isPaused } = useStore();

  const handleMessage = (message: Message) => {
    console.log('📨 Received message:', message.type, message);
    switch (message.type) {
      case 'traceData':
        console.log('📊 Adding trace event:', message.data);
        if (!isPaused) {
          addEvent(message.data as TraceEvent);
        }
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
