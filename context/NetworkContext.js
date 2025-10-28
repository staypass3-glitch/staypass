import { MaterialIcons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Create a context for user data refresh
const UserRefreshContext = createContext(() => {});

export const useUserRefresh = () => {
  return useContext(UserRefreshContext);
};

const NetworkContext = createContext({ isConnected: true, networkType: null });

export const useNetwork = () => {
  return useContext(NetworkContext);
};

export const NetworkProvider = ({ children, onNetworkRestored }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState(null);
  const [shouldRefreshUser, setShouldRefreshUser] = useState(false);
  const [showConnectionRestored, setShowConnectionRestored] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const restoredFadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const wasOffline = useRef(false);
  const restoreTimeoutRef = useRef(null);
  const { width, height } = Dimensions.get('window');

  // Function to trigger user refresh
  const refreshUserData = React.useCallback(() => {
    console.log("Refreshing user data...");
    if (onNetworkRestored && typeof onNetworkRestored === 'function') {
      onNetworkRestored();
    }
    setShouldRefreshUser(true);
    // Reset after triggering refresh
    setTimeout(() => setShouldRefreshUser(false), 1000);
  }, [onNetworkRestored]);

  // Clear timeout
  const clearRestoreTimeout = React.useCallback(() => {
    if (restoreTimeoutRef.current) {
      clearTimeout(restoreTimeoutRef.current);
      restoreTimeoutRef.current = null;
    }
  }, []);

  // Function to show connection restored message
  const showConnectionRestoredMessage = React.useCallback(() => {
    // Clear any existing timeout first
    clearRestoreTimeout();
    
    setShowConnectionRestored(true);
    
    // Animate in the message
    Animated.timing(restoredFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    
  }, [clearRestoreTimeout]);

  const hideConnectionRestoredMessage = React.useCallback(() => {
    clearRestoreTimeout();
    
    // Animate out the restored message
    Animated.timing(restoredFadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      if (isMounted.current) {
        setShowConnectionRestored(false);
      }
    });
  }, [clearRestoreTimeout]);

  useEffect(() => {
    isMounted.current = true;

    console.log("NetworkProvider mounted with @react-native-community/netinfo");

    // Initial network check
    const checkInitialNetwork = async () => {
      try {
        const state = await NetInfo.fetch();
        if (!isMounted.current) return;

        console.log("Initial network state:", state.isConnected, "Type:", state.type);
        handleNetworkChange(state.isConnected, state.type);
      } catch (error) {
        console.error("Error checking initial network:", error);
      }
    };

    checkInitialNetwork();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      if (!isMounted.current) return;

      console.log("Network state change detected. Is connected:", state.isConnected, "Type:", state.type);
      handleNetworkChange(state.isConnected, state.type);
    });

    // Handle app state changes
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log("App became active, checking network...");
        NetInfo.fetch().then(state => {
          if (!isMounted.current) return;
          handleNetworkChange(state.isConnected, state.type);
        });
      }
    });

    return () => {
      console.log("NetworkProvider unmounted");
      isMounted.current = false;
      
      // Clean up timeout
      clearRestoreTimeout();
      
      // Stop all animations
      scaleAnim.stopAnimation();
      fadeAnim.stopAnimation();
      pulseAnim.stopAnimation();
      rotateAnim.stopAnimation();
      restoredFadeAnim.stopAnimation();
      
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [clearRestoreTimeout]);

  const handleNetworkChange = (isConnectedToNetwork, type = null) => {
    const wasConnected = isConnected;
    
    setIsConnected(isConnectedToNetwork);
    if (type) setNetworkType(type);

    // If we were offline and now we're online, show connection restored message and refresh data
    if (wasOffline.current && isConnectedToNetwork) {
      console.log("Network restored, showing connection restored message");
      showConnectionRestoredMessage();
      refreshUserData();
      return;
    }

    // Update offline tracker
    wasOffline.current = !isConnectedToNetwork;

    if (!isConnectedToNetwork) {
      console.log("No internet connection detected");
      
      // Cancel any existing restore message
      if (showConnectionRestored) {
        hideConnectionRestoredMessage();
      }
      
      // Start pulse animation for the retry button
      startPulse();
      
      // Scale in animation with bounce effect
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
    } else {
      console.log("Internet connection available");
      
      // Stop pulse animation
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      
      // Scale out animation
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  // Start pulsing animation
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Start rotation animation for refresh icon
  const startRotation = () => {
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  const handleRetry = () => {
    console.log("Manual network check triggered");
    
    // Start rotation animation
    startRotation();
    
    // Add a quick feedback animation when retry is pressed
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      NetInfo.fetch().then(state => {
        if (!isMounted.current) return;
        handleNetworkChange(state.isConnected, state.type);
      });
    });
  };

  const networkValue = {
    isConnected,
    networkType
  };

  // Rotation interpolation
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <NetworkContext.Provider value={networkValue}>
      <UserRefreshContext.Provider value={refreshUserData}>
        {/* Children are still rendered but blocked when offline */}
        <View style={{ flex: 1 }}>
          {children}

          {/* Overlay to block interaction when offline */}
          {!isConnected && !showConnectionRestored && (
            <Animated.View 
              style={[
                styles.blockOverlay, 
                { opacity: fadeAnim }
              ]} 
              pointerEvents="auto" 
            />
          )}

          {/* Centered No Internet Alert */}
          <Animated.View
            style={[
              styles.centeredAlertContainer,
              { 
                transform: [{ scale: scaleAnim }],
                opacity: fadeAnim,
              }
            ]}
            pointerEvents={!isConnected && !showConnectionRestored ? 'auto' : 'none'}
          >
            <View style={styles.alertCard}>
              {/* Animated WiFi Off Icon */}
              <Animated.View 
                style={[
                  styles.iconContainer,
                  { transform: [{ scale: pulseAnim }] }
                ]}
              >
                <MaterialIcons name="wifi-off" size={48} color="#ef4444" />
              </Animated.View>

              <View style={styles.textContainer}>
                <Text style={styles.mainText}>No Internet Connection</Text>
                <Text style={styles.subText}>Please check your network settings</Text>
              </View>

              {/* Retry Button */}
              <View style={styles.retryButtonContainer}>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                  <Animated.View
                    style={[
                      styles.refreshIconContainer,
                      { transform: [{ rotate: rotateInterpolate }] }
                    ]}
                  >
                    <MaterialIcons name="refresh" size={20} color="white" />
                  </Animated.View>
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* Connection Restored Message */}
          {showConnectionRestored && (
            <Animated.View
              style={[
                styles.restoredOverlay,
                { opacity: restoredFadeAnim }
              ]}
              pointerEvents="auto"
            >
              <View style={styles.restoredCard}>
                <MaterialIcons name="wifi" size={64} color="#10b981" />
                <Text style={styles.restoredTitle}>Connection Restored!</Text>
                <Text style={styles.restoredMessage}>
                  Please Restart the app
                </Text>
                
                {/* Dismiss button */}
        
              </View>
            </Animated.View>
          )}
        </View>
      </UserRefreshContext.Provider>
    </NetworkContext.Provider>
  );
};

const styles = StyleSheet.create({
  blockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 9999,
  },
  centeredAlertContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    elevation: 10000,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    maxWidth: 320,
    minWidth: 280,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mainText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButtonContainer: {
    width: '100%',
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  refreshIconContainer: {
    marginRight: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Connection restored styles
  restoredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001,
    elevation: 10001,
  },
  restoredCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 32,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height :10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    maxWidth: 360,
    minWidth: 300,
  },
  restoredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  restoredMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  dismissButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  dismissButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Optional: Higher Order Component for network awareness
export const withNetwork = (Component) => {
  return (props) => (
    <NetworkProvider>
      <Component {...props} />
    </NetworkProvider>
  );
};