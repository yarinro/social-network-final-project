import { useEffect, useState } from 'react';
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

  const fetchGroups = async () => {
    try {
      setError('');
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const getManagerName = (manager) => {
    if (!manager) {
      return 'Unknown';
    }

    return manager.fullName || manager.username || 'Unknown';
  };

  const isMember = (group) => {
    if (!user) {
      return false;
    }

    return group.members.some(
      (member) => (member._id || member).toString() === user._id.toString()
    );
  };

  const isPending = (group) => {
    if (!user || !group.pendingMembers) {
      return false;
    }

    return group.pendingMembers.some(
      (member) => (member._id || member).toString() === user._id.toString()
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

      setGroups((prevGroups) => [response.data, ...prevGroups]);
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

      setGroups((prevGroups) =>
        prevGroups.map((group) =>
          group._id === updatedGroup._id ? updatedGroup : group
        )
      );
      setMessage(joinMessage);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group');
    } finally {
      setJoiningId(null);
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
            {groups.map((group) => (
              <div key={group._id} className="group-card">
                <h3>{group.name}</h3>
                <p>{group.description || 'No description'}</p>
                <p>
                  <strong>Type:</strong> {group.isPrivate ? 'Private' : 'Public'}
                </p>
                <p>
                  <strong>Manager:</strong> {getManagerName(group.manager)}
                </p>
                <p>
                  <strong>Members:</strong> {group.members?.length || 0}
                </p>
                {group.pendingMembers && (
                  <p>
                    <strong>Pending members:</strong> {group.pendingMembers.length}
                  </p>
                )}

                {user && !isMember(group) && !isPending(group) && (
                  <button
                    type="button"
                    className="join-button"
                    onClick={() => handleJoinGroup(group._id)}
                    disabled={joiningId === group._id}
                  >
                    {joiningId === group._id ? 'Joining...' : 'Join'}
                  </button>
                )}

                {user && isMember(group) && (
                  <p className="group-status">You are a member</p>
                )}

                {user && isPending(group) && (
                  <p className="group-status">Join request pending</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Groups;
