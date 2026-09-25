import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/app';
import '@/index.css';
import { ThemeProvider } from '@/lib/theme';
import { ToastHost } from '@/lib/toast';
import { registerServiceWorker } from '@angisoft/offline';
import swUrl from '@/workers/sw.js?url';

const container = document.getElementById('root');

ReactDOM.createRoot(container as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
        <ToastHost />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);

registerServiceWorker(swUrl);