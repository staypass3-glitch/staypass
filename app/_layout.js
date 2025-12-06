import { NetworkProvider } from '@/context/NetworkContext.js';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertProvider } from '@/context/AlertContext.js';
import AppNavigator from '../components/AppNavigator.js';
import { AuthProvider } from '../context/AuthContext.js';
import { UserProvider } from '../context/UserContext.js';

import * as Notifications from 'expo-notifications';



Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('Notification handler called:', notification);
    
    return {
      shouldShowAlert: true,  
      shouldPlaySound: true,  
      shouldSetBadge: false,
    };
  },
});




function AppContent() {
  useEffect(() => {
    const check = Notifications.addNotificationReceivedListener(n => {
     
    });
  
    return () => check.remove();
  }, []);
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function setupNotificationChannel() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'custom_noti', 
        });
      }
    }

    setupNotificationChannel();
  }, []);


  useEffect(() => {
    // Listen for notifications received while app is in foreground
    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('Notification received in foreground:', notification);
      
      // For foreground notifications, we need to explicitly present them
      // The handler above sets shouldShowAlert: true, but we'll also ensure it displays
      try {
        // Present the notification immediately to ensure it's visible
        // Note: This may create a duplicate if shouldShowAlert already displayed it,
        // but it ensures notifications are visible when the handler doesn't work properly
        await Notifications.scheduleNotificationAsync({
          identifier: `fg-${Date.now()}-${Math.random()}`, // Unique identifier
          content: {
            title: notification.request.content.title || 'Notification',
            body: notification.request.content.body || '',
            data: notification.request.content.data || {},
            sound: true,
            priority: 'high',
          },
          trigger: null, // Show immediately
        });
      } catch (error) {
        console.error('Error displaying foreground notification:', error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);


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
