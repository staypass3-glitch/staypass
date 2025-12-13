import { MaterialIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
    destination: 'Destination',
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
    parentNotified: 'Parent Notified via SMS',
    parentNotificationFailed: 'Failed to notify parent',
    smsNotificationSent: 'SMS sent to parent successfully',
    smsNotificationFailed: 'Failed to send SMS to parent',
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
    destination: 'गंतव्य स्थान',
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
    parentNotified: 'पालकांना एसएमएस द्वारे सूचित केले',
    parentNotificationFailed: 'पालकांना सूचित करण्यात अयशस्वी',
    smsNotificationSent: 'पालकांना एसएमएस पाठवला',
    smsNotificationFailed: 'पालकांना एसएमएस पाठविण्यात अयशस्वी',
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
  const [customAlert,setCustomAlert] = useState({visible:false,title:'',message:'',buttons:[]});
  const [smsNotificationStatus, setSmsNotificationStatus] = useState(null);
  // Individual loading states
  const [joinLoading, setJoinLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [customIndicator, setCustomIndicator] = useState(false);
  const [loggingOut,setLoggingOut] = useState(false);
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

  async function notifyStudentOfScan(studentId) {
    try {
      const { data, error } = await supabase
        .from("user_push_tokens")
        .select("expo_push_token")
        .eq("user_id", studentId);

      if (error) {
        console.error("Error fetching tokens:", error);
        return false;
      }

      if (!data || data.length === 0) {
        console.log("No push tokens found for student:", studentId);
        return false;
      }

      // Extract tokens and filter invalid ones
      const tokens = data
        .map(item => item.expo_push_token)
        .filter(token => token && token.startsWith("ExponentPushToken"));

      if (tokens.length === 0) {
        console.log("No valid Expo tokens found.");
        return false;
      }

      console.log("Sending notification to", tokens.length, "devices");

      const messages = tokens.map(token => ({
        to: token,
        title: "Scan Successful",
        body: "Your QR code was scanned.",
        data: { refresh: true },
        priority: "high",
      }));

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),  
      });

      const result = await response.json();
      console.log("Push response:", result);
      return true;
    } catch (error) {
      console.error("Failed to send push notification:", error);
      return false;
    }
  }

  async function notifyParentViaSMS(studentName, destination, parentPhone, type) {
    try {
      // Validate phone number
      if (!parentPhone || parentPhone.trim() === '') {
        console.log('Parent phone number not available');
        return { success: false, message: 'Parent phone number not available' };
      }

      // Clean phone number (remove spaces, dashes, etc.)
      const cleanedPhone = parentPhone.replace(/\D/g, '');
      
      // Validate Indian phone number format
      if (!cleanedPhone.startsWith('91') || cleanedPhone.length !== 12) {
        console.log('Invalid phone number format:', parentPhone);
        return { success: false, message: 'Invalid phone number format' };
      }

      const now = new Date();
      const date = now.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
      const time = now.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });

      const notificationData = {
        studentName: studentName,
        destination: destination,
        date: date,
        time: time,
        type: type // 'exit' or 'return'
      };

      console.log('Sending SMS to parent:', {
        phone: cleanedPhone,
        studentName,
        destination,
        type
      });

      const { data, error } = await supabase.functions.invoke('notify-parent-sms', {
        body: {
          notification: notificationData,
          parent_phone: cleanedPhone
        }
      });

      if (error) {
        console.error('Error sending parent SMS:', error);
        return { success: false, message: error.message || 'Failed to send SMS' };
      }

      console.log(`Parent SMS sent successfully for ${type}:`, data);
      return { success: true, message: data?.message || 'SMS sent successfully' };
    } catch (error) {
      console.error('Failed to send parent SMS notification:', error);
      return { success: false, message: error.message || 'Network error' };
    }
  }

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
      
      setIsSessionJoined(!!guardProfile.current_session_id && !!guardProfile.college_id);
    } catch (error) {
      console.error("Error fetching guard's details:", error);
      showAlert('Error', error.message || 'Failed to load guard details');
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
      showAlert('Error', 'Failed to save language preference');
    }
  };

  const joinSession = useCallback(async () => {
    const trimmedSessionId = sessionId.trim();
    
    if (!trimmedSessionId) {
      showAlert('Error', 'Please enter a session ID.');
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
      showAlert('Error', error.message || 'Failed to join session');
    } finally {
      setJoinLoading(false);
    }
  }, [sessionId, user?.id, fetchGuardDetails]);

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    if (scanningRef.current || !guardDetailsLoaded || !guardCollegeId) {
      if (!guardDetailsLoaded || !guardCollegeId) {
        showAlert('Error', 'Guard details not fully loaded. Please wait.');
      }
      return;
    }

    scanningRef.current = true;
    setScanned(true);
    setScanLoading(true);
    setSmsNotificationStatus(null);

    try {
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (parseError) {
        throw new Error('Invalid QR code format: Cannot parse JSON');
      }
      
      const { student_id, type } = qrData;

      if (!student_id || !type || !['exit', 'return'].includes(type)) {
        throw new Error('Invalid QR code format: Missing student_id or invalid type');
      }

      const { data: student, error: studentError } = await supabase
        .from('profiles')
        .select('name, room_number, department, college_id, parent_phone, profile_image')
        .eq('id', student_id)
        .single();

      if (studentError) {
        if (studentError.code === 'PGRST116') {
          throw new Error('Student not found');
        }
        throw studentError;
      }

      if (student.college_id !== guardCollegeId) {
        throw new Error('You can only approve requests for students from your college');
      }

      if (student.profile_image) {
        setStudentImage(student.profile_image);
      }

      let destination = null;
      let smsResult = null;

      if (type === 'exit') {
        // Get the destination from the latest approved request
        const { data: latestRequest, error: requestError } = await supabase
          .from('requests')
          .select('destination')
          .eq('student_id', student_id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (requestError && requestError.code !== 'PGRST116') {
          console.error('Error fetching request:', requestError);
          // Don't throw error here, continue without destination
        }

        if (latestRequest) {
          destination = latestRequest.destination;
        }

        const { error: exitError } = await supabase
          .from('requests')
          .update({ actual_scan_out: new Date().toISOString() })
          .eq('student_id', student_id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1);

        if (exitError) throw exitError;

        // Send SMS to parent for EXIT
        if (student.parent_phone && destination) {
          smsResult = await notifyParentViaSMS(
            student.name,
            destination,
            student.parent_phone,
            'exit'
          );
          setSmsNotificationStatus(smsResult);
        }
      } else if (type === 'return') {
        const { data: latestRequest, error: fetchError } = await supabase
          .from('requests')
          .select('id, status, destination')
          .eq('student_id', student_id)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            throw new Error('No approved request found for this student');
          }
          throw fetchError;
        }

        if (!latestRequest) {
          throw new Error('No approved request found for this student');
        }

        destination = latestRequest.destination;

        const { error: returnError } = await supabase
          .from('requests')
          .update({
            status: 'completed',
            actual_scan_in: new Date().toISOString(),
          })
          .eq('id', latestRequest.id);

        if (returnError) throw returnError;

        // Send SMS to parent for RETURN
        if (student.parent_phone && destination) {
          smsResult = await notifyParentViaSMS(
            student.name,
            destination,
            student.parent_phone,
            'return'
          );
          setSmsNotificationStatus(smsResult);
        }
      }

      // Send push notification to student
      const pushNotificationSent = await notifyStudentOfScan(student_id);
      
      setStudentDetails({ 
        ...student, 
        type,
        destination
      });
      
      // Show success message with SMS status if applicable
      let successMessage = `Student ${type} recorded successfully!`;
      if (smsResult) {
        if (smsResult.success) {
          successMessage += `\n${t.smsNotificationSent}`;
        } else {
          successMessage += `\n${t.smsNotificationFailed}`;
        }
      }
      
      showAlert('Success', successMessage);
    } catch (error) {
      console.error('Error scanning QR code:', error);
      showAlert('Error', error.message || 'Please scan a valid QR code');
      setScanned(false);
      scanningRef.current = false;
    } finally {
      setScanLoading(false);
    }
  }, [guardDetailsLoaded, guardCollegeId, language]);

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
      showAlert('Error', 'Failed to leave session');
    } finally {
      setLeaveLoading(false);
    }
  }, [user?.id, fetchGuardDetails]);

  const onLogout = async() => {
    try{
      setLoggingOut(true);
      await signOut();
      setLoggingOut(false);
    }catch(error){
      showAlert('Error','Error occoured while logging out');
    }finally{
      setLoggingOut(false);
    }
  };

  const handleScanAgain = useCallback(() => {
    setScanned(false);
    setStudentDetails(null);
    setStudentImage(null);
    setSmsNotificationStatus(null);
    scanningRef.current = false;
  }, []);

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
          
          {/* Add Destination Row */}
          {studentDetails.destination && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t.destination}:</Text>
              <Text style={styles.destinationValue}>
                {studentDetails.destination}
              </Text>
            </View>
          )}
          
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

          {/* SMS Notification Status */}
          {smsNotificationStatus && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SMS:</Text>
              <Text style={[
                styles.detailValue,
                smsNotificationStatus.success ? styles.smsSuccess : styles.smsError
              ]}>
                {smsNotificationStatus.success ? t.parentNotified : t.parentNotificationFailed}
              </Text>
            </View>
          )}
        </View>
        
        <Pressable
          style={styles.primaryButton}
          onPress={handleScanAgain}
        >
          <Text style={styles.buttonText}>{t.scanAgain}</Text>
        </Pressable>
      </View>
    );
  }, [studentDetails, studentImage, smsNotificationStatus, handleScanAgain, language]);

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

  if (loggingOut) {
    return (
      <ScreenWrapper>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'column', alignItems: 'center', gap: 15 }}>
            <Text style={{ fontSize: 19 }}>Logging Out</Text>
            <ActivityIndicator size={50} color="#3b82f6" />
          </View>
        </View>
      </ScreenWrapper>
    );
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
  destinationValue: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: '500',
    flex: 1,
    fontStyle: 'italic',
  },
  smsSuccess: {
    color: '#10b981',
    fontWeight: '600',
  },
  smsError: {
    color: '#ef4444',
    fontWeight: '600',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#334155',
    flex: 1,
    textAlign: 'center',
  },
  modalCloseButton: {
    marginBottom: 10,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    paddingBottom: 20,
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
});