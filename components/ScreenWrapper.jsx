import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../constants/theme';

const ScreenWrapper = ({ 
  children, 
  bg = 'white', 
  paddingtop = false, 
  haveTabs = false,
  statusBarColor = theme.colors.primary,
  statusBarStyle = 'light-content',
  gradientColors = theme.gradients.primary,
  style
}) => {
  const insets = useSafeAreaInsets();
  const paddingTop = paddingtop ? 0 : insets.top > 0 ? insets.top : 0;

  return (
    <>
      <StatusBar 
        backgroundColor={statusBarColor} 
        barStyle={statusBarStyle} 
        translucent={false} 
      />

      <LinearGradient
        colors={gradientColors}
        style={{
          height: Platform.OS === 'android' ? StatusBar.currentHeight : insets.top,
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
        }}
      />

      <View style={[
        { 
          flex: 1, 
          backgroundColor: bg, 
          marginTop: paddingTop,
          paddingHorizontal: theme.spacing.sm,
        },
        haveTabs && { marginBottom: theme.responsive.tabBar.height },
        style
      ]}>
        {children}
      </View>
    </>
  );
};

export default ScreenWrapper;