import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import CustomIndicator from './CustomIndicator';
import CustomLoadingScreen from './CustomLoadingScreen.jsx';
import ScreenWrapper from './ScreenWrapper';

// Constants
const LOGOUT_DELAY = 2000;
const CAMERA_HEIGHT = 400;

const GuardPortal = () => {
  const { user, signOut } = useAuth();
  const [scanned, setScanned] = useState(false);
  const [studentDetails, setStudentDetails] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [guardCollegeId, setGuardCollegeId] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [isSessionJoined, setIsSessionJoined] = useState(false);
  const [guardDetailsLoaded, setGuardDetailsLoaded] = useState(false);
  const [studentImage, setStudentImage] = useState(null);
  
  // Individual loading states
  const [joinLoading, setJoinLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [customIndicator,setCustomIndicator] = useState(false);

  // Refs to prevent multiple simultaneous scans
  const scanningRef = useRef(false);
  const logoutTimerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    };
  }, []);

  const fetchGuardDetails = useCallback(async () => {
    if (!user?.id) return;

    try {
      setCustomIndicator(true)
      setGuardDetailsLoaded(false);
      
      const { data: guardProfile, error } = await supabase
        .from('profiles')
        .select('college_id, current_session_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      setGuardCollegeId(guardProfile.college_id);
      setIsSessionJoined(!!guardProfile.current_session_id);
    } catch (error) {
      console.error("Error fetching guard's details:", error);
      Alert.alert('Error', error.message || 'Failed to load guard details');
    } finally {
      setGuardDetailsLoaded(true);
      setCustomIndicator(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGuardDetails();
  }, [fetchGuardDetails]);

  const joinSession = useCallback(async () => {
    const trimmedSessionId = sessionId.trim();
    
    if (!trimmedSessionId) {
      Alert.alert('Error', 'Please enter a session ID.');
      return;
    }

    try {
      setJoinLoading(true);

      // Fetch session by guard_id
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, college_id')
        .eq('guard_id', trimmedSessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;
      
      if (!sessionData) {
        throw new Error('Invalid session ID or session not found');
      }

      // Update guard profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          current_session_id: sessionData.id,
          college_id: sessionData.college_id 
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setIsSessionJoined(true);
      await fetchGuardDetails();
      Alert.alert('Success', 'Session joined successfully!');
      setSessionId(''); // Clear input
    } catch (error) {
      console.error("Error joining session:", error);
      Alert.alert('Error', error.message || 'Failed to join session');
    } finally {
      setJoinLoading(false);
    }
  }, [sessionId, user?.id, fetchGuardDetails]);

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    // Prevent multiple simultaneous scans
    if (scanningRef.current || !guardDetailsLoaded || !guardCollegeId) {
      if (!guardDetailsLoaded || !guardCollegeId) {
        Alert.alert('Error', 'Guard details not fully loaded. Please wait.');
      }
      return;
    }

    scanningRef.current = true;
    setScanned(true);
    setScanLoading(true);

    try {
      const qrData = JSON.parse(data);
      const { student_id, type } = qrData;

      if (!student_id || !type || !['exit', 'return'].includes(type)) {
        throw new Error('Invalid QR code format');
      }

      // Fetch student details
      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('name, room_number, department, college_id, parent_phone, profile_image')
        .eq('id', student_id)
        .single();

      if (studentError) throw studentError;

      // Validate college match
      if (student.college_id !== guardCollegeId) {
        Alert.alert('Error', 'You can only approve requests for students from your college.');
        setScanned(false);
        scanningRef.current = false;
        setScanLoading(false);
        return;
      }

      // Set student image if available
      if (student.profile_image) {
        setStudentImage(student.profile_image);
      }

      // Handle exit or return
      if (type === 'exit') {
        const { error: exitError } = await supabase
          .from('requests')
          .update({ actual_scan_out: new Date().toISOString() })
          .eq('student_id', student_id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);

        if (exitError) throw exitError;
      } else if (type === 'return') {
        const { data: latestRequest, error: fetchError } = await supabase
          .from('requests')
          .select('id, status')
          .eq('student_id', student_id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) throw fetchError;

        if (!latestRequest) {
          Alert.alert('Error', 'No approved request found for this student.');
          setScanned(false);
          scanningRef.current = false;
          setScanLoading(false);
          return;
        }

        const { error: returnError } = await supabase
          .from('requests')
          .update({
            status: 'completed',
            actual_scan_in: new Date().toISOString(),
          })
          .eq('id', latestRequest.id);

        if (returnError) throw returnError;
      }

      setStudentDetails({ ...student, type });
      Alert.alert('Success', `Student ${type} recorded successfully!`);
    } catch (error) {
      console.error('Error scanning QR code:', error);
      Alert.alert('Error', error.message || 'Please scan a valid QR code');
      setScanned(false);
      scanningRef.current = false;
    } finally {
      setScanLoading(false);
    }
  }, [guardDetailsLoaded, guardCollegeId]);

  const leaveSession = useCallback(async () => {
    try {
      setLeaveLoading(true);
      
      const { error } = await supabase 
        .from('profiles')
        .update({ current_session_id: null, college_id: null })
        .eq('id', user.id);

      if (error) throw error;

      await fetchGuardDetails();
      setIsSessionJoined(false);
      Alert.alert('Success', 'Left session successfully');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to leave session');
    } finally {
      setLeaveLoading(false);
    }
  }, [user?.id, fetchGuardDetails]);

  const onLogout = useCallback(async () => {
    try {
      setLogoutLoading(true);
      
      logoutTimerRef.current = setTimeout(async () => {
        try {
          await signOut();
        } catch (error) {
          console.error('Logout failed:', error);
          setLogoutLoading(false);
          Alert.alert('Error', 'Failed to logout. Please try again.');
        }
      }, LOGOUT_DELAY);
    } catch (error) {
      console.error('Logout failed:', error);
      setLogoutLoading(false);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  }, [signOut]);

  const handleScanAgain = useCallback(() => {
    setScanned(false);
    setStudentDetails(null);
    setStudentImage(null);
    scanningRef.current = false;
  }, []);


  // Memoized components
  const PermissionView = useMemo(() => (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.headerGradient}>
        <Text style={styles.title}>Guard Portal</Text>
      </LinearGradient>
      <View style={styles.contentContainer}>
        <Text style={styles.permissionText}>
          We need your permission to use the camera to scan QR codes.
        </Text>
        <Pressable 
          style={styles.primaryButton}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  ), [requestPermission]);

  const StudentCard = useMemo(() => {
    if (!studentDetails) return null;

    return (
      <View style={styles.studentCardContainer}>
        <View style={styles.studentCard}>
          <Text style={styles.cardTitle}>Student ID Card</Text>
          
          {studentImage ? (
            <Image 
              source={{ uri: studentImage }} 
              style={styles.studentImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>No Image</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name:</Text>
            <Text style={styles.detailValue}>{studentDetails.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Room:</Text>
            <Text style={styles.detailValue}>{studentDetails.room_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Department:</Text>
            <Text style={styles.detailValue}>{studentDetails.department || 'Computer Technology'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Action:</Text>
            <Text style={[
              styles.detailValue, 
              styles.statusBadge,
              studentDetails.type === 'exit' ? styles.exitBadge : styles.returnBadge
            ]}>
              {studentDetails.type === 'exit' ? 'Going Home' : 'Returning'}
            </Text>
          </View>
        </View>
        
        <Pressable
          style={styles.primaryButton}
          onPress={handleScanAgain}
        >
          <Text style={styles.buttonText}>Scan Again</Text>
        </Pressable>
      </View>
    );
  }, [studentDetails, studentImage, handleScanAgain]);

  // Early returns
  if (!permission) {
    return <View />; 
  }
  
  if (!permission.granted) {
    return PermissionView;
  }

  if (logoutLoading) {
    return (
      <CustomLoadingScreen 
        type="logout"
        message="Logging out..."
        duration={LOGOUT_DELAY}
        onFinish={() => setLogoutLoading(false)}
      />
    );
  }

  if(customIndicator){
    return <CustomIndicator/>
  }
  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.headerGradient}>
          <Text style={styles.title}>Guard Portal</Text>
        </LinearGradient>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isSessionJoined ? (
            <View style={styles.contentContainer}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Join Admin Session</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Session ID"
                  value={sessionId}
                  onChangeText={setSessionId}
                  placeholderTextColor="#a0aec0"
                  editable={!joinLoading}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable
                  style={[styles.primaryButton, joinLoading && styles.disabledButton]}
                  onPress={joinSession}
                  disabled={joinLoading}
                >
                  {joinLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Join Session</Text>
                  )}
                </Pressable>
                <Pressable
                  style={[styles.dangerButton, logoutLoading && styles.disabledButton]}
                  onPress={onLogout}
                  disabled={logoutLoading}
                >
                  {logoutLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Log Out</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.scannerContainer}>
              {!guardDetailsLoaded ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>Loading guard details...</Text>
                </View>
              ) : scanned && studentDetails ? (
                StudentCard
              ) : (
                <View style={styles.cameraContainer}>
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                  >
                    <View style={styles.scannerOverlay}>
                      <View style={styles.scannerFrame} />
                      {scanLoading && (
                        <View style={styles.loadingOverlay}>
                          <ActivityIndicator size="large" color="#ffffff" />
                        </View>
                      )}
                    </View>
                    <View style={styles.cameraOverlay}>
                      <Text style={styles.overlayText}>Scan Student QR Code</Text>
                    </View>
                  </CameraView>
                </View>
              )}

              <View style={styles.buttonGroup}>
                <Pressable 
                  style={[styles.secondaryButton, leaveLoading && styles.disabledButton]}
                  onPress={leaveSession}
                  disabled={leaveLoading}
                >
                  {leaveLoading ? (
                    <ActivityIndicator color="#3b82f6" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Leave Session</Text>
                  )}
                </Pressable>
                
                <Pressable 
                  style={[styles.dangerButton, logoutLoading && styles.disabledButton]}
                  onPress={onLogout}
                  disabled={logoutLoading}
                >
                  {logoutLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Log Out</Text>
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  scannerContainer: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#334155',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 50,
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    minHeight: 50,
    justifyContent: 'center',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#334155',
    paddingHorizontal: 20,
  },
  cameraContainer: {
    overflow: 'hidden',
    borderRadius: 15,
    height: CAMERA_HEIGHT,
    marginBottom: 20,
  },
  camera: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannerOverlay: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#3b82f6',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 15,
    width: '100%',
    alignItems: 'center',
  },
  overlayText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  studentCardContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  studentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
  },
  studentImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 15,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e5e7eb',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 16,
    color: '#64748b',
    width: 100,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    fontSize: 14,
    textAlign: 'center',
    overflow: 'hidden',
    maxWidth: 120,
  },
  exitBadge: {
    backgroundColor: '#ffe4e6',
    color: '#ef4444',
  },
  returnBadge: {
    backgroundColor: '#dcfce7',
    color: '#10b981',
  },
  buttonGroup: {
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: CAMERA_HEIGHT,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#334155',
  },
});

export default GuardPortal;