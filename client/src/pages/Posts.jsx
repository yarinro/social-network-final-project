import { useCallback, useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import UserBadge from '../components/UserBadge';

const Posts = () => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [memberGroups, setMemberGroups] = useState([]);
  const [view, setView] = useState('feed');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [groupId, setGroupId] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editVideoUrl, setEditVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const fetchPosts = useCallback(async () => {
    const endpoint = view === 'my' ? '/posts/my' : '/posts/feed';
    const response = await api.get(endpoint);
    setPosts(response.data);
  }, [view]);

  const loadMemberGroups = useCallback(async () => {
    const groupsResponse = await api.get('/groups');
    const groups = groupsResponse.data.filter((group) =>
      group.members.some(
        (member) => (member._id || member).toString() === user._id.toString()
      )
    );

    setMemberGroups(groups);
    setGroupId((current) => current || (groups.length > 0 ? groups[0]._id : ''));
  }, [user]);

  useEffect(() => {
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
        setError(err.response?.data?.message || 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [user, fetchPosts, loadMemberGroups]);

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
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  const isOwnPost = (post) => {
    const authorId = post.author._id || post.author;
    return authorId.toString() === user._id.toString();
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
      setError(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSavingEdit(false);
    }
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
      setError(err.response?.data?.message || 'Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  const getGroupName = (group) => {
    if (!group) {
      return 'Unknown group';
    }

    return group.name || 'Unknown group';
  };

  const renderPostMedia = (post) => (
    <>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post" className="post-image" />
      )}

      {post.videoUrl && (
        <video src={post.videoUrl} controls className="post-video">
          Your browser does not support the video tag.
        </video>
      )}
    </>
  );

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

        {loading ? (
          <p>Loading posts...</p>
        ) : posts.length === 0 ? (
          <p>{view === 'my' ? 'You have not created any posts yet.' : 'No posts yet.'}</p>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <article key={post._id} className="post-card">
                <div className="post-author">
                  <UserBadge user={post.author} />
                </div>
                <p className="post-meta">
                  Group: {getGroupName(post.group)} |{' '}
                  {new Date(post.createdAt).toLocaleString()}
                </p>

                {editingPostId === post._id ? (
                  <form
                    className="post-edit-form"
                    onSubmit={(event) => handleUpdatePost(event, post._id)}
                  >
                    <label>
                      Content
                      <textarea
                        value={editContent}
                        onChange={(event) => setEditContent(event.target.value)}
                        rows="4"
                        required
                      />
                    </label>

                    <label>
                      Image URL
                      <input
                        type="url"
                        value={editImageUrl}
                        onChange={(event) => setEditImageUrl(event.target.value)}
                      />
                    </label>

                    <label>
                      Video URL
                      <input
                        type="url"
                        value={editVideoUrl}
                        onChange={(event) => setEditVideoUrl(event.target.value)}
                      />
                    </label>

                    <div className="post-actions">
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
                    <p className="post-content">{post.content}</p>
                    {renderPostMedia(post)}

                    {isOwnPost(post) && (
                      <div className="post-actions">
                        <button
                          type="button"
                          className="edit-post-button"
                          onClick={() => startEdit(post)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="delete-post-button"
                          onClick={() => handleDeletePost(post._id)}
                          disabled={deletingId === post._id}
                        >
                          {deletingId === post._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Posts;
