import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loading1, setLoading1] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const [description, setDescription] = useState('');
  const [destination,setDestination] = useState('');
  const [collegeId, setCollegeId] = useState(null);
  const [sessionId, setSessionId] = useState('');
  const [adminId, setAdminId] = useState('');
  const [dateToGo, setDateToGo] = useState(new Date());
  const [dateToCome, setDateToCome] = useState(new Date());
  const [showDatePickerGo, setShowDatePickerGo] = useState(false);
  const [showDatePickerCome, setShowDatePickerCome] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [lastRejectedAt, setLastRejectedAt] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [qrSwitchTimer, setQrSwitchTimer] = useState(0);
  const [qrType, setQrType] = useState(null);
  const [scanOutCompleted, setScanOutCompleted] = useState(false);
  const timerRef = useRef(null);
  const shouldGenerateReturnQRRef = useRef(false);

  const today = new Date();
  const maxDate =  new Date(today);
  maxDate.setDate(today.getDate()+7)
  // Color theme
  const colors = {
    primary: '#2563eb',
    secondary: '#3b82f6',
    tertiary: '#60a5fa',
    light: '#eff6ff',
    white: '#ffffff',
    danger: '#ef4444'
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading1(true);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('college_id, current_session_id, last_rejected_at')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        let collegeIdFromProfile = null;
        let sessionIdFromProfile = null;

        if (profileData) {
          collegeIdFromProfile = profileData.college_id;
          sessionIdFromProfile = profileData.current_session_id;
          setCollegeId(collegeIdFromProfile);
          setSessionId(sessionIdFromProfile);
          setLastRejectedAt(profileData.last_rejected_at);
        }

        if (sessionIdFromProfile) {
          const { data: adminData, error: adminDataError } = await supabase
            .from('sessions')
            .select('admin_id')
            .eq('id', sessionIdFromProfile)
            .single();

          if (adminDataError) throw adminDataError;

          if (adminData) {
            setAdminId(adminData.admin_id);
          }
        }

        const { data: requestData, error: requestError } = await supabase
          .from('requests')
          .select('status, decided_at, actual_scan_out, actual_scan_in')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (requestError && requestError.code !== 'PGRST116') throw requestError;

        if (requestData) {
          setRequestStatus(requestData.status);
          setScanOutCompleted(!!requestData.actual_scan_out);

          if (requestData.status === 'rejected') {
            setLastRejectedAt(requestData.decided_at);
          }

          if (requestData.status === 'approved') {
            if (!requestData.actual_scan_out && collegeIdFromProfile && sessionIdFromProfile) {
              generateQRCode('exit', collegeIdFromProfile, sessionIdFromProfile);
            } else if (!requestData.actual_scan_in && collegeIdFromProfile && sessionIdFromProfile) {
              generateQRCode('return', collegeIdFromProfile, sessionIdFromProfile);
            }
          }
        }
      } catch (error) {
        setError(error);
        Alert.alert('Error', error.message);
      } finally {
        setLoading1(false);
      }
    };

    if (user?.id) {
      fetchData();
    }

    const channel = supabase
      .channel('requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `student_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.actual_scan_out && !payload.old?.actual_scan_out) {
            setScanOutCompleted(true);
            startQrSwitchTimer();
          }
          fetchData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    if (lastRejectedAt) {
      const lastRejectedTime = new Date(lastRejectedAt).getTime();
      const currentTime = new Date().getTime();
      const timeDifference = (currentTime - lastRejectedTime) / 1000;

      if (timeDifference < 3 * 60 * 60) {
        const remainingTime = Math.floor(3 * 60 * 60 - timeDifference);
        setTimeRemaining(remainingTime);

        const timer = setInterval(() => {
          setTimeRemaining((prevTime) => {
            if (prevTime <= 0) {
              clearInterval(timer);
              return 0;
            }
            return prevTime - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      } else {
        setTimeRemaining(0);
      }
    }
  }, [lastRejectedAt]);

  const startQrSwitchTimer = () => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Reset the flag
    shouldGenerateReturnQRRef.current = false;
    
    setQrSwitchTimer(15);
    
    timerRef.current = setInterval(() => {
      setQrSwitchTimer((prev) => {
        if (prev > 0) {
          return prev - 1;
        }
        
        // When timer reaches 0
        clearInterval(timerRef.current);
        shouldGenerateReturnQRRef.current = true;
        
        // Use setTimeout to ensure state update completes
        setTimeout(() => {
          if (shouldGenerateReturnQRRef.current && collegeId && sessionId) {
            generateQRCode('return', collegeId, sessionId);
          }
        }, 0);
        
        return 0;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';

    seconds = Math.floor(seconds);

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const submitRequest = async () => {
    if (!description.trim() || !dateToGo || !dateToCome) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!collegeId) {
      Alert.alert('Error', 'College ID not found or admin id');
      return;
    }

    if (lastRejectedAt) {
      const lastRejectedTime = new Date(lastRejectedAt).getTime();
      const currentTime = new Date().getTime();
      const timeDifference = (currentTime - lastRejectedTime) / (1000 * 60 * 60);

      if (timeDifference < 3) {
        Alert.alert('Error', 'You can only submit a new request after 3 hours from the last rejection.');
        return;
      }
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('requests')
        .insert([
          {
            student_id: user.id,
            college_id: collegeId,
            description,
            date_to_go: dateToGo.toISOString().split('T')[0],
            date_to_come: dateToCome.toISOString().split('T')[0],
            session_id: sessionId,
            admin_id: adminId,
            status: 'pending',
          },
        ]);

      if (error) throw error;

      Alert.alert('Success', 'Request submitted successfully');
      setDescription('');
      setDateToGo(new Date());
      setDateToCome(new Date());
      setRequestStatus('pending');
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onLeave = async () => {
    Alert.alert(
      'Leave Session',
      'Are you sure you want to leave this session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({
                college_id: null,
                current_session_id: null,
              })
              .eq('id', user.id);

            if (error) throw error;

            navigation.navigate('Student');
          },
        },
      ]
    );
  };

  const generateQRCode = (type, collegeId, sessionId) => {
    setGeneratingQR(true);
    try {
      const qrData = JSON.stringify({
        student_id: user.id,
        session_id: sessionId,
        college_id: collegeId,
        type,
        timestamp: new Date().toISOString(),
      });
      setQrData(qrData);
      setQrType(type);
      
      // Reset the flag after generating QR
      if (type === 'return') {
        shouldGenerateReturnQRRef.current = false;
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setGeneratingQR(false);
    }
  };

  if (!collegeId) {
    return (
      <LinearGradient colors={[colors.light, colors.white]} style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={[colors.light, colors.white]} style={styles.container}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Error: {error.message}</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.light, colors.white]} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Student Dashboard</Text>
          <Text style={styles.subtitle}>Manage your leave requests</Text>
        </View>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                onLeave();
              }}
            >
              <Ionicons name="exit-outline" size={20} color={colors.danger} />
              <Text style={[styles.menuItemText, { color: colors.danger }]}>Leave Session</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          {requestStatus === 'approved' && (
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: '#10b981' }]}>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={[styles.statusText, { color: 'white' }]}>Approved</Text>
              </View>
              <Text style={styles.statusMessage}>Your request has been approved!</Text>
              
              {qrData ? (
                <View style={styles.qrContainer}>
                  <View style={styles.qrBackground}>
                    <QRCode value={qrData} size={200} color={'#000'} backgroundColor="transparent" />
                  </View>
                  <Text style={styles.qrNote}>
                    {qrType === 'exit'
                      ? 'Show this QR code to the guard when going home.'
                      : 'Show this QR code to the guard when returning.'}
                  </Text>
                  
                  {scanOutCompleted && qrType === 'exit' && qrSwitchTimer > 0 && (
                    <View style={styles.qrTimerContainer}>
                      <Text style={styles.qrTimerText}>QR will change in: {qrSwitchTimer}s</Text>
                    </View>
                  )}
                </View>
              ) : generatingQR ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
              ) : null}
            </View>
          )}

          {requestStatus === 'rejected' && (
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: colors.danger }]}>
                <Ionicons name="close-circle" size={20} color="white" />
                <Text style={[styles.statusText, { color: 'white' }]}>Rejected</Text>
              </View>
              <Text style={styles.statusMessage}>Your request has been rejected. You can submit a new request after:</Text>
              <View style={styles.timerContainer}>
                <Text style={[styles.timerText, { color: colors.danger }]}>{formatTime(timeRemaining)}</Text>
              </View>
            </View>
          )}

          {requestStatus === 'pending' && (
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: colors.secondary }]}>
                <Ionicons name="time" size={20} color="white" />
                <Text style={[styles.statusText, { color: 'white' }]}>Pending</Text>
              </View>
              <Text style={styles.statusMessage}>Your request is under review. Please wait for approval.</Text>
            </View>
          )}

          {requestStatus !== 'approved' && requestStatus !== 'pending' && (
            <>
              <Text style={styles.label}>Request Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your reason for leave..."
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
              />
<Text style={styles.label}>Destination</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Your Destination"
                placeholderTextColor="#9ca3af"
                value={destination}
                onChangeText={setDestination}
              />
              <Text style={styles.label}>Date to Go</Text>
              <TouchableOpacity onPress={() => setShowDatePickerGo(true)}>
                <View style={styles.dateInput}>
                  <Ionicons name="calendar" size={20} color={colors.primary} style={styles.dateIcon} />
                  <Text style={styles.dateText}>{dateToGo.toDateString()}</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.label}>Date to Come</Text>
              <TouchableOpacity onPress={() => setShowDatePickerCome(true)}>
                <View style={styles.dateInput}>
                  <Ionicons name="calendar" size={20} color={colors.primary} style={styles.dateIcon} />
                  <Text style={styles.dateText}>{dateToCome.toDateString()}</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={submitRequest}
                disabled={loading || timeRemaining > 0}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        {showDatePickerGo && (
          <DateTimePicker
            value={dateToGo}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePickerGo(false);
              if (selectedDate) {
                setDateToGo(selectedDate);
              }
            }}
            minimumDate={today}
            maximumDate={maxDate}
          />
        )}

        {showDatePickerCome && (
          <DateTimePicker
            value={dateToCome}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePickerCome(false);
              if (selectedDate) {
                setDateToCome(selectedDate);
              }
            }}
            minimumDate={dateToGo}
          />
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Styles remain the same as in the original component
  // (I've kept the entire original styles section)
  container: {
    flex: 1,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  menuButton: {
    padding: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 20,
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    width: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    minHeight: 100,
    backgroundColor: '#f9fafb',
    fontSize: 16,
    color: '#1f2937',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    backgroundColor: '#f9fafb',
  },
  dateIcon: {
    marginRight: 10,
  },
  dateText: {
    fontSize: 16,
    color: '#1f2937',
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  statusMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 10,
  },
  timerContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  qrBackground: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  qrNote: {
    marginTop: 15,
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 14,
    maxWidth: '80%',
  },
  qrTimerContainer: {
    marginTop: 10,
    backgroundColor: '#e0f2fe',
    padding: 8,
    borderRadius: 8,
  },
  qrTimerText: {
    color: '#0369a1',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default StudentDashboard;