import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { AppConfigProvider } from './context/AppConfigContext';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppConfigProvider>
      <App />
    </AppConfigProvider>
  </React.StrictMode>,
);
