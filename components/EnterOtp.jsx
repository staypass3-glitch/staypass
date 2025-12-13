import { supabase } from '@/lib/supabase';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';


const { width } = Dimensions.get('window');

const EnterOtp = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { formData } = route.params;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  
  // Input refs
  const inputRefs = useRef([]);

  useEffect(() => {
    const sendOTP = async () => {
      try {
        await supabase.auth.signInWithOtp({ phone: '+91' + formData.phone });
        console.log('+91' + formData.phone);
      } catch (error) {
        console.error('Error sending OTP:', error);
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    };
    
    sendOTP();
  }, []);

  useEffect(() => {
    
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleOtpChange = (value, index) => {
    if (value.length > 1) return; 
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    
    
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      verifyOTP(newOtp.join(''));
    }
  };

// Also update your verifyOTP function to handle the image upload better:
const verifyOTP = async (otpCode) => {
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: '+91' + formData.phone,
      token: otpCode,
      type: 'sms'
    });
    
    if (error) {
      throw error;
    }
    
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          name: formData.name,
          phone: formData.phone,
        },
      },
    });

    if (authError) throw authError;
    
 

    // Success
    navigation.navigate('SignIn');
    
  } catch (error) {
    console.error('OTP verification error:', error);
    Alert.alert('Error', 'Invalid OTP. Please try again.');
    
    // Clear OTP inputs
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  } finally {
    setLoading(false);
  }
};
const handleKeyPress = (e, index) => {
  // Handle backspace
  if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
    inputRefs.current[index - 1]?.focus();
  }
};

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    try {
      await supabase.auth.signInWithOtp({ phone: '+91' + formData.phone });
      setResendTimer(30);
      setCanResend(false);
      Alert.alert('Success', 'OTP sent successfully!');
    } catch (error) {
      console.error('Error resending OTP:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to{'\n'}
            <Text style={styles.phoneNumber}>+91 {formData.phone}</Text>
          </Text>
        </View>

        {/* OTP Input Container */}
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

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        )}

        {/* Resend OTP */}
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
              {canResend ? 'Resend' : `Resend in ${resendTimer}s`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Manual Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            otp.every(digit => digit !== '') ? styles.verifyButtonActive : styles.verifyButtonInactive
          ]}
          onPress={() => verifyOTP(otp.join(''))}
          disabled={!otp.every(digit => digit !== '') || loading}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? 'Verifying...' : 'Verify Code'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EnterOtp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    marginTop:90,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    color: '#2563eb',
    fontWeight: '600',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
    paddingHorizontal: 20,
    
  },
  otpInputWrapper: {
    position: 'relative',
    marginHorizontal: 6,
  },
  otpInput: {
    width: 40,
    height: 50,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  otpInputFilled: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
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
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
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
  verifyButton: {
    width: width - 80,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyButtonActive: {
    backgroundColor: '#2563eb',
  },
  verifyButtonInactive: {
    backgroundColor: '#94a3b8',
  },
  verifyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});