import { supabaseAnonKey, supabaseUrl } from '@/constants';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ScreenWrapper from './ScreenWrapper';
const { width } = Dimensions.get('window');


const EnterOtp = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { completeFormData } = route.params;
  
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [otpId, setOtpId] = useState(null);
  const { signUp, signIn } = useAuth();
  const {showAlert} = useAlert();

  // Format phone number
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    return `+${cleaned}`;
  };

  // Clean phone number (remove + and non-digits)
  const cleanPhoneNumber = (phone) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };

  // Send OTP using Edge Function
  const sendOTP = async () => {
    try {
      const cleanedPhone = cleanPhoneNumber(completeFormData.phone);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/otp-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ phone: cleanedPhone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpId(data.otp_id);
      return {
        success: true,
        otpId: data.otp_id,
        expiresIn: data.expires_in
      };

    } catch (error) {
      console.error('Send OTP Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Verify OTP using Edge Function
  const verifyOTP = async (otpCode) => {
    try {
      const cleanedPhone = cleanPhoneNumber(completeFormData.phone);
      
      const body = { 
        otp_code: otpCode,
        phone: cleanedPhone
      };
      
      if (otpId) {
        body.otp_id = otpId;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/otp-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      return {
        success: true,
        verified: true,
        phone: data.phone,
        verificationToken: data.verification_token,
        verifiedAt: data.verified_at
      };

    } catch (error) {
      console.error('Verify OTP Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Initial OTP send on component mount
  useEffect(() => {
    const initOTP = async () => {
      const result = await sendOTP();
      
      if (result.success) {
        console.log('OTP sent successfully');
      } else {
        showAlert('Error', result.error);
      }
    };
    
    initOTP();
  }, []);

  // Timer for resend OTP
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

  // Handle OTP verification
  const handleVerifyOTP = async (otpCode) => {
    if (!otpCode || otpCode.length !== 6) {
      showAlert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    
    try {
      const result = await verifyOTP(otpCode);
      
      if (result.success) {
        
        if (signUp) {
          const { error: signUpError } = await signUp(completeFormData);
          if (signUpError) throw signUpError;
        }
        
       
        if (signIn) {
          const { error: signInError } = await signIn(
            completeFormData.phone,
            completeFormData.password
          );
          if (signInError) throw signInError;
        }

      } else {
        showAlert('Error', result.error);
        setOtp('');
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      if (error.message?.includes('Maximum attempts')) {
        errorMessage = 'Maximum attempts reached. Please request a new OTP.';
      } else if (error.message?.includes('expired')) {
        errorMessage = 'OTP has expired. Please request a new one.';
      }
      
      showAlert('Error', errorMessage);
      setOtp('');
      
    } finally {
      setLoading(false);
    }
  };

  // Handle resend OTP
  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setLoading(true); // Show loading when resending
    
    try {
      setOtp('');
      const result = await sendOTP();
      
      if (result.success) {
        setResendTimer(60);
        setCanResend(false);
        showAlert('Success', 'New OTP sent successfully!');
      } else {
        showAlert('Error', result.error);
      }
      
    } catch (error) {
      console.error('Error resending OTP:', error);
      showAlert('Error', error.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit when OTP reaches 6 digits
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerifyOTP(otp);
    }
  }, [otp]);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit code to{'\n'}
              <Text style={styles.phoneNumber}>{formatPhoneNumber(completeFormData.phone)}</Text>
            </Text>
          </View>

          {/* OTP Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Enter 6-digit OTP</Text>
            <View style={[
              styles.otpContainer,
              loading && styles.disabled
            ]}>
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
                autoFocus
              />
            </View>
          </View>

          {/* Verify Button and Resend */}
          <View style={styles.otpActions}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.verifyButton,
                (loading || otp.length !== 6) && styles.buttonDisabled
              ]}
              onPress={() => handleVerifyOTP(otp)}
              disabled={otp.length !== 6 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResendOTP}
              disabled={!canResend || loading}
              style={styles.resendButton}
            >
              <Text style={[
                styles.resendText,
                (canResend && !loading) ? styles.resendActive : styles.resendInactive
              ]}>
                {loading ? 'Processing...' : canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backButton, loading && styles.disabled]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>Back to Sign Up</Text>
          </TouchableOpacity>

          {/* Small loading indicator at bottom */}
          {loading && (
            <View style={styles.bottomLoading}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.bottomLoadingText}>Verifying OTP...</Text>
            </View>
          )}
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default EnterOtp;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 25,
  },
  content: {
    flex: 1,
    marginTop: 60,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 24,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  phoneNumber: {
    color: '#2563eb',
    fontWeight: '600',
  },
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    fontWeight: '500',
  },
  otpContainer: {
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
  otpInput: {
    width: '100%',
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4158D0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyButton: {
    flex: 1,
    marginRight: 10,
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  resendButton: {
    padding: 10,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resendActive: {
    color: '#4158D0',
  },
  resendInactive: {
    color: '#999',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  bottomLoading: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  bottomLoadingText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
});