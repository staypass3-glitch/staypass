import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { hp, wp } from '../helpers/common.js';

const Welcome = () => {
  const router = useRouter();
  const navigation = useNavigation();

  return (
  
      <View style={styles.container}>
        {/* Background Gradient */}
        <LinearGradient 
          colors={['#2563eb', '#3b82f6', '#60a5fa']} 
          start={[0, 0]} 
          end={[1, 1]} 
          style={styles.backgroundGradient}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome</Text>
        </View>

        {/* Main Content with Image */}
        <View style={styles.imageContainer}>
          <Image
            style={styles.welcomeImage}
            resizeMode="contain"
            source={require('../assets/images/welcome1.png')}
          />
          
          {/* Accent Circles */}
          <View style={[styles.accentCircle, styles.accentCircle1]} />
          <View style={[styles.accentCircle, styles.accentCircle2]} />
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.name}>Stay Pass</Text>
          <Text style={styles.tagline}>
            Where <Text style={styles.highlight}>Safety</Text> Meets{' '}
            <Text style={styles.highlight}>Simplicity</Text>
          </Text>
        </View>

        {/* Footer with Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={()=>navigation.navigate('SignUp')}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={()=>navigation.navigate('SignIn')}>
            <Text style={styles.loginText}>
             Already have an account? <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>

  );
};

export default Welcome;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: hp(6),
    paddingBottom: hp(4),
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: hp(40),
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    paddingTop: hp(2),
    paddingBottom: hp(2),
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  imageContainer: {
    position: 'relative',
    height: hp(35),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeImage: {
    height: hp(35),
    width: wp(90),
    marginTop: -hp(4),
  },
  accentCircle: {
    position: 'absolute',
    borderRadius: 100,
    opacity: 0.4,
  },
  accentCircle1: {
    width: 100,
    height: 100,
    backgroundColor: '#3b82f6',
    top: hp(2),
    left: wp(15),
  },
  accentCircle2: {
    width: 120,
    height: 120,
    backgroundColor: '#60a5fa',
    bottom: -hp(2),
    right: wp(10),
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: wp(10),
    marginTop: hp(2),
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: hp(1),
  },
  tagline: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 26,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: wp(7),
    marginTop: hp(4),
  },
  button: {
    width: '100%',
    borderRadius: 16,
    marginBottom: hp(3),
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonGradient: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  loginText: {
    fontSize: 16,
    color: '#4b5563',
  },
  loginLink: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
});