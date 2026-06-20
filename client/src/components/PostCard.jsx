import UserBadge from './UserBadge';
import GroupLink from './GroupLink';

const PostCard = ({
  post,
  currentUser,
  editingPostId,
  editContent,
  editImageUrl,
  editVideoUrl,
  savingEdit,
  deletingId,
  onStartEdit,
  onCancelEdit,
  onUpdatePost,
  onDeletePost,
  onEditContentChange,
  onEditImageUrlChange,
  onEditVideoUrlChange
}) => {
  if (!post || !currentUser?._id) {
    return null;
  }

  const isOwnPost = () => {
    const authorId = post.author?._id || post.author;

    if (!authorId) {
      return false;
    }

    return authorId.toString() === currentUser._id.toString();
  };

  const isGroupManager = () => {
    const managerId = post.group?.manager?._id || post.group?.manager;

    if (!managerId) {
      return false;
    }

    return managerId.toString() === currentUser._id.toString();
  };

  const canDeletePost = () => {
    return (
      isOwnPost() || isGroupManager() || currentUser.role === 'admin'
    );
  };

  const showPostActions = isOwnPost() || canDeletePost();

  const renderPostMedia = () => (
    <>
      {post.imageUrl?.trim() && (
        <img
          src={post.imageUrl}
          alt="Post"
          className="post-image"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      )}

      {post.videoUrl?.trim() && (
        <video src={post.videoUrl} controls className="post-video">
          Your browser does not support the video tag.
        </video>
      )}
    </>
  );

  return (
    <article className="post-card">
      <div className="post-author">
        <UserBadge user={post.author} />
      </div>
      <p className="post-meta">
        Group: <GroupLink group={post.group} /> |{' '}
        {post.createdAt
          ? new Date(post.createdAt).toLocaleString()
          : 'Unknown date'}
      </p>

      {editingPostId === post._id ? (
        <form
          className="post-edit-form"
          onSubmit={(event) => onUpdatePost(event, post._id)}
        >
          <label>
            Content
            <textarea
              value={editContent}
              onChange={(event) => onEditContentChange(event.target.value)}
              rows="4"
              required
            />
          </label>

          <label>
            Image URL
            <input
              type="url"
              value={editImageUrl}
              onChange={(event) => onEditImageUrlChange(event.target.value)}
            />
          </label>

          <label>
            Video URL
            <input
              type="url"
              value={editVideoUrl}
              onChange={(event) => onEditVideoUrlChange(event.target.value)}
            />
          </label>

          <div className="post-actions">
            <button type="submit" disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={onCancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="post-content">{post.content || ''}</p>
          {renderPostMedia()}

          {showPostActions && (
            <div className="post-actions">
              {isOwnPost() && (
                <button
                  type="button"
                  className="edit-post-button"
                  onClick={() => onStartEdit(post)}
                >
                  Edit
                </button>
              )}
              {canDeletePost() && (
                <button
                  type="button"
                  className="delete-post-button"
                  onClick={() => onDeletePost(post._id)}
                  disabled={deletingId === post._id}
                >
                  {deletingId === post._id ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
};

export default PostCard;
