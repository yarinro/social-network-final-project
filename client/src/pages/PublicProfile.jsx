import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const PublicProfile = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPublicProfile = async () => {
      try {
        setError('');
        setLoading(true);
        const response = await api.get(`/users/${id}/public`);
        setProfile(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load public profile');
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [user, id]);

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

  if (!user) {
    return (
      <div className="page">
        <h1>Public Profile</h1>
        <p>Please login to view public profiles.</p>
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

  if (error) {
    return (
      <div className="page">
        <h1>Public Profile</h1>
        <p className="error-message">{error}</p>
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
            alt={`${profile.username} profile`}
            className="public-profile-avatar"
          />
        ) : (
          <div className="public-profile-avatar public-profile-fallback">
            {getInitial()}
          </div>
        )}

        <h2>@{profile.username}</h2>
        <p>
          <strong>Full Name:</strong> {profile.fullName}
        </p>
        <p>
          <strong>Bio:</strong> {profile.bio || 'No bio yet.'}
        </p>
        <p>
          <strong>Joined:</strong>{' '}
          {new Date(profile.createdAt).toLocaleDateString()}
        </p>
      </section>
    </div>
  );
};

export default PublicProfile;
