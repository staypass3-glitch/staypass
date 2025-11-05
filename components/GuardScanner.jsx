import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import CustomAlert from './CustomAlert';
import CustomIndicator from './CustomIndicator';
import CustomLoadingScreen from './CustomLoadingScreen.jsx';
import ScreenWrapper from './ScreenWrapper';

// Constants
const LOGOUT_DELAY = 2000;
const CAMERA_HEIGHT = 400;
const MemoizedMaterialIcons  = React.memo(MaterialIcons);
// Translations
const translations = {
  en: {
    title: 'Guard Portal',
    joinSession: 'Join Admin Session',
    enterSessionId: 'Enter Session ID',
    joinButton: 'Join Session',
    logout: 'Log Out',
    scanQRCode: 'Scan Student QR Code',
    leaveSession: 'Leave Session',
    studentCard: 'Student ID Card',
    name: 'Name',
    room: 'Room',
    department: 'Department',
    action: 'Action',
    goingHome: 'Going Home',
    returning: 'Returning',
    scanAgain: 'Scan Again',
    grantPermission: 'Grant Permission',
    permissionText: 'We need your permission to use the camera to scan QR codes.',
    loggingOut: 'Logging out...',
    loadingDetails: 'Loading guard details...',
    settings: 'Settings',
    language: 'Language',
    english: 'English',
    marathi: 'मराठी',
    howToUse: 'How to Use',
    noImage: 'No Image',
    closeSettings: 'Close Settings',
    instructions: [
      '1. Enter the Session ID provided by your admin',
      '2. Click "Join Session" to start your duty',
      '3. Scan student QR codes when they want to exit or return',
      '4. The system will automatically record their exit/entry time',
      '5. After scanning, you can scan the next student',
    ],
  },
  mr: {
    title: 'गार्ड पोर्टल',
    joinSession: 'प्रशासक सत्रात सामील व्हा',
    enterSessionId: 'सत्र आयडी प्रविष्ट करा',
    joinButton: 'सत्रात सामील व्हा',
    logout: 'लॉग आउट',
    scanQRCode: 'विद्यार्थी QR कोड स्कॅन करा',
    leaveSession: 'सत्र सोडा',
    studentCard: 'विद्यार्थी ओळखपत्र',
    name: 'नाव',
    room: 'खोली',
    department: 'विभाग',
    action: 'कृती',
    goingHome: 'घरी जात आहे',
    returning: 'परत येत आहे',
    scanAgain: 'पुन्हा स्कॅन करा',
    grantPermission: 'परवानगी द्या',
    permissionText: 'QR कोड स्कॅन करण्यासाठी आम्हाला कॅमेरा वापरण्याची परवानगी आवश्यक आहे.',
    loggingOut: 'लॉग आउट करत आहे...',
    loadingDetails: 'गार्ड तपशील लोड करत आहे...',
    settings: 'सेटिंग्ज',
    language: 'भाषा',
    english: 'English',
    marathi: 'मराठी',
    howToUse: 'कसे वापरावे',
    noImage: 'चित्र नाही',
    closeSettings: 'सेटिंग्ज बंद करा',
    instructions: [
      '१. तुमच्या प्रशासकाने दिलेला सत्र आयडी प्रविष्ट करा',
      '२. तुमची ड्युटी सुरू करण्यासाठी "सत्रात सामील व्हा" वर क्लिक करा',
      '३. विद्यार्थी बाहेर जाऊ इच्छित असताना किंवा परत येताना त्यांचे QR कोड स्कॅन करा',
      '४. सिस्टम आपोआप त्यांचा बाहेर पडण्याची/प्रवेशाची वेळ रेकॉर्ड करेल',
      '५. स्कॅन केल्यानंतर, तुम्ही पुढील विद्यार्थ्याला स्कॅन करू शकता',
    ],
  },
};

