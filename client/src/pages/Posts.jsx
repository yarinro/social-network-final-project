import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import PostCard from '../components/PostCard';
import PostFilterForm from '../components/PostFilterForm';
import { buildPostFilterParams, emptyPostFilters } from '../utils/postFilters';

const Posts = () => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [memberGroups, setMemberGroups] = useState([]);
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

  const fetchPosts = useCallback(
    async (activeFilters = emptyPostFilters) => {
      if (view === 'my') {
        const response = await api.get('/posts/my');
        const postList = Array.isArray(response.data) ? response.data : [];
        setPosts(postList);
        return postList.length;
      }

      const response = await api.get('/posts/feed', {
        params: buildPostFilterParams(activeFilters, { includeGroup: true })
      });
      const postList = Array.isArray(response.data) ? response.data : [];
      setPosts(postList);
      return postList.length;
    },
    [view]
  );

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

  // Load feed or my posts when the page opens or the tab changes
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

  const startEdit = (post) => {
    setEditingPostId(post._id);
    setEditContent(post.content);
    setEditImageUrl(post.imageUrl || '');
    setEditVideoUrl(post.videoUrl || '');
    setError('');
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingPostId(null);
    setEditContent('');
    setEditImageUrl('');
    setEditVideoUrl('');
  };

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

  const handlePostUpdated = (updatedPost) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) =>
        post._id === updatedPost._id ? updatedPost : post
      )
    );
  };

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
