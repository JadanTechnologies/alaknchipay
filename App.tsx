import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { Cashier } from './pages/Cashier';
import { SuperAdmin } from './pages/SuperAdmin';
import { Role } from './types';
import { ToastContainer } from './components/ui/Toast';

console.log('Debugging Error #130 - App.tsx:');
console.log('StoreProvider:', StoreProvider);
console.log('useStore:', useStore);
console.log('Login:', Login);
console.log('Admin:', Admin);
console.log('Cashier:', Cashier);
console.log('SuperAdmin:', SuperAdmin);
console.log('Role:', Role);
console.log('ToastContainer:', ToastContainer);
console.log('AuthProvider:', AuthProvider);


const AppContent = () => {
  const { user } = useStore();

  if (!user) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      {user.role === Role.SUPER_ADMIN && <SuperAdmin />}
      {(user.role === Role.ADMIN || user.role === 'BRANCH_MANAGER') && <Admin />}
      {user.role === Role.CASHIER && <Cashier />}
      <ToastContainer />
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </AuthProvider>
  );
};

export default App;