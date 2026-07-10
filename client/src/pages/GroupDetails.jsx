/**
 * @file GroupDetails.jsx
 * @description Single-group detail page: membership overview, in-group post creation, and filtered post list.
 *
 * Purpose:
 *   Route `/groups/:id` shows one group's metadata (name, privacy, manager, members) and the posts
 *   belonging to that group. Members, the manager, and site admins can create posts; anyone who can
 *   load the group can filter and view its posts (subject to server authorization).
 *
 * Responsibilities:
 *   - Load group by URL param (`GET /groups/:id`) after auth is ready
 *   - Load group posts (`GET /groups/:id/posts`) with optional filter query params
 *   - Create posts scoped to this group (`POST /posts` with `group: id`)
 *   - Edit/delete posts via PostCard callbacks (`PATCH` / `DELETE /posts/:id`)
 *   - Gate the create-post form with `canCreatePost` (manager, admin, or member)
 *
 * Data flow:
 *   useParams().id + AuthContext.user → load group → setGroup
 *   → second effect calls fetchGroupPosts (buildPostFilterParams) → posts state
 *   → PostFilterForm / create form / PostCard mutate or refresh posts
 *
 * Key concepts for defense:
 *   - Membership: create-post allowed for manager, admin, or listed member only
 *   - Filters: shared PostFilterForm + buildPostFilterParams (same helpers as the Feed page)
 *   - Create post always sends this route's `id` as the group; list refresh reuses current filters
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import UserBadge from '../components/UserBadge';
import PostCard from '../components/PostCard';
import PostFilterForm from '../components/PostFilterForm';
import { buildPostFilterParams, emptyPostFilters } from '../utils/postFilters';

/**
 * Group details page: one group header plus its posts (create, filter, edit, delete).
 *
 * @returns {JSX.Element}
 */
