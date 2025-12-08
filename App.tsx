import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { Cashier } from './pages/Cashier';
import { SuperAdmin } from './pages/SuperAdmin';
import { Role } from './types';
import { ToastContainer } from './components/ui/Toast';

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
      {user.role === Role.ADMIN && <Admin />}
      {user.role === Role.CASHIER && <Cashier />}
      <ToastContainer />
    </>
  );
};

const App = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;