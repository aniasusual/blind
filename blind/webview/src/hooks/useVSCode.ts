import { useEffect, useCallback } from 'react';
import { VSCodeAPI, Message } from '../types';

declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeAPI;
  }
}

let vscodeApi: VSCodeAPI | null = null;

export const getVSCodeAPI = (): VSCodeAPI | null => {
  if (vscodeApi) {
    return vscodeApi;
  }

  if (typeof window.acquireVsCodeApi === 'function') {
    vscodeApi = window.acquireVsCodeApi();
    return vscodeApi;
  }

  // Mock API for development
  return {
    postMessage: (message: any) => console.log('Mock postMessage:', message),
    getState: () => ({}),
    setState: (state: any) => console.log('Mock setState:', state),
  };
};

export const useVSCode = (onMessage?: (message: Message) => void) => {
  const vscode = getVSCodeAPI();

  useEffect(() => {
    if (!onMessage) return;

    const handleMessage = (event: MessageEvent) => {
      const message = event.data as Message;
      onMessage(message);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage]);

  const postMessage = useCallback((message: Message) => {
    vscode?.postMessage(message);
  }, [vscode]);

  return { vscode, postMessage };
};
