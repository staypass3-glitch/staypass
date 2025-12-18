import theme from '@/constants/theme';
import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const ForgotChangePass = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { showAlert } = useAlert();

  // Extract phone number from user object (remove +91 if present)
  const userPhone = user?.phone_number?.replace('+91', '') || null;


  useEffect(() => {
    // Timer for resend OTP
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (resendTimer === 0 && otpSent) {
      setCanResend(true);
    }
    
    return () => clearInterval(interval);
  }, [resendTimer, otpSent]);

  const handleSendOTP = async () => {
    if (!userPhone) {
      showAlert('Error', 'Phone number not found. Please update your profile.');
      return;
    }

    try {
      setLoading(true);
      setOtp(''); // Clear previous OTP

      // Supabase OTP for phone - sends SMS
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${userPhone}`,
        options: {
          channel: 'sms',
        }
      });

      if (error) throw error;

      showAlert('OTP Sent', `OTP has been sent to +91 ${userPhone}`);
      setOtpSent(true);
      setResendTimer(30);
      setCanResend(false);
      
    } catch (error) {
      showAlert('Error', error.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleBackPress = () => {
    navigation.goBack();
  };
  
  const verifyOTP = async () => {
    if (otp.length !== 6) {
      showAlert('Error', 'Please enter a 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // Supabase verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${userPhone}`,
        token: otp,
        type: 'sms'
      });

      if (error) throw error;

      if (data?.user) {
        setOtpVerified(true);
        showAlert('Success', 'OTP verified successfully! You can now change your password.');
      } else {
        throw new Error('Verification failed');
      }
      
    } catch (error) {
      showAlert('Error', error.message || 'Invalid OTP. Please try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    await handleSendOTP();
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    try {
      setLoading(true);

      // Supabase update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      showAlert('Success', 'Password changed successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
      
    } catch (error) {
      showAlert('Error', error.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{flex:1, backgroundColor:'#fff'}}>
      <ScrollView style={{flex: 1}}>
        <LinearGradient 
          colors={['#2563eb', '#3b82f6', '#60a5fa']} 
          style={styles.gradient}
        >
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={theme.colors.white} />
            </TouchableOpacity>
            
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>🔒</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.container}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Verify your identity to change password</Text>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>Verification will be sent to:</Text>
            <Text style={styles.phoneText}>+91 {userPhone}</Text>
          </View>

          {/* Send OTP Button - Show only if OTP not sent yet */}
          {!otpSent && (
            <TouchableOpacity
              style={[styles.button, styles.sendOtpButton]}
              onPress={handleSendOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          )}

          {/* OTP Section - Show only after OTP is sent */}
          {otpSent && (
            <View style={styles.section}>
              <Text style={styles.label}>Enter 6-digit OTP</Text>
              <View style={styles.otpContainer}>
                <TextInput
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  style={styles.otpInput}
                  placeholderTextColor="#999"
                  maxLength={6}
                  editable={!loading && !otpVerified}
                />
              </View>

              {!otpVerified ? (
                <View style={styles.otpActions}>
                  <TouchableOpacity
                    style={[styles.button, styles.verifyButton, (loading || otp.length !== 6) && styles.buttonDisabled]}
                    onPress={verifyOTP}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.buttonText}>Verify OTP</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={!canResend}
                    style={styles.resendButton}
                  >
                    <Text style={[
                      styles.resendText,
                      canResend ? styles.resendActive : styles.resendInactive
                    ]}>
                      {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.verifiedBadge}>
                  <MaterialIcons name="check-circle" size={24} color="#10b981" />
                  <Text style={styles.verifiedText}>OTP Verified</Text>
                </View>
              )}
            </View>
          )}

          {/* Password Fields - Only show after OTP verification */}
          {otpVerified && (
            <View style={styles.section}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialIcons 
                    name={showPassword ? "visibility" : "visibility-off"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.passwordInput}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity 
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <MaterialIcons 
                    name={showConfirmPassword ? "visibility" : "visibility-off"} 
                    size={20} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, styles.changePasswordButton]}
                onPress={handleChangePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    height: 150,
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  headerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    padding: 8,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 40,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 30,
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
    marginBottom: 20,
  },
  userInfo: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  userInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  phoneText: {
    fontSize: 16,
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
    fontSize: 18,
    letterSpacing: 8,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    color: '#333',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifyButton: {
    flex: 1,
    marginRight: 10,
  },
  button: {
    backgroundColor: '#4158D0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOtpButton: {
    marginBottom: 20,
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
  verifiedBadge: {
    backgroundColor: '#ecfdf5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  verifiedText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 16,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  eyeIcon: {
    padding: 10,
  },
  changePasswordButton: {
    marginTop: 10,
  },
});

export default ForgotChangePass;