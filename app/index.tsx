import { AppNavigator } from '@/components';
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from '@/context/UserContext';
import React from 'react';
const Index = () => {
  return (
    <AuthProvider>
      <UserProvider>
          <AppNavigator />
      </UserProvider>
    </AuthProvider>
  );
};

export default Index;
