import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('🚀 Blind webview: main.tsx executing');
console.log('🚀 React version:', React.version);
console.log('🚀 Root element:', document.getElementById('root'));

try {
  const root = document.getElementById('root');
  if (!root) {
    console.error('❌ Root element not found!');
  } else {
    console.log('✅ Root element found, creating React root...');
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('✅ React render called');
  }
} catch (error) {
  console.error('❌ Error rendering React app:', error);
}
