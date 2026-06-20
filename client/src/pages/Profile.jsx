import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, loading: authLoading, updateUser, logout } = useAuth();
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

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setError('');
        const response = await api.get('/users/me');
        setProfile(response.data);
        setFullName(response.data.fullName || '');
        setBio(response.data.bio || '');
        setProfileImageUrl(response.data.profileImageUrl || '');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      const response = await api.patch('/users/me', {
        fullName: fullName.trim(),
        bio,
        profileImageUrl: profileImageUrl.trim()
      });

      setProfile(response.data.user);
      setFullName(response.data.user.fullName || '');
      setBio(response.data.user.bio || '');
      setProfileImageUrl(response.data.user.profileImageUrl || '');
      updateUser(response.data.user);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

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
      await api.delete('/users/me');
      logout();
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
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

  if (!user) {
    return (
      <div className="page">
        <h1>Profile</h1>
        <p>Please login to view your profile.</p>
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

  return (
    <div className="page">
      <h1>Profile</h1>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <section className="profile-section">
        <h2>My Profile</h2>

        {profile && (
          <div className="profile-info">
            {profile.profileImageUrl && (
              <img
                src={profile.profileImageUrl}
                alt="Profile"
                className="profile-image"
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
        )}

        <form className="profile-form" onSubmit={handleSaveProfile}>
          <h3>Edit Profile</h3>

          <div className="profile-readonly">
            <p>
              <strong>Username:</strong> {profile?.username}
            </p>
            <p>
              <strong>Email:</strong> {profile?.email}
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
