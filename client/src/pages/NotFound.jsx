/**
 * @file NotFound.jsx
 * @description Fallback 404 page shown when the user navigates to an unknown
 * route. Provides a React Router link back to the home page.
 * @module pages/NotFound
 */

import { Link } from 'react-router-dom';

/**
 * Renders a simple "Page Not Found" message with a link to `/`.
 *
 * @returns {JSX.Element} 404 not-found page
 */
const NotFound = () => {
  return (
    <div className="page">
      <h1>Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      {/* Navigation: client-side Link back to the home route */}
      <Link to="/">Go Home</Link>
    </div>
  );
};

export default NotFound;
