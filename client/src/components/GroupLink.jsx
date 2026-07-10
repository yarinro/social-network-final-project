/**
 * @file GroupLink.jsx
 * @description Small presentational link to a group's detail page by id.
 *
 * Purpose:
 * Render a group's name as a React Router `Link` to `/groups/:id`, or a plain
 * "Unknown group" span when the group reference is missing. Keeps group navigation
 * consistent wherever posts or lists mention a group.
 *
 * Responsibilities:
 * - Normalize group id from a populated object or a raw id string
 * - Show `group.name` when available
 * - Avoid linking when id cannot be resolved
 *
 * Data flow:
 * Props in: `group`, optional `className`. No state or API — presentational only.
 *
 * React concepts demonstrated:
 * Defensive helpers for MongoDB populate vs id-only refs, and conditional rendering
 * of `Link` vs static text for incomplete data.
 */

import { Link } from 'react-router-dom';

/**
 * Resolves a group id whether `group` is populated (`{ _id, name }`) or a raw id.
 *
 * @param {Object|string|null|undefined} group
 * @returns {string|null}
 */
const getGroupId = (group) => {
  if (!group) {
    return null;
  }

  return group._id || group;
};

/**
 * Clickable group name linking to the group page, or a placeholder if data is missing.
 *
 * @param {Object} props
 * @param {Object|string|null|undefined} props.group - Group document or id
 * @param {string} [props.className=''] - Extra CSS classes on the link/span
 * @returns {JSX.Element}
 */
const GroupLink = ({ group, className = '' }) => {
  const groupId = getGroupId(group);

  if (!group || !groupId) {
    return <span className={className}>Unknown group</span>;
  }

  return (
    <Link to={`/groups/${groupId}`} className={`group-link ${className}`.trim()}>
      {group.name || 'Unknown group'}
    </Link>
  );
};

export default GroupLink;
