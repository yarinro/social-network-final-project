import { Link } from 'react-router-dom';

const getGroupId = (group) => {
  if (!group) {
    return null;
  }

  return group._id || group;
};

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
