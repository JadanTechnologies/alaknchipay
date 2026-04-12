
import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/ui/Icons';
import * as LocalStorage from '../services/localStorage';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreMessage('');
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (!content) {
        setRestoreMessage('Error reading file');
        return;
      }
      const success = LocalStorage.Backup.restore(content);
      if (success) {
        setRestoreSuccess(true);
        setRestoreMessage('Backup restored successfully! You can now sign in.');
      } else {
        setRestoreMessage('Invalid backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Authenticate user from localStorage
      const normalizedUsername = username?.trim().toLowerCase();
      const user = LocalStorage.Users.authenticate(normalizedUsername, password);

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full text-white animate-bounce">
            <Icons.POS size={40} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2 animate-slide-in">AlkanchiPay POS</h1>
        <p className="text-center text-gray-500 mb-8">Local Storage Version - Sign in to start your session</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email/Username</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Enter your username"
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

        <div className="mt-6 pt-4 border-t">
          {restoreMessage && (
            <div className={`p-3 rounded-lg mb-4 text-sm text-center ${restoreSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {restoreMessage}
            </div>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleRestoreBackup}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Icons.Upload size={18} /> Restore from Backup
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Have a backup file? Click to restore all data
          </p>
        </div>
        
        <div className="mt-4 text-xs text-gray-400 text-center border-t pt-4">
          <p className="text-gray-500">Cashier accounts are created by Super Admin via the Users panel.</p>
        </div>
      </div>
      
      <footer className="mt-8 text-center animate-fade-in-up">
        <p className="text-xs text-gray-500">Developed by</p>
        <p className="text-sm font-semibold text-blue-600">Jadan Tech Solutions Nig Ltd</p>
      </footer>
    </div>
  );
};