import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text } from 'react-native';
import theme from '../../constants/theme.js';


const CustomLoadingScreen = ({ 
  message = 'Loading...', 
  type = 'default',
  onFinish,
  duration = 2000 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Pulse animation for the loading indicator
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Slide up animation
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Auto-finish after duration
    if (onFinish && duration) {
      const timer = setTimeout(() => {
        onFinish();
      }, duration);

      return () => {
        clearTimeout(timer);
        pulseAnimation.stop();
      };
    }

    return () => {
      pulseAnimation.stop();
    };
  }, [fadeAnim, pulseAnim, slideAnim, onFinish, duration]);

  const getGradientColors = () => {
    switch (type) {
      case 'logout':
        return ['#ef4444', '#f87171', '#fca5a5']; // Red gradient for logout
      case 'success':
        return ['#10b981', '#34d399', '#6ee7b7']; // Green gradient for success
      case 'warning':
        return ['#f59e0b', '#fbbf24', '#fcd34d']; // Yellow gradient for warning
      default:
        return theme.gradients.primary; // Default blue gradient
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'logout':
        return 'logout';
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'warning';
      default:
        return 'hourglass-empty';
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'logout':
        return 'Logging out...';
      case 'success':
        return 'Success!';
      case 'warning':
        return 'Please wait...';
      default:
        return message;
    }
  };

  return (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <MaterialIcons 
            name={getIcon()} 
            size={theme.iconSize.xxl} 
            color={theme.colors.white} 
            style={styles.icon}
          />
        </Animated.View>

        <Text style={styles.title}>StayPass</Text>
        <Text style={styles.message}>{getMessage()}</Text>
        
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.white} />
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  icon: {
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  message: {
    fontSize: theme.fontSize.lg,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: theme.spacing.lg,
  },
});

export default CustomLoadingScreen; 