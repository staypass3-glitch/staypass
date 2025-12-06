import { useAuth } from '@/context/AuthContext.js';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase.js';
const { width } = Dimensions.get('window');


const SignInScreen = () => {
  const {signIn} = useAuth();
  const navigation = useNavigation();
  const [credentials, setCredentials] = useState({
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const logoScale = useState(new Animated.Value(0.5))[0];

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Function to clean phone number
  const cleanPhoneNumber = (phone) => {
    return phone.replace(/\D/g, '').slice(0, 10);
  };

  // Function to get full phone number with country code
  const getFullPhoneNumber = () => {
    const cleaned = cleanPhoneNumber(credentials.phone);
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return null;
  };

  const handlePhoneChange = (text) => {
    const cleaned = cleanPhoneNumber(text);
    setCredentials({ ...credentials, phone: cleaned });
  };

  const handleSignIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      if (!credentials.phone || !credentials.password) {
        throw new Error('Please fill in all fields');
      }

      // Validate phone number
      const cleanedPhone = cleanPhoneNumber(credentials.phone);
      if (cleanedPhone.length !== 10) {
        throw new Error('Please enter a valid 10-digit phone number');
      }

      const fullPhoneNumber = getFullPhoneNumber();
      if (!fullPhoneNumber) {
        throw new Error('Invalid phone number format');
      }

      await signIn(fullPhoneNumber, credentials.password);

      // Get user profile after successful login
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_approved')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      // Handle admin approval
      if (profile.role === 'admin' && !profile.is_approved) {
        throw new Error('Admin account pending approval');
      }

      // Successful login haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate based on role
      switch (profile.role) {
        case 'student':
          navigation.navigate('Student');
          break;
        case 'admin':
          navigation.navigate('AdminDashboard');
          break;
        case 'guard':
          navigation.navigate('GuardScanner');
          break;
        default:
          throw new Error('Invalid user role');
      }
    } catch (error) {
      // Haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      // You might want to show an alert with the error message
      // Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    Haptics.selectionAsync();
    setSecureTextEntry(!secureTextEntry);
  };

  return (
      <View style={{flex: 1}}>
        <LinearGradient 
          colors={['#2563eb', '#3b82f6', '#60a5fa']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Animated.View style={[
            styles.logoContainer,
            { transform: [{ scale: logoScale }] }
          ]}>
            <View style={styles.logoBackground}>
              <FontAwesome5 name="user-graduate" size={40} color="#4158D0" />
            </View>
          </Animated.View>
        </LinearGradient>

        <Animated.View 
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={20} color="#666" style={styles.icon} />
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>+91</Text>
                </View>
                <TextInput
                  placeholder="10-digit phone number"
                  value={credentials.phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  style={styles.phoneInput}
                  placeholderTextColor="#999"
                  maxLength={10}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#666" style={styles.icon} />
              <TextInput
                placeholder="Password"
                value={credentials.password}
                onChangeText={(text) => setCredentials({ ...credentials, password: text })}
                secureTextEntry={secureTextEntry}
                style={styles.input}
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                <MaterialIcons 
                  name={!secureTextEntry ? "visibility" : "visibility-off"} 
                  size={20} 
                  color="#999" 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => {
                Haptics.selectionAsync();
                navigation.navigate('ForgotPassword');
              }}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.signupText}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate('SignUp');
            }}>
              <Text style={styles.signupLink}> Sign Up</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    height: 220,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  logoBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  container: {
    flex: 1,
    marginTop: -30,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 20,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 28,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
  },
  formContainer: {
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 56,
    backgroundColor: '#f8f9fa',
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  countryCodeText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 16,
    paddingVertical: 0,
  },
  icon: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 16,
    paddingVertical: 0,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#4158D0',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#4158D0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4158D0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  signupText: {
    fontSize: 15,
    color: '#666',
  },
  signupLink: {
    fontSize: 15,
    color: '#4158D0',
    fontWeight: '600',
  },
});

export default SignInScreen;