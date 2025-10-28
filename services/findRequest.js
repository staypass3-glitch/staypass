import { adminService } from '@/services/adminService';
import { Alert } from 'react-native';

export const findRequest = async (collegeId) => {
  try {
    const result = await adminService.fetchRequests(collegeId);
    console.log('Request result:', !!result);
    return !!result; 
  } catch (error) {
    Alert.alert('Admin', 'Error in fetching Request');
    console.error('Error fetching requests:', error);
    return false;
  }
};