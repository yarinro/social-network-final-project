/**
 * @file ProtectedRoute.jsx
 * @description Route guard that only renders child routes when a user is authenticated.
 *
 * Purpose:
 * Wrap private pages (feed, profile, messages, etc.) so unauthenticated visitors are
 * redirected to `/login`, while still showing a brief loading state while AuthContext
 * finishes restoring the session (e.g. from a stored token).
 *
 * Responsibilities:
 * - Read `user` and `loading` from `AuthContext`
 * - Show a loading placeholder until auth status is known (avoids a flash redirect)
 * - Redirect to login with `state.from` set to the attempted location so login can
 *   send the user back after success
 * - Render `children` when authenticated
 *
 * Data flow:
 * Auth state comes from context (not props). `useLocation` captures the current path
 * for the redirect `state`. Uses React Router's `<Navigate>` for declarative redirect.
 *
 * React concepts demonstrated:
 * Context consumption (`useAuth`), location-aware redirects, and the common pattern of
 * gating routes with a wrapper component instead of checking auth inside every page.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Renders children only for authenticated users; otherwise redirects to login.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Protected page or nested routes
 * @returns {JSX.Element}
 */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for AuthContext to resolve before deciding redirect vs render
  if (loading) {
    return (
      <div className="page">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    // `replace` avoids stacking the protected URL in history; `from` enables post-login return
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
