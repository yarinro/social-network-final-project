/**
 * @file PostCard.jsx
 * @description Presentational card for a single social-network post in the feed or group views.
 *
 * Purpose:
 * Renders one post's author, group, timestamp, content, optional media, like controls,
 * and permission-gated edit/delete actions. When the parent marks this post as being
 * edited, the card switches to an inline edit form whose field values and submit handlers
 * are owned by the parent page.
 *
 * Responsibilities:
 * - Derive like state (count, whether the current user liked) from `post.likes`
 * - Decide edit/delete visibility from ownership, group-manager, and admin role checks
 * - Toggle likes via PATCH `/posts/:id/like` and push the updated post to the parent
 * - Render image/video URLs with graceful failure handling (hide broken images; swap
 *   failed videos for an error message)
 * - Keep local UI state for like-in-flight, like errors, and video load failures
 *
 * Data flow:
 * Props in: `post`, `currentUser`, edit-form values/flags, and parent callbacks
 * (`onStartEdit`, `onCancelEdit`, `onUpdatePost`, `onDeletePost`, `onPostUpdated`,
 * field change handlers). Local state: `liking`, `likeError`, `videoError`.
 * Outbound: like API response via `onPostUpdated`; edit/delete delegated to parent.
 *
 * React concepts demonstrated:
 * Controlled edit form (parent-owned state), conditional rendering, optional chaining
 * for callbacks (`onPostUpdated?.`), `useEffect` to reset media error when the video URL
 * changes, and permission helpers that normalize populated vs raw MongoDB ObjectId refs.
 */

import { useEffect, useState } from 'react';
import api from '../api/api';
import { getApiErrorMessage } from '../utils/apiError';
import UserBadge from './UserBadge';
import GroupLink from './GroupLink';

/**
 * Single-post card with like, media, and permission-aware actions.
 *
 * @param {Object} props
 * @param {Object} props.post - Post document (may include populated author/group/likes)
 * @param {Object} props.currentUser - Authenticated user used for like/permission checks
 * @param {string|null} props.editingPostId - Id of the post currently in edit mode (parent)
 * @param {string} props.editContent - Controlled edit textarea value (parent)
 * @param {string} props.editImageUrl - Controlled edit image URL (parent)
 * @param {string} props.editVideoUrl - Controlled edit video URL (parent)
 * @param {boolean} props.savingEdit - Whether the parent is saving an edit
 * @param {string|null} props.deletingId - Id of a post currently being deleted
 * @param {Function} props.onStartEdit - Begin editing this post
 * @param {Function} props.onCancelEdit - Cancel the inline edit form
 * @param {Function} props.onUpdatePost - Submit edit form `(event, postId)`
 * @param {Function} props.onDeletePost - Delete by post id
 * @param {Function} [props.onPostUpdated] - Receive updated post after like toggle
 * @param {Function} props.onEditContentChange - Update edit content in parent
 * @param {Function} props.onEditImageUrlChange - Update edit image URL in parent
 * @param {Function} props.onEditVideoUrlChange - Update edit video URL in parent
 * @returns {JSX.Element|null}
 */
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
  onPostUpdated,
  onEditContentChange,
  onEditImageUrlChange,
  onEditVideoUrlChange
}) => {
  const [liking, setLiking] = useState(false);
  const [likeError, setLikeError] = useState('');
  const [videoError, setVideoError] = useState(false);

  /**
   * When the post's video URL changes (e.g. after an edit), clear a previous load failure
   * so the player can try the new source instead of staying on the error UI.
   */
  useEffect(() => {
    setVideoError(false);
  }, [post?.videoUrl]);

  if (!post || !currentUser?._id) {
    return null;
  }

  const likes = post.likes || [];
  const likeCount = likes.length;
  // likes may be ObjectIds or populated user objects — normalize before comparing
  const isLiked = likes.some(
    (likeId) => (likeId._id || likeId).toString() === currentUser._id.toString()
  );

  /**
   * Whether the signed-in user authored this post.
   * Author may be a populated object or a raw id string depending on the API populate path.
   *
   * @returns {boolean}
   */
  const isOwnPost = () => {
    const authorId = post.author?._id || post.author;

    if (!authorId) {
      return false;
    }

    return authorId.toString() === currentUser._id.toString();
  };

  /**
   * Whether the signed-in user manages the group this post belongs to.
   * Group managers can delete posts in their group even if they did not author them.
   *
   * @returns {boolean}
   */
  const isGroupManager = () => {
    const managerId = post.group?.manager?._id || post.group?.manager;

    if (!managerId) {
      return false;
    }

    return managerId.toString() === currentUser._id.toString();
  };

  /**
   * Delete is allowed for the author, the group's manager, or a site admin.
   *
   * @returns {boolean}
   */
  const canDeletePost = () => {
    return (
      isOwnPost() || isGroupManager() || currentUser.role === 'admin'
    );
  };

  // Show the actions row if the user can edit (own post) and/or delete
  const showPostActions = isOwnPost() || canDeletePost();

  /**
   * Toggle the current user's like on this post, then notify the parent with the
   * updated post document so the feed stays in sync without a full refetch.
   *
   * @returns {Promise<void>}
   */
  const handleToggleLike = async () => {
    setLikeError('');
    setLiking(true);

    try {
      const response = await api.patch(`/posts/${post._id}/like`);
      onPostUpdated?.(response.data);
    } catch (err) {
      setLikeError(getApiErrorMessage(err, 'Failed to update like'));
    } finally {
      setLiking(false);
    }
  };

  /**
   * Renders optional image and video attached to the post.
   * Broken images are hidden via `onError`; failed videos flip `videoError` so a
   * fallback message is shown instead of a blank player.
   *
   * @returns {JSX.Element}
   */
  const renderPostMedia = () => (
    <>
      {/* Optional image/video URLs stored on the post */}
      {post.imageUrl?.trim() && (
        <img
          src={post.imageUrl}
          alt="Post"
          className="post-image"
          onError={(event) => {
            // Hide broken remote images without unmounting the rest of the card
            event.currentTarget.style.display = 'none';
          }}
        />
      )}

      {post.videoUrl?.trim() &&
        (videoError ? (
          <div className="post-video-error">
            <p>The video could not be loaded.</p>
            {/* Expose the failing URL only in development to aid debugging */}
            {process.env.NODE_ENV === 'development' && (
              <p className="post-video-error-url">{post.videoUrl}</p>
            )}
          </div>
        ) : (
          <video
            controls
            preload="metadata"
            className="post-video"
            onError={() => setVideoError(true)}
          >
            <source src={post.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ))}
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

          <div className="post-like-row">
            <button
              type="button"
              className={isLiked ? 'like-button liked' : 'like-button'}
              onClick={handleToggleLike}
              disabled={liking}
            >
              {liking ? 'Updating...' : isLiked ? 'Unlike' : 'Like'}
            </button>
            <span className="like-count">
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </span>
          </div>

          {likeError && <p className="error-message post-like-error">{likeError}</p>}

          {showPostActions && (
            <div className="post-actions">
              {/* Only the author may edit; managers/admins may delete without editing */}
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
