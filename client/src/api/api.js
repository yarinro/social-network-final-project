/**
 * File: api.js
 *
 * Purpose:
 * Shared Axios HTTP client for all frontend calls to the Express backend.
 * Centralizes the API base URL, JWT attachment, and global 401 handling.
 *
 * Main responsibilities:
 * - Create an Axios instance pointed at http://localhost:5000/api.
 * - Attach Authorization: Bearer <token> from localStorage on every request.
 * - On most 401 responses, clear the token and redirect to /login.
 * - Leave /auth/me 401s alone so AuthProvider can clear a stale session quietly.
 *
 * Data flow:
 * - Imported by AuthContext, pages, and components that call the REST API.
 * - Token is written by login/register and removed by logout or this interceptor.
 *
 * Important concepts:
 * Axios instance vs raw fetch, request/response interceptors, Bearer JWT,
 * localStorage session persistence, and SPA redirect after auth failure.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

/**
 * Request interceptor: if a JWT exists in localStorage, add it as a Bearer token.
 * Controllers on the server then verify it via protect middleware.
 */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Response interceptor: handle unauthorized responses globally.
 *
 * Skipping /auth/me avoids a redirect loop during initial session restore
 * when AuthProvider discovers an expired or invalid token.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isAuthMeRequest = requestUrl.includes('/auth/me');

    if (status === 401 && !isAuthMeRequest) {
      localStorage.removeItem('token');

      const publicPaths = ['/login', '/register', '/'];
      const currentPath = window.location.pathname;

      // Only force navigation away from pages that require a session.
      if (!publicPaths.includes(currentPath)) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
