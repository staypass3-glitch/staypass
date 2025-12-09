import { AlertProvider } from '@/context/AlertContext.js';
import { NetworkProvider } from '@/context/NetworkContext.js';
import * as Notifications from 'expo-notifications';
import React from 'react';
import { Appearance, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppNavigator from '../components/AppNavigator.js';
import { AuthProvider } from '../context/AuthContext.js';
import { UserProvider } from '../context/UserContext.js';
import '../firebase.js';

// ✅ Notification Handler (REQUIRED)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,  // this only tells system how to handle background
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

Appearance.setColorScheme('light');
function AppContent() {

  const insets = useSafeAreaInsets();



  return (
    <View style={{ flex: 1, paddingBottom: insets.bottom, backgroundColor: '#fff' }}>
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
