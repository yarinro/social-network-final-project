/**
 * @file Register.jsx
 * @description Registration page that collects username, full name, email, and
 * password, creates an account via AuthContext, and redirects to home on success.
 * @module pages/Register
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Controlled registration form page. Submits new-user fields through
 * AuthContext.register (backend signup API) and navigates to `/` when successful.
 *
 * @returns {JSX.Element} Register page with signup form
 */
const Register = () => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // AuthContext: register() creates the account and stores the session
  const { register } = useAuth();
  // Navigation: redirect to home after successful registration
  const navigate = useNavigate();

  /**
   * Handles form submit: prevents default, clears prior errors, calls
   * AuthContext.register with all fields, then navigates home.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - Form submit event
   * @returns {Promise<void>}
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      // API call (via AuthContext): POST new user, persist session
      await register(username, fullName, email, password);
      // Navigation: land on home after registration
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="page">
      <h1>Register</h1>

      {error && <p className="error-message">{error}</p>}

      {/* Controlled form: username, full name, email, password */}
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label>
          Full Name
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </label>

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

        <button type="submit">Register</button>
      </form>
    </div>
  );
};

export default Register;
