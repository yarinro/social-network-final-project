/**
 * File: index.js
 *
 * Purpose:
 * React application entry point. Mounts the root component tree into the
 * HTML element with id "root" (defined in public/index.html).
 *
 * Main responsibilities:
 * - Create the React 18 root with ReactDOM.createRoot.
 * - Wrap the app in React.StrictMode (extra development checks).
 * - Wrap the app in AuthProvider so every page can read login state.
 * - Render App, which owns routing and the main layout.
 *
 * Data flow:
 * - No API calls here; AuthProvider (inside) restores the session on load.
 * - Global CSS (index.css) is imported once for base styles.
 *
 * Important concepts:
 * SPA bootstrap, React 18 createRoot, context providers at the top of the tree,
 * and StrictMode (double-invokes some effects in development only).
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* AuthProvider must wrap App so Navbar, ProtectedRoute, and pages can use useAuth(). */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
