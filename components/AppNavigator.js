import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'react-native-svg';
import { useUser } from '../context/UserContext.js';
import AppStartupAnimation from './AppStartupAnimation.jsx';
import LoadingScreen from './LoadingScreen.jsx';
// Screens
import StudentTabsNavigator from '@/(studentTabs)/StudentTabsNavigator.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import PendingApproval from './admin/PendingApproval.jsx';
import AdminAllSettings from './adminSettings/AdminAllSettings.jsx';
import AdminProfile from './adminSettings/AdminProfile.jsx';
import ChangePassword from './ChangePassword.jsx';
import CustomIndicator from './CustomIndicator.jsx';
import EnterOtp from './EnterOtp.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import GuardScanner from './GuardScanner.jsx';
import ReachedHomeScreen from './ReachedHomeScreen.jsx';
import SessionDetails from './SessionDetails.jsx';
import ShowCredentials from './ShowCredentials.jsx';
import SignInScreen from './SignInScreen.jsx';
import SignUpScreen from './SignUpScreen.jsx';
import StudentHistory from './StudentHistory.jsx';
import StudentPortal from './StudentPortal.jsx';
import AboutUs from './studentSettings/AboutUs.jsx';
import AllSettings from './studentSettings/AllSettings.jsx';
import Welcome from './Welcome.jsx';

const Stack = createNativeStackNavigator();

// Memoized loading component (fallback)
const FallbackLoadingScreen = React.memo(() => (
  <View style={styles.loadingOverlay}>
        <LinearGradient
          colors={['#2563eb', '#3b82f6', '#60a5fa']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="white" />
      
        </LinearGradient>
      </View>
));

export default function AppNavigator() {
  const { 
    user, 
    isLoading, 
    sessionChecked, 
    hasCachedData, 
    isRetrievingFromStorage, 
    isInitialLoad 
  } = useUser();
  const [showStartupAnimation, setShowStartupAnimation] = useState(true);

  // Memoize the loading screen
  const loadingScreen = useMemo(() => <LoadingScreen />, []);
  const fallbackLoadingScreen = useMemo(() => <CustomIndicator/>, []);

  // Show startup animation on first load or when retrieving from storage
  if (showStartupAnimation && (isInitialLoad || isRetrievingFromStorage)) {
    return (
      <AppStartupAnimation
        isRetrievingFromStorage={isRetrievingFromStorage}
        onAnimationComplete={() => {
          setShowStartupAnimation(false);
        }}
      />
    );
  }

  // Show regular loading screen for other loading states
  if (isLoading && !hasCachedData && !sessionChecked) {
    return fallbackLoadingScreen;
  }

  // Now it's safe to log user
  console.log('Effective user:', user, 'Has cached data:', hasCachedData, 'Is loading:', isLoading);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          {user.role === 'student' && (
            <>
              <Stack.Screen name="Student" component={StudentPortal} />
              <Stack.Screen name="studentTabsNavigator" component={StudentTabsNavigator} />
              <Stack.Screen name="ReachedHomeScreen" component={ReachedHomeScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePassword} />
              <Stack.Screen name="AllSettings" component={AllSettings} />
              <Stack.Screen name="AboutUs" component={AboutUs} />
            
            </>
          )}
          {user.role === 'admin' && (
            <>
             
              <Stack.Screen name="Admin" component={AdminDashboard} />
              <Stack.Screen name="PendingApproval" component={PendingApproval} />
              <Stack.Screen name="SessionDetails" component={SessionDetails} />
              <Stack.Screen name="StudentHistory" component={StudentHistory} />
              <Stack.Screen name="ShowCredentials" component={ShowCredentials}/>
              <Stack.Screen name="AdminAllSettings" component={AdminAllSettings} />
              <Stack.Screen name="AdminProfile" component={AdminProfile}/>
              <Stack.Screen name="AboutUs" component={AboutUs} />
              <Stack.Screen name="ChangePassword" component={ChangePassword} />
            </>
          )}
          {user.role === 'guard' && (
            <>
              <Stack.Screen name="GuardScanner" component={GuardScanner} />
            </>
          )}
        </>
      ) : (
        <>
          <Stack.Screen name='Welcome' component={Welcome}/>
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name='EnterOtp' component={EnterOtp}/>
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 155, 223, 0.9)',
    zIndex: 10,
  },
  loadingGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '500',
    color: 'white',
  },
})