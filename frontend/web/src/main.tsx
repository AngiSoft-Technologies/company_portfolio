import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/app';
import '@/index.css';
import { ThemeProvider } from '@/lib/theme';
import { ToastHost } from '@/lib/toast';
import { ScrollToTop } from '@/components/ScrollToTop';
import { registerServiceWorker } from '@angisoft/offline';

const container = document.getElementById('root');

ReactDOM.createRoot(container as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <App />
        <ToastHost />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);

/*
 * Service worker (offline PWA shell) is production-only: a SW in dev caches
 * Vite's unhashed dev modules and serves stale code after edits, which breaks
 * HMR-adjacent behaviour with mismatched bundles.
 */
if (import.meta.env.PROD) {
  registerServiceWorker();
}