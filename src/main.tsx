import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AppConfigProvider } from './context/AppConfigContext';
import './styles/global.css';

function markEmbeddedMode(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  let embedded = false;
  try {
    embedded = window.self !== window.top || /(?:^|[?&])embed=1(?:&|$)/.test(window.location.search);
  } catch {
    embedded = true;
  }
  document.documentElement.dataset.embedded = embedded ? 'true' : 'false';
}

markEmbeddedMode();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppConfigProvider>
      <App />
    </AppConfigProvider>
  </React.StrictMode>,
);
