/**
 * @file Users.jsx
 * @description Authenticated users directory. Lists all other users, supports
 * multi-field search and a friends-only filter, and lets the current user
 * add/remove friends while keeping AuthContext in sync.
 * @module pages/Users
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import UserBadge from '../components/UserBadge';

/**
 * Users and friends management page. Loads the full user list on mount,
 * switches to GET /users/search when filters are active, and exposes
 * add/remove-friend actions per listed user.
 *
 * @returns {JSX.Element} Search form, user list, or auth/loading fallbacks
 */
const Users = () => {
  // AuthContext: session user, auth bootstrap, updateUser after friend changes
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

  /**
   * Returns true when any text search field has a non-empty trimmed value.
   *
   * @returns {boolean|string} Truthy if at least one text filter is set
   */
  const hasTextFilters = () => {
    return (
      searchUsername.trim() ||
      searchFullName.trim() ||
      searchEmail.trim()
    );
  };

  /**
   * Builds the query-param object for GET /users/search from current form state.
   *
   * @param {boolean} [onlyFriends=friendsOnly] - Whether to include friendsOnly=true
   * @returns {Object} Axios `params` object (may be empty)
   */
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

  /**
   * Decides whether to call the search endpoint vs. listing all users.
   *
   * @param {boolean} [onlyFriends=friendsOnly] - Friends-only toggle value
   * @returns {boolean} True when friends-only or any text filter is active
   */
  const shouldUseSearch = (onlyFriends = friendsOnly) => {
    return onlyFriends || hasTextFilters();
  };

  /**
   * Fetches all users via GET /users, excludes the current user, and exits search mode.
   *
   * @returns {Promise<number>} Count of listed users after filtering
   */
  const fetchAllUsers = useCallback(async () => {
    // API call: GET /users (full directory)
    const response = await api.get('/users');
    const filteredUsers = (response.data || []).filter(
      (listedUser) => listedUser._id !== user._id
    );
    setUsers(filteredUsers);
    setIsSearchMode(false);
    return filteredUsers.length;
  }, [user]);

  /**
   * Loads users either via search (when filters apply) or the full list.
   *
   * @param {boolean} [onlyFriends=friendsOnly] - Override for friends-only filter
   * @returns {Promise<number>} Number of users returned
   */
  const fetchUsers = useCallback(
    async (onlyFriends = friendsOnly) => {
      if (shouldUseSearch(onlyFriends)) {
        // API call: GET /users/search with built query params
        const response = await api.get('/users/search', {
          params: buildSearchParams(onlyFriends)
        });
        setUsers(Array.isArray(response.data) ? response.data : []);
        setIsSearchMode(true);
        return response.data.length;
      }

      return fetchAllUsers();
    },
    [friendsOnly, fetchAllUsers, user]
  );

  /**
   * Initial load: once AuthContext has a user, fetch the full user directory.
   */
  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    /**
     * Loads the unfiltered user list on mount / when the session user changes.
     *
     * @returns {Promise<void>}
     */
    const loadUsers = async () => {
      try {
        setError('');
        setLoading(true);
        await fetchAllUsers();
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load users'));
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [user, authLoading, fetchAllUsers]);

  /**
   * Checks whether the given user id is already in the current user's friends list.
   * Supports both populated friend objects and raw id strings.
   *
   * @param {string} userId - Candidate friend's MongoDB id
   * @returns {boolean} True if already friends
   */
  const isFriend = (userId) => {
    return user?.friends?.some(
      (friendId) => (friendId._id || friendId).toString() === userId.toString()
    );
  };

  /**
   * Form submit handler for the search form. Runs fetchUsers and shows a count message.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - Form submit event
   * @returns {Promise<void>}
   */
  const handleSearchUsers = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSearching(true);

    try {
      const count = await fetchUsers();
      setMessage(`Found ${count} user(s).`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to search users'));
    } finally {
      setSearching(false);
    }
  };

  /**
   * Toggles the friends-only checkbox and immediately reloads the list
   * with the new filter value (does not wait for a separate Search click).
   *
   * @param {React.ChangeEvent<HTMLInputElement>} event - Checkbox change event
   * @returns {Promise<void>}
   */
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
      setError(getApiErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clears username/fullName text filters and reloads either friends-only
   * search results or the full user list, depending on the checkbox state.
   *
   * @returns {Promise<void>}
   */
  const handleClearSearch = async () => {
    setSearchUsername('');
    setSearchFullName('');
    setError('');
    setMessage('');

    try {
      setLoading(true);

      if (friendsOnly) {
        // API call: keep friends-only filter after clearing text fields
        const response = await api.get('/users/search', {
          params: { friendsOnly: 'true' }
        });
        setUsers(Array.isArray(response.data) ? response.data : []);
        setIsSearchMode(true);
      } else {
        await fetchAllUsers();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Adds a friend via POST /users/:userId/friend, updates AuthContext, and refreshes the list.
   *
   * @param {string} userId - Target user id to befriend
   * @returns {Promise<void>}
   */
  const handleAddFriend = async (userId) => {
    setError('');
    setMessage('');
    setActionUserId(userId);

    try {
      // API call: POST /users/:userId/friend
      const response = await api.post(`/users/${userId}/friend`);
      // AuthContext: sync friends array on the current user
      updateUser(response.data.user);
      setMessage(response.data.message);
      await fetchUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to add friend'));
    } finally {
      setActionUserId(null);
    }
  };

  /**
   * Removes a friend via DELETE /users/:userId/friend, updates AuthContext, and refreshes the list.
   *
   * @param {string} userId - Target user id to unfriend
   * @returns {Promise<void>}
   */
  const handleRemoveFriend = async (userId) => {
    setError('');
    setMessage('');
    setActionUserId(userId);

    try {
      // API call: DELETE /users/:userId/friend
      const response = await api.delete(`/users/${userId}/friend`);
      // AuthContext: sync friends array on the current user
      updateUser(response.data.user);
      setMessage(response.data.message);
      await fetchUsers();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to remove friend'));
    } finally {
      setActionUserId(null);
    }
  };

  /**
   * Chooses an empty-state message based on friends-only and search mode.
   *
   * @returns {string} Message shown when the users array is empty
   */
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

  /**
   * Chooses the list section heading based on friends-only and search mode.
   *
   * @returns {string} Section title for the users list
   */
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
          {/* Controlled search form: username, fullName, email + friends-only */}
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
