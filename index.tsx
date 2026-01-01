import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { COMMON_BLOCK_CSS } from './services/commonStyles';

const styleEl = document.createElement('style');
styleEl.setAttribute('data-openbento-common', 'true');
styleEl.textContent = COMMON_BLOCK_CSS;
document.head.appendChild(styleEl);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
