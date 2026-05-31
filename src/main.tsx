import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent benign developmental WebSocket / HMR connection errors in sandboxed environments from throwing crash popups or console noise.
if (typeof window !== 'undefined') {
  const isWebsocketError = (err: any): boolean => {
    if (!err) return false;
    const str = typeof err === 'string' 
      ? err 
      : (err.message || err.description || err.reason || String(err));
    const strLower = str.toLowerCase();
    
    const nameLower = (err.name || '').toLowerCase();
    const stackLower = (err.stack || '').toLowerCase();

    return (
      strLower.includes('websocket') ||
      strLower.includes('closed without opened') ||
      strLower.includes('hmr') ||
      strLower.includes('vite') ||
      strLower.includes('failed to fetch') ||
      strLower.includes('load failed') ||
      strLower.includes('networkerror') ||
      nameLower.includes('websocket') ||
      nameLower.includes('networkerror') ||
      stackLower.includes('websocket') ||
      stackLower.includes('closed without opened') ||
      stackLower.includes('failed to fetch')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isWebsocketError(event.reason)) {
      console.info(' [Sandbox Guard] Prevented benign WebSocket/HMR Unhandled Rejection:', event.reason);
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isWebsocketError(event.message) || isWebsocketError(event.error)) {
      console.info(' [Sandbox Guard] Prevented benign WebSocket/HMR Error:', event.message || event.error);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true); // Use capture phase to catch resource/connection errors early
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

