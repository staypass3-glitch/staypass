import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext.js';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const {
    user,
    cachedUser,
    cachedRole,
    isLoading,
    isLoadingCache,
    isLoadingAuth,
    sessionChecked,
    initialDataLoaded,
    authCheckComplete,
    refreshUserData
  } = useAuth();

  // Simple effective user - prefer live data, fallback to cached
  const effectiveUser = useMemo(() => {
    // Always prefer the current user state (which starts with cached data)
    if (user) {
      return user;
    }
    return null;
  }, [user]);

  // Effective role
  const effectiveRole = useMemo(() => {
    return effectiveUser?.role || cachedRole;
  }, [effectiveUser?.role, cachedRole]);

  // Loading states for different scenarios
  const isRetrievingFromStorage = useMemo(() => {
    return isLoadingCache && authCheckComplete;
  }, [isLoadingCache, authCheckComplete]);

  const isInitialLoad = useMemo(() => {
    return isLoadingAuth && !authCheckComplete;
  }, [isLoadingAuth, authCheckComplete]);

  // Show loading only while checking auth OR loading cache (if no user data yet)
  const isLoadingUser = useMemo(() => {
    return (isLoadingAuth || (isLoadingCache && !effectiveUser));
  }, [isLoadingAuth, isLoadingCache, effectiveUser]);

  const value = useMemo(() => ({
    user: effectiveUser,
    role: effectiveRole,
    isLoading: isLoadingUser,
    sessionChecked,
    refreshUserData,
    
    // Detailed loading states
    isLoadingCache,
    isLoadingAuth,
    isRetrievingFromStorage,
    isInitialLoad,
    
    // Data source info
    hasLiveData: Boolean(user?.lastFetched),
    hasCachedData: Boolean(cachedUser),
    dataSource: user?.lastFetched ? 'live' : cachedUser ? 'cache' : 'none'
  }), [
    effectiveUser,
    effectiveRole,
    isLoadingUser,
    sessionChecked,
    refreshUserData,
    isLoadingCache,
    isLoadingAuth,
    isRetrievingFromStorage,
    isInitialLoad,
    user?.lastFetched,
    cachedUser
  ]);

  // Debug logging
  console.log('👤 UserContext:', {
    user: effectiveUser?.email || 'null',
    isLoadingAuth,
    isLoadingCache,
    isLoadingUser,
    authCheckComplete,
    hasCached: !!cachedUser,
    hasLive: !!user?.lastFetched
  });

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};