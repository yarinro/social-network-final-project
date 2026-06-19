import { useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { user, loading: authLoading, updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actionUserId, setActionUserId] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        setError('');
        setLoading(true);

        let response;

        if (!searchQuery.trim()) {
          response = await api.get('/users');
          setUsers(
            response.data.filter(
              (listedUser) => listedUser._id !== user._id
            )
          );
        } else {
          response = await api.get(`/users/search/${searchQuery}`);
          setUsers(response.data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, searchQuery]);

  const isFriend = (userId) => {
    return user.friends?.some(
      (friendId) => (friendId._id || friendId).toString() === userId.toString()
    );
  };

  const handleAddFriend = async (userId) => {
    setError('');
    setMessage('');
    setActionUserId(userId);

    try {
      const response = await api.post(`/users/${userId}/friend`);
      updateUser(response.data.user);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add friend');
    } finally {
      setActionUserId(null);
    }
  };

  const handleRemoveFriend = async (userId) => {
    setError('');
    setMessage('');
    setActionUserId(userId);

    try {
      const response = await api.delete(`/users/${userId}/friend`);
      updateUser(response.data.user);
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove friend');
    } finally {
      setActionUserId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="page">
        <h1>Users</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Users</h1>
        <p>Please login to view and manage friends.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Users</h1>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <section className="users-section">
        <div className="users-toolbar">
          <input
            type="text"
            placeholder="Search by username, full name, or email"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="users-list">
            {users.map((listedUser) => (
              <div key={listedUser._id} className="user-card">
                <h3>{listedUser.fullName}</h3>
                <p>
                  <strong>Username:</strong> {listedUser.username}
                </p>
                <p>
                  <strong>Email:</strong> {listedUser.email}
                </p>

                {isFriend(listedUser._id) ? (
                  <button
                    type="button"
                    className="remove-friend-button"
                    onClick={() => handleRemoveFriend(listedUser._id)}
                    disabled={actionUserId === listedUser._id}
                  >
                    {actionUserId === listedUser._id
                      ? 'Removing...'
                      : 'Remove Friend'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="friend-button"
                    onClick={() => handleAddFriend(listedUser._id)}
                    disabled={actionUserId === listedUser._id}
                  >
                    {actionUserId === listedUser._id
                      ? 'Adding...'
                      : 'Add Friend'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Users;
