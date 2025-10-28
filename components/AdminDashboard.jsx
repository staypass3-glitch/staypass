import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext.js';
import { useUser } from '../context/UserContext.js';
import { supabase } from '../lib/supabase.js';
import CustomLoadingScreen from './CustomLoadingScreen.jsx';
import ScreenWrapper from './ScreenWrapper.jsx';
const { width, height } = Dimensions.get('window');

// Extracted components for better organization
const SessionCard = ({ session, isSelected, onPress }) => (
  <TouchableOpacity
    style={[
      styles.sessionCard,
      session.status === 'expired' ? styles.expiredSession : styles.activeSession,
      isSelected && styles.selectedSession
    ]}
    onPress={onPress}
  >
    <View style={styles.sessionDetails}>
      <View style={styles.sessionHeaderRow}>
        <View style={styles.sessionDetailRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.sessionDetail}>
            {new Date(session.start_time).toLocaleDateString()}
          </Text>
        </View>
        <Ionicons
          name={session.status === 'active' ? 'radio-button-on' : 'radio-button-off'}
          size={16}
          color={session.status === 'active' ? '#4cc9f0' : '#adb5bd'}
        />
      </View>

      <View style={styles.sessionDetailRow}>
        <Ionicons name="time-outline" size={14} color="#666" />
        <Text style={styles.sessionDetail}>
          {new Date(session.start_time).toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.sessionDetailRow}>
        <Ionicons name="school-outline" size={14} color="#666" />
        <Text style={styles.sessionDetail}>
          {session?.colleges?.name || 'Unknown college'}
        </Text>
      </View>
    </View>

    <View style={styles.sessionCardFooter}>
      <TouchableOpacity
        style={styles.viewQRButton}
        onPress={onPress}
      >
        <Text style={styles.viewQRButtonText}>View QR</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);



