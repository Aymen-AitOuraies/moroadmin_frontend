import React, { useState } from 'react';
import AdminLogin from './AdminLogin';
import AdminProducts from './AdminProducts';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');

  const handleLogin = (authToken) => {
    setToken(authToken);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setToken('');
    setIsLoggedIn(false);
  };

  return (
    <div className="app">
      {!isLoggedIn ? (
        <AdminLogin onLogin={handleLogin} />
      ) : (
        <AdminProducts token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;