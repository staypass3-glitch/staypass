import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

const TabBarButton = ({ onPress, routeName, label, isFocused }) => {
  const icon = {
    Home: (props) => <Feather name='home' size={24} {...props} />,
    History: (props) => <MaterialIcons name="history" size={24} {...props} />,
    Account: (props) => <MaterialCommunityIcons name="account-outline" size={24} {...props} />
  };

  const scale = useSharedValue(0);


  useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0, { duration: 350 });
  }, [isFocused]);

  const animatedTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(scale.value, [0, 1], [1, 0]);
    return {
      opacity,
    };
  });


  const animatedIconStyle = useAnimatedStyle(()=>{
    const size = interpolate(scale.value, [0,1], [1,1.2])

    const top = interpolate(scale.value, [0,1], [0,9])

    return{
        transform:[{
            scale:size
        }],
        top
    }
  })
  return (
    <Pressable
      key={routeName}
      accessibilityRole="button"
      onPress={onPress}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center',marginBottom:'3%' }}
    >
    <Animated.View style={animatedIconStyle}>
    {icon[routeName]?.({ color: isFocused ? '#fff' : '#000' }) || <Feather name="alert-circle" size={24} />}
    </Animated.View>
      
      
      <Animated.Text style={[{ color: isFocused ? '#fff' : '#000' }, animatedTextStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
};

export default TabBarButton;

const styles = StyleSheet.create({});