const ConnectSessionForm = ({ onBack, onSubmit, loading, sessionId, setSessionId }) => {
  
  useEffect(() => {
    const backAction = () => {
      onBack(); // Call your onBack function
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    // Cleanup the event listener
    return () => backHandler.remove();
  }, [onBack]); 
  
  return(
  <ScreenWrapper>
  <View style={styles.connectFormContainer}>
    <View style={styles.formHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#4361ee" />
      </TouchableOpacity>
      <Text style={styles.formTitle}>Connect to Existing Session</Text>
    </View>

    <View style={styles.formCard}>
      <Text style={styles.formSubtitle}>Enter the Session ID provided by another admin</Text>
      <TextInput
        style={styles.input}
        placeholder='Enter session ID'
        value={sessionId}
        onChangeText={setSessionId}
        placeholderTextColor="#999"
        autoCapitalize="none"
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Connect Session</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
  </ScreenWrapper>
  )
  
};

const CollegeForm = ({ onBack, onSubmit, loading, collegeName, setCollegeName }) => {
  useEffect(() => {
    const backAction = () => {
      onBack(); // Call your onBack function
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    // Cleanup the event listener
    return () => backHandler.remove();
  }, [onBack]); // Add onBack to dependency array
  
return(
  <ScreenWrapper style={styles.formContainer}>
    <View style={styles.formHeader}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#4361ee" />
      </TouchableOpacity>
      <Text style={styles.formTitle}>New Session Setup</Text>
    </View>

    <View style={styles.formCard}>
      <Text style={styles.formSubtitle}>Enter your college details to create a new session</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>College Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter college name"
          value={collegeName}
          onChangeText={setCollegeName}
          placeholderTextColor="#999"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            (!collegeName.trim() || loading) && styles.disabledButton
          ]}
          onPress={onSubmit}
          disabled={loading || !collegeName.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.buttonText}>Create Session</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </ScreenWrapper>
)
};

const AdminDashboard = () => {
  const { user } = useUser();
  const { signOut } = useAuth();
  const navigation = useNavigation();
  
  // State management
  const [sessions, setSessions] = useState([]);
  const [currentQR, setCurrentQR] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [collegeName, setCollegeName] = useState('');
  const [showCollegeForm, setShowCollegeForm] = useState(false);
  const [collegeId, setCollegeId] = useState(null);
  const [connectExistingSession, setConnectExistingSession] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    if (selectedSession) {
      const onBack = () => {
        setSelectedSession(null);
        setCurrentQR(null);
        return true; // prevent default back behavior
      };
  
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBack
      );
  
      return () => backHandler.remove();
    }
  }, [selectedSession]);
  

  // Fetch college ID
  useEffect(() => {
    const fetchCollegeId = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('college_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setCollegeId(data.college_id);
      } catch (error) {
        console.error("Error fetching college ID:", error);
        Alert.alert('Error', error.message);
      }
    };

    fetchCollegeId();
  }, [user]);

  // Fetch existing sessions
   const fetchSessions = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, colleges(name)')
        .eq('admin_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      Alert.alert('Error', error.message);
    }
  }, [user]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCollegeSubmit = async () => {
    if (!collegeName.trim()) {
      Alert.alert('Error', 'Please enter a college name');
      return;
    }

    try {
      setLoading(true);

      // Insert college details
      const { data: college, error: collegeError } = await supabase
        .from('colleges')
        .insert([{ name: collegeName }])
        .select()
        .single();

      if (collegeError) throw collegeError;

      // Update admin's profile with college ID
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ college_id: college.id })
        .eq('id', user.id);

      if (profileError) throw profileError;

      setCollegeId(college.id);

      // Create new session
      const newSession = await createNewSession(college.id);

      Alert.alert('Success', 'College details saved successfully');
      await fetchSessions();
      setShowCollegeForm(false);
      setCollegeName('');

      // Set the selected session with college name
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
  };

  const createNewSession = async (collegeId) => {
    try {
      setLoading(true);

      // Create new session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert([{
          admin_id: user.id,
          college_id: collegeId,
          start_time: new Date(),
          status: 'active',
        }])
        .select()
        .single();

      if (sessionError) throw sessionError;
      if (!session?.id) throw new Error("Session ID is undefined");

      // Generate QR Code data
      const qrData = JSON.stringify({
        session_id: session.id,
        college_id: collegeId
      });

      // Store QR code in database
      const { error: qrError } = await supabase
        .from('qrcodes')
        .insert([{
          session_id: session.id,
          college_id: collegeId,
          code: qrData,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
        }]);

      if (qrError) throw qrError;

      setCurrentQR(qrData);
      setSessions(prev => [session, ...prev]);

      return session;
    } catch (error) {
      console.error("Error creating session:", error);
      Alert.alert('Error', error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    try {
      setLogoutLoading(true);
      
      setTimeout(async () => {
        try {
          await signOut();
        } catch (error) {
          console.error('Logout failed:', error);
          setLogoutLoading(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Logout failed:', error);
      setLogoutLoading(false);
    }
  };

  const showSessionQR = async (session) => {
    try {
      setLoading(true);

      // Check if QR code exists
      const { data: existingQrCode, error: qrError } = await supabase
        .from('qrcodes')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (qrError && qrError.code !== 'PGRST116') throw qrError;

      const now = new Date();
      const expiresAt = existingQrCode ? new Date(existingQrCode.expires_at) : null;

      let qrData = JSON.stringify({
        session_id: session.id,
        college_id: session.college_id
      });

      // If no QR code exists or it has expired, generate a new one
      if (!existingQrCode || now > expiresAt) {
        const { error: upsertError } = await supabase
          .from('qrcodes')
          .upsert(
            {
              session_id: session.id,
              college_id: session.college_id,
              code: qrData,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h expiry
            },
            { onConflict: 'session_id' }
          );

        if (upsertError) throw upsertError;
      } else {
        qrData = existingQrCode.code;
      }

      setCurrentQR(qrData);
      setSelectedSession(session);
    } catch (error) {
      console.error("Error showing session QR:", error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const deactivateSession = async (sessionId) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('sessions')
        .update({
          status: 'expired',
          end_time: new Date()
        })
        .eq('id', sessionId);

      if (error) throw error;

      await fetchSessions();

      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setCurrentQR(null);
      }

      Alert.alert('Success', 'Session deactivated successfully');
    } catch (error) {
      console.error("Error deactivating session:", error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSessionDetails = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'No session selected');
      return;
    }
    navigation.navigate('SessionDetails', { session: selectedSession });
  };

  const sessionIdSubmitted = async () => {
    if (!sessionId.trim()) {
      Alert.alert('Session Id', 'Please enter the session id');
      return;
    }

    try {
      setLoading(true);
      const refinedSessionId = sessionId.trim();

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_id', refinedSessionId);

      if (sessionError) throw sessionError;
      if (!sessionData || sessionData.length === 0) {
        Alert.alert('Error', 'Session not found');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          current_session_id: sessionData[0]?.id,
          college_id: sessionData[0]?.college_id
        })
        .eq('id', user.id);

      if (error) throw error;

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('college_id', sessionData[0]?.college_id)
        .eq('admin_id', user.id)
        .single();

      if (data) {
        Alert.alert('Request', 'Already connected to the session');
        setConnectExistingSession(false);
        return;
      }

      const { error: insertionError } = await supabase
        .from('sessions')
        .insert([{
          admin_id: user.id,
          start_time: sessionData[0]?.start_time,
          status: sessionData[0]?.status,
          college_id: sessionData[0]?.college_id,
          created_at: sessionData[0]?.created_at
        }])
        .select()
        .single();

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
  };

  const handlePendingRequests = () => {
    if (!selectedSession) {
      Alert.alert('Error', 'No session selected');
      return;
    }
    navigation.navigate('PendingApproval', { collegeId: collegeId });
  };

  // Show custom loading screen during logout
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

  // Show connect session form
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

  // Show college form
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

  return (
    <ScreenWrapper>
      <View style={styles.mainContainer}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
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
                style={styles.modalOverlay}
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
                        setShowMenu(false);
                        onLogout();
                      }}
                    >
                      <Ionicons name="log-out-outline" size={20} color="#e63946" />
                      <Text style={styles.menuItemDanger}>Logout</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>

          {/* QR Code Section */}
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
              </View>

              <Text style={styles.qrNote}>Scan this QR code to join the session</Text>

              <View style={styles.collegeInfo}>
                <Ionicons name="school-outline" size={20} color="#4361ee" />
                <Text style={styles.collegeName}>{selectedSession?.colleges?.name || 'No college selected'}</Text>
              </View>

              {selectedSession && (
                <View style={styles.sessionActions}>
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.dangerButton,
                        selectedSession.status === 'expired' && styles.disabledButton
                      ]}
                      onPress={() => deactivateSession(selectedSession.id)}
                      disabled={selectedSession.status === 'expired'}
                    >
                      <Ionicons name="power-outline" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Deactivate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={handlePendingRequests}
                    >
                      <Ionicons name="list-outline" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Requests</Text>
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

          {/* Sessions List Section */}
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
              sessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  isSelected={selectedSession?.id === session.id}
                  onPress={() => showSessionQR(session)}
                />
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 1000,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  menuItemDanger: {
    fontSize: 16,
    color: '#e63946',
    marginLeft: 12,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f1f3f5',
    marginVertical: 4,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 40,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  connectFormContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 40,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButton: {
    backgroundColor: '#4361ee',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  dangerButton: {
    backgroundColor: '#e63946',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 16,
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  qrStatusBadge: {
    backgroundColor: '#4cc9f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qrStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  qrCodeContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f3f5',
    marginBottom: 16,
  },
  qrNote: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  collegeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  collegeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  sessionActions: {
    width: '100%',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
  },
  sessionsSection: {
    marginTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#495057',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 4,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  activeSession: {
    borderLeftWidth: 4,
    borderLeftColor: '#4361ee',
  },
  expiredSession: {
    borderLeftWidth: 4,
    borderLeftColor: '#adb5bd',
    opacity: 0.8,
  },
  selectedSession: {
    borderWidth: 1,
    borderColor: '#4361ee',
  },
  sessionHeaderRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  sessionDetails: {
    marginBottom: 12,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDetail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  sessionCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  viewQRButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4361ee',
  },
  viewQRButtonText: {
    fontSize: 14,
    color: '#4361ee',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  modalContainer: {
    backgroundColor: 'transparent',
  },
});

export default AdminDashboard;