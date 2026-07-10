/**
 * @file Posts.jsx
 * @description Main feed / "My Posts" page for creating and browsing posts across groups.
 *
 * Purpose:
 *   Authenticated users create posts into a group they belong to, browse a filterable feed of
 *   posts from their groups (`GET /posts/feed`), or switch to only their own posts (`GET /posts/my`).
 *
 * Responsibilities:
 *   - Dual view: Feed (filterable) vs My Posts (author's posts, no filter form)
 *   - Load member groups for the create-post group dropdown
 *   - Create posts (`POST /posts`); prepend to feed list when on the Feed tab
 *   - Apply/clear filters via PostFilterForm + buildPostFilterParams (includeGroup on feed)
 *   - Edit/delete posts and sync PostCard updates into local state
 *
 * Data flow:
 *   AuthContext.user → useEffect loads fetchPosts + loadMemberGroups in parallel
 *   → view ('feed' | 'my') selects endpoint inside fetchPosts
 *   → filters → buildPostFilterParams(..., { includeGroup: true }) on feed only
 *   → posts / memberGroups state drive the list and create form
 *
 * Key concepts for defense:
 *   - Feed vs My: `view` toggles endpoint; filters UI and handlers are feed-only
 *   - PostFilterForm: controlled filters state; Apply/Clear call fetchPosts with params
 *   - buildPostFilterParams: shared util turns filter object into axios query params
 */

import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import PostCard from '../components/PostCard';
import PostFilterForm from '../components/PostFilterForm';
import { buildPostFilterParams, emptyPostFilters } from '../utils/postFilters';

/**
 * Posts (Feed) page: create posts, switch Feed / My Posts, filter the feed, edit/delete.
 *
 * @returns {JSX.Element}
 */
