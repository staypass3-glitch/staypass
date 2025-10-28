import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import TabBarButton from './TabBarButton';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const [dimensions, setDimensions] = useState({ height: 20, width: 100 });

  const buttonWidth = (dimensions.width - 30 - (state.routes.length - 1) * 5) / state.routes.length;
  const bubbleWidth = buttonWidth - 20;
  const offset = (buttonWidth - bubbleWidth) / 2;

  const transformX = useSharedValue(15 + offset);

  // Update bubble position when tab changes
  useEffect(() => {
    const buttonPosition = 15 + state.index * (buttonWidth + 5);
    transformX.value = withSpring(buttonPosition + offset, { duration: 1500 });
  }, [state.index, buttonWidth, offset]);

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.index !== 0) {
        // Move bubble to first tab
        const firstTabPosition = 15 + offset;
        transformX.value = withSpring(firstTabPosition, { duration: 1500 });
        
        // Navigate to first tab
        navigation.navigate(state.routes[0].name);
        
        // Return true to prevent default back behavior
        return true;
      }
      // Return false to allow default back behavior (exit app)
      return false;
    });

    return () => backHandler.remove();
  }, [state.index, state.routes, navigation, offset]);

  const onTabBarLayout = (LayoutChangeEvent) => {
    setDimensions({
      height: LayoutChangeEvent.nativeEvent.layout.height,
      width: LayoutChangeEvent.nativeEvent.layout.width
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{
        translateX: transformX.value
      }]
    };
  });

  const onPress = (index) => {
    const buttonPosition = 15 + index * (buttonWidth + 5);
    transformX.value = withSpring(buttonPosition + offset, { duration: 1500 });
    
    const route = state.routes[index];
    const isFocused = state.index === index;
    
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={styles.tabBar} onLayout={onTabBarLayout}>
      <Animated.View style={[animatedStyle, {
        position: 'absolute',
        backgroundColor: '#2563eb',
        borderRadius: 35,
        height: dimensions.height - 45,
        width: bubbleWidth,
        marginBottom: '3%'
      }]} />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        return (
          <TabBarButton
            key={route.name}
            onPress={() => onPress(index)}
            routeName={route.name}
            label={label}
            isFocused={isFocused}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: "space-between",
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 5,
    paddingVertical: 25,
    shadowColor: '#000',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
    width: '100%',
    paddingHorizontal: 15
  },
});

export default CustomTabBar;