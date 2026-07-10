/**
 * @file Groups.jsx
 * @description Groups listing and management page for the MERN social-network client.
 *
 * Purpose:
 *   Central UI for discovering, creating, searching, joining, editing, and deleting groups.
 *   Authenticated users can switch between an "All Groups" catalog and a "My Groups" subset
 *   (groups they manage or belong to), and managers/admins can approve private join requests.
 *
 * Responsibilities:
 *   - Fetch group lists from REST (`GET /groups`, `GET /groups/my`, `GET /groups/search`)
 *   - Create groups (`POST /groups`) and update/delete when the user is manager or admin
 *   - Join public groups immediately or request to join private groups (`POST .../join`)
 *   - Approve pending members for private groups (`POST .../approve/:userId`)
 *   - Enrich manager/admin list rows with full detail (`GET /groups/:id`) so pendingMembers appear
 *   - Render membership status (Manager / Member / Pending / Not joined) per card
 *
 * Data flow:
 *   AuthContext.user → permission helpers (isManager, isMember, isPending, canManageGroup)
 *   → fetchGroups / performGroupSearch → enrichGroups (detail fetch for managers)
 *   → groups state → renderGroupCard UI; mutations update local list via updateGroupInList
 *
 * Key concepts for defense:
 *   - All vs My tabs (`view`): controls which endpoint/filter is used; search re-runs when tab changes
 *   - Public join vs private request: same join endpoint; UI label and pending state differ by isPrivate
 *   - Manager vs admin: both can edit/delete/approve; membership helpers normalize populated vs raw IDs
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import UserBadge from '../components/UserBadge';
import GroupLink from '../components/GroupLink';

/**
 * Groups page component: list, search, create, join, and manage groups.
 * Holds all list/search/edit UI state and wires REST mutations back into the local `groups` array.
 *
 * @returns {JSX.Element} Groups page
 */
