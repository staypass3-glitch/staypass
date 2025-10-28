import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext.js';
import { supabase } from '../lib/supabase.js';
import ScreenWrapper from './ScreenWrapper.jsx';

const StudentHistory = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { student, collegeId } = route.params;
  
  const [studentHistory, setStudentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(student.profile_image);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [department, setDepartment] = useState(student.department);
  const [menuVisible, setMenuVisible] = useState(false);
  const [latestIncompleteRequest, setLatestIncompleteRequest] = useState(null);

  const fetchStudentHistory = useCallback(async (studentId) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          description,
          status,
          created_at,
          decided_at,
          date_to_go,
          date_to_come,
          actual_scan_out,
          actual_scan_in,
          location
        `)
        .eq('student_id', studentId)
        .eq('college_id', collegeId)
        .order('created_at', { ascending: false });
  
      if (error) throw error;
      
      setStudentHistory(data || []);
      
      // Find the latest incomplete request with location coordinates
      if (data && data.length > 0) {
        setProfileImage(student.profile_image);
        
        // Find the latest request that is not completed and has location coordinates
        const incompleteRequest = data.find(request => 
          request.status !== 'completed' && 
          request.location && 
          request.location.trim() !== ''
        );
        
        setLatestIncompleteRequest(incompleteRequest || null);
      }

      if(data){
        setDepartment(student.department);
      }
  
    } catch (error) {
      console.error("Error fetching student history:", error);
      Alert.alert('Error', 'Failed to fetch student history');
    } finally {
      setLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    fetchStudentHistory(student.id);
  }, [student.id, fetchStudentHistory]);

  const handleViewLocation = useCallback((coordinates) => {
    if (!coordinates) return;
    
    // Clean the coordinates string and create Google Maps URL
    const cleanCoordinates = coordinates.trim();
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanCoordinates)}`;
    
    Linking.openURL(mapsUrl).catch(err => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Error', 'Could not open Google Maps. Please check if the app is installed.');
    });
  }, []);

  const handleRemoveStudent = useCallback(async () => {
    // Close the menu first
    setMenuVisible(false);
    
    Alert.alert(
      "Remove Student",
      `Are you sure you want to remove ${student.name} from this college? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // Remove student from college_students table
              const { error } = await supabase
                .from('profiles')
                .update({college_id:null,
                     current_session_id:null
                })
                .eq('id', student.id)
                .eq('college_id', collegeId);

              if (error) throw error;

              Alert.alert(
                "Success",
                `${student.name} has been removed from the college successfully.`,
                [
                  {
                    text: "OK",
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } catch (error) {
              console.error("Error removing student:", error);
              Alert.alert('Error', 'Failed to remove student. Please try again.');
            }
          }
        }
      ]
    );
  }, [student.id, student.name, collegeId, navigation]);

  const toggleMenu = useCallback(() => {
    setMenuVisible(!menuVisible);
  }, [menuVisible]);

  const closeMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'approved': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'pending': return 'time';
      default: return 'help-circle';
    }
  }, []);

  const renderHistoryItem = useCallback(({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyInfo}>
          <Text style={styles.historyDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={styles.historyTime}>
            {new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Ionicons 
            name={getStatusIcon(item.status)} 
            size={16} 
            color="#fff" 
          />
          <Text style={styles.statusText}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      
      <Text style={styles.historyDescription}>{item.description}</Text>
      
      {/* Location Button - Only show for the latest incomplete request with coordinates */}
      {latestIncompleteRequest && latestIncompleteRequest.id === item.id && (
        <TouchableOpacity 
          style={styles.locationButton}
          onPress={() => handleViewLocation(item.location)}
        >
          <Ionicons name="location-outline" size={16} color="#4361ee" />
          <Text style={styles.locationButtonText}>View Location</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.historyDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.detailText}>
            {new Date(item.date_to_go).toLocaleDateString()} - {new Date(item.date_to_come).toLocaleDateString()}
          </Text>
        </View>
        
        {item.decided_at && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.detailText}>
              Decided: {new Date(item.decided_at).toLocaleString()}
            </Text>
          </View>
        )}
        
        {item.actual_scan_out && (
          <View style={styles.detailRow}>
            <Ionicons name="exit-outline" size={14} color="#666" />
            <Text style={styles.detailText}>
              Scanned out: {new Date(item.actual_scan_out).toLocaleString()}
            </Text>
          </View>
        )}
        
        {item.actual_scan_in && (
          <View style={styles.detailRow}>
            <Ionicons name="enter-outline" size={14} color="#666" />
            <Text style={styles.detailText}>
              Scanned in: {new Date(item.actual_scan_in).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  ), [getStatusColor, getStatusIcon, latestIncompleteRequest, handleViewLocation]);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const keyExtractor = useCallback((item) => item.id, []);

  const openImageViewer = useCallback(() => {
    if (profileImage) {
      setImageViewerVisible(true);
    }
  }, [profileImage]);

  const closeImageViewer = useCallback(() => {
    setImageViewerVisible(false);
  }, []);

  const memoizedStudentInfo = useMemo(() => (
    <View style={styles.studentInfoCard}>
      <View style={styles.studentHeader}>
        <TouchableOpacity 
          style={styles.studentAvatar}
          onPress={openImageViewer}
          disabled={!profileImage}
        >
          {profileImage ? (
            <Image 
              source={{uri: profileImage}} 
              resizeMode='cover'
              style={styles.avatarImage}
              onError={() => setProfileImage(null)}
            />
          ) : (
            <Ionicons name="person-circle-outline" size={50} color="#ccc" />
          )}
        </TouchableOpacity>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{student.name}</Text>
          <Text style={styles.studentEmail}>{student.email}</Text>
        </View>
        
        {/* Three dots menu button */}
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={toggleMenu}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.studentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{student.phone_number || 'No phone'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="home-outline" size={16} color="#666" />
          <Text style={styles.detailText}>Room {student.room_number || 'N/A'}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            Joined: {student.last_joined_at ? new Date(student.last_joined_at).toLocaleString() : 'Unknown'}
          </Text>
        </View>
        <View style={styles.detailRow}>
        <Feather name="briefcase" size={12} color="#6c757d" /> 
          <Text style={styles.detailText}>
            {department || 'No Department found'}
          </Text>
        </View>
      </View>
    </View>
  ), [student, profileImage, openImageViewer, toggleMenu, department]);

  const memoizedHeader = useMemo(() => (
    <View style={styles.headerContainer}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={goBack}
      >
        <Ionicons name="arrow-back" size={24} color="#4361ee" />
      </TouchableOpacity>
      
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Student History</Text>
        <Text style={styles.headerSubtitle}>{student.name}</Text>
      </View>
    </View>
  ), [student.name, goBack]);

  const historyList = useMemo(() => {
    if (loading) {
      return <ActivityIndicator size="large" color="#4361ee" style={styles.loadingIndicator} />;
    }
    
    if (studentHistory.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color="#adb5bd" />
          <Text style={styles.emptyStateText}>No request history found</Text>
          <Text style={styles.emptyStateSubtext}>This student hasn't made any requests yet</Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={studentHistory}
        renderItem={renderHistoryItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.historyListContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={7}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    );
  }, [loading, studentHistory, renderHistoryItem, keyExtractor]);

  return (
    <ScreenWrapper>
      <View style={styles.mainContainer}>
        {memoizedHeader}
        {memoizedStudentInfo}
        
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Request History</Text>
            <Text style={styles.sectionSubtitle}>
              {studentHistory.length} request(s) found
            </Text>
          </View>
          {historyList}
        </View>
      </View>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        onRequestClose={closeImageViewer}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <TouchableWithoutFeedback onPress={closeImageViewer}>
            <View style={styles.modalBackground}>
              <TouchableWithoutFeedback>
                <View style={styles.imageContainer}>
                  <Image 
                    source={{uri: profileImage}} 
                    resizeMode="contain"
                    style={styles.fullSizeImage}
                  />
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={closeImageViewer}
                  >
                    <Ionicons name="close-circle" size={32} color="#fff" />
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableWithoutFeedback onPress={closeMenu}>
          <View style={styles.menuOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.menuContainer}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={handleRemoveStudent}
                >
                  <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
                  <Text style={styles.menuItemTextRemove}>Remove Student</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={closeMenu}
                >
                  <Ionicons name="close-outline" size={20} color="#666" />
                  <Text style={styles.menuItemText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    marginRight: 16,
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
  studentInfoCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  studentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  studentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
    marginRight: 16,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  studentDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 8,
  },
  historySection: {
    flex: 1,
    marginHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 16,
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
  loadingIndicator: {
    marginTop: 40,
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
  historyListContent: {
    paddingBottom: 20,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  historyTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 4,
  },
  historyDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  // Location Button Styles
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#4361ee',
    fontWeight: '500',
    marginLeft: 6,
  },
  historyDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    paddingTop: 12,
  },
  // Image Viewer Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullSizeImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 16,
  },
  // Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  menuItemTextRemove: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
    marginLeft: 12,
  },
});

export default StudentHistory;