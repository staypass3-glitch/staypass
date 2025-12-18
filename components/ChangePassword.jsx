import { CustomAlert } from '@/components';
import ScreenWrapper from '@/components/ScreenWrapper';
import fonts from '@/constants/fonts';
import theme from '@/constants/theme';
import { useUser } from '@/context/UserContext';
import { supabase } from "@/lib/supabase";
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"; // Added useEffect import
import {
  ActivityIndicator, BackHandler, KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const ChangePassword = () => {
  const currentPassRef = useRef('');
  const newPassRef = useRef('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(true);
  const [showNewPassword, setShowNewPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const [customAlert, setCustomAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    buttons: [] 
  });
  const {user} = useUser();
  const Navigation = useNavigation();
  const phone = parseInt(user?.phone ? user.phone.replace('/\D/g','') : null);
  // Add BackHandler effect
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        Navigation.goBack();
        return true; 
      }
    );

    // Cleanup the event listener when component unmounts
    return () => backHandler.remove();
  }, [Navigation]);

  const showAlert = useCallback((title, message, buttons = []) => {
    setCustomAlert({ visible: true, title, message, buttons });
  }, []);

  const validatePassword = useCallback((password) => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    return null;
  }, []);

  const changePass = useCallback(async () => {
    const currentPassword = currentPassRef.current;
    const newPassword = newPassRef.current;
    
    // Validate current password
    if (!currentPassword) {
      showAlert('Validation Error', 'Please enter your current password', [{ text: 'Ok'}],
      );
      return;
    }

    // Validate new password
    const passwordValidationError = validatePassword(newPassword);
    if (passwordValidationError) {
      showAlert('Validation Error', passwordValidationError, [{ text: 'Ok' }]);
      return;
    }

    if (newPassword !== confirmPass) {
      showAlert('Validation Error', 'New passwords do not match', [{ text: 'Ok' }]);
      return;
    }

    setIsLoading(true);
    
    try {
      // First, verify the current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        phone:phone,// You might need to get the current user's phone differently
        password: currentPassword,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Current password is incorrect');
        }
        throw signInError;
      }

      // If current password is correct, update to new password
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      showAlert(
        'Success', 
        'Your password has been updated successfully', 
        [{ text: 'Ok', onPress: () => {
          currentPassRef.current = '';
          newPassRef.current = '';
          setConfirmPass('');
          
          setShowCurrentPassword(false);
          setShowNewPassword(false);
          setShowConfirmPassword(false);
          Navigation.goBack();
        }}]
      );
      
    } catch (error) {
      console.error('Password change error:', error);
      showAlert(
        'Error', 
        error.message || 'Failed to update password. Please try again.', 
        [{ text: 'Ok' }]
      );
    } finally {
      setIsLoading(false);
      
    }
  }, [confirmPass, validatePassword, showAlert, phone, Navigation]);

  const styles = useMemo(() => StyleSheet.create({
    scrollContainer: {
      flex: 1,
      backgroundColor: '#fff',
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 40,
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    headerSection: {
      alignItems: 'center',
      marginBottom: 40,
      paddingTop: 20,
    },
    headerTitle: {
      fontSize: fonts.fontSizes.xl,
      fontWeight: fonts.fontWeights.bold,
      color: theme.colors.dark,
      marginBottom: 12,
      fontFamily: fonts.fontFamilies.bold,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: fonts.fontSizes.md,
      color: theme.colors.gray,
      textAlign: 'center',
      maxWidth: '90%',
      lineHeight: 22,
      fontFamily: fonts.fontFamilies.regular,
      paddingHorizontal: 4,
    },
    formSection: {
      marginBottom: 36,
    },
    fieldGroup: {
      marginBottom: 28,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 8,
    },
    labelIcon: {
      marginRight: 10,
    },
    fieldLabel: {
      fontSize: fonts.fontSizes.md,
      fontWeight: fonts.fontWeights.semibold,
      color: theme.colors.dark,
      fontFamily: fonts.fontFamilies.semibold,
      letterSpacing: 0.3,
    },
    inputContainer: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.lightGray,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: theme.colors.dark,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'center',
    },
    textInput: {
      fontSize: fonts.fontSizes.md,
      color: theme.colors.dark,
      fontFamily: fonts.fontFamilies.regular,
      padding: 0,
      flex: 1,
    },
    focusedInput: {
      borderColor: theme.colors.primary,
      shadowColor: theme.colors.primary,
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 4,
    },
    eyeButton: {
      padding: 4,
      marginLeft: 8,
    },
    buttonSection: {
      paddingTop: 20,
    },
    updateButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 18,
      paddingHorizontal: 32,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      shadowColor: theme.colors.primary,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
      minHeight: 60,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}dd`,
    },
    updateButtonDisabled: {
      backgroundColor: theme.colors.gray,
      shadowOpacity: 0.1,
      elevation: 2,
      borderColor: theme.colors.gray,
    },
    updateButtonText: {
      color: theme.colors.white,
      fontSize: fonts.fontSizes.md,
      fontWeight: fonts.fontWeights.bold,
      letterSpacing: 0.8,
      fontFamily: fonts.fontFamilies.bold,
      marginLeft: 8,
    },
    buttonIcon: {
      marginRight: 8,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: theme.colors.white,
      fontSize: fonts.fontSizes.md,
      fontWeight: fonts.fontWeights.medium,
      fontFamily: fonts.fontFamilies.medium,
      marginLeft: 12,
    },
    passwordRequirements: {
      marginTop: 8,
      paddingHorizontal: 8,
    },
    requirementText: {
      fontSize: fonts.fontSizes.sm,
      color: theme.colors.gray,
      fontFamily: fonts.fontFamilies.regular,
      lineHeight: 18,
    },
  }), []);

  const [focusedInput, setFocusedInput] = useState(null);

  const handleFocus = (inputName) => setFocusedInput(inputName);
  const handleBlur = () => setFocusedInput(null);

  const toggleShowCurrentPassword = () => setShowCurrentPassword(!showCurrentPassword);
  const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);
  const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <ScreenWrapper haveTabs={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
                      <TouchableOpacity onPress={()=>Navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#4361ee" />
      </TouchableOpacity>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Text style={styles.headerTitle}>Change Password</Text>
              <Text style={styles.headerSubtitle}>
                Enter your current password and create a strong new password to secure your account
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Current Password Field */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelContainer}>
                  <MaterialIcons 
                    name="lock-outline" 
                    size={20} 
                    color={theme.colors.primary} 
                    style={styles.labelIcon} 
                  />
                  <Text style={styles.fieldLabel}>Current Password</Text>
                </View>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'currentPassword' && styles.focusedInput
                ]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter current password"
                    placeholderTextColor={theme.colors.gray}
                    secureTextEntry={showCurrentPassword}
                    onChangeText={(text) => currentPassRef.current = text}
                    onFocus={() => handleFocus('currentPassword')}
                    onBlur={handleBlur}
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton} 
                    onPress={toggleShowCurrentPassword}
                    disabled={isLoading}
                  >
                    <MaterialIcons 
                      name={showCurrentPassword ? "visibility-off" : "visibility"} 
                      size={24} 
                      color={theme.colors.gray} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password Field */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelContainer}>
                  <MaterialIcons 
                    name="lock-outline" 
                    size={20} 
                    color={theme.colors.primary} 
                    style={styles.labelIcon} 
                  />
                  <Text style={styles.fieldLabel}>New Password</Text>
                </View>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'newPassword' && styles.focusedInput
                ]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.colors.gray}
                    secureTextEntry={showNewPassword}
                    onChangeText={(text) => newPassRef.current = text}
                    onFocus={() => handleFocus('newPassword')}
                    onBlur={handleBlur}
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton} 
                    onPress={toggleShowNewPassword}
                    disabled={isLoading}
                  >
                    <MaterialIcons 
                      name={showNewPassword ? "visibility-off" : "visibility"} 
                      size={24} 
                      color={theme.colors.gray} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Field */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelContainer}>
                  <MaterialIcons 
                    name="lock" 
                    size={20} 
                    color={theme.colors.primary} 
                    style={styles.labelIcon} 
                  />
                  <Text style={styles.fieldLabel}>Confirm Password</Text>
                </View>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'confirmPassword' && styles.focusedInput
                ]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Confirm new password"
                    placeholderTextColor={theme.colors.gray}
                    secureTextEntry={showConfirmPassword}
                    value={confirmPass}
                    onChangeText={setConfirmPass}
                    onFocus={() => handleFocus('confirmPassword')}
                    onBlur={handleBlur}
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    style={styles.eyeButton} 
                    onPress={toggleShowConfirmPassword}
                    disabled={isLoading}
                  >
                    <MaterialIcons 
                      name={showConfirmPassword ? "visibility-off" : "visibility"} 
                      size={24} 
                      color={theme.colors.gray} 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Requirements */}
              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementText}>
                  • At least 6 characters long{'\n'}
                  • Contains uppercase and lowercase letters{'\n'}
                  • Includes at least one number
                </Text>
              </View>
            </View>

            {/* Update Button */}
            <View style={styles.buttonSection}>
              <TouchableOpacity
                style={[styles.updateButton, isLoading && styles.updateButtonDisabled]}
                activeOpacity={0.8}
                onPress={changePass}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={'white'} size={24} />
                    <Text style={styles.loadingText}>Updating...</Text>
                  </View>
                ) : (
                  <>
                    <MaterialIcons 
                      name="security" 
                      size={20} 
                      color={theme.colors.white} 
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.updateButtonText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onDismiss={() => {
          setCustomAlert({ visible: false, title: '', message: '', buttons: [] });
        }}
      />
    </ScreenWrapper>
  );
};

export default React.memo(ChangePassword);