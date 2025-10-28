import * as Application from 'expo-application';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { clearUserData, getUserData, getUserRole, isCachedDataValid, saveUserData, saveUserRole } from '../helpers/storage.js';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext();

// Constants for better maintainability
const AUTH_TIMEOUT = 5000;
const CACHE_VALIDITY_DAYS = 1;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [cachedUser, setCachedUser] = useState(null);
  const [cachedRole, setCachedRole] = useState(null);

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
        console.log('🚀 App initialization started');
        
        // Reset states
        setIsLoadingAuth(true);
        setAuthCheckComplete(false);
        setAppInitialized(false);
        
        // Set timeout for auth check
        authTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current && !authCheckComplete) {
            console.log('⏰ Auth timeout - proceeding with cached data fallback');
            handleAuthTimeout();
          }
        }, AUTH_TIMEOUT);

        // Check authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          await handleNoAuthData();
        } else if (session?.user) {
          console.log('✅ Valid session found, fetching fresh profile');
          await fetchUserProfile(session.user);
          await completeInitialization();
        } else {
          console.log('❌ No active session found');
          await handleNoAuthData();
        }

      } catch (error) {
        console.error('❌ Critical app initialization error:', error);
        await handleInitializationError();
      }
    };

    const handleAuthTimeout = async () => {
      if (!mountedRef.current) return;
      console.log('⏰ Auth check timed out, using cached data');
      setAuthCheckComplete(true);
      await loadCachedDataAsFallback();
      await completeInitialization();
    };

    const handleNoAuthData = async () => {
      if (!mountedRef.current) return;
      console.log('📦 No auth data, checking cache...');
      setAuthCheckComplete(true);
      await loadCachedDataAsFallback();
      await completeInitialization();
    };

    const handleInitializationError = async () => {
      if (!mountedRef.current) return;
      console.log('❌ Initialization error, trying cache...');
      setAuthCheckComplete(true);
      await loadCachedDataAsFallback();
      await completeInitialization();
    };

    const loadCachedDataAsFallback = async () => {
      if (!mountedRef.current) return;

      try {
        console.log('📦 Loading cached data...');
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
              console.log('✅ Applied cached user data');
            }
          } else {
            console.log('❌ No valid cached data available');
            await clearInvalidCache();
          }
        } else {
          console.log('❌ Cached data expired, clearing');
          await clearInvalidCache();
        }
      } catch (error) {
        console.error('❌ Cache loading error:', error);
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
        console.error('❌ Error clearing invalid cache:', error);
      }
    };

    const completeInitialization = () => {
      if (!mountedRef.current) return;
      
      console.log('✅ App initialization complete');
      
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
        
        console.log('🔄 Auth state changed:', event);
        
        try {
          setIsLoadingAuth(true);
          
          if (session?.user) {
            await fetchUserProfile(session.user);
          } else {
            console.log('🚪 User signed out');
            await handleSignOutCleanup();
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error);
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
      console.log('📡 Fetching user profile for:', authUser.email);
      
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

      console.log('✅ Fresh profile data received');
      
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
      console.error('❌ Profile fetch error:', error);
      
      if (error.message?.includes('JWT') || error.message?.includes('auth') || error.status === 401) {
        console.log('🔐 Auth error - clearing session');
        await handleSignOutCleanup();
      }
      throw error;
    }
  };

  const signIn = useCallback(async (email, password) => {
    setIsLoadingAuth(true);
    try {
      // Authenticate
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error){
        Alert.alert('Error','Enter the valid credentials',[{text:'Ok'}])
      }
      
      // Fetch profile
      console.log('🔐 Authentication successful, fetching user profile...');
      const userData = await fetchUserProfile(data.user);
      
      // Save to cache
      console.log('💾 Saving user data to cache...');
      await Promise.allSettled([
        saveUserRole(userData.role),
        saveUserData(userData)
      ]);
      
      console.log('✅ Sign in complete');
      return userData;

    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const signUp = useCallback(async (email, password, userData, collegeId, sessionId) => {
    setIsLoadingAuth(true);
    try {
      // Validate session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('status, end_time')
        .eq('id', sessionId)
        .single();
  
      if (sessionError) throw sessionError;
      if (session.status !== 'active' || new Date(session.end_time) < new Date()) {
        throw new Error('This session has expired or is inactive');
      }
  
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone
          }
        }
      });
  
      if (authError) throw authError;
  
      const guard_id = crypto.randomUUID();
      const session_id = crypto.randomUUID();
  
      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: authData.user.id,
        role: userData.role,
        college_id: collegeId,
        current_session_id: sessionId,
        name: userData.name,
        phone_number: userData.phone,
        room_number: userData.role === 'student' ? userData.roomNumber : null,
        department: userData.role === 'admin' ? userData.department : null,
        shift_schedule: userData.role === 'guard' ? userData.shift : null,
        is_approved: userData.role === 'admin' ? false : true,
        guard_id: userData.role === 'admin' ? guard_id : null,
        session_id: userData.role === 'admin' ? session_id : null
      }]);
  
      if (profileError) throw profileError;
  
      // Create user data object
      const completeUserData = {
        id: authData.user.id,
        email: authData.user.email,
        role: userData.role,
        collegeId: collegeId,
        sessionId: sessionId,
        isApproved: userData.role === 'admin' ? false : true,
        profile_image: null,
        name: userData.name,
        phone_number: userData.phone,
        roomNumber: userData.role === 'student' ? userData.roomNumber : null,
        parentNumber: userData.role === 'student' ? userData.parentPhone : null,
        department: userData.role === 'admin' ? userData.department : null,
        shift_schedule: userData.role === 'guard' ? userData.shift : null,
        lastFetched: new Date().toISOString()
      };
  
      // Update state
      setUser(completeUserData);
      setCachedUser(completeUserData);
      setCachedRole(userData.role);
      
      // Save to storage
      await Promise.allSettled([
        saveUserRole(userData.role),
        saveUserData(completeUserData)
      ]);
  
      console.log('✅ Sign up successful');
      return completeUserData;
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoadingAuth(true);
    
    try {
      let deviceId = null;
  
      // Get device ID
      try {
        if (Platform.OS === 'android') {
          deviceId = await Application.getAndroidId();
        } else if (Platform.OS === 'ios') {
          deviceId = await Application.getIosIdForVendorAsync();
        }
      } catch (deviceIdError) {
        console.warn('⚠️ Could not retrieve device ID:', deviceIdError.message);
      }
  
      // Delete push tokens
      if (deviceId) {
        try {
          const { error: tokenError } = await supabase
            .from('user_push_tokens')
            .delete()
            .eq('device_id', deviceId);
  
          if (tokenError) {
            console.warn('⚠️ Failed to delete push tokens:', tokenError.message);
          } else {
            console.log('✅ Push tokens deleted successfully');
          }
        } catch (tokenDeletionError) {
          console.warn('⚠️ Error during push token deletion:', tokenDeletionError.message);
        }
      }
  
      // Sign out from auth
      try {
        const { error: signOutError } = await supabase.auth.signOut();
        
        if (signOutError && 
            !signOutError.message.includes('Auth session missing') && 
            !signOutError.message.includes('Invalid Refresh Token')) {
          console.warn('⚠️ Auth sign out error:', signOutError.message);
        } else {
          console.log('✅ Remote sign out successful');
        }
      } catch (authError) {
        console.warn('⚠️ Auth sign out error:', authError.message);
      }
  
    } catch (error) {
      console.error('❌ Unexpected sign out error:', error);
    } finally {
      // Always perform cleanup
      try {
        await handleSignOutCleanup();
        console.log('✅ Sign out cleanup completed');
      } catch (cleanupError) {
        console.error('❌ Error during cleanup:', cleanupError);
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
      console.error('❌ Error refreshing user data:', error);
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