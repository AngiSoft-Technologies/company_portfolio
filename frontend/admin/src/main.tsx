import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/app';
import '@/styles/global.css';
import { ThemeProvider } from '@/styles/theme';

const container = document.getElementById('root');

ReactDOM.createRoot(container as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>,
);