import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const AppStartupAnimation = ({ onAnimationComplete, isRetrievingFromStorage = false }) => {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [currentStep, setCurrentStep] = useState(0);

  const loadingSteps = [
    'Initializing app...',
    'Checking cached data...',
    'Loading user preferences...',
    'Preparing your experience...',
    'Almost ready...'
  ];

  useEffect(() => {
    // Start the animation sequence
    const startAnimation = async () => {
      // Logo entrance animation
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();

      // Text fade in after logo
      setTimeout(() => {
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 400);

      // Progress bar animation
      setTimeout(() => {
        Animated.timing(progressWidth, {
          toValue: width * 0.8,
          duration: 2000,
          useNativeDriver: false,
        }).start();
      }, 800);

      // Pulse animation for the icon
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
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

      // Step through loading messages
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < loadingSteps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(stepInterval);
            return prev;
          }
        });
      }, 600);

      // Complete animation after appropriate time
      const animationDuration = isRetrievingFromStorage ? 2500 : 3000;
      setTimeout(() => {
        onAnimationComplete?.();
      }, animationDuration);

      return () => clearInterval(stepInterval);
    };

    startAnimation();
  }, [isRetrievingFromStorage]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e40af', '#3b82f6', '#60a5fa']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Logo/Icon */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [
                { scale: logoScale },
                { scale: pulseAnim }
              ],
            },
          ]}
        >
          <MaterialIcons 
            name={isRetrievingFromStorage ? "storage" : "school"} 
            size={80} 
            color="white" 
          />
        </Animated.View>

        {/* App Name */}
        <Animated.Text
          style={[
            styles.appName,
            {
              opacity: textOpacity,
            },
          ]}
        >
          StayPass
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: textOpacity,
            },
          ]}
        >
          Smart Campus Management
        </Animated.Text>

        {/* Dynamic Loading Text */}
        <Animated.Text
          style={[
            styles.loadingText,
            {
              opacity: textOpacity,
            },
          ]}
        >
          {loadingSteps[currentStep]}
        </Animated.Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
              },
            ]}
          />
        </View>

        {/* Loading Dots */}
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: pulseAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: pulseAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: pulseAnim,
              },
            ]}
          />
        </View>

        {/* Status Indicator */}
        <Animated.Text
          style={[
            styles.statusText,
            {
              opacity: textOpacity,
            },
          ]}
        >
          {isRetrievingFromStorage ? 'Retrieving cached data...' : 'Loading fresh data...'}
        </Animated.Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 40,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 30,
    textAlign: 'center',
    minHeight: 20,
  },
  progressContainer: {
    width: width * 0.8,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 30,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginHorizontal: 4,
  },
  statusText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
});

export default AppStartupAnimation; 