import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base dimensions (iPhone 11 Pro - 375x812)
const baseWidth = 375;
const baseHeight = 812;

// Device type detection
const isSmallDevice = SCREEN_WIDTH < 375;
const isMediumDevice = SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414;
const isLargeDevice = SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768;
const isTablet = SCREEN_WIDTH >= 768;

// Responsive scaling
const scale = SCREEN_WIDTH / baseWidth;
const verticalScale = SCREEN_HEIGHT / baseHeight;
const moderateScale = (size, factor = 0.5) => size + (scale - 1) * factor;

// Responsive dimensions
const responsiveDimensions = {
  // Screen dimensions
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  
  // Responsive scaling functions
  scale,
  verticalScale,
  moderateScale,
  
  // Device type
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isTablet,
  
  // Responsive sizes
  getResponsiveSize: (size) => moderateScale(size),
  getResponsiveHeight: (height) => height * verticalScale,
  getResponsiveWidth: (width) => width * scale,
  
  // Safe area adjustments
  getSafeAreaTop: () => Platform.OS === 'ios' ? 44 : 24,
  getSafeAreaBottom: () => Platform.OS === 'ios' ? 34 : 0,
  
  // Responsive spacing
  spacing: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(16),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(48),
  },
  
  // Responsive font sizes
  fontSize: {
    xs: moderateScale(12),
    sm: moderateScale(14),
    md: moderateScale(16),
    lg: moderateScale(20),
    xl: moderateScale(24),
    xxl: moderateScale(28),
    xxxl: moderateScale(32),
  },
  
  // Responsive icon sizes
  iconSize: {
    xs: moderateScale(16),
    sm: moderateScale(20),
    md: moderateScale(24),
    lg: moderateScale(32),
    xl: moderateScale(40),
    xxl: moderateScale(48),
  },
  
  // Responsive border radius
  borderRadius: {
    sm: moderateScale(4),
    md: moderateScale(8),
    lg: moderateScale(12),
    xl: moderateScale(16),
    xxl: moderateScale(24),
  },
  
  // Responsive padding/margin
  padding: {
    xs: moderateScale(4),
    sm: moderateScale(8),
    md: moderateScale(16),
    lg: moderateScale(24),
    xl: moderateScale(32),
    xxl: moderateScale(48),
  },
  
  // Responsive button heights
  buttonHeight: {
    sm: moderateScale(36),
    md: moderateScale(44),
    lg: moderateScale(52),
    xl: moderateScale(60),
  },
  
  // Responsive input heights
  inputHeight: {
    sm: moderateScale(40),
    md: moderateScale(48),
    lg: moderateScale(56),
  },
  
  // Responsive card dimensions
  card: {
    padding: moderateScale(16),
    borderRadius: moderateScale(12),
    margin: moderateScale(8),
  },
  
  // Responsive header dimensions
  header: {
    height: moderateScale(56) + (Platform.OS === 'ios' ? 44 : 24),
    paddingHorizontal: moderateScale(16),
  },
  
  // Responsive tab bar dimensions
  tabBar: {
    height: moderateScale(60) + (Platform.OS === 'ios' ? 34 : 0),
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
};

export default responsiveDimensions; 