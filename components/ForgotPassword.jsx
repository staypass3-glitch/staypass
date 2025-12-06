import { useAuth } from '@/context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const inputRefs = useRef([]);

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
    ]).start();
  }, []);

  useEffect(() => {
    // Timer for resend OTP
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

  // Function to clean phone number
  const cleanPhoneNumber = (phone) => {
    return phone.replace(/\D/g, '').slice(0, 10);
  };

  // Function to get full phone number with country code
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
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoading(true);

      // Simulate OTP sending (replace with actual OTP service)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOtpSent(true);
      setResendTimer(30);
      setCanResend(false);
      Alert.alert('OTP Sent', `OTP has been sent to +91 ${cleanedPhone}`);
      
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Error sending OTP:', error);
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    if (value.length > 1) return; 
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto-verify when all digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      verifyOTP(newOtp.join(''));
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyOTP = async (otpCode) => {
    setLoading(true);
    try {
      // For demo purposes, accept any 6-digit code starting with 1-9
      // In a real app, you would verify the OTP with your backend
      if (otpCode.length === 6 && /^[1-9]\d{5}$/.test(otpCode)) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Simulate OTP verification
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get full phone number with country code
        const fullPhoneNumber = getFullPhoneNumber();
        if (!fullPhoneNumber) {
          throw new Error('Invalid phone number');
        }

        // Here you would typically sign in the user after OTP verification
        // For demo, we'll navigate to appropriate screen based on user role
        Alert.alert('Success', 'OTP verified successfully!', [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to appropriate screen based on your app flow
              navigation.navigate('Student'); // or AdminDashboard, GuardScanner, etc.
            }
          }
        ]);
        
      } else {
        throw new Error('Invalid OTP');
      }
      
    } catch (error) {
      console.error('OTP verification error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Invalid OTP. Please try again.');
      
      // Clear OTP inputs
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    try {
      await handleSendOTP();
    } catch (error) {
      console.error('Error resending OTP:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  const renderPhoneInput = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Enter Your Phone</Text>
      <Text style={styles.subtitle}>We'll send you a 6-digit OTP to verify</Text>
      
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
    </View>
  );

  const renderOtpInput = () => (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>
        We've sent a 6-digit code to{'\n'}
        <Text style={styles.phoneText}>+91 {phone}</Text>
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <View key={index} style={styles.otpInputWrapper}>
            <TextInput
              ref={ref => inputRefs.current[index] = ref}
              style={[
                styles.otpInput,
                digit ? styles.otpInputFilled : null,
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
              editable={!loading}
            />
            {digit && <View style={styles.dotIndicator} />}
          </View>
        ))}
      </View>

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
        onPress={() => setOtpSent(false)}
      >
        <Text style={styles.backButtonText}>Change Phone Number</Text>
      </TouchableOpacity>
    </View>
  );

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
        {!otpSent ? renderPhoneInput() : renderOtpInput()}
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 10,
    width: '100%',
  },
  otpInputWrapper: {
    position: 'relative',
    marginHorizontal: 4,
  },
  otpInput: {
    width: 44,
    height: 54,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  otpInputFilled: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  dotIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563eb',
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