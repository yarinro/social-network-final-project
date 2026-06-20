import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        {user ? (
          <>
            <span className="navbar-user">
              {user.fullName || user.username}
            </span>
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
