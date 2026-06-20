import { Link } from 'react-router-dom';

const getUserId = (user) => {
  if (!user) {
    return null;
  }

  return user._id || user;
};

const getDisplayName = (user) => {
  return user.fullName || user.username || 'Unknown';
};

const getInitial = (user) => {
  const name = user.username || user.fullName || '?';
  return name.charAt(0).toUpperCase();
};

const UserBadge = ({ user, className = '' }) => {
  const userId = getUserId(user);

  if (!user || !userId) {
    return null;
  }

  return (
    <Link to={`/users/${userId}`} className={`user-badge ${className}`.trim()}>
      {user.profileImageUrl ? (
        <img
          src={user.profileImageUrl}
          alt={`${getDisplayName(user)} avatar`}
          className="user-badge-avatar"
        />
      ) : (
        <span className="user-badge-avatar user-badge-fallback">
          {getInitial(user)}
        </span>
      )}
      <span className="user-badge-name">{getDisplayName(user)}</span>
    </Link>
  );
};

export default UserBadge;
