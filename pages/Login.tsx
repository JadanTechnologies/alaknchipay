import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Icons } from '../components/ui/Icons';

export const Login = () => {
  const { login } = useStore();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username)) {
      setError('');
    } else {
      setError('Invalid username or inactive account.');
    }
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
        <p className="text-center text-gray-500 mb-8">Sign in to start your session</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter username (e.g., admin, cashier)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            Sign In
          </button>
        </form>
        
        <div className="mt-6 text-xs text-gray-400 text-center border-t pt-4">
          <p>Demo Accounts:</p>
          <p>Super Admin: <b>super</b> | Admin: <b>admin</b> | Cashier: <b>cashier</b></p>
        </div>
      </div>
    </div>
  );
};