import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="page">
      <h1>Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Go Home</Link>
    </div>
  );
};

export default NotFound;
