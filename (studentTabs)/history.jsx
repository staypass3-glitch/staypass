import ScreenWrapper from '@/components/ScreenWrapper';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

// Memoized components to prevent unnecessary re-renders
const StatusBadge = React.memo(({ status, getStatusColor }) => (
  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
    <Text style={styles.statusText}>{status}</Text>
  </View>
));

const DetailRow = React.memo(({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
      {value || 'Not recorded'}
    </Text>
  </View>
));

const History = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [error, setError] = useState(null);
  
  // Refs for animation values to prevent recreation
  const modalAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const filterOptions = useMemo(() => [
    { id: 'all', label: 'All Time', icon: 'time-outline' },
    { id: 'today', label: 'Today', icon: 'today-outline' },
    { id: 'week', label: 'This Week', icon: 'calendar-outline' },
    { id: 'month', label: 'This Month', icon: 'calendar-number-outline' },
    { id: 'year', label: 'This Year', icon: 'calendar-clear-outline' }
  ], []);

  const statusOptions = useMemo(() => [
    { id: 'all', label: 'All Status', color: '#607D8B' },
    { id: 'approved', label: 'Approved', color: '#4CAF50' },
    { id: 'pending', label: 'Pending', color: '#FFC107' },
    { id: 'rejected', label: 'Rejected', color: '#F44336' }
  ], []);

  // Compute filtered history directly to avoid state duplication
  const filteredHistory = useMemo(() => {
    if (!history || history.length === 0) return [];

    let filtered = [...history];

    // Apply date filter
    if (selectedFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.created_at);
        
        switch (selectedFilter) {
          case 'today':
            return itemDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return itemDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return itemDate >= monthAgo;
          case 'year':
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            return itemDate >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => 
        item.status?.toLowerCase() === selectedStatus.toLowerCase()
      );
    }

    return filtered;
  }, [history, selectedFilter, selectedStatus]);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (!user?.id || !user?.collegeId) {
      setError('User not authenticated');
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    setError(null);

    try {
      const { data: historyData, error: historyError } = await supabase
        .from('requests')
        .select('*')
        .eq('student_id', user.id)
        .eq('college_id', user.collegeId)
        .order('created_at', { ascending: false });

      if (historyError) {
        throw new Error(`Database error: ${historyError.message}`);
      }
      
      if (!isMounted.current) return;
      
      setHistory(prevHistory => {
        // Only update if data actually changed to prevent unnecessary re-renders
        const newHistory = historyData || [];
        if (JSON.stringify(prevHistory) !== JSON.stringify(newHistory)) {
          return newHistory;
        }
        return prevHistory;
      });
      
    } catch (error) {
      console.error('Error fetching history:', error);
      if (isMounted.current) {
        setError(error.message || 'Failed to load history');
        
        // Show alert for user-friendly error message
        if (!isRefresh) {
          Alert.alert(
            'Error',
            'Could not load your leave history. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [user]);

  // Refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const toggleFilterModal = useCallback(() => {
    if (showFilterModal) {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        if (isMounted.current) {
          setShowFilterModal(false);
        }
      });
    } else {
      setShowFilterModal(true);
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showFilterModal, modalAnim]);

  const selectFilter = useCallback((filterId) => {
    setSelectedFilter(filterId);
    toggleFilterModal();
  }, [toggleFilterModal]);

  const selectStatus = useCallback((statusId) => {
    setSelectedStatus(statusId);
  }, []);

  const getStatusColor = useCallback((status) => {
    const statusLower = status?.toLowerCase() || '';
    switch (statusLower) {
      case 'approved':
        return '#4CAF50';
      case 'pending':
        return '#FFC107';
      case 'rejected':
        return '#F44336';
      default:
        return '#607D8B';
    }
  }, []);

  const renderFilterButton = useCallback(({ item }) => {
    const isSelected = selectedFilter === item.id;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isSelected && styles.selectedFilterButton]}
        onPress={() => selectFilter(item.id)}
      >
        <Ionicons 
          name={item.icon} 
          size={20} 
          color={isSelected ? '#fff' : '#6c757d'} 
        />
        <Text style={[styles.filterButtonText, isSelected && styles.selectedFilterButtonText]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedFilter, selectFilter]);

  const renderStatusButton = useCallback(({ item }) => {
    const isSelected = selectedStatus === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.statusButton,
          isSelected && { backgroundColor: item.color }
        ]}
        onPress={() => selectStatus(item.id)}
      >
        <Text style={[
          styles.statusButtonText,
          isSelected && { color: '#fff' }
        ]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  }, [selectedStatus, selectStatus]);

  // Memoized render item to prevent unnecessary re-renders
  const renderItem = useCallback(({ item }) => {
    return (
      <View style={styles.cardContainer}>
        <LinearGradient 
          colors={['#fff', '#fff']} 
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <StatusBadge status={item.status} getStatusColor={getStatusColor} />
          
          <DetailRow label="Leave Start:" value={item.date_to_go} />
          <DetailRow label="Leave End:" value={item.date_to_come} />
          <DetailRow label="Actual Departure:" value={item.actual_scan_out} />
          <DetailRow label="Actual Return:" value={item.actual_scan_in} />
          
          {item.description && (
            <View style={styles.descriptionContainer}>
              {/* Description */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Description:</Text>
                <Text
                  style={styles.descriptionText}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {item.description}
                </Text>
              </View>

              {/* Destination */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Destination:</Text>
                <Text
                  style={styles.descriptionText}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {item.destination}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  }, [getStatusColor]);

  const keyExtractor = useCallback((item) => item.id.toString(), []);

  const handleRefresh = useCallback(() => {
    fetchHistory(true);
  }, [fetchHistory]);

  return (
    <ScreenWrapper haveTabs={true} bg={'white'}>
      <View style={styles.container}>
        {/* Header with Filter Button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Leave History</Text>
          <TouchableOpacity 
            style={styles.filterToggle}
            onPress={toggleFilterModal}
          >
            <Ionicons name="filter" size={24} color="#6c757d" />
            <Text style={styles.filterToggleText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Status Filter Row */}
        <View style={styles.statusFilterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusFilterContent}
          >
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status.id}
                style={[
                  styles.statusButton,
                  selectedStatus === status.id && { backgroundColor: status.color }
                ]}
                onPress={() => selectStatus(status.id)}
              >
                <Text style={[
                  styles.statusButtonText,
                  selectedStatus === status.id && { color: '#fff' }
                ]}>
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results Count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>
            {filteredHistory.length} {filteredHistory.length === 1 ? 'result' : 'results'}
          </Text>
        </View>

        {/* Error State */}
        {error && !isLoading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#dc3545" />
            <Text style={styles.errorText}>Something went wrong</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => fetchHistory()}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content */}
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading your history...</Text>
          </View>
        ) : !error && filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#6c757d" />
            <Text style={styles.emptyStateText}>No leave history found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try adjusting your filters or check back later
            </Text>
          </View>
        ) : !error && (
          <FlatList
            data={filteredHistory}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
                tintColor={'#007AFF'}
              />
            }
            removeClippedSubviews={true}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={10}
            updateCellsBatchingPeriod={50}
            getItemLayout={(data, index) => ({
              length: 220,
              offset: 220 * index,
              index,
            })}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="none"
        onRequestClose={toggleFilterModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={toggleFilterModal}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                opacity: modalAnim,
                transform: [{
                  translateY: modalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }]
              }
            ]}
          >
            <LinearGradient
              colors={['#ffffff', '#f8f9fa']}
              style={styles.modalGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter by Date</Text>
                <TouchableOpacity onPress={toggleFilterModal}>
                  <Ionicons name="close" size={24} color="#6c757d" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.filterOptionsContainer}>
                {filterOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.filterOption,
                      selectedFilter === option.id && styles.selectedFilterOption
                    ]}
                    onPress={() => selectFilter(option.id)}
                  >
                    <Ionicons 
                      name={option.icon} 
                      size={20} 
                      color={selectedFilter === option.id ? '#007AFF' : '#6c757d'} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      selectedFilter === option.id && styles.selectedFilterOptionText
                    ]}>
                      {option.label}
                    </Text>
                    {selectedFilter === option.id && (
                      <Ionicons name="checkmark" size={20} color="#007AFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
};

export default History;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'white'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingTop: 20,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#495057',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterToggleText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  statusFilterContainer: {
    marginBottom: 12,
    paddingVertical: 4,
  },
  statusFilterContent: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 36,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
  },
  resultsCount: {
    marginBottom: 12,
    paddingVertical: 4,
  },
  resultsText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  cardContainer: {
    marginVertical: 10,
    marginHorizontal: 2,
  },
  cardGradient: {
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 2,
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  descriptionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  fieldContainer: {
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#495057',
    marginTop: 4,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#adb5bd',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: width * 0.85,
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#495057',
  },
  filterOptionsContainer: {
    gap: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    minHeight: 56,
  },
  selectedFilterOption: {
    backgroundColor: '#e7f3ff',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  selectedFilterOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
});