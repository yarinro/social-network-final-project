import { useAuth } from '../context/AuthContext';
import NetworkCanvas from '../components/NetworkCanvas';
import UserBadge from '../components/UserBadge';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Home</h1>

      {user ? (
        <p className="home-welcome">
          Welcome, <UserBadge user={user} />!
        </p>
      ) : (
        <p>Welcome! Please login or register to continue.</p>
      )}

      <section className="home-canvas-section">
        <h2>Network Visualization</h2>
        <NetworkCanvas />
      </section>

      <section className="about-section">
        <h2>About This Project</h2>
        <p>
          This social network final project is built with the MERN stack:
          MongoDB, Express, React, and Node.js.
        </p>
        <p>
          Users can register, login, manage profiles, create and join groups,
          publish posts, send real-time messages, and connect with friends.
        </p>
        <p>
          The backend uses JWT authentication, REST APIs, and Socket.IO for
          live messaging. MongoDB Atlas stores all application data.
        </p>
        <p>
          The frontend uses React with Axios, D3.js statistics, HTML Canvas,
          and modern CSS3 features such as transitions, text-shadow, and
          multi-column layout.
        </p>
      </section>
    </div>
  );
};

export default Home;
