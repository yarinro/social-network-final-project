/**
 * @file PublicProfile.jsx
 * @description Read-only public profile view for another user, keyed by the
 * `:id` route param. Requires an authenticated session and loads
 * GET /users/:id/public.
 * @module pages/PublicProfile
 */

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Displays another user's public profile (avatar, username, bio, join date).
 * Waits for AuthContext before fetching so the JWT is available.
 *
 * @returns {JSX.Element} Public profile card, loading states, or error fallback
 */
const PublicProfile = () => {
  // Route param: target user id from /users/:id (or equivalent public route)
  const { id } = useParams();
  // AuthContext: require a logged-in session before calling the public API
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /**
   * Fetches the public profile for `id` once auth is ready. Re-runs when the
   * route param or session user changes.
   */
  useEffect(() => {
    // Skip until AuthContext finishes and a user session exists
    if (authLoading || !user) {
      return;
    }

    /**
     * Loads GET /users/:id/public and stores the result in local state.
     *
     * @returns {Promise<void>}
     */
    const fetchPublicProfile = async () => {
      try {
        setError('');
        setLoading(true);
        setProfile(null);
        // API call: GET /users/:id/public
        const response = await api.get(`/users/${id}/public`);
        setProfile(response.data);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load public profile'));
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [user, authLoading, id]);

  /**
   * Derives a single uppercase initial for the avatar fallback when no
   * profile image URL is available.
   *
   * @returns {string} First character of username/fullName, or '?'
   */
  const getInitial = () => {
    const name = profile?.username || profile?.fullName || '?';
    return name.charAt(0).toUpperCase();
  };

  if (authLoading) {
    return (
      <div className="page">
        <h1>Public Profile</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Public Profile</h1>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page">
        <h1>Public Profile</h1>
        <p className="error-message">{error || 'Not found.'}</p>
        {/* Navigation: return to the users directory */}
        <Link to="/users">Back to Users</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Public Profile</h1>

      <section className="public-profile-card">
        {profile.profileImageUrl ? (
          <img
            src={profile.profileImageUrl}
            alt={`${profile.username || 'User'} profile`}
            className="public-profile-avatar"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="public-profile-avatar public-profile-fallback">
            {getInitial()}
          </div>
        )}

        <h2>@{profile.username || 'unknown'}</h2>
        <p>
          <strong>Full Name:</strong> {profile.fullName || 'Not provided'}
        </p>
        <p>
          <strong>Bio:</strong> {profile.bio || 'No bio yet.'}
        </p>
        <p>
          <strong>Joined:</strong>{' '}
          {profile.createdAt
            ? new Date(profile.createdAt).toLocaleDateString()
            : 'Unknown'}
        </p>
      </section>
    </div>
  );
};

export default PublicProfile;
