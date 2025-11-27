import { NetworkProvider } from '@/context/NetworkContext.js';
import React from 'react';
import { View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertProvider } from '@/context/AlertContext.js';
import AppNavigator from '../components/AppNavigator.js';
import { AuthProvider } from '../context/AuthContext.js';
import { UserProvider } from '../context/UserContext.js';
import '../firebase.js';

function AppContent() {
  const insets = useSafeAreaInsets();
  


  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom-10, backgroundColor: '#fff' }}>
      <NetworkProvider>
        <AlertProvider>
        <AuthProvider>
          <UserProvider>
            <AppNavigator />
          </UserProvider>
        </AuthProvider>
        </AlertProvider>
      </NetworkProvider>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}