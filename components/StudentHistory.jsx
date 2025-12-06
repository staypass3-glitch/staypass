import { useAlert } from '@/context/AlertContext.js';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
import * as XLSX from 'xlsx';
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
  const [excelGenerating, setExcelGenerating] = useState(false);
  const {showAlert} = useAlert();
  const fetchStudentHistory = useCallback(async (studentId) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          description,
          destination,
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
    
    showAlert(
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
                .update({
                  college_id: null,
                  current_session_id: null
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

  // ✅ EXCEL GENERATION FUNCTION
  const handleGenerateExcel = useCallback(async () => {
    setMenuVisible(false);
    
    if (studentHistory.length === 0) {
      Alert.alert('No Data', 'There is no request history to export.');
      return;
    }

    try {
      setExcelGenerating(true);

      // Format data for Excel
      const excelData = studentHistory.map((request, index) => ({
        'Sr No': index + 1,
        'Request Date': new Date(request.created_at).toLocaleDateString(),
        'Request Time': new Date(request.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        'Description': request.description,
        'Destination': request.destination || 'N/A',
        'Status': request.status.toUpperCase(),
        'Date to Go': new Date(request.date_to_go).toLocaleDateString(),
        'Date to Come': new Date(request.date_to_come).toLocaleDateString(),
        'Decided At': request.decided_at ? new Date(request.decided_at).toLocaleString() : 'N/A',
        'Scan Out': request.actual_scan_out ? new Date(request.actual_scan_out).toLocaleString() : 'N/A',
        'Scan In': request.actual_scan_in ? new Date(request.actual_scan_in).toLocaleString() : 'N/A',
        'Location': request.location || 'N/A'
      }));

      // Create worksheet starting from row 8
      const ws = XLSX.utils.json_to_sheet(excelData, { origin: "A8" });

      // Add title rows
      const titles = [
        [`Student Name: ${student.name}`],
        [`Phone Number: ${student.phone_number || 'N/A'}`],
        [`Room Number: ${student.room_number || 'N/A'}`],
        [`Department: ${department || 'N/A'}`],
        [`Joined At: ${student.last_joined_at ? new Date(student.last_joined_at).toLocaleString() : 'N/A'}`],
        [] // Empty row before data
      ];

      XLSX.utils.sheet_add_aoa(ws, titles, { origin: "A1" });

      // Merge cells for better layout
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 6 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 6 } },
        { s: { r: 5, c: 0 }, e: { r: 5, c: 6 } }
      ];

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },  // Sr No
        { wch: 15 }, // Request Date
        { wch: 12 }, // Request Time
        { wch: 30 }, // Description
        { wch: 25 }, // Destination
        { wch: 12 }, // Status
        { wch: 15 }, // Date to Go
        { wch: 15 }, // Date to Come
        { wch: 20 }, // Decided At
        { wch: 20 }, // Scan Out
        { wch: 20 }, // Scan In
        { wch: 20 }  // Location
      ];

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Student History");

      // Generate base64
      const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });

      // Save and share
      const fileName = `${student.name.replace(/\s+/g, '_')}_History_${new Date().toISOString().split('T')[0]}.xlsx`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Check if sharing is available
      const sharingAvailable = await Sharing.isAvailableAsync();
      
      if (sharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Save Excel File',
          UTI: 'com.microsoft.excel.xlsx'
        });
      } else {
        Alert.alert('Success', 'Excel file generated but sharing is not available on this device.');
      }

    } catch (error) {
      console.error('Error generating Excel:', error);
      Alert.alert('Error', 'Failed to generate Excel file. Please try again.');
    } finally {
      setExcelGenerating(false);
    }
  }, [studentHistory, student, department]);

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
      
      {/* Destination Display */}
      {item.destination && (
        <View style={styles.destinationContainer}>
          <Feather name="map-pin" size={14} color="#4361ee" />
          <Text style={styles.destinationText}>{item.destination}</Text>
        </View>
      )}
      
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
                  onPress={handleGenerateExcel}
                  disabled={excelGenerating}
                >
                  <Ionicons name="document-text-sharp" size={20} color="#10b981" />
                  <Text style={styles.menuItemTextExcel}>
                    {excelGenerating ? 'Generating...' : 'Generate Excel'}
                  </Text>
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

      {/* Loading Overlay for Excel Generation */}
      {excelGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#4361ee" />
            <Text style={styles.loadingText}>Generating Excel...</Text>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
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
    padding: 6,
    marginRight: '7%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
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
    borderColor:'#c7d7d9',
    borderWidth:1,
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
  destinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4361ee',
  },
  destinationText: {
    fontSize: 14,
    color: '#4361ee',
    fontWeight: '600',
    marginLeft: 8,
  },
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
    marginBottom: '50%',
    marginLeft: '20%'
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
  menuItemTextExcel: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '500',
    marginLeft: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingContent: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default StudentHistory;