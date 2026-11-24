import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './App.css';
import './theme.css';
import './tech.css';
import { initTheme } from './utils/theme';
import { initNativeApp } from './native';

initTheme();
initNativeApp();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
