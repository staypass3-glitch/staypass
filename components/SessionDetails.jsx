import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { supabase } from '../lib/supabase.js';
import ScreenWrapper from './ScreenWrapper.jsx';

const { width } = Dimensions.get('window');

const SessionDetails = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { session } = route.params;
  const flatListRef = useRef(null);
  
  const [currentQR, setCurrentQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState(session);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  useEffect(() => {
    if (session) {
      showSessionQR(session);
      fetchSessionStudents(session.id);
    }
  }, [session]);

  // Optimized filter function that doesn't cause unnecessary re-renders
  const filterStudents = useCallback((query, studentList) => {
    if (query.trim() === '') {
      return studentList;
    } else {
      return studentList.filter(student =>
        student.name?.toLowerCase().includes(query.toLowerCase()) ||
        student.email?.toLowerCase().includes(query.toLowerCase()) ||
        student.phone_number?.includes(query)
      );
    }
  }, []);

  // Only update filteredStudents when searchQuery or students actually change
  useEffect(() => {
    const filtered = filterStudents(searchQuery, students);
    setFilteredStudents(filtered);
  }, [searchQuery, students, filterStudents]);

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
      setSessionData(session);
      
    } catch (error) {
      console.error("Error showing session QR:", error);
      Alert.alert('Error', error.message);
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
      Alert.alert('Error', 'Failed to fetch students');
    } finally {
      setLoadingStudents(false);
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

      setSessionData({ ...sessionData, status: 'expired' });
      Alert.alert('Success', 'Session deactivated successfully');
    } catch (error) {
      console.error("Error deactivating session:", error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentPress = (student) => {
    navigation.navigate('StudentHistory', { 
      student: student,
      collegeId: sessionData.college_id
    });
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.studentCard}
      onPress={() => handleStudentPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.studentHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.name || 'Unknown Student'}</Text>
          <Text style={styles.studentEmail}>{item.email}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
      
      <View style={styles.studentDetails}>
        <View style={styles.studentDetailRow}>
          <Ionicons name="call-outline" size={14} color="#666" />
          <Text style={styles.studentDetail}>{item.phone_number || 'No phone'}</Text>
        </View>
        
        <View style={styles.studentDetailRow}>
          <Ionicons name="home-outline" size={14} color="#666" />
          <Text style={styles.studentDetail}>Room {item.room_number || 'N/A'}</Text>
        </View>
        
        <View style={styles.studentDetailRow}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.studentDetail}>
            Joined: {item.last_joined_at ? new Date(item.last_joined_at).toLocaleString() : 'Unknown'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const copySessionId = (id) => {
    Clipboard.setString(id);
    Alert.alert('Copied!', 'Session ID copied to clipboard');
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  if (!sessionData) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  return (
    <ScreenWrapper bg='#fff'>
      <KeyboardAvoidingView 
        style={styles.mainContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
      >
        {/* Fixed Header Section */}
        <View style={styles.headerContainer}>
          {/* Header with back button and title */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#4361ee" />
            </TouchableOpacity>
            <Text style={styles.title}>Session Details</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          {/* Session Info Section */}
          <View style={styles.sessionInfoCard}>
            <Text style={styles.sectionTitle}>Session Information</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.infoLabel}>Start Date:</Text>
              <Text style={styles.infoValue}>
                {new Date(sessionData.start_time).toLocaleDateString()}
              </Text>
            </View>
           
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.infoLabel}>Start Time:</Text>
              <Text style={styles.infoValue}>
                {new Date(sessionData.start_time).toLocaleTimeString()}
              </Text>
            </View>
            
            {sessionData.end_time && (
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.infoLabel}>End Time:</Text>
                <Text style={styles.infoValue}>
                  {new Date(sessionData.end_time).toLocaleTimeString()}
                </Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Ionicons name="school-outline" size={16} color="#666" />
              <Text style={styles.infoLabel}>College:</Text>
              <Text style={styles.infoValue}>
                {sessionData?.colleges?.name || 'Unknown college'}
              </Text>
            </View>
            
            {/* Enhanced Session Credentials Button */}
            <TouchableOpacity 
              style={styles.credentialsButton}
              onPress={() => {
                navigation.navigate('ShowCredentials', { sessionId: session?.id })
              }}
            >
              <View style={styles.credentialsButtonContent}>
                <Ionicons name="key-outline" size={20} color="#fff" />
                <Text style={styles.credentialsButtonText}>
                  Session Credentials
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Student List Section Header with Search */}
          <View style={styles.studentListSection}>
            <View style={styles.studentSectionHeader}>
              <Text style={styles.sectionTitle}>Students in Session</Text>
              {loadingStudents && (
                <ActivityIndicator size="small" color="#4361ee" style={styles.loadingIndicator} />
              )}
            </View>
            
            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search students by name"
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {students.length === 0 && !loadingStudents ? (
              <Text style={styles.noStudentsText}>No students in this session yet.</Text>
            ) : filteredStudents.length === 0 && searchQuery ? (
              <Text style={styles.noStudentsText}>No students found matching your search.</Text>
            ) : students.length > 0 && (
              <Text style={styles.searchResultsText}>
                Showing {filteredStudents.length} of {students.length} students
              </Text>
            )}
          </View>
        </View>

        {/* Scrollable Student List */}
        <FlatList
          ref={flatListRef}
          data={filteredStudents}
          renderItem={renderStudentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          ListEmptyComponent={
            !loadingStudents && students.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No students in this session</Text>
              </View>
            ) : null
          }
        />
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
  },
  flatListContent: {
    paddingBottom: 30,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerSpacer: {
    width: 24, // Same as back button for balance
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
  },
  sessionInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  credentialsButton: {
    backgroundColor: '#4361ee',
    borderRadius: 10,
    padding: 16,
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  credentialsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credentialsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  studentListSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10
  },
  studentSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingIndicator: {
    marginLeft: 10,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
  },
  clearButton: {
    marginLeft: 8,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  noStudentsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    paddingVertical: 20,
  },
  studentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginHorizontal: 20,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  studentEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  studentDetails: {
    marginBottom: 8,
  },
  studentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  studentDetail: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});

export default SessionDetails;