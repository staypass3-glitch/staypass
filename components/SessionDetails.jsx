import { COLORS } from '@/constants/studentConstants.js';
import { useAlert } from '@/context/AlertContext.js';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { supabase } from '../lib/supabase.js';
import CustomIndicator from './CustomIndicator.jsx';
import ScreenWrapper from './ScreenWrapper.jsx';

const { width } = Dimensions.get('window');

const SessionDetails = () => {
  // Hooks
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = route.params;
  const flatListRef = useRef(null);
  const {setAlert} = useAlert();
  
  // State
  const [currentQR, setCurrentQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState(session);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [sessionInfoExpanded, setSessionInfoExpanded] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [customIndicator, setCustomIndicator] = useState(false);
  const [calendar, showCalendar] = useState(false);
  const [dateFind, setDateFind] = useState(new Date());
  const [dateInserted, setDateInserted] = useState(false);
  const [fetchedRequests, setFetchedRequests] = useState([]);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isMainAdmin, setIsMainAdmin] = useState(false);

  // Memoized values
  const { today, minDate } = useMemo(() => {
    const today = new Date();
    const minDate = new Date(sessionData.start_time);
    return { today, minDate };
  }, [sessionData.start_time]);

  // Effects
  useEffect(() => {
    if (session) {
      showSessionQR(session);
      fetchSessionStudents(session.id);
      checkIfMainAdmin(session.id);
    }
  }, [session, user]);

  useEffect(() => {
    const filtered = filterStudents(searchQuery, students);
    setFilteredStudents(filtered);
  }, [searchQuery, students, filterStudents]);

  // Helper functions
  const generateVerificationCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    return code;
  };

  const filterStudents = useCallback((query, studentList) => {
    if (query.trim() === '') {
      return studentList;
    }
    return studentList.filter(student =>
      student.name?.toLowerCase().includes(query.toLowerCase()) ||
      student.email?.toLowerCase().includes(query.toLowerCase()) ||
      student.phone_number?.includes(query)
    );
  }, []);

  // Check if current user is the main admin of this session
  const checkIfMainAdmin = async (sessionId) => {
    try {
      setCustomIndicator(true);
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('admin_id, mainAdmin')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      if (sessionData && sessionData.admin_id === user.id && sessionData.mainAdmin === true) {
        setIsMainAdmin(true);
      } else {
        setIsMainAdmin(false);
      }
      setCustomIndicator(false);
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsMainAdmin(false);
      setCustomIndicator(false);
    }
  };

  // Modal handlers
  const openDeleteModal = () => {
    const newCode = generateVerificationCode();
    setVerificationCode(newCode);
    setCodeInput('');
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setCodeInput('');
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // API functions
  const showSessionQR = async (session) => {
    try {
      setLoading(true);

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

      if (!existingQrCode || now > expiresAt) {
        const { error: upsertError } = await supabase
          .from('qrcodes')
          .upsert(
            {
              session_id: session.id,
              college_id: session.college_id,
              code: qrData,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            { onConflict: 'session_id' }
          );

        if (upsertError) throw upsertError;
      } else {
        qrData = existingQrCode.code;
      }

      setCurrentQR(qrData);
      setSessionData(session);
      
    } catch (error) {
      console.error("Error showing session Qr:", error);
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionStudents = async (sessionId) => {
    try {
      setLoadingStudents(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          phone_number,
          room_number,
          last_joined_at,
          role,
          profile_image,
          department,
          requests!requests_student_id_fkey(
            id,
            status,
            created_at,
            description,
            date_to_go,
            date_to_come
          )
        `)
        .eq('role', 'student')
        .eq('college_id', session.college_id)
        .order('last_joined_at', { ascending: false });
        
      if (error) throw error;
      setStudents(data || []);
      setFilteredStudents(data || []);
    } catch (error) {
      console.error("Error fetching session students:", error);
      showAlert('Error', 'Failed to fetch students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchRequestsForDate = async (selectedDate) => {
    try {
      setDateInserted(true);
      
      const formattedDate = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          student:profiles!requests_student_id_fkey(
            id,
            name,
            phone_number,
            room_number,
            department
          )
        `)
        .eq('college_id', session.college_id)
        .or(`actual_scan_out.gte.${formattedDate}T00:00:00,actual_scan_in.gte.${formattedDate}T00:00:00`)
        .or(`actual_scan_out.lte.${formattedDate}T23:59:59,actual_scan_in.lte.${formattedDate}T23:59:59`)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
  
      setDateInserted(false);
  
      if (data && data.length > 0) {
        setFetchedRequests(data);
        setShowDownloadModal(true);
        showAlert(
          'Data Found',
          `Found ${data.length} request(s) for ${selectedDate.toLocaleDateString()}`,
          [{ text: 'OK' }]
        );
      } else {
        showAlert(
          'No Data',
          `No requests found for ${selectedDate.toLocaleDateString()}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      setDateInserted(false);
      showAlert('Error', 'Failed to fetch data for the selected date');
    }
  };

  const deleteSession = async () => {
    try {   
      console.log('deleting');
      setCustomIndicator(true);
     
      const { error: collegeError } = await supabase
        .from('colleges')
        .delete()
        .eq('id', session.college_id)

      if (collegeError) console.error(collegeError);
      navigation.navigate('Admin');
      showAlert('Session', 'Session deleted Successfully');
    } catch (error) {
      console.log('Error occurred');
    } finally {
      setCustomIndicator(false);
    }
  };

  const handleDeleteSession = () => {
    if (codeInput.trim().toUpperCase() === generatedCode) {
      closeDeleteModal();
      deleteSession();
    } else {
      showAlert('Invalid Code', 'Please enter the correct verification code.');
    }
  };

  // CSV Generation with Destination
  const generateCSV = (requests) => {
    const headers = [
      'Student Name',
      'Phone Number',
      'Room Number',
      'Department',
      'Type',
      'Status',
      'Destination',
      'Date to Go',
      'Date to Come',
      'Description',
      'Location',
      'Created At',
      'Actual Scan Out',
      'Actual Scan In'
    ];

    const rows = requests.map(req => [
      req.student?.name || 'N/A',
      req.student?.phone_number || 'N/A',
      req.student?.room_number || 'N/A',
      req.student?.department || 'N/A',
      req.type || 'N/A',
      req.status || 'N/A',
      req.destination || 'N/A',
      req.date_to_go || 'N/A',
      req.date_to_come || 'N/A',
      req.description || 'N/A',
      req.location || 'N/A',
      req.created_at ? new Date(req.created_at).toLocaleString() : 'N/A',
      req.actual_scan_out ? new Date(req.actual_scan_out).toLocaleString() : 'N/A',
      req.actual_scan_in ? new Date(req.actual_scan_in).toLocaleString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  // Download Excel (CSV) file
  const downloadExcel = async () => {
    try {
      setCustomIndicator(true);

      const csvContent = generateCSV(fetchedRequests);
      const fileName = `requests_${dateFind.toISOString().split('T')[0]}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Download Requests Data',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        showAlert('Success', `File saved at: ${fileUri}`);
      }

      setShowDownloadModal(false);
      setCustomIndicator(false);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      setCustomIndicator(false);
      showAlert('Error', 'Failed to download Excel file');
    }
  };

  // Event handlers
  const handleStudentPress = (student) => {
    navigation.navigate('StudentHistory', { 
      student: student,
      collegeId: sessionData.college_id
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (event.type === "dismissed") {
      showCalendar(false);
      return;
    }

    if (selectedDate) {
      setDateFind(selectedDate);
      showCalendar(false);
      fetchRequestsForDate(selectedDate);
    } else {
      console.error('Error occurred in selecting the date');
    }
  };

  // Memoized components
  const datePicker = useMemo(() => (
    calendar && (
      <DateTimePicker 
        value={dateFind}
        mode="date"
        display="default"
        onChange={handleDateChange}
        minimumDate={minDate}
        maximumDate={today}
      />
    )
  ), [calendar, dateFind, minDate, today]);

  const renderStudentItem = ({ item, index }) => (
    <TouchableOpacity 
      style={[
        styles.studentCard,
        index === 0 && styles.firstStudentCard,
        index === filteredStudents.length - 1 && styles.lastStudentCard
      ]}
      onPress={() => handleStudentPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.studentAvatar}>
        <Text style={styles.avatarText}>
          {item.name ? item.name.charAt(0).toUpperCase() : '?'}
        </Text>
      </View>
      
      <View style={styles.studentContent}>
        <View style={styles.studentHeader}>
          <Text style={styles.studentName} numberOfLines={1}>
            {item.name || 'Unknown Student'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        </View>
        
        <View style={styles.studentDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={12} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.phone_number || 'No phone number'}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="home-outline" size={12} color="#64748b" />
            <Text style={styles.detailText}>
              Room {item.room_number || 'N/A'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Loading states
  if (!sessionData) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (customIndicator) {
    return <CustomIndicator />;
  }

  return (
    <ScreenWrapper bg='#fff'>
      <KeyboardAvoidingView 
        style={styles.mainContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={25} color={COLORS.primary} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.title}>Session Details</Text>
              <Text style={styles.subtitle}>
                {students.length} {students.length === 1 ? 'student' : 'students'} enrolled
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={() => setSessionInfoExpanded(!sessionInfoExpanded)}
              style={styles.infoToggle}
            >
              <Ionicons 
                name={sessionInfoExpanded ? "chevron-up" : "information-circle-outline"} 
                size={25} 
                color="#3b82f6" 
              />
            </TouchableOpacity>
          </View>

          {/* Session Info Card */}
          {sessionInfoExpanded && (
            <View style={styles.sessionInfoCard}>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={14} color="#3b82f6" />
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>
                    {new Date(sessionData.start_time).toLocaleDateString()}
                  </Text>
                </View>
               
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={14} color="#3b82f6" />
                  <Text style={styles.infoLabel}>Time</Text>
                  <Text style={styles.infoValue}>
                    {new Date(sessionData.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Ionicons name="school-outline" size={14} color="#3b82f6" />
                  <Text style={styles.infoLabel}>College</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {sessionData?.colleges?.name || 'Unknown'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.credentialsButton]}
              onPress={() => navigation.navigate('ShowCredentials', { sessionId: session?.id })}
            >
              <Ionicons name="key-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Credentials</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.deleteButton]}
              onPress={openDeleteModal}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Download Data Button */}
          <View style={styles.downloadSection}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.downloadDataButton]}
              onPress={() => showCalendar(true)}
            >
              <Ionicons name="cloud-download" size={16} color="#fff" />
              <Text style={styles.downloadButtonText}>Download Data</Text>
            </TouchableOpacity>
            
            {/* Conditionally render Admins button only for main admin */}
            {isMainAdmin && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.showAdminsButton]}
                onPress={() => {
                  navigation.navigate('AllAdmins',{collegeId:sessionData.college_id});
                }}
              >
                <Ionicons name="people" size={16} color="#fff" />
                <Text style={styles.downloadButtonText}>Admins</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Section */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={16} color="#64748b" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={16} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsText}>
                Showing {filteredStudents.length} of {students.length} students
              </Text>
              {loadingStudents && (
                <ActivityIndicator size="small" color="#3b82f6" style={styles.loadingIndicator} />
              )}
            </View>
          </View>
        </View>

        {/* Student List */}
        <FlatList
          ref={flatListRef}
          data={filteredStudents}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            !loadingStudents ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyStateTitle}>
                  {searchQuery ? 'No students found' : 'No students enrolled'}
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  {searchQuery ? 'Try adjusting your search terms' : 'Students will appear here once they join the session'}
                </Text>
              </View>
            ) : null
          }
        />

        {/* Modals */}
        {datePicker}

        <Modal
          visible={dateInserted}
          animationType="fade"
          transparent={true}
        >
          <View style={styles.loadingModalOverlay}>
            <View style={styles.loadingModalContent}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingModalText}>
                Searching for date {dateFind.toLocaleDateString()}
              </Text>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showDownloadModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowDownloadModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.downloadModalContainer}>
              <View style={styles.downloadModalHeader}>
                <Ionicons name="document-text" size={32} color="#3b82f6" />
                <Text style={styles.downloadModalTitle}>Download Data</Text>
              </View>
              
              <Text style={styles.downloadModalText}>
                Found {fetchedRequests.length} request(s) for {dateFind.toLocaleDateString()}
              </Text>
              
              <View style={styles.downloadModalActions}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowDownloadModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.modalButton, styles.downloadButton]}
                  onPress={downloadExcel}
                >
                  <Ionicons name="download-outline" size={16} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent={true}
          visible={deleteModalVisible}
          onRequestClose={closeDeleteModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Ionicons name="warning" size={20} color="#dc2626" />
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Delete Session</Text>
                  <Text style={styles.modalSubtitle}>This action cannot be undone</Text>
                </View>
                <TouchableOpacity onPress={closeDeleteModal} style={styles.closeButton}>
                  <Ionicons name="close" size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>
                  You are about to permanently delete this session and all associated data. 
                  This will remove student records and cannot be recovered.
                </Text>
                
                <View style={styles.verificationSection}>
                  <Text style={styles.verificationLabel}>
                    Enter this verification code to continue:
                  </Text>
                  <View style={styles.verificationCodeContainer}>
                    <Text style={styles.verificationCode}>
                      {generatedCode}
                    </Text>
                  </View>
                </View>
                
                <TextInput
                  style={styles.codeInput}
                  placeholder="Enter code here"
                  placeholderTextColor="#94a3b8"
                  value={codeInput}
                  onChangeText={setCodeInput}
                  autoCorrect={false}
                  returnKeyType="done"
                  selectionColor="#3b82f6"
                />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={closeDeleteModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.modalButton, 
                      styles.confirmDeleteButton,
                      !codeInput.trim() && styles.disabledButton
                    ]}
                    onPress={handleDeleteSession}
                    disabled={!codeInput.trim()}
                  >
                    <Text style={styles.confirmDeleteButtonText}>Delete Session</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  // Header Section
  headerSection: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  header: {
    marginTop:20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 6,
    marginRight: '7%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  infoToggle: {
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  // Session Info Card
  sessionInfoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  infoGrid: {
    gap: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    width: 50,
  },
  infoValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  downloadSection: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  credentialsButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#dc2626',
  },
  downloadDataButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
  },
  showAdminsButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Search Section
  searchSection: {
    gap: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  resultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultsText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  loadingIndicator: {
    marginLeft: 6,
  },
  // Student List
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  firstStudentCard: {
    marginTop: 0,
  },
  lastStudentCard: {
    marginBottom: 0,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  studentContent: {
    flex: 1,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  studentDetails: {
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fef2f2',
  },
  modalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#ef4444',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  verificationSection: {
    marginBottom: 16,
  },
  verificationLabel: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  verificationCodeContainer: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  verificationCode: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: 2,
  },
  codeInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  confirmDeleteButton: {
    backgroundColor: '#dc2626',
  },
  downloadButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    gap: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Download Modal
  downloadModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    width: '90%',
    maxWidth: 380,
  },
  downloadModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  downloadModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 10,
  },
  downloadModalText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  downloadModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  // Loading Modal
  loadingModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    minWidth: 220,
  },
  loadingModalText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
});

export default SessionDetails;