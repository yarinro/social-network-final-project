/**
 * File: App.js
 *
 * Purpose:
 * Top-level React component that defines client-side routing and the shared
 * chrome (navbar + main content area) for the social-network SPA.
 *
 * Main responsibilities:
 * - Enable BrowserRouter so URLs map to page components without full reloads.
 * - Wrap the UI in ErrorBoundary so render crashes show a fallback instead of a blank screen.
 * - Declare public routes (home, login, register, groups list, posts) and
 *   protected routes (group details, users, profile, messages, statistics).
 * - Catch unknown paths with the NotFound page (`path="*"`).
 *
 * Data flow:
 * - Does not fetch data itself; each page loads its own API data.
 * - ProtectedRoute reads AuthContext to allow or redirect unauthenticated users.
 *
 * Important concepts:
 * React Router v6 Routes/Route, nested ProtectedRoute wrappers, layout
 * composition (Navbar outside Routes so it stays visible), and SPA navigation.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import Posts from './pages/Posts';
import Users from './pages/Users';
import PublicProfile from './pages/PublicProfile';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Statistics from './pages/Statistics';
import NotFound from './pages/NotFound';
import './App.css';

/**
 * Renders the application shell: router, error boundary, navbar, and route table.
 *
 * @returns {JSX.Element}
 */
function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Public pages — no JWT required */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/groups" element={<Groups />} />
            {/* Group details need auth for membership/permission-aware content */}
            <Route
              path="/groups/:id"
              element={
                <ProtectedRoute>
                  <GroupDetails />
                </ProtectedRoute>
              }
            />
            <Route path="/posts" element={<Posts />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users/:id"
              element={
                <ProtectedRoute>
                  <PublicProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/statistics"
              element={
                <ProtectedRoute>
                  <Statistics />
                </ProtectedRoute>
              }
            />
            {/* Fallback for any unmatched URL */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
