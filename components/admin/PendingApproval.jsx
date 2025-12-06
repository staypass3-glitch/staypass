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
  const [processingRequests, setProcessingRequests] = useState({});

  const showAlert = useCallback((title, message, buttons = []) => {
    setAlert({visible: true, title, message, buttons});
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    try {
      setLoading(true);
      setRefreshing(true);

      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
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
      setProcessingRequests(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  }, [fetchPendingRequests, showAlert]);

  const handleReject = useCallback(async (requestId) => {
    try {
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
      setProcessingRequests(prev => {
        const newState = { ...prev };
        delete newState[requestId];
        return newState;
      });
    }
  }, [fetchPendingRequests, showAlert]);

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
            {student?.profile_image ? (
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
            <View style={styles.nameContainer}>
              <Text style={styles.studentName} numberOfLines={2}>
                {student?.name || 'Unknown Student'}
              </Text>
              <Text style={styles.timestamp}>
                <Feather name="clock" size={12} color="#6c757d" /> {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.requestContent}>
          <Text style={styles.description}>{item.description}</Text>
          
          {item.destination && (
            <View style={styles.destinationContainer}>
              <Feather name="map-pin" size={14} color="#4361ee" />
              <Text style={styles.destinationText} numberOfLines={2}>
                {item.destination}
              </Text>
            </View>
          )}
          
          <View style={styles.studentInfo}>
            <Text style={styles.infoText}>
              <Feather name="phone" size={12} color="#6c757d" /> {student?.phone_number || 'N/A'}
            </Text>
            {student?.room_number && (
              <Text style={styles.infoText}>
                <Feather name="home" size={12} color="#6c757d" /> Room {student.room_number}
              </Text>
            )}
            {student?.department && (
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

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const EmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={48} color="#adb5bd" />
      <Text style={styles.emptyText}>No pending requests</Text>
      <Text style={styles.emptySubText}>Pull down to refresh</Text>
    </View>
  ), []);

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
      {/* StatusBar should be at the very top */}
      <LinearGradient colors={['#f8f9fa', '#e9ecef']} style={styles.safeArea}>
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#4361ee" />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>
              Pending Approvals
            </Text>
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
    paddingTop: 8, // Reduced top padding to account for StatusBar
    paddingHorizontal: 16,
    backgroundColor:'#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  title: {
    fontSize: 20, // Reduced size for better fit
    fontWeight: '700',
    color: '#212529',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 4,
  },
  backButton: {
    padding: 4,
    minWidth: 40,
    alignItems: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
  },
  listContent: {
    paddingBottom: 20,
  },
  requestItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16, // Reduced padding for better fit
    marginBottom: 16,
    borderColor:'#c7d7d9',
    borderWidth:1,
  },
  requestHeader: {
    marginBottom: 12,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 50, // Reduced size for better fit
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#e9ecef',
  },
  defaultProfile: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
  },
  studentName: {
    fontSize: 16, // Reduced size
    fontWeight: '600',
    color: '#212529',
    flexShrink: 1,
    marginBottom: 2,
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
    flex: 1,
    flexWrap: 'wrap',
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
    paddingVertical: 10,
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
    fontSize: 14,
    marginLeft: 6,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#6c757d',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c757d',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: windowWidth * 0.9,
    height: windowHeight * 0.7,
  },
});

export default PendingApproval;