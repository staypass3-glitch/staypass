import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
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

const { width } = Dimensions.get('window');

const ForgotPassword = () => {
  const navigation = useNavigation();
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const { showAlert } = useAlert();

  useEffect(() => {
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
    ]).start();
  }, []);

  useEffect(() => {
    let interval;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (otpSent) {
      setCanResend(true);
    }
    
    return () => clearInterval(interval);
  }, [resendTimer, otpSent]);

  const cleanPhoneNumber = (phone) => {
    return phone.replace(/\D/g, '').slice(0, 10);
  };

  const getFullPhoneNumber = () => {
    const cleaned = cleanPhoneNumber(phone);
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return null;
  };

  const handleSendOTP = async () => {
    const cleanedPhone = cleanPhoneNumber(phone);
    
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      showAlert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      const fullPhoneNumber = getFullPhoneNumber();
      const result = await signIn(fullPhoneNumber, null, true);

      if (result?.otpSent) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setOtpSent(true);
        setResendTimer(30);
        setCanResend(false);
        showAlert('OTP Sent', `OTP has been sent to ${fullPhoneNumber}`);
      } else if (result?.error) {
        throw new Error(result.error);
      }
      
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Error sending OTP:', error);
      
      // Extract error message
      const errorMessage = error.message || '';
      const errorString = error.toString();
      
      // Check for "Signups not allowed for otp" error
      if (errorMessage.includes('Signups not allowed for otp') || 
          errorString.includes('Signups not allowed for otp') ||
          errorMessage.toLowerCase().includes('signup not allowed') || 
          errorMessage.toLowerCase().includes('not registered') ||
          errorMessage.toLowerCase().includes('user not found')) {
        
        // Show custom alert for signup required
        showAlert(
          'Account Not Found',
          'This phone number is not registered. Please sign up first.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to SignIn screen after user clicks OK
                navigation.navigate('SignUp');
              }
            }
          ]
        );
      } else {
        // Show generic error for other cases
        showAlert('Error', errorMessage || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      showAlert('Error', 'Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = getFullPhoneNumber();
      if (!fullPhoneNumber) {
        throw new Error('Invalid phone number');
      }

      const userData = await signIn(fullPhoneNumber, otp, true);

      if (userData) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Handle successful verification
        showAlert('Success', 'Update your password by going to Settings and clicking on ‘Forgot Password’');
        // You might want to navigate to login or home screen here
        // navigation.navigate('Login');
      }
      
    } catch (error) {
      console.error('OTP verification error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      const errorMessage = error.message || '';
      const errorString = error.toString();
      
      // Check for "Signups not allowed for otp" error
      if (errorMessage.includes('Signups not allowed for otp') || 
          errorString.includes('Signups not allowed for otp') ||
          errorMessage.toLowerCase().includes('signup not allowed') || 
          errorMessage.toLowerCase().includes('not registered') ||
          errorMessage.toLowerCase().includes('user not found')) {
        
        // Show custom alert for signup required
        showAlert(
          'Account Not Found',
          'This phone number is not registered. Please sign up first.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to SignIn screen after user clicks OK
                navigation.navigate('SignIn');
                // Reset the OTP state
                setOtpSent(false);
                setOtp('');
              }
            }
          ]
        );
      } else {
        showAlert('Error', errorMessage || 'Invalid OTP. Please try again.');
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    try {
      setOtp('');
      await handleSendOTP();
    } catch (error) {
      console.error('Error resending OTP:', error);
      
      const errorMessage = error.message || '';
      const errorString = error.toString();
      
      if (errorMessage.includes('Signups not allowed for otp') || 
          errorString.includes('Signups not allowed for otp') ||
          errorMessage.toLowerCase().includes('signup not allowed') || 
          errorMessage.toLowerCase().includes('not registered') ||
          errorMessage.toLowerCase().includes('user not found')) {
        
        showAlert(
          'Account Not Found',
          'This phone number is not registered. Please sign up first.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('SignUp');
                setOtpSent(false);
              }
            }
          ]
        );
      } else {
        showAlert('Error', 'Failed to resend OTP. Please try again.');
      }
    }
  };

  return (
    <View style={{flex: 1}}>
      <LinearGradient 
        colors={['#2563eb', '#3b82f6', '#60a5fa']} 
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoBackground}>
            <Text style={styles.logoText}>🔐</Text>
          </View>
        </View>
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
        <View style={styles.formContainer}>
          {!otpSent ? (
            <>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>Enter your registered phone number to receive OTP</Text>
              
              <View style={styles.inputContainer}>
                <View style={styles.phoneInputContainer}>
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>+91</Text>
                  </View>
                  <TextInput
                    placeholder="10-digit phone number"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    style={styles.phoneInput}
                    placeholderTextColor="#999"
                    maxLength={10}
                    editable={!loading}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Verify OTP</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to{'\n'}
                <Text style={styles.phoneText}>+91 {phone}</Text>
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  style={styles.otpInput}
                  placeholderTextColor="#999"
                  maxLength={6}
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, (loading || otp.length !== 6) && styles.buttonDisabled]}
                onPress={verifyOTP}
                disabled={loading || otp.length !== 6}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  Didn't receive the code?{' '}
                </Text>
                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={!canResend}
                  style={styles.resendButton}
                >
                  <Text style={[
                    styles.resendButtonText,
                    canResend ? styles.resendButtonActive : styles.resendButtonInactive
                  ]}>
                    {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
              >
                <Text style={styles.backButtonText}>Change Phone Number</Text>
              </TouchableOpacity>
            </>
          )}
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
  logoText: {
    fontSize: 40,
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
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    fontSize: 28,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  phoneText: {
    color: '#2563eb',
    fontWeight: '600',
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
    width: '100%',
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
  otpInput: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 18,
    paddingVertical: 0,
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
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
    width: '100%',
    marginBottom: 20,
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
  backButton: {
    paddingVertical: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4158D0',
    fontWeight: '500',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  resendText: {
    fontSize: 16,
    color: '#64748b',
  },
  resendButton: {
    padding: 4,
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resendButtonActive: {
    color: '#2563eb',
  },
  resendButtonInactive: {
    color: '#94a3b8',
  },
});

export default ForgotPassword;