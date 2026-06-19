import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const savedToken = localStorage.getItem('token');

      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
        setToken(savedToken);
      } catch (error) {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const register = async (username, fullName, email, password) => {
    const response = await api.post('/auth/register', {
      username,
      fullName,
      email,
      password
    });

    const { user: newUser, token: newToken } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);

    return response.data;
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    const { user: loggedInUser, token: newToken } = response.data;

    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(loggedInUser);

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        register,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
