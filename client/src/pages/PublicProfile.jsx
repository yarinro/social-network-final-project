import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';

const PublicProfile = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const fetchPublicProfile = async () => {
      try {
        setError('');
        setLoading(true);
        setProfile(null);
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
