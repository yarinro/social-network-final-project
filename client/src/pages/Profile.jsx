/**
 * @file Profile.jsx
 * @description Authenticated user's own profile page. Loads `/users/me`,
 * allows editing full name / bio / image URL, syncs AuthContext on save,
 * and supports permanent account deletion with logout + redirect.
 * @module pages/Profile
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Own-profile management page. Fetches the current user from the API once
 * AuthContext has finished loading, then exposes edit and delete flows.
 *
 * @returns {JSX.Element} Profile view, loading states, or error fallback
 */
const Profile = () => {
  // AuthContext: session user, auth bootstrap flag, updateUser, logout
  const { user, loading: authLoading, updateUser, logout } = useAuth();
  // Navigation: used after account deletion to send the user to /login
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /**
   * Loads the authenticated user's profile from GET /users/me when the
   * session is ready, and seeds the edit-form fields from the response.
   */
  useEffect(() => {
    // Wait until AuthContext finishes and a user session exists
    if (authLoading || !user) {
      return;
    }

    /**
     * Fetches the current user's profile document and populates local form state.
     *
     * @returns {Promise<void>}
     */
    const fetchProfile = async () => {
      try {
        setError('');
        setLoading(true);
        // API call: GET /users/me (JWT-authenticated)
        const response = await api.get('/users/me');
        setProfile(response.data);
        setFullName(response.data.fullName || '');
        setBio(response.data.bio || '');
        setProfileImageUrl(response.data.profileImageUrl || '');
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load profile'));
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading]);

  /**
   * Saves editable profile fields via PATCH /users/me, then syncs AuthContext
   * so the navbar/badge reflect the updated user immediately.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - Form submit event
   * @returns {Promise<void>}
   */
  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      // API call: PATCH /users/me with trimmed editable fields
      const response = await api.patch('/users/me', {
        fullName: fullName.trim(),
        bio,
        profileImageUrl: profileImageUrl.trim()
      });

      setProfile(response.data.user);
      setFullName(response.data.user.fullName || '');
      setBio(response.data.user.bio || '');
      setProfileImageUrl(response.data.user.profileImageUrl || '');
      // AuthContext: keep global user state in sync with the server
      updateUser(response.data.user);
      setMessage(response.data.message);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Confirms, then permanently deletes the account via DELETE /users/me,
   * clears the session with logout(), and navigates to the login page.
   *
   * @returns {Promise<void>}
   */
  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');
    setDeleting(true);

    try {
      // API call: DELETE /users/me
      await api.delete('/users/me');
      // AuthContext: clear JWT/session after successful deletion
      logout();
      // Navigation: send the user to login (account no longer exists)
      navigate('/login');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete account'));
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page">
        <h1>Profile</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <h1>Profile</h1>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="page">
        <h1>Profile</h1>
        <p className="error-message">{error || 'Failed to load profile.'}</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Profile</h1>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <section className="profile-section">
        <h2>My Profile</h2>

        <div className="profile-info">
          {profile.profileImageUrl && (
            <img
              src={profile.profileImageUrl}
              alt="Profile"
              className="profile-image"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <p>
            <strong>Username:</strong> {profile.username}
          </p>
          <p>
            <strong>Email:</strong> {profile.email}
          </p>
          <p>
            <strong>Full Name:</strong> {profile.fullName}
          </p>
          <p>
            <strong>Bio:</strong> {profile.bio || 'No bio yet.'}
          </p>
          <p>
            <strong>Friends:</strong> {profile.friends?.length || 0}
          </p>
        </div>

        {/* Controlled edit form: fullName, bio, profileImageUrl (username/email read-only) */}
        <form className="profile-form" onSubmit={handleSaveProfile}>
          <h3>Edit Profile</h3>

          <div className="profile-readonly">
            <p>
              <strong>Username:</strong> {profile.username}
            </p>
            <p>
              <strong>Email:</strong> {profile.email}
            </p>
          </div>

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
            Bio
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows="4"
            />
          </label>

          <label>
            Profile Image URL
            <input
              type="url"
              value={profileImageUrl}
              onChange={(event) => setProfileImageUrl(event.target.value)}
              placeholder="https://example.com/profile.jpg"
            />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="profile-danger-zone">
          <h3>Delete Account</h3>
          <p>
            Deleting your account will remove your profile, posts, and messages.
            If you manage groups, you must delete or transfer them first.
          </p>
          <button
            type="button"
            className="delete-account-button"
            onClick={handleDeleteAccount}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default Profile;
