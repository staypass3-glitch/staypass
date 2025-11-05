import { MaterialIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { useUser } from '../context/UserContext.js';
import '../firebase.js';
import { supabase } from '../lib/supabase.js';
import CustomAlert from './CustomAlert.jsx';
import ScreenWrapper from './ScreenWrapper.jsx';

const StudentPortal = ({ navigation }) => {
  const { user } = useUser();
  const { signOut, fetchUserProfile } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Move push notification registration to useEffect
  const registerForPushNotifications = useCallback(async () => {
    try {
      // Explicitly request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // Get the token
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'a93753d8-c15c-4e24-aeea-d41040f243bb'
      })).data;
      
      setExpoPushToken(token);
      
      let deviceId = null;
      if (Platform.OS === 'android') {
        deviceId = Application.getAndroidId(); 
      } else if (Platform.OS === 'ios') {
        deviceId = await Application.getIosIdForVendorAsync();
      }

      // Save token to Supabase
      if (user?.id) {
        await supabase
          .from('user_push_tokens')
          .upsert({
            user_id: user.id,
            expo_push_token: token,
            last_used_at: new Date().toISOString(),
            device_id: deviceId
          });
      }

      // Required for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
     
        BackHandler.exitApp();
        return true; 
      }
    );

    // Cleanup the event listener
    return () => backHandler.remove();
  }, []);

  // Register for push notifications on mount
  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications();
    }
  }, [registerForPushNotifications]);

  // Check if the student is already in a session
  useEffect(() => {
    console.log(`user is ${JSON.stringify(user)}`);
    const checkCurrentSession = async () => {
      if (!user?.id) {
        console.log('User ID not available, skipping session check');
        setProfileLoading(false);
        return;
      }
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('current_session_id, college_id')
          .eq('id', user.id)
          .single();

        console.log(profile);

        if (error) throw error;

        if (profile?.current_session_id && profile?.college_id) {
          console.log('sessionPresent');
          setHasSession(true);
          navigation.replace('studentTabsNavigator');
        } else {
          setProfileLoading(false);
        }
      } catch (error) {
        console.error('Error checking current session:', error);
        setProfileLoading(false);
      }
    };

    if (user?.id) {
      checkCurrentSession();
    } else {
      setProfileLoading(false);
    }
  }, [user, navigation]);

  // Logout function
  const onLogout = useCallback(async () => {
    try {
      console.log('Logging out...');
      await signOut();
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [signOut]);

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    if (!user?.id) {
      console.log('User ID not available, cannot process QR code');
      setCustomAlert({
        visible: true,
        title: 'Error',
        message: 'User session not available. Please try again.',
        buttons: [{ text: 'OK' }]
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Parse QR code data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (parseError) {
        console.error('Failed to parse QR code data:', parseError);
        throw new Error('Invalid QR code format');
      }

      // Validate QR code structure
      if (!qrData.session_id || !qrData.college_id || !qrData.session_validation) {
        throw new Error('Invalid QR code data structure');
      }

      // Check if QR code exists and is valid in database
      const { data: validQR, error: qrError } = await supabase
        .from('qrcodes')
        .select('*')
        .eq('session_id', qrData.session_id)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (qrError || !validQR) {
        throw new Error('Invalid or expired QR code');
      }

      // Parse the stored QR code data to compare session_validation
      let storedQrData;
      try {
        storedQrData = typeof validQR.code === 'string' 
          ? JSON.parse(validQR.code) 
          : validQR.code;
      } catch (parseError) {
        console.error('Failed to parse stored QR code data:', parseError);
        throw new Error('Invalid stored QR code format');
      }

      // Verify session validation matches
      if (storedQrData.session_validation !== qrData.session_validation) {
        throw new Error('QR code has been sd. Please scan the latest QR code.');
      }

      // Check if session is active
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', qrData.session_id)
        .eq('status', 'active')
        .single();

      if (sessionError || !session) {
        throw new Error('Session is no longer active');
      }

      // Verify session validation in sessions table matches
      if (session.session_validation !== qrData.session_validation) {
        throw new Error('Session has been updated. Please scan the latest QR code.');
      }

      // Update user profile with session and college info
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          current_session_id: qrData.session_id,
          college_id: qrData.college_id,
          last_joined_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh user profile
      const { data: authUser } = await supabase.auth.getUser();
      await fetchUserProfile(authUser.user);

      // Show success message and navigate
      setCustomAlert({
        visible: true,
        title: 'Success!',
        message: `Successfully joined the session`,
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace('studentTabsNavigator');
            }
          }
        ]
      });

    } catch (error) {
      console.error('QR scan error:', error);
      setCustomAlert({
        visible: true,
        title: 'Session Scanner',
        message: error.message || 'Please scan a valid QR code',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, navigation, fetchUserProfile]);

  // Memoize loading overlay
  const loadingOverlay = useMemo(() => (
    <View style={styles.loadingOverlay}>
      <LinearGradient
        colors={['#2563eb', '#3b82f6', '#60a5fa']}
        style={styles.loadingGradient}
      >
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </LinearGradient>
    </View>
  ), []);

  if (profileLoading || hasSession) {
    return loadingOverlay;
  }

  // Handle camera permissions
  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient
          colors={['#2563eb', '#3b82f6', '#60a5fa']}
          style={styles.permissionGradient}
        >
          <MaterialIcons name="camera" size={40} color="white" />
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            Requesting camera permission...
          </Text>
        </LinearGradient>
      </View>
    );
  }
  
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <LinearGradient
          colors={['#2563eb', '#3b82f6', '#60a5fa']}
          style={styles.permissionGradient}
        >
          <MaterialIcons name="no-photography" size={50} color="white" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to scan QR codes for session joining
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // Main camera interface
  return (
    <ScreenWrapper bg={'white'}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
        
        <LinearGradient
          colors={['#2563eb', '#3b82f6']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Session Scanner</Text>
          <Text style={styles.headerSubtitle}>Scan QR code to join a session</Text>
        </LinearGradient>
        
        <View style={styles.cameraContainer}>
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraFrame}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={loading ? undefined : handleBarCodeScanned}
              />
            </View>
            
            <View style={styles.scannerUI}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
            </View>
            
            <Text style={styles.scannerText}>
              Position the QR code within the frame
            </Text>
          </View>
        </View>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={onLogout}
          >
            <MaterialIcons name="logout" size={20} color="white" />
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingCardText}>Joining session...</Text>
            </View>
          </View>
        )}
      </View>
      
      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onDismiss={() => setCustomAlert({ visible: false, title: '', message: '', buttons: [] })}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraOverlay: {
    width: '100%',
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrame: {
    width: 280,
    height: 280,
    overflow: 'hidden',
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  scannerUI: {
    position: 'absolute',
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2563eb',
    borderTopLeftRadius: 20,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2563eb',
    borderTopRightRadius: 20,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#2563eb',
    borderBottomLeftRadius: 20,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#2563eb',
    borderBottomRightRadius: 20,
  },
  scannerText: {
    position: 'absolute',
    bottom: -40,
    textAlign: 'center',
    width: '100%',
    color: '#64748b',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 25,
    width: '70%',
    elevation: 3,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 30,
    maxWidth: '80%',
  },
  permissionButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    elevation: 2,
  },
  permissionButtonText: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingCardText: {
    marginTop: 15,
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
});

export default StudentPortal;