const Posts = () => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  /** Groups where the current user is a member — options for the create-post select */
  const [memberGroups, setMemberGroups] = useState([]);
  /** @type {'feed' | 'my'} Feed = filtered group feed; my = author's posts only */
  const [view, setView] = useState('feed');
  const [filters, setFilters] = useState(emptyPostFilters);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [groupId, setGroupId] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  /**
   * Load posts for the active tab.
   * - `view === 'my'` → `GET /posts/my` (no filter params)
   * - otherwise → `GET /posts/feed` with `buildPostFilterParams(activeFilters, { includeGroup: true })`
   *   so the feed can filter by group name as well as content/author/date fields.
   *
   * @param {object} [activeFilters=emptyPostFilters]
   * @returns {Promise<number>} Count of posts set into state
   */
  const fetchPosts = useCallback(
    async (activeFilters = emptyPostFilters) => {
      // My Posts tab: author-scoped list, filters are not applied
      if (view === 'my') {
        const response = await api.get('/posts/my');
        const postList = Array.isArray(response.data) ? response.data : [];
        setPosts(postList);
        return postList.length;
      }

      // Feed tab: server-side filters via shared buildPostFilterParams helper
      const response = await api.get('/posts/feed', {
        params: buildPostFilterParams(activeFilters, { includeGroup: true })
      });
      const postList = Array.isArray(response.data) ? response.data : [];
      setPosts(postList);
      return postList.length;
    },
    [view]
  );

  /**
   * Load all groups, keep those where the user is a member, and default `groupId`
   * for the create form if none is selected yet.
   */
  const loadMemberGroups = useCallback(async () => {
    const groupsResponse = await api.get('/groups');
    const groups = (groupsResponse.data || []).filter((group) =>
      (group.members || []).some(
        (member) => (member._id || member).toString() === user._id.toString()
      )
    );

    setMemberGroups(groups);
    setGroupId((current) => current || (groups.length > 0 ? groups[0]._id : ''));
  }, [user]);

  /**
   * Load feed or my posts when the page opens or the tab changes.
   * Also refreshes member groups for the create-post dropdown.
   */
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      return;
    }

    const loadPageData = async () => {
      try {
        setError('');
        setLoading(true);
        await Promise.all([fetchPosts(), loadMemberGroups()]);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to load posts'));
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [user, authLoading, view, fetchPosts, loadMemberGroups]);

  /**
   * Create-post submit: `POST /posts` with selected group.
   * On the Feed tab, the new post is prepended locally; My Posts relies on a later refetch via tab change.
   *
   * @param {React.FormEvent} event
   */
  const handleCreatePost = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      const response = await api.post('/posts', {
        group: groupId,
        content: content.trim(),
        imageUrl: imageUrl.trim(),
        videoUrl: videoUrl.trim()
      });

      // Optimistic list update only on Feed (new post belongs in the group feed)
      if (view === 'feed') {
        setPosts((prevPosts) => [response.data, ...prevPosts]);
      }

      setContent('');
      setImageUrl('');
      setVideoUrl('');
      setMessage('Post created successfully.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to create post'));
    } finally {
      setCreating(false);
    }
  };

  /**
   * Apply PostFilterForm filters — only meaningful on the Feed tab.
   * Calls fetchPosts(filters) so buildPostFilterParams runs with current form values.
   */
  const handleApplyFilters = async () => {
    if (view !== 'feed') {
      return;
    }

    setError('');
    setMessage('');
    setFiltering(true);

    try {
      const count = await fetchPosts(filters);
      setMessage(`Found ${count} post(s).`);
    } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to filter posts'));
    } finally {
      setFiltering(false);
    }
  };

  /**
   * Clear filter fields and reload the unfiltered feed (no-op on My Posts beyond resetting state).
   */
  const handleClearFilters = async () => {
    const clearedFilters = { ...emptyPostFilters };
    setFilters(clearedFilters);
    setError('');
    setMessage('');

    if (view !== 'feed') {
      return;
    }

    try {
      setLoading(true);
      const count = await fetchPosts(clearedFilters);
      setMessage(`Found ${count} post(s).`);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load posts'));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enter PostCard edit mode for a post.
   *
   * @param {object} post
   */
  const startEdit = (post) => {
    setEditingPostId(post._id);
    setEditContent(post.content);
    setEditImageUrl(post.imageUrl || '');
    setEditVideoUrl(post.videoUrl || '');
    setError('');
    setMessage('');
  };

  /**
   * Exit PostCard edit mode and clear edit fields.
   */
  const cancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
    setEditImageUrl('');
    setEditVideoUrl('');
  };

  /**
   * Save post edits via `PATCH /posts/:postId` and replace the item in `posts`.
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
   * Sync a post updated inside PostCard (likes, comments, etc.) into local state.
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
   * Delete a post after confirm and remove it from the list.
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

  if (authLoading) {
    return (
      <div className="page">
        <h1>Feed</h1>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page">
        <h1>Feed</h1>
        <p>Please login to view and create posts.</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Feed</h1>

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <section className="posts-section">
        <h2>Create Post</h2>

        {memberGroups.length === 0 ? (
          <p>Join a group before creating posts.</p>
        ) : (
          <form className="post-form" onSubmit={handleCreatePost}>
            <label>
              Group
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                required
              >
                {memberGroups.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Content
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows="4"
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
        )}
      </section>

      <section className="posts-section">
        <div className="posts-toolbar">
          <h2>{view === 'my' ? 'My Posts' : 'Feed'}</h2>
          {/* Feed vs My Posts — changing view re-runs the load effect via fetchPosts deps */}
          <div className="posts-view-buttons">
            <button
              type="button"
              className={view === 'feed' ? 'view-button active' : 'view-button'}
              onClick={() => setView('feed')}
            >
              Feed
            </button>
            <button
              type="button"
              className={view === 'my' ? 'view-button active' : 'view-button'}
              onClick={() => setView('my')}
            >
              My Posts
            </button>
          </div>
        </div>

        {/* Filters only on Feed; My Posts uses /posts/my without query params */}
        {view === 'feed' && (
          <PostFilterForm
            filters={filters}
            onChange={setFilters}
            onSubmit={handleApplyFilters}
            onClear={handleClearFilters}
            showGroupField
            submitting={filtering}
          />
        )}

        {loading ? (
          <p>Loading posts...</p>
        ) : posts.length === 0 ? (
          <p>
            {view === 'my'
              ? 'You have not created any posts yet.'
              : 'No posts match your filters.'}
          </p>
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

export default Posts;
