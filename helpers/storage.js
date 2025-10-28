import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  USER_ROLE: 'user_role',
  USER_DATA: 'user_data',
  LAST_LOGIN: 'last_login'
};

// Save user role to localStorage
export const saveUserRole = async (role) => {
  try {
    if (!role) {
      console.warn('Attempted to save null/undefined role to localStorage');
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLE, role);
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
    console.log('User role saved to localStorage:', role);
  } catch (error) {
    console.error('Error saving user role to localStorage:', error);
  }
};

// Get user role from localStorage (NO expiration check)
export const getUserRole = async () => {
  try {
    const role = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    if (role) {
      console.log('User role retrieved from localStorage:', role);
      return role;
    }
    return null;
  } catch (error) {
    console.error('Error getting user role from localStorage:', error);
    return null;
  }
};

// Save complete user data to localStorage
export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_LOGIN, new Date().toISOString());
    console.log('User data saved to localStorage');
  } catch (error) {
    console.error('Error saving user data to localStorage:', error);
  }
};

// Get complete user data from localStorage (NO expiration check)
export const getUserData = async () => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (userData) {
      console.log('User data retrieved from localStorage');
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Error getting user data from localStorage:', error);
    return null;
  }
};

// Clear all user data from localStorage
export const clearUserData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_ROLE,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.LAST_LOGIN
    ]);
    console.log('User data cleared from localStorage');
  } catch (error) {
    console.error('Error clearing user data from localStorage:', error);
  }
};

// Check if cached data exists (ignore 24hr rule)
export const isCachedDataValid = async () => {
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    return !!userData; // just check if something exists
  } catch (error) {
    console.error('Error checking cached data validity:', error);
    return false;
  }
};
