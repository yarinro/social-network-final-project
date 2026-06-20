import { Link } from 'react-router-dom';

const getUserId = (user) => {
  if (!user) {
    return null;
  }

  return user._id || user;
};

const getDisplayName = (user) => {
  if (!user) {
    return 'Unknown';
  }

  return user.fullName || user.username || 'Unknown';
};

const getInitial = (user) => {
  const name = user?.username || user?.fullName || '?';
  return name.charAt(0).toUpperCase();
};

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
            event.currentTarget.style.display = 'none';
            const fallback = event.currentTarget.nextElementSibling;
            if (fallback) {
              fallback.style.display = 'inline-flex';
            }
          }}
        />
      ) : null}
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
