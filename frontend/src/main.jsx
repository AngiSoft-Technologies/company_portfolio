import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
        <ToastContainer />
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}