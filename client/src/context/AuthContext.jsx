/**
 * File: AuthContext.jsx
 *
 * Purpose:
 * React Context that holds the authenticated user, JWT token, loading flag,
 * and auth actions (register, login, logout, updateUser) for the whole SPA.
 *
 * Main responsibilities:
 * - Restore the session on first load via GET /auth/me when a token exists.
 * - Persist the JWT in localStorage so refresh keeps the user logged in.
 * - Expose useAuth() for Navbar, ProtectedRoute, and feature pages.
 *
 * Data flow:
 * - Reads/writes localStorage key "token".
 * - Calls the shared Axios instance (api.js) for /auth/register, /login, /me.
 * - Provider value is consumed by any child under AuthProvider in index.js.
 *
 * Important concepts:
 * Context API, custom hook (useAuth), useEffect for bootstrap, controlled
 * global auth state, and clearing state on failed session restore.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/api';

const AuthContext = createContext();

/**
 * Convenience hook to read AuthContext. Must be used under AuthProvider.
 *
 * @returns {{
 *   user: object|null,
 *   token: string|null,
 *   loading: boolean,
 *   register: Function,
 *   login: Function,
 *   logout: Function,
 *   updateUser: Function
 * }}
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Provides authentication state and actions to the component tree.
 *
 * @param {{ children: import('react').ReactNode }} props
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  // loading stays true until we know whether a saved token is still valid.
  const [loading, setLoading] = useState(true);

  // On app load, restore the logged-in user from the saved JWT token
  useEffect(() => {
    /**
     * If localStorage has a token, ask the backend who it belongs to.
     * On failure, wipe the stale token so ProtectedRoute treats the user as logged out.
     */
    const loadUser = async () => {
      const savedToken = localStorage.getItem('token');

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setToken(savedToken);
      } catch (error) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  /**
   * Registers a new account, stores the returned JWT, and sets user state.
   *
   * @param {string} username
   * @param {string} fullName
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Backend response with user and token.
   */
  const register = async (username, fullName, email, password) => {
    const response = await api.post('/auth/register', {
      username,
      fullName,
      email,
      password
    });

    const { user: newUser, token: newToken } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);

    return response.data;
  };

  /**
   * Logs in with email/password, stores JWT, and updates context user.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Backend response with user and token.
   */
  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    const { user: loggedInUser, token: newToken } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(loggedInUser);

    return response.data;
  };

  /**
   * Clears JWT and user from localStorage and React state (client-side logout).
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  /**
   * Replaces the context user after profile edits without requiring a full re-login.
   *
   * @param {object} updatedUser - User object returned from the profile update API.
   */
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
