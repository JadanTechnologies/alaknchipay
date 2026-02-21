
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import * as LocalStorage from '../services/localStorage';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Authenticate user from localStorage
      const user = LocalStorage.Users.authenticate(username, password);

      if (!user) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      if (!user.active) {
        setError('Your account has been suspended');
        setLoading(false);
        return;
      }

      // Save session to localStorage
      const session = {
        userId: user.id,
        username: user.username,
        role: user.role
      };

      localStorage.setItem('alkanchipay_session', JSON.stringify(session));

      // Reload page to let App handle the new user state
      window.location.reload();
    } catch (err) {
      setError('An error occurred during login');
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-3 rounded-full text-white">
            <Icons.POS size={32} />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">AlkanchiPay POS</h1>
        <p className="text-center text-gray-500 mb-8">Local Storage Version - Sign in to start your session</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email/Username</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="salmanu@alkanchipay.com"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-400 text-center border-t pt-4">
          <p className="mb-3 font-semibold text-gray-600">Admin Credentials:</p>
          <div>
            <p className="font-medium text-gray-700">Super Admin:</p>
            <p>Email: <code className="bg-gray-100 px-1">salmanu@alkanchipay.com</code></p>
            <p>Password: <code className="bg-gray-100 px-1">Salmanu@2025</code></p>
          </div>
          <p className="mt-3 text-gray-500">Cashier accounts are created by Super Admin via the Users panel.</p>
        </div>
      </div>
    </div>
  );
};