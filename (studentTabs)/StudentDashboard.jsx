import ScreenWrapper from '@/components/ScreenWrapper';
import fonts from '@/constants/fonts';
import theme from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import CustomAlert from '../components/CustomAlert.jsx';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

// Constants - moved outside component
const QR_SWITCH_DELAY = 15;
const REJECTION_COOLDOWN = 3 * 60 * 60;
const LOGOUT_DELAY = 2000;

const COLORS = {
  primary: '#2563eb',
  secondary: '#3b82f6',
  tertiary: '#60a5fa',
  light: '#eff6ff',
  white: '#ffffff',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  dark: '#1e293b'
};

// Memoized helper functions
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds <= 0) return '';
  seconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getStatusColor = (status) => {
  const colors = {
    approved: COLORS.success,
    rejected: COLORS.danger,
    pending: COLORS.warning
  };
  return colors[status] || COLORS.dark;
};

const StudentDashboard = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  
  // Consolidated state
  const [state, setState] = useState({
    loading: false,
    loading1: false,
    error: null,
    description: '',
    collegeId: null,
    sessionId: '',
    adminId: '',
    dateToGo: new Date(),
    dateToCome: new Date(),
    showDatePickerGo: false,
    showDatePickerCome: false,
    qrData: null,
    lastRejectedAt: null,
    requestStatus: null,
    timeRemaining: 0,
    generatingQR: false,
    showMenu: false,
    qrSwitchTimer: 0,
    qrType: null,
    scanOutCompleted: false,
    requestHistory: [],
    profileData: null,
    refreshing: false,
    logoutLoading: false,
    showReachedHomeModal: false,
    currentRequestId: null,
    savingLocation: false
  });

  const [customAlert, setCustomAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    buttons: [] 
  });

  // Refs
  const timerRef = useRef(null);
  const qrFadeAnim = useRef(new Animated.Value(0)).current;
  const subscriptionRef = useRef(null);

  // Memoized date values
  const { today, maxDate } = useMemo(() => {
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 7);
    return { today, maxDate };
  }, []);

  // Optimized state updater
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Alert handler
  const showAlert = useCallback((title, message, buttons = []) => {
    setCustomAlert({ visible: true, title, message, buttons });
  }, []);

  // Get current location - memoized
  const getCurrentLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  }, []);

  // QR Code generation - optimized
  const generateQRCode = useCallback((type, collegeId, sessionId) => {
    try {
      const qrData = {
        type,
        college_id: collegeId,
        session_id: sessionId,
        student_id: user.id,
        timestamp: new Date().toISOString()
      };
      
      updateState({
        qrData: JSON.stringify(qrData),
        qrType: type,
        generatingQR: false
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      showAlert('Error', 'Failed to generate QR code', [{ text: 'OK' }]);
      updateState({ generatingQR: false });
    }
  }, [user?.id, updateState, showAlert]);

  // Save location - optimized
  const saveLocationToDatabase = useCallback(async () => {
    try {
      updateState({ savingLocation: true });

      const location = await getCurrentLocation();
      const locationString = `${location.latitude},${location.longitude}`;

      const { error } = await supabase
        .from('requests')
        .update({ location: locationString })
        .eq('id', state.currentRequestId);

      if (error) throw error;

      updateState({ showReachedHomeModal: false, savingLocation: false });
      
      if (state.collegeId && state.sessionId) {
        generateQRCode('return', state.collegeId, state.sessionId);
      }

      showAlert('Success', 'Location saved successfully! Return QR code is now ready.', [{ text: 'OK' }]);
      fetchData();
    } catch (error) {
      console.error('Error saving location:', error);
      showAlert('Error', error.message || 'Failed to save location. Please try again.', [{ text: 'OK' }]);
      updateState({ savingLocation: false });
    }
  }, [state.currentRequestId, state.collegeId, state.sessionId, getCurrentLocation, showAlert, generateQRCode]);

  // Data fetching - optimized with early returns
  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      updateState({ loading1: true, error: null });
      
      // Parallel fetch for better performance
      const [profileResult, historyResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, colleges(name)')
          .eq('id', user.id)
          .single(),
        supabase
          .from('requests')
          .select('*')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (profileResult.error) throw profileResult.error;

      const profileData = profileResult.data;
      const collegeId = profileData.college_id;
      const sessionId = profileData.current_session_id;

      // Fetch admin data if session exists
      let adminId = '';
      if (sessionId) {
        const { data: adminData, error: adminError } = await supabase
          .from('sessions')
          .select('admin_id')
          .eq('id', sessionId)
          .single();

        if (!adminError && adminData) {
          adminId = adminData.admin_id;
        }
      }

      // Fetch current request
      const { data: requestData, error: requestError } = await supabase
        .from('requests')
        .select('id, status, decided_at, actual_scan_out, actual_scan_in, location')
        .eq('student_id', user.id)
        .eq('college_id', user.collegeId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestError && requestError.code !== 'PGRST116') throw requestError;

      // Update all state at once
      const updates = {
        collegeId,
        sessionId,
        adminId,
        lastRejectedAt: profileData.last_rejected_at,
        profileData,
        requestHistory: historyResult.data || [],
        loading1: false
      };

      if (requestData) {
        updates.currentRequestId = requestData.id;
        updates.requestStatus = requestData.status;
        updates.scanOutCompleted = !!requestData.actual_scan_out;

        if (requestData.status === 'rejected') {
          updates.lastRejectedAt = requestData.decided_at;
        }

        // Handle QR generation
        if (requestData.status === 'approved') {
          if (!requestData.actual_scan_out && collegeId && sessionId) {
            setTimeout(() => generateQRCode('exit', collegeId, sessionId), 100);
          } else if (requestData.actual_scan_out && !requestData.location) {
            updates.showReachedHomeModal = true;
          } else if (requestData.location && !requestData.actual_scan_in && collegeId && sessionId) {
            setTimeout(() => generateQRCode('return', collegeId, sessionId), 100);
          }
        }
      }

      updateState(updates);

    } catch (error) {
      console.error('Error fetching data:', error);
      updateState({ error, loading1: false });
      showAlert('Error', error.message || 'Failed to fetch data', [{ text: 'OK' }]);
    }
  }, [user?.id, generateQRCode, updateState, showAlert]);

  // Request submission - optimized validation
  const submitRequest = useCallback(async () => {
    const trimmedDescription = state.description.trim();
    
    // Validation
    if (!trimmedDescription) {
      showAlert('Error', 'Please enter a description', [{ text: 'OK' }]);
      return;
    }

    if (state.dateToCome <= state.dateToGo) {
      showAlert('Error', 'Return date must be after departure date', [{ text: 'OK' }]);
      return;
    }

    if (!state.collegeId) {
      showAlert('Error', 'College ID not found', [{ text: 'OK' }]);
      return;
    }

    if (state.lastRejectedAt) {
      const timeDifference = (Date.now() - new Date(state.lastRejectedAt).getTime()) / (1000 * 60 * 60);
      if (timeDifference < 3) {
        showAlert('Error', 'You can only submit a new request after 3 hours from the last rejection.', [{ text: 'OK' }]);
        return;
      }
    }

    try {
      updateState({ loading: true });

      const { error } = await supabase
        .from('requests')
        .insert([{
          student_id: user.id,
          college_id: state.collegeId,
          description: trimmedDescription,
          date_to_go: state.dateToGo.toISOString().split('T')[0],
          date_to_come: state.dateToCome.toISOString().split('T')[0],
          session_id: state.sessionId,
          admin_id: state.adminId,
          status: 'pending',
        }]);

      if (error) throw error;

      showAlert('Success', 'Request submitted successfully', [{ text: 'OK' }]);
      updateState({ 
        description: '', 
        dateToGo: new Date(), 
        dateToCome: new Date(),
        loading: false 
      });
      fetchData();
    } catch (error) {
      console.error('Error submitting request:', error);
      showAlert('Error', error.message || 'Failed to submit request', [{ text: 'OK' }]);
      updateState({ loading: false });
    }
  }, [state.description, state.dateToGo, state.dateToCome, state.collegeId, state.sessionId, state.adminId, state.lastRejectedAt, user?.id, fetchData, showAlert, updateState]);

  // Session management - optimized
  const onLeave = useCallback(async () => {
    showAlert(
      'Leave Session',
      'Are you sure you want to leave this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              updateState({ loading: true });

              const { error } = await supabase
                .from('profiles')
                .update({
                  college_id: null,
                  current_session_id: null,
                  last_joined_at: null
                })
                .eq('id', user.id);

              if (error) throw error;

              showAlert('Success', 'Left session successfully!', [{ text: 'OK' }]);
              navigation.replace('Student');
            } catch (error) {
              console.error('Error leaving session:', error);
              showAlert('Error', error.message || 'Failed to leave session', [{ text: 'OK' }]);
            } finally {
              updateState({ loading: false });
            }
          },
        },
      ]
    );
  }, [user?.id, navigation, showAlert, updateState]);

  const onLogout = useCallback(async () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              updateState({ logoutLoading: true });
              
              setTimeout(async () => {
                try {
                  await signOut();
                } catch (error) {
                  console.error('Error during logout:', error);
                  updateState({ logoutLoading: false });
                  showAlert('Error', error.message || 'Failed to logout', [{ text: 'OK' }]);
                }
              }, LOGOUT_DELAY);
            } catch (error) {
              updateState({ logoutLoading: false });
              showAlert('Error', error.message || 'Failed to initiate logout', [{ text: 'OK' }]);
            }
          },
        },
      ]
    );
  }, [signOut, showAlert, updateState]);

  // Initial fetch effect
  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  // Realtime subscription effect - optimized cleanup
  useEffect(() => {
    if (!user?.id || !state.collegeId || !state.sessionId) return;

    subscriptionRef.current = supabase
      .channel(`requests-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          const { new: newData, old: oldData } = payload;

          if (newData.status === 'approved' && oldData?.status !== 'approved') {
            if (state.collegeId && state.sessionId) {
              if (!newData.actual_scan_out) {
                generateQRCode('exit', state.collegeId, state.sessionId);
              } else if (newData.location && !newData.actual_scan_in) {
                generateQRCode('return', state.collegeId, state.sessionId);
              }
            }
          }
          
          if (newData.actual_scan_out && !oldData?.actual_scan_out && !newData.location) {
            updateState({
              scanOutCompleted: true,
              qrData: null,
              qrType: null,
              currentRequestId: newData.id,
              showReachedHomeModal: true
            });
          }
          fetchData();
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user?.id, state.collegeId, state.sessionId]);

  // Rejection cooldown timer effect
  useEffect(() => {
    if (!state.lastRejectedAt) {
      updateState({ timeRemaining: 0 });
      return;
    }

    const timeDifference = (Date.now() - new Date(state.lastRejectedAt).getTime()) / 1000;

    if (timeDifference >= REJECTION_COOLDOWN) {
      updateState({ timeRemaining: 0 });
      return;
    }

    const remainingTime = Math.floor(REJECTION_COOLDOWN - timeDifference);
    updateState({ timeRemaining: remainingTime });

    const timer = setInterval(() => {
      updateState(prev => {
        const newTime = prev.timeRemaining - 1;
        if (newTime <= 0) {
          clearInterval(timer);
          return { timeRemaining: 0 };
        }
        return { timeRemaining: newTime };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [state.lastRejectedAt]);

  // QR fade animation effect
  useEffect(() => {
    if (state.qrData) {
      Animated.timing(qrFadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      qrFadeAnim.setValue(0);
    }
  }, [state.qrData, qrFadeAnim]);

  // Memoized date pickers
  const DatePickers = useMemo(() => (
    <>
      {state.showDatePickerGo && (
        <DateTimePicker
          value={state.dateToGo}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            const updates = { showDatePickerGo: false };
            if (selectedDate) {
              updates.dateToGo = selectedDate;
              const nextDay = new Date(selectedDate);
              nextDay.setDate(nextDay.getDate() + 1);
              if (state.dateToCome <= selectedDate) {
                updates.dateToCome = nextDay;
              }
            }
            updateState(updates);
          }}
          minimumDate={today}
          maximumDate={maxDate}
        />
      )}

      {state.showDatePickerCome && (
        <DateTimePicker
          value={state.dateToCome}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            updateState({
              showDatePickerCome: false,
              ...(selectedDate && { dateToCome: selectedDate })
            });
          }}
          minimumDate={state.dateToGo}
        />
      )}
    </>
  ), [state.showDatePickerGo, state.showDatePickerCome, state.dateToGo, state.dateToCome, today, maxDate, updateState]);

  // Memoized status content
  const renderStatusContent = useMemo(() => {
    if (state.requestStatus === 'approved') {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.success }]}>
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={[styles.statusText, { color: 'white' }]}>Approved</Text>
          </View>
          <Text style={styles.statusMessage}>Your request has been approved!</Text>
          
          {state.qrData && (
            <Animated.View style={[styles.qrContainer, { opacity: qrFadeAnim }]}> 
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary, COLORS.tertiary]}
                style={styles.qrGradientBorder}
              >
                <View style={styles.qrBackgroundEnhanced}>
                  <QRCode value={state.qrData} size={200} color={'#000'} backgroundColor="transparent" />
                </View>
              </LinearGradient>
              <View style={styles.qrNoteRow}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.qrNoteEnhanced}>
                  {state.qrType === 'exit'
                    ? 'Show this QR code to the guard when going home.'
                    : 'Show this QR code to the guard when returning.'}
                </Text>
              </View>
            </Animated.View>
          )}
          
          {state.generatingQR && (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
          )}
        </View>
      );
    }

    if (state.requestStatus === 'rejected' && state.timeRemaining > 0) {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.danger }]}>
            <Ionicons name="close-circle" size={20} color="white" />
            <Text style={[styles.statusText, { color: 'white' }]}>Rejected</Text>
          </View>
          <Text style={styles.statusMessage}>
            Your request has been rejected. You can submit a new request after:
          </Text>
          <View style={styles.timerContainer}>
            <Text style={[styles.timerText, { color: COLORS.danger }]}>
              {formatTime(state.timeRemaining)}
            </Text>
          </View>
        </View>
      );
    }

    if (state.requestStatus === 'pending') {
      return (
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: COLORS.warning }]}>
            <Ionicons name="time" size={20} color="white" />
            <Text style={[styles.statusText, { color: 'white' }]}>Pending</Text>
          </View>
          <Text style={styles.statusMessage}>
            Your request is under review. Please wait for approval.
          </Text>
        </View>
      );
    }

    if (state.requestStatus === null || 
      (state.requestStatus === 'rejected' && state.timeRemaining <= 0) || 
      state.requestStatus === 'completed') {
      return (
        <>
          <Text style={styles.label}>Request Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your reason for leave..."
            placeholderTextColor="#9ca3af"
            value={state.description}
            onChangeText={(text) => updateState({ description: text })}
            multiline
          />

          <Text style={styles.label}>Date to Go</Text>
          <TouchableOpacity onPress={() => updateState({ showDatePickerGo: true })}>
            <View style={styles.dateInput}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} style={styles.dateIcon} />
              <Text style={styles.dateText}>{state.dateToGo.toDateString()}</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Date to Come</Text>
          <TouchableOpacity onPress={() => updateState({ showDatePickerCome: true })}>
            <View style={styles.dateInput}>
              <Ionicons name="calendar" size={20} color={COLORS.primary} style={styles.dateIcon} />
              <Text style={styles.dateText}>{state.dateToCome.toDateString()}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.primary }]}
            onPress={submitRequest}
            disabled={state.loading || state.timeRemaining > 0}
          >
            {state.loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </>
      );
    }

    return null;
  }, [state.requestStatus, state.timeRemaining, state.qrData, state.qrType, state.generatingQR, state.description, state.dateToGo, state.dateToCome, state.loading, qrFadeAnim, submitRequest, updateState]);

  // Loading state
  if (!state.collegeId || state.loading1) {
    return (
      <LinearGradient colors={[COLORS.light, COLORS.white]} style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </LinearGradient>
    );
  }

  // Error state
  if (state.error) {
    return (
      <LinearGradient colors={[COLORS.light, COLORS.white]} style={styles.container}>
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: COLORS.danger }]}>
            Error: {state.error.message}
          </Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: COLORS.primary, marginTop: 20 }]}
            onPress={fetchData}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Logout loading state
  if (state.logoutLoading) {
    return (
      <ScreenWrapper>
        <Modal
          transparent={true}
          animationType='fade'
          visible={state.logoutLoading}
          onRequestClose={() => {}}
        >
          <View style={styles.overlay}>
            <View style={styles.popupContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Logging out...</Text>
            </View>
          </View>
        </Modal>
      </ScreenWrapper>
    );
  }

  // Main render
  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Student Dashboard</Text>
            <Text style={styles.subtitle}>
              {state.profileData?.colleges?.name || 'Current Session'}
            </Text>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          refreshControl={
            <RefreshControl 
              refreshing={state.refreshing}
              onRefresh={fetchData}
            />
          }
        >
          <View style={styles.card}>
            {renderStatusContent}
          </View>

          {DatePickers}
        </ScrollView>
      </View>
      
      {/* Reached Home Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={state.showReachedHomeModal}
        onRequestClose={() => {}}
      >
        <View style={styles.overlay}>
          <View style={styles.reachedHomeModal}>
            <Ionicons name="home" size={60} color={COLORS.success} style={{ marginBottom: 20 }} />
            <Text style={styles.reachedHomeTitle}>Press the button when you reach home.</Text>
            <Text style={styles.reachedHomeMessage}>
              Press the button below to confirm and save your location. This will make your return QR code ready.
            </Text>
            
            <TouchableOpacity
              style={[styles.button, { 
                backgroundColor: COLORS.success, 
                marginTop: 20,
                width: '100%'
              }]}
              onPress={() => {
                showAlert(
                  'Confirm Location',
                  'Have you really reached home? We will capture your current location.',
                  [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes, I have', onPress: saveLocationToDatabase },
                  ]
                );
              }}
              disabled={state.savingLocation}
            >
              {state.savingLocation ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="location" size={20} color="white" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Yes, I Reached Home</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onDismiss={() => setCustomAlert({ 
          visible: false, 
          title: '', 
          message: '', 
          buttons: [] 
        })}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: fonts.fontSizes.xxl,
    fontWeight: fonts.fontWeights.bold,
    color: theme.colors.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.gray,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  label: {
    fontSize: fonts.fontSizes.sm,
    fontWeight: fonts.fontWeights.medium,
    color: theme.colors.darkGray,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    minHeight: 100,
    backgroundColor: theme.colors.lightBackground,
    fontSize: fonts.fontSizes.md,
    color: theme.colors.darkText,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: theme.colors.lightBackground,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateText: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.darkText,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    flexDirection: 'row',
  },
  buttonText: {
    color: 'white',
    fontWeight: fonts.fontWeights.semibold,
    fontSize: fonts.fontSizes.md,
  },
  statusContainer: {
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  statusText: {
    fontSize: fonts.fontSizes.sm,
    fontWeight: fonts.fontWeights.semibold,
    marginLeft: 6,
  },
  statusMessage: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.gray,
    marginBottom: 10,
  },
  timerContainer: {
    backgroundColor: theme.colors.lightRed,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  timerText: {
    fontSize: fonts.fontSizes.xxl,
    fontWeight: fonts.fontWeights.bold,
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  qrGradientBorder: {
    padding: 3,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  qrBackgroundEnhanced: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 2,
    justifyContent: 'center',
    maxWidth: '90%',
  },
  qrNoteEnhanced: {
    color: theme.colors.primary,
    textAlign: 'center',
    fontSize: fonts.fontSizes.md,
    fontWeight: fonts.fontWeights.medium,
    maxWidth: '85%',
  },
  errorText: {
    fontSize: fonts.fontSizes.md,
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  popupContainer: {
    backgroundColor: '#eff6ff',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  reachedHomeModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  reachedHomeTitle: {
    fontSize: fonts.fontSizes.xl,
    fontWeight: fonts.fontWeights.bold,
    color: theme.colors.darkText,
    marginBottom: 15,
    textAlign: 'center',
  },
  reachedHomeMessage: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default StudentDashboard;