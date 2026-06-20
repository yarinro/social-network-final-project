import { Component } from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

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
