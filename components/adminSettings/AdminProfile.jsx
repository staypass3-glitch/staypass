import { CustomAlert } from '@/components';
import CustomInput from '@/components/CustomInput';
import saveImage from '@/components/saveImage';
import ScreenWrapper from '@/components/ScreenWrapper';
import { useEditFields } from '@/constants/editableFields';
import fonts from '@/constants/fonts';
import theme from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// Error messages constants
const ERROR_MESSAGES = {
  PERMISSION_CAMERA: 'Permission not granted. Please give camera permissions to take pictures.',
  PERMISSION_MEDIA: 'Media permission is needed for accessing images.',
  IMAGE_UPLOAD_FAILED: 'Could not upload your profile image.',
  EMAIL_UPDATE_FAILED: 'Could not update email in authentication.',
  PROFILE_UPDATE_FAILED: 'An error occurred while updating your profile.',
  PROFILE_UPDATE_SUCCESS: 'Your profile has been updated successfully.',
  EMAIL_CONFIRMATION_REQUIRED: 'A confirmation email has been sent to your new address. Please check your email and confirm the change before updating your profile.',
};

// Memoized components to prevent unnecessary re-renders
const MemoizedCustomInput = React.memo(CustomInput);
const MemoizedMaterialIcons = React.memo(MaterialIcons);

