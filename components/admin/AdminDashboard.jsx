import theme from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { findRequest } from '@/services/findRequest';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import Entypo from '@expo/vector-icons/Entypo';
import { useIsFocused, useRoute } from '@react-navigation/native';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import 'expo-mail-composer';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert,
  BackHandler,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { adminService } from '../../services/adminService';
import CustomAlert from '../CustomAlert';
import CustomIndicator from '../CustomIndicator';
import CustomLoadingScreen from '../common/CustomLoadingScreen';
import ScreenWrapper from '../common/ScreenWrapper';
import CollegeForm from './CollegeForm';
import ConnectSessionForm from './ConnectSessionForm';
import SessionCard from './SessionCard';
import { styles } from './adminStyles';
const { width } = Dimensions.get('window');
const MemoizedMaterialIcons = React.memo(MaterialIcons);

const AdminDashboard = () => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const scrollRef = useRef();
  
  // State declarations
  const [customIndicator,setCustomIndicator] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [isRequestPresent, setIsRequestPresent] = useState(false);
  const [currentQR, setCurrentQR] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collegeName, setCollegeName] = useState('');
  const [showCollegeForm, setShowCollegeForm] = useState(false);
  const [collegeId, setCollegeId] = useState(null);
  const [connectExistingSession, setConnectExistingSession] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [alert, setAlert] = useState({visible: false, title: '', message: '', buttons: []});
  const [newQr, setNewQr] = useState(false);
  const route = useRoute();
  // Memoized callbacks
  const showAlert = useCallback((title, message, buttons = []) => {
    setAlert({visible: true, title, message, buttons});
  }, []);



  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    
    setCustomIndicator(true);
    try {
      const { data, error } = await adminService.fetchSessions(user.id);
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      Alert.alert('Error', error.message);
    } finally {
      setCustomIndicator(false);
    }
  }, [user?.id]);

  const registerForPushNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
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
        console.log('Failed to get push token from push notification');
        return;
      }
      
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

      await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: user.id,
          expo_push_token: token,
          last_used_at: new Date().toISOString(),
          device_id: deviceId
        });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound:'custom_noti',
        });
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
    }
  }, [user?.id]);

  const createNewSession = useCallback(async (collegeId) => {
    try {
      setLoading(true);

      const { data: session, error: sessionError } = await adminService.createSession(user.id, collegeId);
      if (sessionError) throw sessionError;
      if (!session?.id) throw new Error("Session ID is undefined");

      const qrData = {
        session_id: session.id,
        college_id: collegeId,
        session_validation: session.session_validation,
      };

      const { error: qrError } = await adminService.createQRCode(session.id, collegeId, JSON.stringify(qrData));
      if (qrError) throw qrError;

      setCurrentQR(JSON.stringify(qrData));
      setSessions(prev => [session, ...prev]);

      return session;
    } catch (error) {
      console.error("Error creating session:", error);
      Alert.alert('Error', error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);



  const showSessionQR = useCallback(async (session) => {
    try {
      setCustomIndicator(true)
  
      const { data: existingQrCode, error: qrError } = await adminService.getQRCode(session.id);
      if (qrError && qrError.code !== 'PGRST116') throw qrError;
  
      const now = new Date();
      const expiresAt = existingQrCode ? new Date(existingQrCode.expires_at) : null;
  
      let qrData = {
        session_id: session.id,
        college_id: session.college_id,
        session_validation: session.session_validation,
      };
  
      if (!existingQrCode || now > expiresAt) {
        const { error: upsertError } = await adminService.upsertQRCode(
          session.id,
          session.college_id,
          JSON.stringify(qrData)
        );
        if (upsertError) throw upsertError;
      } else {
        try {
          const parsedData = typeof existingQrCode.code === 'string' 
            ? JSON.parse(existingQrCode.code) 
            : existingQrCode.code;
          qrData = parsedData;
        } catch (parseError) {
          console.warn('Failed to parse existing QR code data, using new data');
        }
      }
  
      setCurrentQR(JSON.stringify(qrData));
      setSelectedSession(session);
      
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } catch (error) {
      console.error("Error showing session QR:", error);
      Alert.alert('Error', error.message);
    } finally {
      setCustomIndicator(false);
    }
  }, []);

  const deactivateSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);

      const { error } = await adminService.deactivateSession(sessionId);
      if (error) throw error;

      await fetchSessions();

      if (selectedSession?.id === sessionId) {
        setSelectedSession(prev => ({
          ...prev,
          status: 'expired'
        }));
      }

      showAlert('Success', 'Session deactivated successfully',[{text:'Ok'}]);
    } catch (error) {
      console.error("Error deactivating session:", error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSession?.id, fetchSessions]);

  const reactivateSession = useCallback(async (sessionId) => {
    try {
      setLoading(true);

      const { error } = await adminService.reactivateSession(sessionId);
      if (error) throw error;

      await fetchSessions();

      if (selectedSession?.id === sessionId) {
        setSelectedSession(prev => ({
          ...prev,
          status: 'active'
        }));
      }

      showAlert('Success', 'Session reactivated successfully',[{text:'Ok'}]);
    } catch (error) {
      console.error("Error reactivating session:", error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedSession?.id, fetchSessions]);

  const changeQr = useCallback(async () => {
    if (!selectedSession) return;
    
    setNewQr(true);
    try {
      const uuid = Crypto.randomUUID();
      if (!uuid) {
        Alert.alert('Error', 'Failed to generate UUID');
        return;
      }
    
      const { data, error } = await supabase
        .from('sessions')
        .update({ session_validation: uuid })
        .eq('id', selectedSession.id)
        .select();
    
      if (error) {
        console.error('Error updating:', error);
        Alert.alert('Update Error', error.message);
        return;
      }
    
      if (!data || data.length === 0) {
        Alert.alert('Data Error', 'No matching record found');
        return;
      }
      
      const updatedQrData = {
        session_id: selectedSession.id,
        college_id: selectedSession.college_id,
        session_validation: uuid,
      };

      const { error: qrUpdateError } = await adminService.upsertQRCode(
        selectedSession.id,
        selectedSession.college_id,
        JSON.stringify(updatedQrData)
      );

      if (qrUpdateError) {
        console.error('Error updating QR code:', qrUpdateError);
        Alert.alert('Error', 'Failed to update QR code in database');
        return;
      }

      setCurrentQR(JSON.stringify(updatedQrData));
      setSelectedSession(prev => ({
        ...prev,
        session_validation: uuid
      }));

      showAlert('Success', 'QR code updated successfully!',[{text:'Ok'}]);
    } catch (err) {
      console.error('Unexpected error:', err);
      Alert.alert('Error', 'Failed to generate UUID');
    } finally {
      setNewQr(false);
    }
  }, [selectedSession]);

  const handleCollegeSubmit = useCallback(async () => {
    if (!collegeName.trim()) {
      Alert.alert('Error', 'Please enter a college name');
      return;
    }

    try {
      setLoading(true);

      const { data: college, error: collegeError } = await adminService.createCollege(collegeName);
      if (collegeError) throw collegeError;

      const { error: profileError } = await adminService.updateUserCollege(user.id, college.id);
      if (profileError) throw profileError;

      setCollegeId(college.id);
      const newSession = await createNewSession(college.id);

      Alert.alert('Success', 'College details saved successfully');
      await fetchSessions();
      setShowCollegeForm(false);
      setCollegeName('');

      if (newSession) {
        setSelectedSession({
          ...newSession,
          colleges: { name: collegeName }
        });
      }
    } catch (error) {
      Alert.alert('College Details', 'College Already Exists');
    } finally {
      setLoading(false);
    }
  }, [collegeName, user?.id, createNewSession, fetchSessions]);

  const sessionIdSubmitted = useCallback(async () => {
    if (!sessionId.trim()) {
      Alert.alert('Session Id', 'Please enter the session id');
      return;
    }
  
    try {
      setLoading(true);
      const refinedSessionId = sessionId.trim();

      const { data: sessionData, error: sessionError } = await adminService.findSessionById(refinedSessionId);
      if (sessionError) throw sessionError;
      if (!sessionData || sessionData.length === 0) {
        Alert.alert('Error', 'Session not found');
        return;
      }

      const { error } = await adminService.updateUserSession(user.id, sessionData[0]);
      if (error) throw error;

      const { data } = await adminService.checkExistingSession(user.id, sessionData[0]?.college_id);
      if (data) {
        Alert.alert('Request', 'Already connected to the session');
        setConnectExistingSession(false);
        return;
      }

      const { error: insertionError } = await adminService.connectToSession(user.id, sessionData[0]);
      if (insertionError) throw insertionError;

      fetchSessions();
      setConnectExistingSession(false);
      Alert.alert('Success', 'Connected to existing session successfully');
    } catch (error) {
      console.error("Error connecting to session:", error);
      Alert.alert('Error', error?.message || 'Failed to connect to session');
    } finally {
      setLoading(false);
    }
  }, [sessionId, user?.id, fetchSessions]);

  const handleSessionDetails = useCallback(() => {
    if (!selectedSession) {
      Alert.alert('Error', 'No session selected');
      return;
    }
    navigation.navigate('SessionDetails', { session: selectedSession });
  }, [selectedSession, navigation]);

  const handlePendingRequests = useCallback(() => {
    if (!selectedSession) {
      Alert.alert('Error', 'No session selected');
      return;
    }
    navigation.navigate('PendingApproval', { collegeId: selectedSession.college_id });
  }, [selectedSession, navigation]);

  const onLogout = useCallback(async () => {
    try {
      setLogoutLoading(true);
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      setLogoutLoading(false);
    }
  }, [signOut]);

  // Memoized render functions
  const renderSessions = useMemo(() => {
    return sessions.map(session => (
      <SessionCard
        key={session.id}
        session={session}
        isSelected={selectedSession?.id === session.id}
        onPress={() => showSessionQR(session)}
        collegeId={session.college_id}                
      />
    ));
  }, [sessions, selectedSession?.id, showSessionQR]);

  // Effects
  useEffect(() => {

    const fetchCollegeId = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await adminService.fetchCollegeId(user.id);
        if (error) throw error;
        setCollegeId(data.college_id);
      } catch (error) {
        console.error("Error fetching college ID:", error);
        Alert.alert('Error', error.message);
      }
    };

    fetchCollegeId();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications();
    }
  }, [registerForPushNotifications]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);
  useFocusEffect(
    useCallback(() => {
   console.log(`Route name is ${route.name}`);
      if (route.name !== 'Admin') {
        return; // Don't add handler for other routes
      }

      const backAction = () => {
       setAlert({
          title:'Exit App',
          message:'Do you want to exit the app?',
          buttons:[
            {
              text: 'Cancel',
              onPress: () => null,
              style: 'cancel'
            },
            {
              text: 'Exit',
              onPress: () => BackHandler.exitApp()
            }
          ]
      });
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }, [route.name])
  );
  useEffect(() => {
    if (isFocused) {
      fetchSessions();
    }
  }, [isFocused, fetchSessions]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
  
      const fetchData = async () => {
        try {  
          if (selectedSession && isActive) {
            const result = await findRequest(selectedSession.college_id);
            if (isActive) {
              setIsRequestPresent(result);
            }
          }
        } catch (error) {
          if (isActive) {
            Alert.alert('Error', `Error occurred while fetching the last request ${error}`);
            setIsRequestPresent(false);
          }
        }
        
      
      };
  
      fetchData(); 
  
      return () => {
        isActive = false;
      };
    }, [selectedSession, fetchSessions])
  );

  // Conditional renders
  if (logoutLoading) {
    return (
      <CustomLoadingScreen
        type="logout"
        message="Logging out..."
        duration={2000}
        onFinish={() => setLogoutLoading(false)}
      />
    );
  }

  if (connectExistingSession) {
    return (
      <ConnectSessionForm
        onBack={() => setConnectExistingSession(false)}
        onSubmit={sessionIdSubmitted}
        loading={loading}
        sessionId={sessionId}
        setSessionId={setSessionId}
      />
    );
  }

  if (showCollegeForm) {
    return (
      <CollegeForm
        onBack={() => setShowCollegeForm(false)}
        onSubmit={handleCollegeSubmit}
        loading={loading}
        collegeName={collegeName}
        setCollegeName={setCollegeName}
      />
    );
  }

  if(customIndicator){
    return <CustomIndicator/>
  }

  return (
    <ScreenWrapper>
      <View style={styles.mainContainer}>
        <Modal
          visible={newQr}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.qrChangeContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.qrChangeText}>Updating QR Code...</Text>
            </View>
          </View>
        </Modal>

        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false} 
          ref={scrollRef}
        >
          <View style={styles.headerContainer}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>Manage your sessions</Text>
            </View>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setShowMenu(!showMenu)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#4361ee" />
            </TouchableOpacity>

            <Modal
              visible={showMenu}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowMenu(false)}
            >
              <TouchableOpacity 
                style={styles.modalOverlay1}
                activeOpacity={1}
                onPress={() => setShowMenu(false)}
              >
                <View style={styles.modalContainer}>
                  <View style={styles.menuDropdown}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        setShowCollegeForm(true);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#4361ee" />
                      <Text style={styles.menuItemText}>New Session</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        setConnectExistingSession(true);
                      }}
                    >
                      <Ionicons name="link-outline" size={20} color="#4361ee" />
                      <Text style={styles.menuItemText}>Connect to Session</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.menuDivider} />

                    <TouchableOpacity
                      style={[styles.menuItem, styles.menuItemLast]}
                      onPress={() => {
                        navigation.navigate('AdminAllSettings');
                        setShowMenu(false);
                      }}
                    >
                      <MemoizedMaterialIcons 
                        name="settings" 
                        size={20} 
                        color={theme.colors.primary} 
                      />
                      <Text style={styles.menuItemDanger}>Settings</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          {currentQR && (
            <View style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <Text style={styles.qrTitle}>
                  {selectedSession ? 'Session QR Code' : 'Current Session QR'}
                </Text>
                <View style={styles.qrStatusBadge}>
                  <Text style={styles.qrStatusText}>
                    {selectedSession?.status === 'active' ? 'ACTIVE' : 'EXPIRED'}
                  </Text>
                </View>
              </View>

              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={currentQR}
                  size={width * 0.6}
                  color="black"
                  backgroundColor="white"
                />
                <TouchableOpacity 
                  style={styles.refreshButton}
                  onPress={changeQr}
                  activeOpacity={0.7}
                >
                  <Feather name="refresh-cw" size={20} color="#3498db" />
                </TouchableOpacity>
              </View>

              <Text style={styles.qrNote}>Scan this QR code to join the session</Text>

              <View style={styles.collegeInfo}>
                <Ionicons name="school-outline" size={20} color="#4361ee" />
                <Text style={styles.collegeName}>{selectedSession?.colleges?.name || 'No college selected'}</Text>
              </View>

              {selectedSession && (
                <View style={styles.sessionActions}>
                  <View style={styles.actionButtonsRow}>
                    {selectedSession.status === 'active' ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={() => 
                          showAlert(
                            'Deactivate Session',
                            'Do you really want to deactivate the session?',
                            [
                              {
                                text: 'Deactivate',
                                style: 'destructive',
                                onPress: () => deactivateSession(selectedSession.id)
                              },
                              {
                                text: 'Cancel',
                                style: 'cancel'
                              }
                            ]
                          )
                        }
                      >
                        <Ionicons name="power-outline" size={18} color="#fff" />
                        <Text style={styles.buttonText}>Deactivate</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.successButton]}
                        onPress={() => 
                          showAlert(
                            'Reactivate Session',
                            'Do you want to reactivate this session?',
                            [
                              {
                                text: 'Reactivate',
                                onPress: () => reactivateSession(selectedSession.id)
                              },
                              {
                                text: 'Cancel',
                                style: 'cancel'
                              }
                            ]
                          )
                        }
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={styles.buttonText}>Reactivate</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={handlePendingRequests}
                    >
                      <View style={styles.buttonContent}>
                        <View style={styles.bellStyle}>
                        {isRequestPresent && <Entypo name="bell" size={20} color="yellow" />}
                        </View>
                        
                        <Text style={styles.buttonText}>Requests</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton, { marginTop: '3%' }]}
                    onPress={handleSessionDetails}
                  >
                    <Ionicons name="list-outline" size={18} color="#fff" />
                    <Text style={styles.buttonText}>Session Details</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <View style={styles.sessionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Sessions</Text>
              <Text style={styles.sectionSubtitle}>{sessions.length} session(s) found</Text>
            </View>

            {sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#adb5bd" />
                <Text style={styles.emptyStateText}>No sessions available</Text>
                <Text style={styles.emptyStateSubtext}>Create a new session to get started</Text>
              </View>
            ) : (
              renderSessions
            )}
          </View>
        </ScrollView>
      </View>

      <CustomAlert 
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={() => {
          setAlert({visible: false, title: '', message: '', buttons: []})
        }}
      />
    </ScreenWrapper>
  );
};

export default AdminDashboard;