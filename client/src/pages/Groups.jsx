import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Groups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchPrivacy, setSearchPrivacy] = useState('all');
  const [searchManager, setSearchManager] = useState('');
  const [searchMinMembers, setSearchMinMembers] = useState('');
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const isManager = useCallback(
    (group) => {
      if (!user || !group.manager) {
        return false;
      }

      const managerId = group.manager._id || group.manager;
      return managerId.toString() === user._id.toString();
    },
    [user]
  );

  const canManageGroup = useCallback(
    (group) => isManager(group) || user?.role === 'admin',
    [isManager, user]
  );

  const isMember = useCallback(
    (group) => {
      if (!user) {
        return false;
      }

      return group.members.some(
        (member) => (member._id || member).toString() === user._id.toString()
      );
    },
    [user]
  );

  const isPending = useCallback(
    (group) => {
      if (!user || !group.pendingMembers) {
        return false;
      }

      return group.pendingMembers.some(
        (member) => (member._id || member).toString() === user._id.toString()
      );
    },
    [user]
  );

  const enrichGroups = useCallback(
    async (groupsList) => {
      if (!user) {
        return groupsList;
      }

      return Promise.all(
        groupsList.map(async (group) => {
          if (!canManageGroup(group)) {
            return group;
          }

          try {
            const detailResponse = await api.get(`/groups/${group._id}`);
            return detailResponse.data;
          } catch {
            return group;
          }
        })
      );
    },
    [user, canManageGroup]
  );

  const fetchGroups = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const response = await api.get('/groups');
      const enrichedGroups = await enrichGroups(response.data);
      setGroups(enrichedGroups);
      setIsSearchMode(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [enrichGroups]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const getManagerName = (manager) => {
    if (!manager) {
      return 'Unknown';
    }

    return manager.fullName || manager.username || 'Unknown';
  };

  const getUserStatus = (group) => {
    if (!user) {
      return 'Not joined';
    }

    if (isManager(group)) {
      return 'Manager';
    }

    if (isMember(group)) {
      return 'Member';
    }

    if (isPending(group)) {
      return 'Pending approval';
    }

    return 'Not joined';
  };

  const getPendingUserName = (pendingUser) => {
    if (!pendingUser) {
      return 'Unknown user';
    }

    if (typeof pendingUser === 'object') {
      return pendingUser.fullName || pendingUser.username || pendingUser.email;
    }

    return 'Pending user';
  };

  const getPendingUserId = (pendingUser) => {
    return (pendingUser._id || pendingUser).toString();
  };

  const updateGroupInList = (updatedGroup) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group._id === updatedGroup._id ? updatedGroup : group
      )
    );
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      const response = await api.post('/groups', {
        name,
        description,
        isPrivate
      });

      const detailResponse = await api.get(`/groups/${response.data._id}`);
      setGroups((prevGroups) => [detailResponse.data, ...prevGroups]);
      setName('');
      setDescription('');
      setIsPrivate(false);
      setMessage('Group created successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleSearchGroups = async (event) => {
    event.preventDefault();

    if (!user) {
      setError('Please login to search groups.');
      return;
    }

    setError('');
    setMessage('');
    setSearching(true);

    try {
      const params = {};

      if (searchName.trim()) {
        params.name = searchName.trim();
      }

      if (searchPrivacy !== 'all') {
        params.isPrivate = searchPrivacy === 'private' ? 'true' : 'false';
      }

      if (searchManager.trim()) {
        params.manager = searchManager.trim();
      }

      if (searchMinMembers.trim()) {
        params.minMembers = searchMinMembers.trim();
      }

      const response = await api.get('/groups/search', { params });
      setGroups(response.data);
      setIsSearchMode(true);
      setMessage(`Found ${response.data.length} group(s).`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search groups');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchName('');
    setSearchPrivacy('all');
    setSearchManager('');
    setSearchMinMembers('');
    fetchGroups();
  };

  const startEdit = (group) => {
    setEditingGroupId(group._id);
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditIsPrivate(group.isPrivate);
    setError('');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingGroupId(null);
    setEditName('');
    setEditDescription('');
    setEditIsPrivate(false);
  };

  const handleUpdateGroup = async (event, groupId) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSavingEdit(true);

    try {
      const response = await api.patch(`/groups/${groupId}`, {
        name: editName.trim(),
        description: editDescription,
        isPrivate: editIsPrivate
      });

      let updatedGroup = response.data;

      if (canManageGroup(updatedGroup)) {
        const detailResponse = await api.get(`/groups/${groupId}`);
        updatedGroup = detailResponse.data;
      }

      updateGroupInList(updatedGroup);
      cancelEdit();
      setMessage('Group updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this group? All related posts will also be removed.'
    );

    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');
    setDeletingId(groupId);

    try {
      const response = await api.delete(`/groups/${groupId}`);
      setGroups((prevGroups) => prevGroups.filter((group) => group._id !== groupId));
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete group');
    } finally {
      setDeletingId(null);
    }
  };

  const handleJoinGroup = async (groupId) => {
    setError('');
    setMessage('');
    setJoiningId(groupId);

    try {
      const response = await api.post(`/groups/${groupId}/join`);
      const { message: joinMessage, group: updatedGroup } = response.data;

      let finalGroup = updatedGroup;

      if (canManageGroup(updatedGroup)) {
        const detailResponse = await api.get(`/groups/${groupId}`);
        finalGroup = detailResponse.data;
      }

      updateGroupInList(finalGroup);
      setMessage(joinMessage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group');
    } finally {
      setJoiningId(null);
    }
  };

  const handleApproveMember = async (groupId, userId) => {
    setError('');
    setMessage('');
    setApprovingId(userId);

    try {
      const response = await api.post(`/groups/${groupId}/approve/${userId}`);
      updateGroupInList(response.data);
      setMessage('Member approved successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve member');
    } finally {
      setApprovingId(null);
    }
  };

  const renderGroupCard = (group) => {
    const userStatus = getUserStatus(group);
    const pendingMembers = group.pendingMembers || [];

    return (
      <div key={group._id} className="group-card">
        {editingGroupId === group._id ? (
          <form
            className="group-edit-form"
            onSubmit={(event) => handleUpdateGroup(event, group._id)}
          >
            <label>
              Name
              <input
                type="text"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows="3"
              />
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editIsPrivate}
                onChange={(event) => setEditIsPrivate(event.target.checked)}
              />
              Private group
            </label>

            <div className="group-actions">
              <button type="submit" disabled={savingEdit}>
                {savingEdit ? 'Saving...' : 'Save'}
              </button>
              <button type="button" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="group-card-header">
              <h3>{group.name}</h3>
              <span
                className={
                  group.isPrivate
                    ? 'group-badge private-badge'
                    : 'group-badge public-badge'
                }
              >
                {group.isPrivate ? 'Private' : 'Public'}
              </span>
            </div>

            <p>{group.description || 'No description'}</p>
            <p>
              <strong>Manager:</strong> {getManagerName(group.manager)}
            </p>
            <p>
              <strong>Members:</strong> {group.members?.length || 0}
            </p>
            <p className="group-status">
              <strong>Your status:</strong> {userStatus}
            </p>

            {user && canManageGroup(group) && (
              <div className="group-actions">
                <button
                  type="button"
                  className="edit-group-button"
                  onClick={() => startEdit(group)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="delete-group-button"
                  onClick={() => handleDeleteGroup(group._id)}
                  disabled={deletingId === group._id}
                >
                  {deletingId === group._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}

            {user && !isMember(group) && !isPending(group) && (
              <button
                type="button"
                className="join-button"
                onClick={() => handleJoinGroup(group._id)}
                disabled={joiningId === group._id}
              >
                {joiningId === group._id
                  ? 'Processing...'
                  : group.isPrivate
                    ? 'Request to Join'
                    : 'Join'}
              </button>
            )}

            {user && isPending(group) && (
              <p className="group-status">Pending approval</p>
            )}

            {user && canManageGroup(group) && pendingMembers.length > 0 && (
              <div className="manager-controls">
                <h4>Pending requests</h4>
                <div className="pending-members">
                  {pendingMembers.map((pendingUser) => {
                    const pendingUserId = getPendingUserId(pendingUser);

                    return (
                      <div key={pendingUserId} className="pending-member-row">
                        <div>
                          <strong>{getPendingUserName(pendingUser)}</strong>
                          {pendingUser.email && <p>{pendingUser.email}</p>}
                        </div>
                        <button
                          type="button"
                          className="approve-button"
                          onClick={() =>
                            handleApproveMember(group._id, pendingUserId)
                          }
                          disabled={approvingId === pendingUserId}
                        >
                          {approvingId === pendingUserId
                            ? 'Approving...'
                            : 'Approve'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="page">
        <h1>Groups</h1>
        <p>Loading groups...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Groups</h1>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {user && (
        <>
          <section className="groups-section">
            <h2>Create Group</h2>
            <form className="form" onSubmit={handleCreateGroup}>
              <label>
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows="3"
                />
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(event) => setIsPrivate(event.target.checked)}
                />
                Private group
              </label>

              <button type="submit" disabled={creating}>
                {creating ? 'Creating...' : 'Create Group'}
              </button>
            </form>
          </section>

          <section className="groups-section group-search-section">
            <h2>Search Groups</h2>
            <form className="group-search-form" onSubmit={handleSearchGroups}>
              <label>
                Group name
                <input
                  type="text"
                  value={searchName}
                  onChange={(event) => setSearchName(event.target.value)}
                  placeholder="Search by group name"
                />
              </label>

              <label>
                Privacy type
                <select
                  value={searchPrivacy}
                  onChange={(event) => setSearchPrivacy(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </label>

              <label>
                Manager
                <input
                  type="text"
                  value={searchManager}
                  onChange={(event) => setSearchManager(event.target.value)}
                  placeholder="Manager username or full name"
                />
              </label>

              <label>
                Minimum members
                <input
                  type="number"
                  min="0"
                  value={searchMinMembers}
                  onChange={(event) => setSearchMinMembers(event.target.value)}
                  placeholder="0"
                />
              </label>

              <div className="group-search-actions">
                <button type="submit" disabled={searching}>
                  {searching ? 'Searching...' : 'Search'}
                </button>
                {isSearchMode && (
                  <button type="button" onClick={handleClearSearch}>
                    Clear Search
                  </button>
                )}
              </div>
            </form>
          </section>
        </>
      )}

      <section className="groups-section">
        <h2>{isSearchMode ? 'Search Results' : 'All Groups'}</h2>

        {groups.length === 0 ? (
          <p>{isSearchMode ? 'No groups matched your search.' : 'No groups found.'}</p>
        ) : (
          <div className="groups-list">{groups.map(renderGroupCard)}</div>
        )}
      </section>
    </div>
  );
};

export default Groups;
