/**
 * @file Login.jsx
 * @description Authentication page that collects email and password, then
 * signs the user in via AuthContext and redirects to the home route on success.
 * @module pages/Login
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Controlled login form page. Submits credentials through AuthContext.login
 * (which calls the backend auth API) and navigates to `/` when successful.
 *
 * @returns {JSX.Element} Login page with email/password form
 */
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // AuthContext: login() stores JWT/user after a successful API call
  const { login } = useAuth();
  // Navigation: redirect to home after successful authentication
  const navigate = useNavigate();

  /**
   * Handles form submit: prevents default, clears prior errors, calls
   * AuthContext.login, then navigates home. Surfaces API error messages.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - Form submit event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      // API call (via AuthContext): POST credentials, persist session
      await login(email, password);
      // Navigation: land on home after login
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="page">
      <h1>Login</h1>

      {error && <p className="error-message">{error}</p>}

      {/* Controlled form: email + password bound to local state */}
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