const GroupDetails = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  /** Shared filter shape from emptyPostFilters / PostFilterForm */
  const [filters, setFilters] = useState(emptyPostFilters);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [creating, setCreating] = useState(false);

  /**
   * Fetch posts for this group, converting UI filter state into API query params.
   * Uses `buildPostFilterParams` so Group Details and Feed share the same filter contract.
   *
   * @param {object} [activeFilters=emptyPostFilters] - Current or cleared filter values
   * @returns {Promise<number>} Number of posts returned
   */
  const fetchGroupPosts = useCallback(async (activeFilters = emptyPostFilters) => {
    const response = await api.get(`/groups/${id}/posts`, {
      params: buildPostFilterParams(activeFilters)
    });
    const postList = Array.isArray(response.data) ? response.data : [];
    setPosts(postList);
    return postList.length;
  }, [id]);

  /**
   * Load group details from the URL id once auth has finished and a user is present.
   * Resets `group` to null while loading so a previous group's UI does not flash.
   */
  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    const loadGroup = async () => {
      try {
        setError('');
        setLoadingGroup(true);
        setGroup(null);
        const response = await api.get(`/groups/${id}`);
        setGroup(response.data);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load group'));
        setGroup(null);
      } finally {
        setLoadingGroup(false);
      }
    };

    loadGroup();
  }, [user, authLoading, id]);

  /**
   * After the group document is available, load its posts (default empty filters).
   * Depends on `group` so posts only load when membership/access for this id succeeded.
   */
  useEffect(() => {
    if (authLoading || !user || !group) {
      return;
    }

    const loadPosts = async () => {
      try {
        setLoadingPosts(true);
        await fetchGroupPosts();
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load group posts'));
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadPosts();
  }, [user, authLoading, group, fetchGroupPosts]);

  /**
   * Apply PostFilterForm values: re-fetch with current `filters` and report match count.
   */
  const handleApplyFilters = async () => {
    setError('');
    setMessage('');
    setFiltering(true);

    try {
      const count = await fetchGroupPosts(filters);
      setMessage(`Found ${count} post(s).`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to filter posts'));
    } finally {
      setFiltering(false);
    }
  };

  /**
   * Reset filters to emptyPostFilters and reload the unfiltered group post list.
   */
  const handleClearFilters = async () => {
    const clearedFilters = { ...emptyPostFilters };
    setFilters(clearedFilters);
    setError('');
    setMessage('');

    try {
      setLoadingPosts(true);
      await fetchGroupPosts(clearedFilters);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load group posts'));
    } finally {
      setLoadingPosts(false);
    }
  };

  /**
   * Begin editing a post inside PostCard (populate edit fields from the post).
   *
   * @param {object} post
   */
  const startEdit = (post) => {
    setEditingPostId(post._id);
    setEditContent(post.content || '');
    setEditImageUrl(post.imageUrl || '');
    setEditVideoUrl(post.videoUrl || '');
    setError('');
    setMessage('');
  };

  /**
   * Cancel inline post edit and clear edit field state.
   */
  const cancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
    setEditImageUrl('');
    setEditVideoUrl('');
  };

  /**
   * Persist post edits: `PATCH /posts/:postId`, then replace that item in local `posts`.
   *
   * @param {React.FormEvent} event
   * @param {string} postId
   */
  const handleUpdatePost = async (event, postId) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSavingEdit(true);

    try {
      const response = await api.patch(`/posts/${postId}`, {
        content: editContent.trim(),
        imageUrl: editImageUrl.trim(),
        videoUrl: editVideoUrl.trim()
      });

      setPosts((prevPosts) =>
        prevPosts.map((post) => (post._id === postId ? response.data : post))
      );
      cancelEdit();
      setMessage('Post updated successfully.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to update post'));
    } finally {
      setSavingEdit(false);
    }
  };

  /**
   * Delete a post after confirm: `DELETE /posts/:postId` and remove from local list.
   *
   * @param {string} postId
   */
  const handleDeletePost = async (postId) => {
    const confirmed = window.confirm('Are you sure you want to delete this post?');

    if (!confirmed) {
      return;
    }

    setError('');
    setMessage('');
    setDeletingId(postId);

    try {
      const response = await api.delete(`/posts/${postId}`);
      setPosts((prevPosts) => prevPosts.filter((post) => post._id !== postId));
      setMessage(response.data.message);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to delete post'));
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * Callback for PostCard side-effects (e.g. like/comment updates) that return a full post.
   *
   * @param {object} updatedPost
   */
  const handlePostUpdated = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post
      )
    );
  };

  /**
   * Permission helper: who may create a post in this group.
   * Allowed if the user is the group manager, a site admin, or listed in `group.members`.
   *
   * @returns {boolean}
   */
  const canCreatePost = () => {
    if (!user || !group) {
      return false;
    }

    const userId = user._id.toString();
    const managerId = (group.manager?._id || group.manager)?.toString();

    // Manager or admin always may post
    if (managerId === userId || user.role === 'admin') {
      return true;
    }

    // Regular members of this group may post
    return (group.members || []).some(
      (member) => (member._id || member).toString() === userId
    );
  };

  /**
   * Create a post in this group (`POST /posts` with `group: id`), then refresh the list
   * using the currently applied filters so the new post appears if it matches.
   *
   * @param {React.FormEvent} event
   */
  const handleCreatePost = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      // Always bind the new post to the group from the route param
      await api.post('/posts', {
        group: id,
        content: content.trim(),
        imageUrl: imageUrl.trim(),
        videoUrl: videoUrl.trim()
      });

      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setMessage('Post created successfully.');

      try {
        setLoadingPosts(true);
        await fetchGroupPosts(filters);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Post created but failed to refresh the list'));
      } finally {
        setLoadingPosts(false);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create post'));
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page">
        <h1>Group Details</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (loadingGroup) {
    return (
      <div className="page">
        <h1>Group Details</h1>
        <p>Loading group...</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="page">
        <h1>Group Details</h1>
        <p className="error-message">{error || 'Not found.'}</p>
        <Link to="/groups">Back to Groups</Link>
      </div>
    );
  }

  const members = group.members || [];

  return (
    <div className="page">
      <h1>Group Details</h1>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      {/* Membership / metadata panel */}
      <section className="group-details-card">
        <div className="group-details-header">
          <h2>{group.name || 'Unnamed group'}</h2>
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

        <p>
          <strong>Description:</strong> {group.description || 'No description'}
        </p>
        <p>
          <strong>Members:</strong> {members.length}
        </p>
        <p>
          <strong>Created:</strong>{' '}
          {group.createdAt
            ? new Date(group.createdAt).toLocaleDateString()
            : 'Unknown'}
        </p>

        <div className="group-details-manager">
          <strong>Manager:</strong>
          <UserBadge user={group.manager} />
        </div>

        {members.length > 0 && (
          <div className="group-details-members">
            <strong>Members:</strong>
            <div className="group-members-list">
              {members.map((member) => (
                <UserBadge
                  key={member?._id || member}
                  user={member}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="posts-section">
        <h2>Group Posts</h2>

        {/* Create form only if canCreatePost (manager / admin / member) */}
        {canCreatePost() && (
          <div className="group-create-post-card">
            <h3>Create Post in this Group</h3>
            <form className="group-create-post-form" onSubmit={handleCreatePost}>
              <label>
                Content
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows="4"
                  placeholder="Write your post..."
                  required
                />
              </label>

              <label>
                Image URL (optional)
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
              </label>

              <label>
                Video URL (optional)
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://example.com/video.mp4"
                />
              </label>

              <button type="submit" disabled={creating}>
                {creating ? 'Posting...' : 'Create Post'}
              </button>
            </form>
          </div>
        )}

        {/* Shared filter UI; params built via buildPostFilterParams in fetchGroupPosts */}
        <PostFilterForm
          filters={filters}
          onChange={setFilters}
          onSubmit={handleApplyFilters}
          onClear={handleClearFilters}
          submitting={filtering}
        />

        {loadingPosts ? (
          <p>Loading posts...</p>
        ) : posts.length === 0 ? (
          <p>No posts found in this group.</p>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={user}
                editingPostId={editingPostId}
                editContent={editContent}
                editImageUrl={editImageUrl}
                editVideoUrl={editVideoUrl}
                savingEdit={savingEdit}
                deletingId={deletingId}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onUpdatePost={handleUpdatePost}
                onDeletePost={handleDeletePost}
                onPostUpdated={handlePostUpdated}
                onEditContentChange={setEditContent}
                onEditImageUrlChange={setEditImageUrl}
                onEditVideoUrlChange={setEditVideoUrl}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default GroupDetails;
