import saveImage from '@/components/saveImage.jsx';
import * as Application from 'expo-application';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { clearUserData, getUserData, getUserRole, isCachedDataValid, saveUserData, saveUserRole } from '../helpers/storage.js';
import { supabase } from '../lib/supabase.js';
import { useAlert } from './AlertContext.js';

const AuthContext = createContext();

// Constants for better maintainability
const AUTH_TIMEOUT = 5000;
const CACHE_VALIDITY_DAYS = 1;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [cachedUser, setCachedUser] = useState(null);
  const [cachedRole, setCachedRole] = useState(null);
  const {showAlert} = useAlert();

  // Loading states
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingCache, setIsLoadingCache] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);

  // Refs for cleanup and mounting checks
  const mountedRef = useRef(true);
  const authTimeoutRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    
    const initializeApp = async () => {
      try {
        console.log(' App initialization started');
        
        // Reset states
        setIsLoadingAuth(true);
        setAuthCheckComplete(false);
        setAppInitialized(false);
        
        // Set timeout for auth check
        authTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && !authCheckComplete) {
            console.log(' Auth timeout - proceeding with cached data fallback');
            handleAuthTimeout();
          }
        }, AUTH_TIMEOUT);

        // Check authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error(' Session error:', sessionError);
          await handleNoAuthData();
        } else if (session?.user) {
          console.log(' Valid session found, fetching fresh profile');
          await fetchUserProfile(session.user);
          await completeInitialization();
        } else {
          console.log(' No active session found');
          await handleNoAuthData();
        }

      } catch (error) {
        console.error(' Critical app initialization error:', error);
        await handleInitializationError();
      }
    };

    const handleAuthTimeout = async () => {
      if (!mountedRef.current) return;
      console.log(' Auth check timed out, using cached data');
      setAuthCheckComplete(true);
      await loadCachedDataAsFallback();
      await completeInitialization();
    };

    const handleNoAuthData = async () => {
      if (!mountedRef.current) return;
      console.log(' No auth data, checking cache...');
      setAuthCheckComplete(true);
      await loadCachedDataAsFallback();
      await completeInitialization();
    };

    const handleInitializationError = async () => {
      if (!mountedRef.current) return;
      console.log(' Initialization error, trying cache...');
      setAuthCheckComplete(true);
      await loadCachedDataAsFallback();
      await completeInitialization();
    };

    const loadCachedDataAsFallback = async () => {
      if (!mountedRef.current) return;

      try {
        console.log(' Loading cached data...');
        setIsLoadingCache(true);
        
        const isValid = await isCachedDataValid(CACHE_VALIDITY_DAYS);
        console.log('Cache validity:', isValid);
        
        if (isValid) {
          const [role, userData] = await Promise.allSettled([
            getUserRole(),
            getUserData()
          ]);
          
          const successfulRole = role.status === 'fulfilled' ? role.value : null;
          const successfulUserData = userData.status === 'fulfilled' ? userData.value : null;
          
          if (successfulUserData && successfulRole) {
            setCachedUser(successfulUserData);
            setCachedRole(successfulRole);
            
            // Only use cached data if we don't have fresh auth data
            if (!user) {
              setUser(successfulUserData);
              console.log(' Applied cached user data');
            }
          } else {
            console.log(' No valid cached data available');
            await clearInvalidCache();
          }
        } else {
          console.log(' Cached data expired, clearing');
          await clearInvalidCache();
        }
      } catch (error) {
        console.error(' Cache loading error:', error);
        await clearInvalidCache();
      } finally {
        if (mountedRef.current) {
          setIsLoadingCache(false);
        }
      }
    };

    const clearInvalidCache = async () => {
      try {
        await clearUserData();
        setCachedUser(null);
        setCachedRole(null);
      } catch (error) {
        console.error(' Error clearing invalid cache:', error);
      }
    };

    const completeInitialization = () => {
      if (!mountedRef.current) return;
      
      console.log(' App initialization complete');
      
      // Clear timeout
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      
      // Set completion flags
      setIsLoadingAuth(false);
      setIsLoadingCache(false);
      setSessionChecked(true);
      setInitialDataLoaded(true);
      setAuthCheckComplete(true);
      setAppInitialized(true);
    };

    initializeApp();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current || !appInitialized) return;
        
        console.log(' Auth state changed:', event);
        
        try {
          setIsLoadingAuth(true);
          
          if (session?.user) {
            await fetchUserProfile(session.user);
          } else {
            console.log(' User signed out');
            await handleSignOutCleanup();
          }
        } catch (error) {
          console.error(' Auth state change error:', error);
          if (error.message?.includes('JWT') || error.message?.includes('auth') || error.status === 401) {
            await handleSignOutCleanup();
          }
        } finally {
          if (mountedRef.current) {
            setIsLoadingAuth(false);
          }
        }
      }
    );

    return () => {
      mountedRef.current = false;
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      subscription?.unsubscribe();
    };
  }, []);

  const handleSignOutCleanup = async () => {
    try {
      setUser(null);
      setCachedUser(null);
      setCachedRole(null);
      await clearUserData();
    } catch (error) {
      console.error('❌ Sign out cleanup error:', error);
    }
  };

  const fetchUserProfile = async (authUser) => {
    try {
      console.log(' Fetching user profile for:', authUser.email);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          college_id,
          is_approved,
          profile_image,
          name,
          phone_number,
          room_number,
          parent_phone,
          current_session_id
        `)
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      const userData = {
        id: authUser.id,
        email: authUser.email,
        role: profile.role,
        collegeId: profile.college_id,
        sessionId: profile.current_session_id,
        isApproved: profile.is_approved,
        sessionStatus: profile.sessions?.status,
        sessionExpiry: profile.sessions?.end_time,
        profile_image: profile.profile_image,
        name: profile.name,
        phone_number: profile.phone_number,
        roomNumber: profile.room_number,
        parentNumber: profile.parent_phone,
        lastFetched: new Date().toISOString()
      };

      console.log(' Fresh profile data received');
      
      // Update state
      setUser(userData);
      setCachedUser(userData);
      setCachedRole(profile.role);
      
      // Save to storage
      await Promise.allSettled([
        saveUserRole(profile.role),
        saveUserData(userData)
      ]);

      return userData;

    } catch (error) {
      console.error(' Profile fetch error:', error);
      
      if (error.message?.includes('JWT') || error.message?.includes('auth') || error.status === 401) {
        console.log(' Auth error - clearing session');
        await handleSignOutCleanup();
      }
      throw error;
    }
  };


  const signIn = useCallback(async (email, password) => {
    setIsLoadingAuth(true);
    try {
   let existingDeviceId = null;
      const { data: existingSessions, error: sessionError } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('email', email);
  
      if (sessionError) {
        console.error('Error checking active sessions:', sessionError.message);
      }
  
  if(existingSessions){
      if(Platform.OS == 'android'){
        existingDeviceId =  Application.getAndroidId();
      }
      else if(Platform.OS == 'ios'){
        existingDeviceId = await Application.getIosIdForVendorAsync();
      }
    }


      if (existingSessions && existingSessions.length > 0 && (existingSessions[0]?.device_id!=existingDeviceId)) {
        showAlert(
          'Already Logged In',
          'Your account is already logged in on another device. Please log out there first.',
          [{ text: 'OK' }]
        );
        setIsLoadingAuth(false);
        return null;
      }
  

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      if (error) {
        showAlert('Error', 'Enter valid credentials', [{ text: 'OK' }]);
        setIsLoadingAuth(false);
        return null;
      }
  
    
      if (data.session) {

        let deviceId = null;

        if (Platform.OS === 'android') {
          deviceId =  Application.getAndroidId();
        } else if (Platform.OS === 'ios') {
          deviceId = await Application.getIosIdForVendorAsync();
        }
  
        await supabase.from('active_sessions').insert({
          user_id: data.user.id,
          email,
          session_id: data.session.id,
          device_id: deviceId,
          created_at: new Date(),
        });
      }

      console.log(' Authentication successful, fetching user profile...');
      const userData = await fetchUserProfile(data.user);
  

      console.log(' Saving user data to cache...');
      await Promise.allSettled([
        saveUserRole(userData.role),
        saveUserData(userData),
      ]);
  
      console.log(' Sign in complete');
      return userData;
  
    } catch (error) {
      console.error(' Sign in error:', error);
      showAlert('Error', 'Something went wrong. Please try again.', [{ text: 'OK' }]);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);
  

  const signUp = useCallback(async (formData) => {
    setIsLoadingAuth(true);
    try {
 
      let imageUrl = null;
      if (formData.profileImage) {
        imageUrl = await saveImage('profile', formData.profileImage);
      }
  

      const { data: { user }, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
          },
        },
      });
  
      if (authError) throw authError;
  
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: user.id,
          role: formData.role,
          name: formData.name,
          phone_number: formData.phone,
          room_number: formData.role === 'student' ? formData.roomNumber : null,
          department: (formData.role === 'admin' || formData.role === 'student') ? formData.department : null,
          shift_schedule: formData.role === 'guard' ? formData.shift : null,
          parent_phone: formData.role === 'student' ? formData.parentPhone : null,
          is_approved: formData.role === 'admin' ? false : true,
          profile_image: imageUrl || null,
        },
      ]);
  
      if (profileError) {
        // If profile creation fails but auth succeeded, mark for cleanup
        await handleFailedProfile(user.id, formData);
        throw profileError;
      }
  
      return { data: user, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);
  
  const handleFailedProfile = async (userId, formData) => {
 
    const failedProfile = {
      userId,
      formData,
      timestamp: Date.now(),
    };
    localStorage.setItem('failed_profile', JSON.stringify(failedProfile));
  };
  

  const signOut = useCallback(async () => {
    setIsLoadingAuth(true);
  
    try {
      let deviceId = null;
      let user = null;
  
      // Get current user
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.warn(' Could not retrieve user before sign-out:', userError.message);
        } else {
          user = userData?.user;
        }
      } catch (userFetchError) {
        console.warn(' Error fetching current user:', userFetchError.message);
      }
  
      // Get device ID
      try {
        if (Platform.OS === 'android') {
          deviceId = await Application.getAndroidId();
        } else if (Platform.OS === 'ios') {
          deviceId = await Application.getIosIdForVendorAsync();
        }
      } catch (deviceIdError) {
        console.warn(' Could not retrieve device ID:', deviceIdError.message);
      }
  
      // Delete push tokens
      if (deviceId) {
        try {
          const { error: tokenError } = await supabase
            .from('user_push_tokens')
            .delete()
            .eq('device_id', deviceId);
  
          if (tokenError) {
            console.warn(' Failed to delete push tokens:', tokenError.message);
          } else {
            console.log(' Push tokens deleted successfully');
          }
        } catch (tokenDeletionError) {
          console.warn(' Error during push token deletion:', tokenDeletionError.message);
        }
      }

      //  Delete from active_sessions
      if (user && deviceId) {
        try {
          const { error: sessionDeleteError } = await supabase
            .from('active_sessions')
            .delete()
            .eq('user_id', user.id)
            .eq('device_id', deviceId);
  
          if (sessionDeleteError) {
            console.warn(' Failed to delete active session:', sessionDeleteError.message);
          } else {
            console.log(' Active session removed successfully');
          }
        } catch (activeSessionError) {
          console.warn(' Error removing active session:', activeSessionError.message);
        }
      }
  
      // Sign out from auth
      try {
        const { error: signOutError } = await supabase.auth.signOut();
  
        if (
          signOutError &&
          !signOutError.message.includes('Auth session missing') &&
          !signOutError.message.includes('Invalid Refresh Token')
        ) {
          console.warn(' Auth sign out error:', signOutError.message);
        } else {
          console.log(' Remote sign out successful');
        }
      } catch (authError) {
        console.warn(' Auth sign out error:', authError.message);
      }
  
    } catch (error) {
      console.error(' Unexpected sign out error:', error);
    } finally {
      // Always perform cleanup
      try {
        await handleSignOutCleanup();
        console.log(' Sign out cleanup completed');
      } catch (cleanupError) {
        console.error(' Error during cleanup:', cleanupError);
      } finally {
        setIsLoadingAuth(false);
      }
    }
  }, [handleSignOutCleanup]);
  

  const refreshSession = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      if (data.user) await fetchUserProfile(data.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
    } catch (error) {
      console.error(' Error refreshing user data:', error);
    }
  }, [user?.id]);

  const value = useMemo(() => ({
    user,
    isLoading: isLoadingAuth || isLoadingCache,
    isLoadingAuth,
    isLoadingCache,
    sessionChecked,
    cachedRole,
    cachedUser,
    initialDataLoaded,
    authCheckComplete,
    appInitialized,
    signIn,
    signUp,
    signOut, 
    refreshSession,
    refreshUserData,
    fetchUserProfile,
  }), [
    user,
    isLoadingAuth,
    isLoadingCache,
    sessionChecked,
    cachedRole,
    cachedUser,
    initialDataLoaded,
    authCheckComplete,
    appInitialized,
    signIn,
    signUp,
    signOut,
    refreshSession,
    refreshUserData,
    fetchUserProfile,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};