import { BlurView } from 'expo-blur'
import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import ScreenWrapper from './ScreenWrapper'

const CustomIndicator = ({ visible = true, color = 'blue', size = 40 }) => {
  if (!visible) return null
  
  return (
    <ScreenWrapper>

<View style={styles.overlayContainer}>
      <BlurView intensity={50} style={styles.absolute} tint="light" />
      <View style={styles.indicator}>
        <ActivityIndicator color={color} size={size}/>
      </View>
    </View>

    </ScreenWrapper>
  
  )
}

export default CustomIndicator

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  indicator: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  }
})