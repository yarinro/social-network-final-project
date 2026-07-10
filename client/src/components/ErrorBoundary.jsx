/**
 * @file ErrorBoundary.jsx
 * @description Class-based React error boundary that catches render errors in the subtree.
 *
 * Purpose:
 * Prevent a single component crash from blanking the entire app. When a descendant throws
 * during render, this boundary shows a recovery UI (refresh or go home) instead of an
 * unhandled white screen.
 *
 * Responsibilities:
 * - Flip `hasError` via `getDerivedStateFromError` when a child throws
 * - Log the error and component stack in `componentDidCatch` for debugging
 * - Render a fallback page with reload and home navigation when an error was caught
 * - Pass through `children` when no error has occurred
 *
 * Data flow:
 * No props beyond `children`. Error state is local class state. Logging goes to
 * `console.error`. Recovery uses a full `window.location.reload()` or a Router `Link`.
 *
 * React concepts demonstrated:
 * Error boundaries must be class components (hooks cannot catch render errors). Lifecycle
 * pair: `getDerivedStateFromError` (update UI) + `componentDidCatch` (side effects/logging).
 * Note: this does not catch errors in event handlers, async code, or the boundary itself.
 */

import { Component } from 'react';
import { Link } from 'react-router-dom';

/**
 * Catches uncaught rendering errors below it and shows a fallback recovery UI.
 */
class ErrorBoundary extends Component {
  /**
   * @param {Object} props
   * @param {React.ReactNode} props.children
   */
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Static lifecycle: map a thrown error to state so the next render shows the fallback.
   *
   * @returns {{ hasError: boolean }}
   */
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  /**
   * Side-effect lifecycle after an error: log details for developers (does not update UI).
   *
   * @param {Error} error
   * @param {Object} errorInfo - Includes `componentStack` from React
   */
  componentDidCatch(error, errorInfo) {
    console.error('Unhandled rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page error-boundary-page">
          <h1>Something went wrong</h1>
          <p>
            An unexpected error occurred while loading this page. Please refresh
            or return home.
          </p>
          <div className="error-boundary-actions">
            {/* Full reload remounts the app tree and clears the boundary's error state */}
            <button type="button" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
            <Link to="/">Go Home</Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
