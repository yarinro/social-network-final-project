import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import UserBadge from '../components/UserBadge';

const Users = () => {
  const { user, loading: authLoading, updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchFullName, setSearchFullName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [actionUserId, setActionUserId] = useState(null);

  const hasTextFilters = () => {
    return (
      searchUsername.trim() ||
      searchFullName.trim() ||
      searchEmail.trim()
    );
  };

  const buildSearchParams = (onlyFriends = friendsOnly) => {
    const params = {};

    if (searchUsername.trim()) {
      params.username = searchUsername.trim();
    }

    if (searchFullName.trim()) {
      params.fullName = searchFullName.trim();
    }

    if (searchEmail.trim()) {
      params.email = searchEmail.trim();
    }

    if (onlyFriends) {
      params.friendsOnly = 'true';
    }

    return params;
  };

  const shouldUseSearch = (onlyFriends = friendsOnly) => {
    return onlyFriends || hasTextFilters();
  };

  const fetchAllUsers = useCallback(async () => {
    const response = await api.get('/users');
    const filteredUsers = response.data.filter(
      (listedUser) => listedUser._id !== user._id
    );
    setUsers(filteredUsers);
    setIsSearchMode(false);
    return filteredUsers.length;
  }, [user]);

  const fetchUsers = useCallback(
    async (onlyFriends = friendsOnly) => {
      if (shouldUseSearch(onlyFriends)) {
        const response = await api.get('/users/search', {
          params: buildSearchParams(onlyFriends)
        });
        setUsers(response.data);
        setIsSearchMode(true);
        return response.data.length;
      }

      return fetchAllUsers();
    },
    [friendsOnly, fetchAllUsers, user]
  );

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadUsers = async () => {
      try {
        setError('');
        setLoading(true);
        await fetchAllUsers();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [user, fetchAllUsers]);

  const isFriend = (userId) => {
    return user.friends?.some(
      (friendId) => (friendId._id || friendId).toString() === userId.toString()
    );
  };

  const handleSearchUsers = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSearching(true);

    try {
      const count = await fetchUsers();
      setMessage(`Found ${count} user(s).`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleFriendsOnlyChange = async (event) => {
    const checked = event.target.checked;
    setFriendsOnly(checked);
    setError('');
    setMessage('');

    try {
      setLoading(true);
      const count = await fetchUsers(checked);
      if (checked || hasTextFilters()) {
        setMessage(`Found ${count} user(s).`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = async () => {
    setSearchUsername('');
    setSearchFullName('');
    setError('');
    setMessage('');

    try {
      setLoading(true);

      if (friendsOnly) {
        const response = await api.get('/users/search', {
          params: { friendsOnly: 'true' }
        });
        setUsers(response.data);
        setIsSearchMode(true);
      } else {
        await fetchAllUsers();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId) => {
    setError('');
    setMessage('');
    setActionUserId(userId);

    try {
      const response = await api.post(`/users/${userId}/friend`);
      updateUser(response.data.user);
      setMessage(response.data.message);
      await fetchUsers();
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
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove friend');
    } finally {
      setActionUserId(null);
    }
  };

  const getEmptyMessage = () => {
    if (friendsOnly && hasTextFilters()) {
      return 'No friends matched your search.';
    }

    if (friendsOnly) {
      return 'You have no friends yet. Add friends from the user list.';
    }

    if (isSearchMode) {
      return 'No users matched your search.';
    }

    return 'No users found.';
  };

  const getListTitle = () => {
    if (friendsOnly && hasTextFilters()) {
      return 'Friends Search Results';
    }

    if (friendsOnly) {
      return 'Friends';
    }

    if (isSearchMode) {
      return 'Search Results';
    }

    return 'All Users';
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
        <h2>Search Users</h2>
        <div className="search-card">
          <form className="user-search-form" onSubmit={handleSearchUsers}>
            <div className="search-grid">
              <label>
                Username
                <input
                  type="text"
                  value={searchUsername}
                  onChange={(event) => setSearchUsername(event.target.value)}
                  placeholder="Search by username"
                />
              </label>

              <label>
                Full Name
                <input
                  type="text"
                  value={searchFullName}
                  onChange={(event) => setSearchFullName(event.target.value)}
                  placeholder="Search by full name"
                />
              </label>

              <label>
                Email
                <input
                  type="text"
                  value={searchEmail}
                  onChange={(event) => setSearchEmail(event.target.value)}
                  placeholder="Search by email"
                />
              </label>
            </div>

            <div className="search-actions">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={friendsOnly}
                  onChange={handleFriendsOnlyChange}
                />
                <span>Friends only</span>
              </label>

              <div className="search-buttons">
                <button type="submit" disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
                {(isSearchMode || hasTextFilters()) && (
                  <button type="button" onClick={handleClearSearch}>
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </section>

      <section className="users-section">
        <h2>{getListTitle()}</h2>

        {loading ? (
          <p>Loading users...</p>
        ) : users.length === 0 ? (
          <p>{getEmptyMessage()}</p>
        ) : (
          <div className="users-list">
            {users.map((listedUser) => (
              <div key={listedUser._id} className="user-card">
                <UserBadge user={listedUser} />
                <p>
                  <strong>Email:</strong> {listedUser.email}
                </p>
                <p className="friend-status">
                  <strong>Status:</strong>{' '}
                  {isFriend(listedUser._id) ? 'Friend' : 'Not a friend'}
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
