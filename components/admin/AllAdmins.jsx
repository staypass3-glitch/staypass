import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenWrapper from '../ScreenWrapper';

const AllAdmins = () => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const navigation = useNavigation();
  const [admins, setAdmins] = useState([]);
  const [mainAdmin, setMainAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const route = useRoute();
  const {collegeId} = route.params;
  
  useEffect(() => {
    fetchCollegeAndAdmins();
  }, []);

  const fetchCollegeAndAdmins = async () => {
    try {
      setLoading(true);

      if (collegeId) {
        
       console.log('Session id is : ',collegeId);
        
        // Fetch sub-admins
        const { data: adminsData, error: adminsError } = await supabase
          .from('sessions')
          .select(`
            id,
            admin_id,
            mainAdmin,
            created_at,
            admin:profiles!sessions_admin_id_fkey(
              id,
              name,
              email,
              phone_number
            )
          `)
          .eq('college_id', collegeId)
          .eq('mainAdmin', false)
          .order('created_at', { ascending: false });

        if (adminsError) throw adminsError;

        setAdmins(adminsData || []);

        // Fetch main admin
        const { data: mainAdminData, error: mainAdminError } = await supabase
          .from('sessions')
          .select(`
            id,
            admin_id,
            mainAdmin,
            created_at,
            admin:profiles!sessions_admin_id_fkey(
              id,
              name,
              email,
              phone_number
            )
          `)
          .eq('college_id', collegeId)
          .eq('mainAdmin', true)
          .single();

        if (!mainAdminError && mainAdminData) {
          setMainAdmin(mainAdminData);
        }
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      showAlert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const generateVerificationCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    return code;
  };

  const openDeleteModal = (admin) => {
    const newCode = generateVerificationCode();
    setVerificationCode(newCode);
    setCodeInput('');
    setSelectedAdmin(admin);
    setDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalVisible(false);
    setCodeInput('');
    setSelectedAdmin(null);
  };

  const deleteAdmin = async () => {
    try {
      if (!selectedAdmin) return;

      // Delete the session (admin record) from sessions table
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', selectedAdmin.id);

      if (deleteError) throw deleteError;

      showAlert('Success', 'Admin removed successfully');
      closeDeleteModal();
      fetchCollegeAndAdmins(); // Refresh the list
    } catch (error) {
      console.error('Error deleting admin:', error);
      showAlert('Error', 'Failed to remove admin');
    }
  };

  const handleDeleteAdmin = () => {
    if (codeInput.trim().toUpperCase() === generatedCode) {
      deleteAdmin();
    } else {
      showAlert('Invalid Code', 'Please enter the correct verification code.');
    }
  };

  const renderAdminItem = ({ item }) => (
    <View style={styles.adminCard}>
      <View style={styles.adminAvatar}>
        <Text style={styles.avatarText}>
          {item.admin?.name ? item.admin.name.charAt(0).toUpperCase() : 'A'}
        </Text>
      </View>
      
      <View style={styles.adminInfo}>
        <View style={styles.adminHeader}>
          <Text style={styles.adminName} numberOfLines={1}>
            {item.admin?.name || 'Unknown Admin'}
          </Text>
          <Text style={styles.adminType}>Sub-Admin</Text>
        </View>
        
        <View style={styles.adminDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="mail-outline" size={12} color="#64748b" />
            <Text style={styles.detailText} numberOfLines={1}>
              {item.admin?.email || 'No email'}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={12} color="#64748b" />
            <Text style={styles.detailText}>
              {item.admin?.phone_number || 'No phone number'}
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={12} color="#64748b" />
            <Text style={styles.detailText}>
              Added: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.deleteButton}
        onPress={() => openDeleteModal(item)}
      >
        <Ionicons name="trash-outline" size={18} color="#dc2626" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <ScreenWrapper bg='#fff'>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading admins...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper bg='#fff'>
      <View style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#3b82f6" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.title}>All Admins</Text>
              <Text style={styles.subtitle}>
                {admins.length} sub-admin{admins.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          
          {/* Main Admin Info */}
          {mainAdmin && (
            <View style={styles.mainAdminContainer}>
              <Text style={styles.mainAdminLabel}>Main Admin:</Text>
              <View style={styles.mainAdminInfo}>
                <Text style={styles.mainAdminName}>
                  {mainAdmin.admin?.name || 'Unknown Admin'}
                </Text>
                <View style={styles.mainAdminBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#059669" />
                  <Text style={styles.mainAdminBadgeText}>Main Admin</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Admins List */}
        <FlatList
          data={admins}
          renderItem={renderAdminItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIcon}>
                  <Ionicons name="people-outline" size={48} color="#cbd5e1" />
                </View>
                <Text style={styles.emptyStateTitle}>No Sub-Admins Found</Text>
                <Text style={styles.emptyStateSubtitle}>
                  There are no sub-admins assigned to this college yet
                </Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            admins.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  Sub-Admins with access to this college
                </Text>
              </View>
            ) : null
          }
        />

        {/* Delete Confirmation Modal */}
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
                  <Ionicons name="warning" size={24} color="#dc2626" />
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Remove Admin</Text>
                  <Text style={styles.modalSubtitle}>This action cannot be undone</Text>
                </View>
                <TouchableOpacity onPress={closeDeleteModal} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <Text style={styles.modalText}>
                  You are about to remove {selectedAdmin?.admin?.name || 'this admin'} from accessing this college. 
                  They will no longer be able to manage students or sessions.
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
                    onPress={handleDeleteAdmin}
                    disabled={!codeInput.trim()}
                  >
                    <Text style={styles.confirmDeleteButtonText}>Remove Admin</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginRight:'15%',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  // Main Admin Info
  mainAdminContainer: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  mainAdminLabel: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 4,
  },
  mainAdminInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainAdminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  mainAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  mainAdminBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  // List
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  listHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  listHeaderText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  // Admin Card
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  adminAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  adminInfo: {
    flex: 1,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  adminType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminDetails: {
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles (matching SessionDetails theme)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fef2f2',
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fecaca',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#ef4444',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 24,
  },
  modalText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  verificationSection: {
    marginBottom: 20,
  },
  verificationLabel: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '500',
  },
  verificationCodeContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  verificationCode: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: 3,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 24,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AllAdmins;