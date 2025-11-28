import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../lib/supabase.js';
import CustomAlert from '../CustomAlert.jsx';
import ScreenWrapper from '../ScreenWrapper.jsx';

const PendingApproval = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { collegeId } = route.params;
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [alert, setAlert] = useState({visible: false, title: '', message: '', buttons: []});
  const [processingRequests, setProcessingRequests] = useState({}); // Track loading state for each request
  

  const showAlert = useCallback((title, message, buttons = []) => {
    setAlert({visible: true, title, message, buttons});
  }, []);

  // Memoize fetchPendingRequests function
  const fetchPendingRequests = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          session_id,
          status,
          created_at,
          student_id,
          description,
          destination,
          profiles:student_id (id, name, phone_number, room_number, department, profile_image)
        `)
        .eq('college_id', collegeId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingRequests(data);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [collegeId]);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  // Memoize utility functions
  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const onRefresh = useCallback(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleApprove = useCallback(async (requestId) => {
    try {
      // Set loading state for this specific request
      setProcessingRequests(prev => ({ ...prev, [requestId]: 'approving' }));
      
      const { error } = await supabase
        .from('requests')
        .update({ 
          status: 'approved',
          decided_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      showAlert('Success', 'Request approved successfully!', [{text:'Ok'}]);
      fetchPendingRequests();
    } catch (error) {
      console.error("Error approving request:", error);
      Alert.alert('Error', error.message);
    } finally {
      // Clear loading state for this request
      setProcessingRequests(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  }, [fetchPendingRequests, showAlert]);

  const handleReject = useCallback(async (requestId) => {
    try {
      // Set loading state for this specific request
      setProcessingRequests(prev => ({ ...prev, [requestId]: 'rejecting' }));
      
      const { error } = await supabase
        .from('requests')
        .update({ 
          status: 'rejected',
          decided_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      showAlert('Success', 'Request rejected successfully!', [{text:'Ok'}]);
      fetchPendingRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      Alert.alert('Error', error.message);
    } finally {
      // Clear loading state for this request
      setProcessingRequests(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  }, [fetchPendingRequests, showAlert]);

  // Memoize render item function
  const renderRequestItem = useCallback(({ item }) => {
    const student = item.profiles;
    const isProcessing = processingRequests[item.id];
    const isApproving = isProcessing === 'approving';
    const isRejecting = isProcessing === 'rejecting';
    
    return (
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.requestItem}
      >
        <View style={styles.requestHeader}>
          <View style={styles.profileContainer}>
            {student.profile_image ? (
              <TouchableOpacity 
                onPress={() => {
                  setSelectedImage(student.profile_image);
                  setModalVisible(true);
                }}
              >
                <Image 
                  source={{ uri: student.profile_image }} 
                  style={styles.profileImage}
                />
              </TouchableOpacity>
            ) : (
              <View style={[styles.profileImage, styles.defaultProfile]}>
                <MaterialIcons name="person" size={28} color="#6c757d" />
              </View>
            )}
            <View>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.timestamp}>
                <Feather name="clock" size={12} color="#6c757d" /> {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.requestContent}>
          <Text style={styles.description}>{item.description}</Text>
          
          {/* Destination Display */}
          {item.destination && (
            <View style={styles.destinationContainer}>
              <Feather name="map-pin" size={14} color="#4361ee" />
              <Text style={styles.destinationText}>{item.destination}</Text>
            </View>
          )}
          
          <View style={styles.studentInfo}>
            <Text style={styles.infoText}>
              <Feather name="phone" size={12} color="#6c757d" /> {student.phone_number}
            </Text>
            {student.room_number && (
              <Text style={styles.infoText}>
                <Feather name="home" size={12} color="#6c757d" /> Room {student.room_number}
              </Text>
            )}
            {student.department && (
              <Text style={styles.infoText}>
                <Feather name="briefcase" size={12} color="#6c757d" /> {student.department}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.approveButton,
              isProcessing && styles.disabledButton
            ]}
            onPress={() => handleApprove(item.id)}
            disabled={!!isProcessing}
            activeOpacity={isProcessing ? 1 : 0.7}
          >
            {isApproving ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.approveButtonText}>Approving...</Text>
              </>
            ) : (
              <>
                <Feather name="check" size={16} color="#ffffff" />
                <Text style={styles.approveButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.rejectButton,
              isProcessing && styles.disabledButton
            ]}
            onPress={() => handleReject(item.id)}
            disabled={!!isProcessing}
            activeOpacity={isProcessing ? 1 : 0.7}
          >
            {isRejecting ? (
              <>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.rejectButtonText}>Rejecting...</Text>
              </>
            ) : (
              <>
                <Feather name="x" size={16} color="#ffffff" />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }, [formatDate, handleApprove, handleReject, processingRequests]);

  // Memoize key extractor
  const keyExtractor = useCallback((item) => item.id.toString(), []);

  // Memoize empty component
  const EmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={48} color="#adb5bd" />
      <Text style={styles.emptyText}>No pending requests</Text>
      <Text style={styles.emptySubText}>Pull down to refresh</Text>
    </View>
  ), []);

  // Memoize refresh control
  const refreshControl = useMemo(() => (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={['#3498db']}
      tintColor="#3498db"
    />
  ), [refreshing, onRefresh]);

  return (
    <ScreenWrapper>
      <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#4361ee" />
            </TouchableOpacity>
            <Text style={styles.title}>Pending Approvals</Text>
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
              activeOpacity={0.7}
            >
              <Feather name="refresh-cw" size={20} color="#3498db" />
            </TouchableOpacity>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : (
            <FlatList
              data={pendingRequests}
              keyExtractor={keyExtractor}
              renderItem={renderRequestItem}
              refreshControl={refreshControl}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={EmptyComponent}
              removeClippedSubviews={true}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              getItemLayout={(data, index) => ({
                length: 200,
                offset: 200 * index,
                index,
              })}
            />
          )}

          <Modal
            visible={modalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setModalVisible(false)}
            >
              <Image 
                source={{ uri: selectedImage }} 
                style={styles.modalImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </Modal>
          
          <CustomAlert 
            visible={alert.visible}
            title={alert.title}
            message={alert.message}
            buttons={alert.buttons}
            onDismiss={() => {
              setAlert({visible: false, title: '', message: '', buttons: []})
            }}
          />
        </SafeAreaView>
      </LinearGradient>
    </ScreenWrapper>
  );
};

const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor:'#fff'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    fontFamily: 'HelveticaNeue-Bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  requestItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  requestHeader: {
    marginBottom: 16,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
    backgroundColor: '#e9ecef',
  },
  defaultProfile: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6c757d',
  },
  requestContent: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 8,
  },
  destinationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
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
  studentInfo: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButton: {
    backgroundColor: '#2ecc71',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  disabledButton: {
    opacity: 0.7,
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#6c757d',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: windowWidth,
    height: windowHeight * 0.8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PendingApproval;