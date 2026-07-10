/**
 * @file UserBadge.jsx
 * @description Compact clickable identity chip linking to a user's public profile page.
 *
 * Purpose:
 * Display a user's avatar (or letter fallback) and display name as a React Router `Link`
 * to `/users/:id`. Used in posts, the navbar, and other places that need a consistent
 * user affordance without duplicating profile-link markup.
 *
 * Responsibilities:
 * - Normalize user id whether `user` is a populated object or a raw id
 * - Choose a readable display name (`fullName` → `username` → "Unknown")
 * - Show profile image when available; on image error, reveal the initial fallback span
 * - Render a non-link "Unknown user" placeholder when data is missing
 *
 * Data flow:
 * Props in: `user` (object or id), optional `className`. No local state or API calls —
 * purely presentational. Navigation is client-side via `react-router-dom` `Link`.
 *
 * React concepts demonstrated:
 * Small presentational component with helper functions, conditional rendering for
 * missing data, and DOM-level `onError` fallback for broken remote avatar URLs without
 * React state (toggle visibility on the sibling fallback element).
 */

import { Link } from 'react-router-dom';

/**
 * Extracts a usable user id from either a populated user object or a raw id value.
 *
 * @param {Object|string|null|undefined} user
 * @returns {string|null}
 */
const getUserId = (user) => {
  if (!user) {
    return null;
  }

  return user._id || user;
};

/**
 * Prefers full name, then username, for the visible label next to the avatar.
 *
 * @param {Object|null|undefined} user
 * @returns {string}
 */
const getDisplayName = (user) => {
  if (!user) {
    return 'Unknown';
  }

  return user.fullName || user.username || 'Unknown';
};

/**
 * First character of username/fullName for the circular letter avatar fallback.
 *
 * @param {Object|null|undefined} user
 * @returns {string}
 */
const getInitial = (user) => {
  const name = user?.username || user?.fullName || '?';
  return name.charAt(0).toUpperCase();
};

/**
 * Avatar + name link to the user's profile, or a static placeholder if id is missing.
 *
 * @param {Object} props
 * @param {Object|string|null|undefined} props.user - User document or id
 * @param {string} [props.className=''] - Extra CSS classes merged onto the root element
 * @returns {JSX.Element}
 */
const UserBadge = ({ user, className = '' }) => {
  const userId = getUserId(user);

  if (!user || !userId) {
    return <span className={`user-badge user-badge-missing ${className}`.trim()}>Unknown user</span>;
  }

  return (
    <Link to={`/users/${userId}`} className={`user-badge ${className}`.trim()}>
      {user.profileImageUrl?.trim() ? (
        <img
          src={user.profileImageUrl}
          alt={`${getDisplayName(user)} avatar`}
          className="user-badge-avatar"
          onError={(event) => {
            // Broken URL: hide the <img> and show the sibling letter fallback
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget.nextElementSibling;
            if (fallback) {
              fallback.style.display = 'inline-flex';
            }
          }}
        />
      ) : null}
      {/* Hidden when a profile image is present; shown if image fails or is absent */}
      <span
        className="user-badge-avatar user-badge-fallback"
        style={user.profileImageUrl?.trim() ? { display: 'none' } : undefined}
      >
        {getInitial(user)}
      </span>
      <span className="user-badge-name">{getDisplayName(user)}</span>
    </Link>
  );
};

export default UserBadge;
