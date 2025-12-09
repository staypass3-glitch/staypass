import ScreenWrapper from '@/components/ScreenWrapper';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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

const { width, height } = Dimensions.get('window');

// Memoized components to prevent unnecessary re-renders
const StatusBadge = React.memo(({ status, getStatusColor }) => (
  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
    <Text style={styles.statusText}>{status}</Text>
  </View>
));

const DetailRow = React.memo(({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={2} ellipsizeMode="tail">
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
  const isMounted = useRef(true);
  const flatListRef = useRef(null);

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
    setShowFilterModal(!showFilterModal);
  }, [showFilterModal]);

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

  const renderItem = useCallback(({ item, index }) => {
    return (
      <View style={[
        styles.cardContainer,
        index === filteredHistory.length - 1 && styles.lastCard
      ]}>
        <LinearGradient 
          colors={['#ffffff', '#f8f9fa']} 
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <StatusBadge status={item.status} getStatusColor={getStatusColor} />
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </Text>
          </View>
          
          <View style={styles.dateSection}>
            <DetailRow label="Leave Start:" value={item.date_to_go} />
            <DetailRow label="Leave End:" value={item.date_to_come} />
            <DetailRow label="Actual Departure:" value={item.actual_scan_out} />
            <DetailRow label="Actual Return:" value={item.actual_scan_in} />
          </View>
          
          {/* Description and Destination Section - Always visible */}
          <View style={styles.infoSection}>
            {/* Description */}
            <View style={styles.infoField}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text
                style={styles.infoValue}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {item.description || 'No description provided'}
              </Text>
            </View>

            {/* Destination */}
            <View style={styles.infoField}>
              <Text style={styles.infoLabel}>Destination:</Text>
              <Text
                style={styles.infoValue}
                numberOfLines={3}
                ellipsizeMode="tail"
              >
                {item.destination || 'Not specified'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  }, [filteredHistory.length, getStatusColor]);

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
            ref={flatListRef}
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
            removeClippedSubviews={false}
            initialNumToRender={6}
            maxToRenderPerBatch={8}
            windowSize={15}
            updateCellsBatchingPeriod={100}
            legacyImplementation={false}
            onEndReachedThreshold={0.5}
            ListFooterComponent={<View style={styles.listFooter} />}
            scrollEventThrottle={16}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={toggleFilterModal}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={toggleFilterModal}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
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
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
};

export default History;

// Constants for consistent sizing - INCREASED CARD HEIGHT
const CARD_HEIGHT = 440; // Increased from 320 to 440 for much larger cards
const CARD_MARGIN_VERTICAL = 16; // Margin between cards
const TAB_BAR_HEIGHT = 80; // Adjust based on your actual tab bar height

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    zIndex: 10,
    backgroundColor: 'white',
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
    minHeight: 44,
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
    paddingTop: 8,
    paddingBottom: TAB_BAR_HEIGHT + 20,
  },
  listFooter: {
    height: TAB_BAR_HEIGHT + 30,
  },
  cardContainer: {
    marginVertical: 12,
    marginHorizontal: 2,
    minHeight: CARD_HEIGHT, // Changed to minHeight for flexibility
  },
  lastCard: {
    marginBottom: -TAB_BAR_HEIGHT ,
  },
  cardGradient: {
    borderRadius: 16,
    padding: 24, // Increased padding from 20 to 24
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minHeight: CARD_HEIGHT, // Ensures minimum height
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18, // Increased spacing
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 90,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
    textAlign: 'right',
  },
  dateSection: {
    marginBottom: 18, // Increased spacing
    paddingBottom: 18, // Increased spacing
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14, // Increased spacing
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
  infoSection: {
    flex: 1,
    justifyContent: 'flex-start',
    minHeight: 120, // Reduced minimum height
  },
  infoField: {
    marginBottom: 12, // Reduced spacing between fields
  },
  infoLabel: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    borderColor:'#c7d7d9',
    borderWidth:1,
    minHeight: 44, // Reduced minimum height
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: TAB_BAR_HEIGHT,
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
    paddingBottom: TAB_BAR_HEIGHT,
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
    paddingBottom: TAB_BAR_HEIGHT,
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