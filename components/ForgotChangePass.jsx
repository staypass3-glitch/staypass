import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const ForgotChangePass = () => {<ScrollView></ScrollView>
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {showAlert} = useAlert();
  const inputRefs = useRef([]);

  // Extract phone number from user object (remove +91 if present)
  const userPhone = user?.phone_number?.replace('+91', '') || null;

  useEffect(() => {
    // Timer for resend OTP
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

  const handleSendOTP = async () => {
    try {
      setLoading(true);

      // Simulate OTP sending to user's phone
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showAlert('OTP Sent', `OTP has been sent to +91 ${userPhone}`);
      setResendTimer(30);
      setCanResend(false);
      
    } catch (error) {
      showAlert('Error', 'Failed to send OTP. Please try again.');
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
      // For demo purposes, accept any 6-digit code
      if (otpCode.length === 6 && /^\d{6}$/.test(otpCode)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setOtpVerified(true);
        showAlert('Success', 'OTP verified successfully! You can now change your password.');
      } else {
        throw new Error('Invalid OTP');
      }
      
    } catch (error) {
      showAlert('Error', 'Invalid OTP. Please try again.');
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
      showAlert('Error', 'Failed to resend OTP. Please try again.');
    }
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

  
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      showAlert('Success', 'Password changed successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
      
    } catch (error) {
      showAlert('Error', 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (

    <View style={{flex:1,backgroundColor:'#fff'}}>
    <ScrollView style={{flex: 1}}>
 
      <LinearGradient 
        colors={['#2563eb', '#3b82f6', '#60a5fa']} 
        style={styles.gradient}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>🔒</Text>
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

        {/* OTP Section */}
        <View style={styles.section}>
          <Text style={styles.label}>Enter OTP</Text>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                  otpVerified && styles.otpInputVerified
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                editable={!loading && !otpVerified}
              />
            ))}
          </View>

          {!otpVerified ? (
            <View style={styles.otpActions}>
              <TouchableOpacity
                style={[styles.button, styles.sendOtpButton]}
                onPress={handleSendOTP}
                disabled={loading || resendTimer>0}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>{handleResendOTP();
                    setResendTimer(30);
                }}
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
              <Text style={styles.verifiedText}> OTP Verified</Text>
            </View>
          )}
        </View>

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
                <Text style={styles.eyeIconText}>
                <MaterialIcons 
                  name={!showPassword ? "visibility" : "visibility-off"} 
                  size={20} 
                  color="#999" 
                />
                </Text>
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
                <Text style={styles.eyeIconText}>
                <MaterialIcons 
                  name={!confirmPassword ? "visibility" : "visibility-off"} 
                  size={20} 
                  color="#999" 
                />
                </Text>
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

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Profile</Text>
        </TouchableOpacity>
      </View>
    

    </ScrollView>
</View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  otpInput: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    backgroundColor: '#f9f9f9',
  },
  otpInputFilled: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  otpInputVerified: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sendOtpButton: {
    flex: 1,
    marginRight: 10,
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
  },
  eyeIcon: {
    padding: 10,
  },
  eyeIconText: {
    fontSize: 20,
  },
  button: {
    backgroundColor: '#4158D0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePasswordButton: {
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    alignItems: 'center',
    padding: 15,
    marginTop: 13,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4158D0',
    fontWeight: '500',
  },
});

export default ForgotChangePass;