const GuardScanner = () => {
  const { user, signOut } = useAuth();
  const [scanned, setScanned] = useState(false);
  const [studentDetails, setStudentDetails] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [guardCollegeId, setGuardCollegeId] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [isSessionJoined, setIsSessionJoined] = useState(false);
  const [guardDetailsLoaded, setGuardDetailsLoaded] = useState(false);
  const [studentImage, setStudentImage] = useState(null);
  const [language, setLanguage] = useState('en');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customAlert,setCustomAlert] = useState({visible:false,title:'',message:'',buttons:[]})
  // Individual loading states
  const [joinLoading, setJoinLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [customIndicator, setCustomIndicator] = useState(false);

  // Refs to prevent multiple simultaneous scans
  const scanningRef = useRef(false);
  const logoutTimerRef = useRef(null);

  const t = translations[language];

  const showAlert = useCallback((title,message,buttons=[])=>{
    setCustomAlert({visible:true,title:title,message:message,buttons:buttons});
  });
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
      }
    };
  }, []);

  // Load language preference
  useEffect(() => {
    const loadLanguage = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('language_preference')
          .eq('id', user.id)
          .single();
        
        if (data?.language_preference) {
          setLanguage(data.language_preference);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      }
    };
    loadLanguage();
  }, [user?.id]);

  const fetchGuardDetails = useCallback(async () => {
    if (!user?.id) return;

    try {
      setCustomIndicator(true);
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

  const changeLanguage = async (newLanguage) => {
    try {
      setLanguage(newLanguage);
      
      // Save to database
      const { error } = await supabase
        .from('profiles')
        .update({ language_preference: newLanguage })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving language:', error);
      Alert.alert('Error', 'Failed to save language preference');
    }
  };

  const joinSession = useCallback(async () => {
    const trimmedSessionId = sessionId.trim();
    
    if (!trimmedSessionId) {
      Alert.alert('Error', 'Please enter a session ID.');
      return;
    }

    try {
      setJoinLoading(true);

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('id, college_id')
        .eq('guard_id', trimmedSessionId)
        .maybeSingle();

      if (sessionError) throw sessionError;
      
      if (!sessionData) {
        throw new Error('Invalid session ID or session not found');
      }

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
      showAlert('Success', 'Session joined successfully!',[{text:'Ok'}]);
      setSessionId('');
    } catch (error) {
      console.error("Error joining session:", error);
      Alert.alert('Error', error.message || 'Failed to join session');
    } finally {
      setJoinLoading(false);
    }
  }, [sessionId, user?.id, fetchGuardDetails]);

  const handleBarCodeScanned = useCallback(async ({ data }) => {
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

      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('name, room_number, department, college_id, parent_phone, profile_image')
        .eq('id', student_id)
        .single();

      if (studentError) throw studentError;

      if (student.college_id !== guardCollegeId) {
        Alert.alert('Error', 'You can only approve requests for students from your college.');
        setScanned(false);
        scanningRef.current = false;
        setScanLoading(false);
        return;
      }

      if (student.profile_image) {
        setStudentImage(student.profile_image);
      }

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
      setSettingsVisible(false);
      showAlert('Success', 'Left session successfully');
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
      setSettingsVisible(false);
      
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

  // Settings Modal Component
 // Settings Modal Component
 const SettingsModal = () => (
  <Modal
    visible={settingsVisible}
    animationType="slide"
    transparent={true}
    onRequestClose={() => setSettingsVisible(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        {/* Header with Close Button */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t.settings}</Text>
          <Pressable
            style={styles.modalCloseButton}
            onPress={() => setSettingsVisible(false)}
          >
            <MemoizedMaterialIcons name="close" size={28} color="#334155" />
          </Pressable>
        </View>
        
        {/* Scrollable Content */}
        <ScrollView 
          style={styles.modalScrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalScrollContent}
        >
          {/* Language Selection */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>{t.language}</Text>
            <View style={styles.languageButtons}>
              <Pressable
                style={[
                  styles.languageButton,
                  language === 'en' && styles.languageButtonActive
                ]}
                onPress={() => changeLanguage('en')}
              >
                <Text style={[
                  styles.languageButtonText,
                  language === 'en' && styles.languageButtonTextActive
                ]}>
                  {t.english}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.languageButton,
                  language === 'mr' && styles.languageButtonActive
                ]}
                onPress={() => changeLanguage('mr')}
              >
                <Text style={[
                  styles.languageButtonText,
                  language === 'mr' && styles.languageButtonTextActive
                ]}>
                  {t.marathi}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* How to Use */}
          <View style={styles.settingSection}>
            <Text style={styles.settingLabel}>{t.howToUse}</Text>
            <View style={styles.instructionsContainer}>
              {t.instructions.map((instruction, index) => (
                <Text key={index} style={styles.instructionText}>
                  {instruction}
                </Text>
              ))}
            </View>
          </View>

          {/* Action Buttons */}
          {isSessionJoined && (
            <Pressable
              style={[styles.secondaryButton, leaveLoading && styles.disabledButton]}
              onPress={()=>[
                showAlert('Session','Do You really want to leave the session',[
                  {text:'Yes',style:'destructive',onPress:leaveSession},
                  {text:'Cancel',style:'cancel'}
                ])
              ]}
              disabled={leaveLoading}
            >
              {leaveLoading ? (
                <ActivityIndicator color="#3b82f6" />
              ) : (
                <Text style={styles.secondaryButtonText}>{t.leaveSession}</Text>
              )}
            </Pressable>
          )}

          <Pressable
            style={[styles.dangerButton, logoutLoading && styles.disabledButton]}
            onPress={()=>{
              showAlert('Logout',
                 'Do you really want to Logout?',
                  [{text:'Yes',onPress:onLogout},
                    {text:'Cancel',style:'cancel'}
                  ]
        
              )
            }}
            disabled={logoutLoading}
          >
            {logoutLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>{t.logout}</Text>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

  const PermissionView = useMemo(() => (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.headerGradient}>
        <Text style={styles.title}>{t.title}</Text>
      </LinearGradient>
      <View style={styles.contentContainer}>
        <Text style={styles.permissionText}>
          {t.permissionText}
        </Text>
        <Pressable 
          style={styles.primaryButton}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>{t.grantPermission}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  ), [requestPermission, language]);

  const StudentCard = useMemo(() => {
    if (!studentDetails) return null;

    return (
      <View style={styles.studentCardContainer}>
        <View style={styles.studentCard}>
          <Text style={styles.cardTitle}>{t.studentCard}</Text>
          
          {studentImage ? (
            <Image 
              source={{ uri: studentImage }} 
              style={styles.studentImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>{t.noImage}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t.name}:</Text>
            <Text style={styles.detailValue}>{studentDetails.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t.room}:</Text>
            <Text style={styles.detailValue}>{studentDetails.room_number}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t.department}:</Text>
            <Text style={styles.detailValue}>{studentDetails.department || 'Computer Technology'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t.action}:</Text>
            <Text style={[
              styles.detailValue, 
              styles.statusBadge,
              studentDetails.type === 'exit' ? styles.exitBadge : styles.returnBadge
            ]}>
              {studentDetails.type === 'exit' ? t.goingHome : t.returning}
            </Text>
          </View>
        </View>
        
        <Pressable
          style={styles.primaryButton}
          onPress={handleScanAgain}
        >
          <Text style={styles.buttonText}>{t.scanAgain}</Text>
        </Pressable>
      </View>
    );
  }, [studentDetails, studentImage, handleScanAgain, language]);

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
        message={t.loggingOut}
        duration={LOGOUT_DELAY}
        onFinish={() => setLogoutLoading(false)}
      />
    );
  }

  if (customIndicator) {
    return <CustomIndicator />;
  }

  return (
    <ScreenWrapper>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t.title}</Text>
            <Pressable
              style={styles.settingsButton}
              onPress={() => setSettingsVisible(true)}
            >
              <MemoizedMaterialIcons 
                                name="settings" 
                                size={24} 
                                color={'#fff'} 
                              />
            </Pressable>
          </View>
        </LinearGradient>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isSessionJoined ? (
            <View style={styles.contentContainer}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t.joinSession}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t.enterSessionId}
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
                    <Text style={styles.buttonText}>{t.joinButton}</Text>
                  )}
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.scannerContainer}>
              {!guardDetailsLoaded ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>{t.loadingDetails}</Text>
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
                      <Text style={styles.overlayText}>{t.scanQRCode}</Text>
                    </View>
                  </CameraView>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <SettingsModal />
        <CustomAlert 
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onDismiss={()=>{
          setCustomAlert({visible:false,title:'',message:'',buttons:[]});
        }}
        />
      </SafeAreaView>
    </ScreenWrapper>
  );
};

export default GuardScanner;

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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: 0,
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
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
    marginBottom: 10,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingSection: {
    marginBottom: 25,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 12,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  languageButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  languageButtonTextActive: {
    color: '#3b82f6',
  },
  instructionsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 15,
  },
  instructionText: {
    fontSize: 15,
    color: '#334155',
    marginBottom: 10,
    lineHeight: 22,
  },
  closeButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseButton:{
    marginBottom:10
  }
});