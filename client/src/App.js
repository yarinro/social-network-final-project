import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Groups from './pages/Groups';
import Users from './pages/Users';
import Messages from './pages/Messages';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/users" element={<Users />} />
          <Route path="/messages" element={<Messages />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