const AdminProfile = () => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [gmail, setGmail] = useState(user?.email || '');
  const [roomNumber, setRoomNumber] = useState(user?.roomNumber || '');
  const [image, setImage] = useState(user?.profile_image || null);
  const [isLoading, setIsLoading] = useState(false);
  const { editFields, makeEditable } = useEditFields();
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', buttons: [] });
  const Navigation = useNavigation();
  // Use ref for values that don't need to trigger re-renders
  const imageNameRef = useRef('');

  const showAlert = useCallback((title, message, buttons = []) => {
    setCustomAlert({ visible: true, title, message, buttons });
  }, []);



  // Memoize permission request logic
  const requestPermission = useCallback(async (permissionType, errorMessage) => {
    try {
      const { status } = permissionType === 'camera' 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return status === 'granted';
    } catch (error) {
      showAlert('Permission Error', errorMessage, [{ text: 'Ok' }]);
      return false;
    }
  }, [showAlert]);

  // Memoize image selection handler
  const handleImageSelection = useCallback(async (source) => {
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      aspect: [1, 1],
      quality: source === 'camera' ? 0.3 : 0.5,
      allowsEditing: true
    };

    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets?.[0]) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      showAlert('Image Selection Error', 'Failed to select image. Please try again.', [{ text: 'Ok' }]);
    }
  }, [showAlert]);

  // Memoize image picker functions
  const pickCameraImage = useCallback(async () => {
    const hasPermission = await requestPermission('camera', ERROR_MESSAGES.PERMISSION_CAMERA);
    if (hasPermission) {
      await handleImageSelection('camera');
    }
  }, [requestPermission, handleImageSelection]);

  const pickGalleryImage = useCallback(async () => {
    const hasPermission = await requestPermission('media', ERROR_MESSAGES.PERMISSION_MEDIA);
    if (hasPermission) {
      await handleImageSelection('gallery');
    }
  }, [requestPermission, handleImageSelection]);

  const showImagePicker = useCallback(() => {
    showAlert(
      'Select Profile Photo',
      'Choose how you want to add your profile photo',
      [
        { 
          text: 'Take Photo', 
          onPress: pickCameraImage,
          style: 'default'
        },
        { 
          text: 'Use  Gallary', 
          onPress: pickGalleryImage,
          style: 'default'
        },
        { 
          text: 'Cancel', 
          style: 'cancel' 
        }
      ],
      { cancelable: true }
    );
  }, [showAlert, pickCameraImage, pickGalleryImage]);

  // Extract image name without re-creating function on each render
  const extractImageName = useCallback((imageUri) => {
    return imageUri?.split('/').pop() || '';
  }, []);

  // Memoize validation logic
  const validateForm = useCallback(() => {
    if (!name.trim()) {
      showAlert('Validation Error', 'Please enter your name', [{ text: 'Ok' }]);
      return false;
    }

    if (!gmail.trim() || !/\S+@\S+\.\S+/.test(gmail)) {
      showAlert('Validation Error', 'Please enter a valid email address', [{ text: 'Ok' }]);
      return false;
    }

    return true;
  }, [name, gmail, showAlert]);

  // Optimize profile update with useCallback
  const updateProfileData = useCallback(async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      let imageUrl = image;
      
      // Only upload if image is a local file (not a remote URL)
      if (image && image.startsWith('file://')) {
        try {
          imageUrl = await saveImage('profile', image);
          if (!imageUrl) {
            throw new Error(ERROR_MESSAGES.IMAGE_UPLOAD_FAILED);
          }
          // Store image name for potential cleanup
          imageNameRef.current = extractImageName(image);
        } catch (error) {
          showAlert('Image Upload Failed', error.message, [{ text: 'Ok' }]);
          setIsLoading(false);
          return;
        }
      }

      // If email has changed, update in Supabase Auth first
      if (gmail !== user.email) {
        const { data: authData, error: authError } = await supabase.auth.updateUser({ 
          email: gmail 
        });
        
        if (authError) {
          throw new Error(authError.message || ERROR_MESSAGES.EMAIL_UPDATE_FAILED);
        }
        
        // Check if email confirmation is required
        if (authData?.user && !authData.user.email_confirmed_at) {
          showAlert(
            'Email Change Requires Confirmation', 
            ERROR_MESSAGES.EMAIL_CONFIRMATION_REQUIRED,
            [{ text: 'OK' }]
          );
          setIsLoading(false);
          return; // Stop here until email is confirmed
        }
      }

      // Update profile data
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          room_number: roomNumber,
          profile_image: imageUrl
        })
        .eq('id', user.id);

      if (error) throw error;

      // Clean up old image if a new one was uploaded
      if (image && image.startsWith('file://') && imageNameRef.current) {
        try {
          await supabase
            .storage
            .from('images')
            .remove([`profile/${imageNameRef.current}`]);
        } catch (error) {
          console.warn('Failed to remove old image:', error.message);
        }
      }

      showAlert('Success', ERROR_MESSAGES.PROFILE_UPDATE_SUCCESS, [{ text: 'Ok' }]);
    } catch (error) {
      console.error('Profile update error:', error);
      showAlert('Update Failed', error.message || ERROR_MESSAGES.PROFILE_UPDATE_FAILED, [{ text: 'Ok' }]);
    } finally {
      setIsLoading(false);
    }
  }, [name, gmail, roomNumber, image, user, validateForm, showAlert, extractImageName]);

  // Memoize form fields configuration to prevent recreation on every render
  const formFields = useMemo(() => [
    {
      key: 'adminName',
      icon: 'person',
      label: 'Full Name',
      placeholder: 'Enter your full name',
      value: name,
      onChange: setName,
      editableKey: 'adminname'
    },
    {
      key: 'phone',
      icon: 'phone',
      label: 'Admin Number',
      placeholder: 'Phone number',
      value: user?.phone_number || '',
      editable: false
    },
    {
      key: 'email',
      icon: 'email',
      label: 'Admin Email',
      placeholder: 'Enter your email',
      value: gmail,
      onChange: setGmail,
      editableKey: 'gmail'
    },
  ], [name, gmail, roomNumber, user]);

  // Memoize styles to prevent recreation on every render
  const styles = useMemo(() => StyleSheet.create({
    scrollContainer: {
      flex: 1,
      backgroundColor: '#fff',
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 120
    },
    container: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
    },
    // Improved header container with better alignment
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 8,
      paddingTop: 20,
      marginBottom: 32,
    },
    headerTextContainer: {
      flex: 1,
      alignItems: 'flex',
      marginRight: 16,
    },

    headerTitle: {
      fontSize: fonts.fontSizes.xl,
      fontWeight: fonts.fontWeights.bold,
      color: theme.colors.dark,
      marginBottom: 6,
      fontFamily: fonts.fontFamilies.bold,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: fonts.fontSizes.md,
      color: theme.colors.gray,
      textAlign: 'center',
      lineHeight: 22,
      fontFamily: fonts.fontFamilies.regular,
      paddingRight: 8,
    },
    profileImageSection: {
      alignItems: 'center',
      marginBottom: 40,
      paddingVertical: 12,
    },
    imageContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    dashedStyle: {
      height: 160,
      width: 160,
      borderRadius: 80,
      borderWidth: 3,
      borderStyle: 'dashed',
      borderColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.white,
      overflow: 'hidden',
      shadowColor: theme.colors.dark,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    imageStyles: {
      height: '100%',
      width: '100%',
    },
    placeholderImage: {
      height: '100%',
      width: '100%',
      backgroundColor: theme.colors.lightBackground,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editImageIndicator: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      backgroundColor: theme.colors.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.white,
      shadowColor: theme.colors.dark,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    changePhotoText: {
      color: theme.colors.gray,
      fontSize: fonts.fontSizes.sm,
      fontWeight: fonts.fontWeights.medium,
      marginTop: 12,
      fontFamily: fonts.fontFamilies.medium,
      textAlign: 'center',
    },
    formSection: {
      marginBottom: 36,
      paddingHorizontal: 0,
    },
    fieldGroup: {
      marginBottom: 24,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingHorizontal: 16,
    },
    labelIcon: {
      marginRight: 8,
    },
    fieldLabel: {
      fontSize: fonts.fontSizes.md,
      fontWeight: fonts.fontWeights.semibold,
      color: theme.colors.dark,
      fontFamily: fonts.fontFamilies.semibold,
      letterSpacing: 0.3,
    },
    inputWrapper: {
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    buttonSection: {
      paddingBottom: 40,
      paddingTop: 0,
      paddingHorizontal: 4,
    },
    updateButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 20,
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
  }), []);

  // Render form fields with optimized mapping
  const renderFormFields = useCallback(() => (
    formFields.map((field) => (
      <View key={field.key} style={styles.fieldGroup}>
        <View style={styles.labelContainer}>
          <MemoizedMaterialIcons 
            name={field.icon} 
            size={18} 
            color={theme.colors.primary} 
            style={styles.labelIcon} 
          />
          <Text style={styles.fieldLabel}>{field.label}</Text>
        </View>
        <View style={styles.inputWrapper}>
          <MemoizedCustomInput
            title={field.label}
            placeholder={field.placeholder}
            value={field.value}
            editable={field.editable ?? editFields[field.editableKey]}
            fieldKey={field.editableKey}
            onChangeText={field.onChange}
            makeEditable={makeEditable}
          />
        </View>
      </View>
    ))
  ), [formFields, styles, editFields, makeEditable]);

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Header Section with Settings Button - Improved Alignment */}
            <View style={styles.headerContainer}>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Edit Profile</Text>
         
              </View>

            </View>

            {/* Profile Image Section */}
            <View style={styles.profileImageSection}>
              <TouchableOpacity 
                onPress={showImagePicker} 
                style={styles.imageContainer}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <View style={styles.dashedStyle}>
                  {image ? (
                    <Image 
                      style={styles.imageStyles} 
                      source={{ uri: image }} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <MemoizedMaterialIcons 
                        name="add-a-photo" 
                        size={32} 
                        color={theme.colors.gray} 
                      />
                    </View>
                  )}
                </View>
                <View style={styles.editImageIndicator}>
                  <MemoizedMaterialIcons 
                    name="edit" 
                    size={18} 
                    color={theme.colors.white} 
                  />
                </View>
              </TouchableOpacity>
              <Text style={styles.changePhotoText}>Tap to change photo</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {renderFormFields()}
            </View>

            {/* Update Button */}
            <View style={styles.buttonSection}>
              <TouchableOpacity
                style={[styles.updateButton, isLoading && styles.updateButtonDisabled]}
                activeOpacity={0.8}
                onPress={updateProfileData}
                disabled={isLoading}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={'white'} size={24} />
                    <Text style={styles.loadingText}>Updating...</Text>
                  </View>
                ) : (
                  <>
                    <MemoizedMaterialIcons 
                      name="save" 
                      size={20} 
                      color={theme.colors.white} 
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.updateButtonText}>Update Profile</Text>
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

export default React.memo(AdminProfile);