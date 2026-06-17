import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="page">
      <h1>Home</h1>
      {user ? (
        <p>Welcome, {user.fullName || user.username}!</p>
      ) : (
        <p>Welcome! Please login or register to continue.</p>
      )}
    </div>
  );
};

export default Home;
