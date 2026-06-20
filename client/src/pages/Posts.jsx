import { useEffect, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Posts = () => {
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [memberGroups, setMemberGroups] = useState([]);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadPageData = async () => {
      try {
        setError('');
        setLoading(true);

        const [postsResponse, groupsResponse] = await Promise.all([
          api.get('/posts'),
          api.get('/groups')
        ]);

        setPosts(postsResponse.data);

        const groups = groupsResponse.data.filter((group) =>
          group.members.some(
            (member) => (member._id || member).toString() === user._id.toString()
          )
        );

        setMemberGroups(groups);

        if (groups.length > 0) {
          setGroupId(groups[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load feed');
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [user]);

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

      setPosts((prevPosts) => [response.data, ...prevPosts]);
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

  const getAuthorName = (author) => {
    if (!author) {
      return 'Unknown';
    }

    return author.fullName || author.username || 'Unknown';
  };

  const getGroupName = (group) => {
    if (!group) {
      return 'Unknown group';
    }

    return group.name || 'Unknown group';
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
        <h2>Posts</h2>

        {loading ? (
          <p>Loading posts...</p>
        ) : posts.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <article key={post._id} className="post-card">
                <p className="post-author">{getAuthorName(post.author)}</p>
                <p className="post-meta">
                  Group: {getGroupName(post.group)} |{' '}
                  {new Date(post.createdAt).toLocaleString()}
                </p>
                <p className="post-content">{post.content}</p>

                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="post-image"
                  />
                )}

                {post.videoUrl && (
                  <video
                    src={post.videoUrl}
                    controls
                    className="post-video"
                  >
                    Your browser does not support the video tag.
                  </video>
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
