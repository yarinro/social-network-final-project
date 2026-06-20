import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiError';
import UserBadge from '../components/UserBadge';
import PostCard from '../components/PostCard';
import PostFilterForm from '../components/PostFilterForm';
import { buildPostFilterParams, emptyPostFilters } from '../utils/postFilters';

const GroupDetails = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
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

  const fetchGroupPosts = useCallback(async (activeFilters = emptyPostFilters) => {
    const response = await api.get(`/groups/${id}/posts`, {
      params: buildPostFilterParams(activeFilters)
    });
    const postList = Array.isArray(response.data) ? response.data : [];
    setPosts(postList);
    return postList.length;
  }, [id]);

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

  const startEdit = (post) => {
    setEditingPostId(post._id);
    setEditContent(post.content || '');
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
