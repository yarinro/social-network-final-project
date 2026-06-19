import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Groups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

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

  const fetchGroups = useCallback(async () => {
    try {
      setError('');
      const response = await api.get('/groups');
      let groupsList = response.data;

      if (user) {
        groupsList = await Promise.all(
          groupsList.map(async (group) => {
            if (!isManager(group)) {
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
      }

      setGroups(groupsList);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [user, isManager]);

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

      let createdGroup = response.data;

      if (user) {
        const detailResponse = await api.get(`/groups/${createdGroup._id}`);
        createdGroup = detailResponse.data;
      }

      setGroups((prevGroups) => [createdGroup, ...prevGroups]);
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

  const handleJoinGroup = async (groupId) => {
    setError('');
    setMessage('');
    setJoiningId(groupId);

    try {
      const response = await api.post(`/groups/${groupId}/join`);
      const { message: joinMessage, group: updatedGroup } = response.data;

      let finalGroup = updatedGroup;

      if (isManager(updatedGroup)) {
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
      )}

      <section className="groups-section">
        <h2>All Groups</h2>

        {groups.length === 0 ? (
          <p>No groups found.</p>
        ) : (
          <div className="groups-list">
            {groups.map((group) => {
              const userStatus = getUserStatus(group);
              const pendingMembers = group.pendingMembers || [];

              return (
                <div key={group._id} className="group-card">
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

                  {user && isManager(group) && pendingMembers.length > 0 && (
                    <div className="manager-controls">
                      <h4>Pending requests</h4>
                      <div className="pending-members">
                        {pendingMembers.map((pendingUser) => {
                          const pendingUserId = getPendingUserId(pendingUser);

                          return (
                            <div
                              key={pendingUserId}
                              className="pending-member-row"
                            >
                              <div>
                                <strong>{getPendingUserName(pendingUser)}</strong>
                                {pendingUser.email && (
                                  <p>{pendingUser.email}</p>
                                )}
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
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Groups;