const Groups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  /** @type {'all' | 'my'} Active list tab — All Groups vs My Groups */
  const [view, setView] = useState('all');
  /** When true, list shows search results and the view-change effect skips a normal refetch */
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

  /**
   * Permission helper: true when the logged-in user is this group's manager.
   * Compares stringified IDs so both populated `{ _id }` and raw ObjectId strings work.
   *
   * @param {object} group - Group document (manager may be populated or an id)
   * @returns {boolean}
   */
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

  /**
   * Permission helper: manager of the group OR site-wide admin may edit/delete/approve.
   *
   * @param {object} group
   * @returns {boolean}
   */
  const canManageGroup = useCallback(
    (group) => isManager(group) || user?.role === 'admin',
    [isManager, user]
  );

  /**
   * Permission helper: true if the current user appears in `group.members`.
   *
   * @param {object} group
   * @returns {boolean}
   */
  const isMember = useCallback(
    (group) => {
      if (!user) {
        return false;
      }

      return (group.members || []).some(
        (member) => (member._id || member).toString() === user._id.toString()
      );
    },
    [user]
  );

  /**
   * Permission helper: true if the user is waiting for approval on a private group.
   *
   * @param {object} group
   * @returns {boolean}
   */
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

  /**
   * For groups the user can manage, replace list stubs with full detail payloads
   * (includes `pendingMembers` needed for the approve UI). Non-managers keep the list row as-is.
   *
   * @param {object[]} groupsList - Groups from list/search endpoints
   * @returns {Promise<object[]>} Same length array, possibly enriched
   */
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

  /**
   * Filter helper for the "My Groups" tab: keep groups where the user is manager or member.
   * Used when the API returns a full list that must be narrowed client-side, or to scope search results.
   *
   * @param {object[]} groupsList
   * @returns {object[]}
   */
  const filterMyGroups = useCallback(
    (groupsList) => {
      if (!user) {
        return [];
      }

      return (groupsList || []).filter(
        (group) => isManager(group) || isMember(group)
      );
    },
    [user, isManager, isMember]
  );

  /**
   * Loads the non-search list for the active tab.
   * - `view === 'my'` and logged in → `GET /groups/my`
   * - otherwise → `GET /groups`, then optionally client-filter if still on "my"
   * Clears search mode after a successful load.
   */
  const fetchGroups = useCallback(async () => {
    try {
      setError('');
      setLoading(true);

      // All tab → /groups; My tab (when logged in) → dedicated /groups/my endpoint
      const endpoint = view === 'my' && user ? '/groups/my' : '/groups';
      const response = await api.get(endpoint);
      let groupsList = response.data || [];

      // Fallback: if somehow on "my" but hit the public list, filter client-side
      if (view === 'my' && endpoint === '/groups') {
        groupsList = filterMyGroups(groupsList);
      }

      const enrichedGroups = await enrichGroups(groupsList);
      setGroups(enrichedGroups);
      setIsSearchMode(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, [view, user, enrichGroups, filterMyGroups]);

  /**
   * Refetch when the All/My tab changes, but skip while search results are showing
   * (search mode is refreshed by handleViewChange instead).
   */
  useEffect(() => {
    if (isSearchMode) {
      return;
    }

    fetchGroups();
  }, [view, isSearchMode, fetchGroups]);

  /**
   * Section heading for the list: Search Results, My Groups, or All Groups.
   *
   * @returns {string}
   */
  const getListTitle = () => {
    if (isSearchMode) {
      return 'Search Results';
    }

    return view === 'my' ? 'My Groups' : 'All Groups';
  };

  /**
   * Empty-state copy depending on search mode vs All/My tab.
   *
   * @returns {string}
   */
  const getEmptyMessage = () => {
    if (isSearchMode) {
      return 'No groups matched your search.';
    }

    if (view === 'my') {
      return 'You are not a member or manager of any groups yet.';
    }

    return 'No groups found.';
  };

  /**
   * Human-readable membership label for a group card (Manager → Member → Pending → Not joined).
   *
   * @param {object} group
   * @returns {string}
   */
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

  /**
   * Normalize a pending member entry (populated user or raw id) to a string id for keys/API calls.
   *
   * @param {object|string} pendingUser
   * @returns {string}
   */
  const getPendingUserId = (pendingUser) => {
    return (pendingUser._id || pendingUser).toString();
  };

  /**
   * Replace one group in local state after a successful mutation (join, approve, update).
   *
   * @param {object} updatedGroup - Full or partial group returned by the API
   */
  const updateGroupInList = (updatedGroup) => {
    setGroups((prevGroups) =>
      prevGroups.map((group) =>
        group._id === updatedGroup._id ? updatedGroup : group
      )
    );
  };

  /**
   * Create-group form submit: `POST /groups`, then fetch detail and prepend to the list.
   *
   * @param {React.FormEvent} event
   */
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

  /**
   * Runs `GET /groups/search` with optional name, privacy, manager, and minMembers query params.
   * If the active (or next) view is "my", results are narrowed with filterMyGroups.
   * Sets `isSearchMode` so the normal list effect does not overwrite results.
   *
   * @param {'all' | 'my'} [activeView=view] - Tab to scope results against (used when switching tabs mid-search)
   * @returns {Promise<number>} Number of groups after filtering
   */
  const performGroupSearch = async (activeView = view) => {
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
    let results = response.data || [];

    // My tab + search: keep only groups the user manages or belongs to
    if (activeView === 'my') {
      results = filterMyGroups(results);
    }

    setGroups(results);
    setIsSearchMode(true);
    return results.length;
  };

  /**
   * Search form submit handler; requires login, then calls performGroupSearch.
   *
   * @param {React.FormEvent} event
   */
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
      const count = await performGroupSearch();
      setMessage(`Found ${count} group(s).`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to search groups');
    } finally {
      setSearching(false);
    }
  };

  /**
   * Clears search fields and reloads the normal All/My list via fetchGroups.
   */
  const handleClearSearch = () => {
    setSearchName('');
    setSearchPrivacy('all');
    setSearchManager('');
    setSearchMinMembers('');
    fetchGroups();
  };

  /**
   * All / My tab switcher.
   * If currently in search mode, re-runs the same search scoped to the new tab;
   * otherwise updates `view` so the fetchGroups effect loads the matching list.
   *
   * @param {'all' | 'my'} nextView
   */
  const handleViewChange = async (nextView) => {
    if (nextView === view) {
      return;
    }

    setView(nextView);

    // Stay in search mode: re-query and apply My filter if switching to My Groups
    if (isSearchMode && user) {
      setSearching(true);

      try {
        const count = await performGroupSearch(nextView);
        setMessage(`Found ${count} group(s).`);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to search groups');
      } finally {
        setSearching(false);
      }

      return;
    }

    if (!isSearchMode) {
      setLoading(true);
    }
  };

  /**
   * Enter inline edit mode for a group card (manager/admin only in the UI).
   *
   * @param {object} group
   */
  const startEdit = (group) => {
    setEditingGroupId(group._id);
    setEditName(group.name);
    setEditDescription(group.description || '');
    setEditIsPrivate(group.isPrivate);
    setError('');
    setMessage('');
  };

  /**
   * Exit inline edit mode and reset edit form fields.
   */
  const cancelEdit = () => {
    setEditingGroupId(null);
    setEditName('');
    setEditDescription('');
    setEditIsPrivate(false);
  };

  /**
   * Save group edits: `PATCH /groups/:id`, then optionally re-fetch detail for managers.
   *
   * @param {React.FormEvent} event
   * @param {string} groupId
   */
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

  /**
   * Delete a group after confirm: `DELETE /groups/:id` (cascades related posts on the server).
   *
   * @param {string} groupId
   */
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

  /**
   * Join flow: `POST /groups/:id/join`.
   * Public groups typically become members immediately; private groups move the user to pending.
   * Server message (`joinMessage`) is shown as-is; list row is refreshed/enriched afterward.
   *
   * @param {string} groupId
   */
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

  /**
   * Manager/admin action: approve a pending private-group request.
   * `POST /groups/:groupId/approve/:userId` returns the updated group for the list.
   *
   * @param {string} groupId
   * @param {string} userId - Pending member's id
   */
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

  /**
   * Renders one group card: view mode, inline edit form, join/request button, and pending approvals.
   *
   * @param {object} group
   * @returns {JSX.Element}
   */
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
              <h3>
                <GroupLink group={group} className="group-card-title" />
              </h3>
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
            <p className="group-manager-row">
              <strong>Manager:</strong>
            </p>
            <UserBadge user={group.manager} />
            <p>
              <strong>Members:</strong> {group.members?.length || 0}
            </p>
            <p className="group-status">
              <strong>Your status:</strong> {userStatus}
            </p>

            {/* Manager or site admin: edit / delete */}
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

            {/* Not a member and not pending: Join (public) or Request to Join (private) */}
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

            {/* Private-group queue: only visible to manager/admin after enrichGroups */}
            {user && canManageGroup(group) && pendingMembers.length > 0 && (
              <div className="manager-controls">
                <h4>Pending requests</h4>
                <div className="pending-members">
                  {pendingMembers.map((pendingUser) => {
                    const pendingUserId = getPendingUserId(pendingUser);

                    return (
                      <div key={pendingUserId} className="pending-member-row">
                        <UserBadge user={pendingUser} />
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
        <div className="groups-toolbar posts-toolbar">
          <h2>{getListTitle()}</h2>
          {/* All Groups vs My Groups — only shown when logged in */}
          {user && (
            <div className="posts-view-buttons">
              <button
                type="button"
                className={view === 'all' ? 'view-button active' : 'view-button'}
                onClick={() => handleViewChange('all')}
              >
                All Groups
              </button>
              <button
                type="button"
                className={view === 'my' ? 'view-button active' : 'view-button'}
                onClick={() => handleViewChange('my')}
              >
                My Groups
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p>Loading groups...</p>
        ) : groups.length === 0 ? (
          <p>{getEmptyMessage()}</p>
        ) : (
          <div className="groups-list">{groups.map(renderGroupCard)}</div>
        )}
      </section>
    </div>
  );
};

export default Groups;
