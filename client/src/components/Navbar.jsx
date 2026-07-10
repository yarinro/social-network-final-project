/**
 * @file Navbar.jsx
 * @description Top application navigation bar with brand, main links, and auth controls.
 *
 * Purpose:
 * Provide global navigation across Home, Feed, Groups, Users, Profile, Messages, and
 * Statistics, plus a right-side auth area that either shows the signed-in user (badge +
 * logout) or Login/Register links when anonymous.
 *
 * Responsibilities:
 * - Read `user` and `logout` from `AuthContext`
 * - Render primary `Link` destinations for the app's main routes
 * - Conditionally switch the auth section based on session presence
 *
 * Data flow:
 * Auth state from context only — no local state. Logout is the context method (clears
 * session/token). Navigation is client-side via `react-router-dom` `Link`.
 *
 * React concepts demonstrated:
 * Context-driven conditional UI (authenticated vs guest), composition with `UserBadge`,
 * and a shared layout chrome component used above routed pages.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserBadge from './UserBadge';

/**
 * Site-wide navbar: brand, primary routes, and login/logout controls.
 *
 * @returns {JSX.Element}
 */
const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Social Network</Link>
      </div>

      <div className="navbar-links">
        <Link to="/">Home</Link>
        <Link to="/posts">Feed</Link>
        <Link to="/groups">Groups</Link>
        <Link to="/users">Users</Link>
        <Link to="/profile">Profile</Link>
        <Link to="/messages">Messages</Link>
        <Link to="/statistics">Statistics</Link>
      </div>

      <div className="navbar-auth">
        {/* Auth UI: badge + logout when signed in; otherwise login/register entry points */}
        {user ? (
          <>
            <UserBadge user={user} className="navbar-user-badge" />
            <button type="button" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
