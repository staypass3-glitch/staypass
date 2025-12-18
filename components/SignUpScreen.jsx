import { ImagePickerAlert } from '@/components/ImagePickerAlert';
import { supabaseAnonKey, supabaseUrl } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const SignUpScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const [role, setRole] = useState('student');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const { signUp, signIn } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    roomNumber: '',
    department: '',
    shift: '',
    parentPhone: '',
    role: '',
    profileImage: null,
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    buttons: [] 
  });

  const showAlert = useCallback((title, message, buttons = []) => {
    setCustomAlert({ visible: true, title, message, buttons });
  }, []);

  // Clean phone number
  const cleanPhoneNumber = (phone) => {
    return phone.replace(/\D/g, '').slice(0, 10);
  };

  // Get full phone number with country code
  const getFullPhoneNumber = (phone) => {
    const cleaned = cleanPhoneNumber(phone);
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    }
    return null;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const cleanedPhone = cleanPhoneNumber(phone);
    return cleanedPhone.length === 10;
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateAllFields = () => {
    const newErrors = {};
    const hasSubmitted = Object.keys(touched).length > 0;

    // Basic required fields for all roles
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.profileImage) newErrors.profileImage = 'Profile photo is required';

    // Email format validation
    if (formData.email.trim() && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone format validation
    if (formData.phone.trim() && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    // Password length validation
    if (formData.password && !validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    // Role-specific validations
    if (role === 'student') {
      if (!formData.roomNumber.trim()) newErrors.roomNumber = 'Room number is required for students';
      if (!formData.parentPhone.trim()) newErrors.parentPhone = "Parent's phone number is required for students";
      
      if (formData.parentPhone.trim() && !validatePhone(formData.parentPhone)) {
        newErrors.parentPhone = 'Please enter a valid 10-digit parent phone number';
      }
    }

    if ((role === 'admin' || role === 'student') && !formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    if (role === 'guard' && !formData.shift.trim()) {
      newErrors.shift = 'Shift information is required for guards';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (fieldName, value) => {
    const cleaned = cleanPhoneNumber(value);
    setFormData(prev => ({
      ...prev,
      [fieldName]: cleaned
    }));

    // Only validate if form has been submitted
    if (Object.keys(touched).length > 0) {
      validateAllFields();
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Only validate if form has been submitted
    if (Object.keys(touched).length > 0) {
      validateAllFields();
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant camera roll permissions to select a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, profileImage: result.assets[0].uri });
        // Only validate if form has been submitted
        if (Object.keys(touched).length > 0) {
          validateAllFields();
        }
      }
    } catch (error) {
      showAlert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Required', 'Please grant camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, profileImage: result.assets[0].uri });
        // Only validate if form has been submitted
        if (Object.keys(touched).length > 0) {
          validateAllFields();
        }
      }
    } catch (error) {
      showAlert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const showImagePicker = () => {
    showAlert(
      'Select Profile Photo',
      'Choose how you want to add your profile photo',
      [
        { text: 'Camera', onPress: takePicture },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const togglePasswordVisibility = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  const handleSignUp = async () => {
    try {
      // Mark all fields as touched to trigger validation and red borders
      const allFields = ['name', 'email', 'password', 'phone', 'profileImage'];
      if (role === 'student') allFields.push('roomNumber', 'parentPhone', 'department');
      if (role === 'admin') allFields.push('department');
      if (role === 'guard') allFields.push('shift');
  
      const newTouched = {};
      allFields.forEach(field => {
        newTouched[field] = true;
      });
      setTouched(newTouched);
  
      // Validate all fields - this will set errors and trigger red borders
      if (!validateAllFields()) {
        showAlert('Validation Error', 'Please fill all required fields correctly.');
        return;
      }
  
      setLoading(true);
  
      // Prepare phone numbers with country code
      const fullPhoneNumber = getFullPhoneNumber(formData.phone);
      if (!fullPhoneNumber) {
        throw new Error('Invalid phone number format');
      }
  
      const phoneCheckResponse = await fetch(
        `${supabaseUrl}/functions/v1/check-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            phone: fullPhoneNumber
          })
        }
      );
  
      if (!phoneCheckResponse.ok) {
        const errorData = await phoneCheckResponse.json();
        console.error('Phone check failed:', errorData);

      } else {
        const phoneCheckResult = await phoneCheckResponse.json();
        
        if (phoneCheckResult.exists) {
          showAlert('Account Exists', 'This phone number is already registered. Please use a different phone number or sign in.');
          setLoading(false);
          return; 
        }
      }
  
      let fullParentPhoneNumber = null;
      if (role === 'student') {
        fullParentPhoneNumber = getFullPhoneNumber(formData.parentPhone);
        if (!fullParentPhoneNumber) {
          throw new Error('Invalid parent phone number format');
        }
      }
  
      const completeFormData = { 
        ...formData, 
        role,
        phone: fullPhoneNumber,
        ...(role === 'student' && { parentPhone: fullParentPhoneNumber })
      };
  
      navigation.navigate('EnterOtp', { completeFormData: completeFormData });
  
    } catch (error) {
      showAlert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'student': return 'school';
      case 'guard': return 'security';
      case 'admin': return 'admin-panel-settings';
      default: return 'person';
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Helper function to check if a field should show error border
  const shouldShowError = (fieldName) => {
    return errors[fieldName] && Object.keys(touched).length > 0;
  };

  const renderPhoneInput = (fieldName, placeholder, value) => (
    <View style={styles.phoneInputContainer}>
      <View style={styles.countryCode}>
        <Text style={styles.countryCodeText}>+91</Text>
      </View>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={(text) => handlePhoneChange(fieldName, text)}
        keyboardType="phone-pad"
        style={styles.phoneInput}
        placeholderTextColor="#999"
        returnKeyType="next"
        blurOnSubmit={false}
        maxLength={10}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEventThrottle={16}
          nestedScrollEnabled={true}
        >
          <TouchableWithoutFeedback onPress={dismissKeyboard}>
            <View>
              <LinearGradient
                colors={['#2563eb', '#3b82f6', '#60a5fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              >
                <View style={styles.header}>
                  <Text style={styles.welcomeSmall}>Welcome to</Text>
                  <Text style={styles.welcome}>StayPass</Text>
                  <View style={styles.roleSelector}>
                    <MaterialIcons name={getRoleIcon()} size={24} color="#fff" style={styles.headerIcon} />
                    <Text style={styles.roleText}>{role.charAt(0).toUpperCase() + role.slice(1)} Registration</Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.cardContainer}>
                <View style={styles.card}>
                  <View style={styles.formContainer}>
                    {/* Profile Photo Section */}
                    <View style={styles.profilePhotoContainer}>
                      <Text style={styles.profilePhotoLabel}>Profile Photo *</Text>
                      <TouchableOpacity
                        style={[
                          styles.profilePhotoButton,
                          shouldShowError('profileImage') && styles.errorBorder
                        ]}
                        onPress={showImagePicker}
                        activeOpacity={0.7}
                      >
                        {formData.profileImage ? (
                          <Image source={{ uri: formData.profileImage }} style={styles.profileImage} />
                        ) : (
                          <View style={styles.profilePlaceholder}>
                            <MaterialIcons name="add-a-photo" size={40} color="#4158D0" />
                            <Text style={styles.profilePlaceholderText}>Add Photo</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* Role Picker with spacing */}
                    <View style={styles.fieldSpacing}>
                      <Text style={styles.pickerLabel}>Select Your Role *</Text>
                      <View style={[
                        styles.pickerWrapper,
                        shouldShowError('role') && styles.errorBorder
                      ]}>
                        <Picker
                          selectedValue={role}
                          onValueChange={(value) => {
                            setRole(value);
                            // Reset role-specific fields when role changes
                            if (value !== 'student') {
                              setFormData(prev => ({
                                ...prev,
                                roomNumber: '',
                                parentPhone: '',
                              }));
                            }
                            if (value !== 'guard') {
                              setFormData(prev => ({ ...prev, shift: '' }));
                            }
                            if (value !== 'admin' && value !== 'student') {
                              setFormData(prev => ({ ...prev, department: '' }));
                            }
                            // Revalidate if form was already submitted
                            if (Object.keys(touched).length > 0) {
                              validateAllFields();
                            }
                          }}
                          style={styles.picker}
                          dropdownIconColor="#4158D0"
                          mode="dropdown"
                        >
                          <Picker.Item label="Student" value="student" />
                          <Picker.Item label="Guard" value="guard" />
                          <Picker.Item label="Admin" value="admin" />
                        </Picker>
                      </View>
                    </View>

                    {/* Input Fields with spacing */}
                    <View style={styles.fieldSpacing}>
                      <View style={[
                        styles.inputContainer,
                        shouldShowError('name') && styles.errorBorder
                      ]}>
                        <MaterialIcons name="person" size={20} color="#666" style={styles.icon} />
                        <TextInput
                          placeholder="Full Name *"
                          value={formData.name}
                          onChangeText={(text) => handleFieldChange('name', text)}
                          style={styles.input}
                          placeholderTextColor="#999"
                          returnKeyType="next"
                        />
                      </View>
                    </View>

                    <View style={styles.fieldSpacing}>
                      <View style={[
                        styles.inputContainer,
                        shouldShowError('email') && styles.errorBorder
                      ]}>
                        <MaterialIcons name="email" size={20} color="#666" style={styles.icon} />
                        <TextInput
                          placeholder="Email *"
                          value={formData.email}
                          onChangeText={(text) => handleFieldChange('email', text)}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={styles.input}
                          placeholderTextColor="#999"
                          returnKeyType="next"
                        />
                      </View>
                    </View>

                    <View style={styles.fieldSpacing}>
                      <View style={[
                        styles.inputContainer,
                        shouldShowError('password') && styles.errorBorder
                      ]}>
                        <MaterialIcons name="lock" size={20} color="#666" style={styles.icon} />
                        <TextInput
                          placeholder="Password *"
                          value={formData.password}
                          onChangeText={(text) => handleFieldChange('password', text)}
                          secureTextEntry={secureTextEntry}
                          style={styles.input}
                          placeholderTextColor="#999"
                          returnKeyType="next"
                        />
                        <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                          <MaterialIcons 
                            name={!secureTextEntry ? "visibility" : "visibility-off"} 
                            size={20} 
                            color="#999" 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.fieldSpacing}>
                      <View style={[
                        styles.inputContainer,
                        shouldShowError('phone') && styles.errorBorder
                      ]}>
                        <MaterialIcons name="phone" size={20} color="#666" style={styles.icon} />
                        {renderPhoneInput('phone', 'Phone', formData.phone)}
                      </View>
                    </View>

                    {role === 'student' && (
                      <>
                        <View style={styles.fieldSpacing}>
                          <View style={[
                            styles.inputContainer,
                            shouldShowError('roomNumber') && styles.errorBorder
                          ]}>
                            <MaterialIcons name="meeting-room" size={20} color="#666" style={styles.icon} />
                            <TextInput
                              placeholder="Room Number *"
                              value={formData.roomNumber}
                              onChangeText={(text) => handleFieldChange('roomNumber', text)}
                              style={styles.input}
                              placeholderTextColor="#999"
                              returnKeyType="next"
                            />
                          </View>
                        </View>

                        <View style={styles.fieldSpacing}>
                          <View style={[
                            styles.inputContainer,
                            shouldShowError('parentPhone') && styles.errorBorder
                          ]}>
                            <MaterialIcons name="contact-phone" size={20} color="#666" style={styles.icon} />
                            {renderPhoneInput('parentPhone', "Parent's Phone", formData.parentPhone)}
                          </View>
                        </View>
                      </>
                    )}

                    {(role === 'admin' || role === 'student') && (
                      <View style={styles.fieldSpacing}>
                        <View style={[
                          styles.inputContainer,
                          shouldShowError('department') && styles.errorBorder
                        ]}>
                          <MaterialIcons name="business" size={20} color="#666" style={styles.icon} />
                          <TextInput
                            placeholder="Department *"
                            value={formData.department}
                            onChangeText={(text) => handleFieldChange('department', text)}
                            style={styles.input}
                            placeholderTextColor="#999"
                            returnKeyType="next"
                          />
                        </View>
                      </View>
                    )}

                    {role === 'guard' && (
                      <View style={styles.fieldSpacing}>
                        <View style={[
                          styles.inputContainer,
                          shouldShowError('shift') && styles.errorBorder
                        ]}>
                          <MaterialIcons name="schedule" size={20} color="#666" style={styles.icon} />
                          <TextInput
                            placeholder="Shift Schedule (e.g., Morning 8-4) *"
                            value={formData.shift}
                            onChangeText={(text) => handleFieldChange('shift', text)}
                            style={styles.input}
                            placeholderTextColor="#999"
                            returnKeyType="done"
                          />
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={handleSignUp}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <>
                          <MaterialIcons name="app-registration" size={20} color="#fff" style={styles.buttonIcon} />
                          <Text style={styles.buttonText}>Complete Registration</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.loginLink}
                      onPress={() => navigation.navigate('SignIn')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.loginText}>Already have an account? </Text>
                      <Text style={styles.loginLinkText}>Sign In</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </KeyboardAvoidingView>

      <ImagePickerAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons}
        onDismiss={() => setCustomAlert({ 
          visible: false, 
          title: '', 
          message: '', 
          buttons: [] 
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  gradient: {
    height: SCREEN_HEIGHT * 0.22,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? '15%' : '10%',
  },
  welcomeSmall: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
  welcome: {
    fontWeight: 'bold',
    fontSize: 32,
    color: 'white',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: '5%'
  },
  roleText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  headerIcon: {
    marginRight: 5,
  },
  cardContainer: {
    marginTop: -20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    marginBottom: 20,
  },
  formContainer: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 25,
    marginTop: 10,
  },
  profilePhotoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  profilePhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4158D0',
    borderStyle: 'dashed',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  profilePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  profilePlaceholderText: {
    color: '#4158D0',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  picker: {
    height: Platform.OS === 'ios' ? 130 : 50,
    width: '100%',
    backgroundColor: '#ffffff',
    color: '#333333',
  },
  fieldSpacing: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    minHeight: 55,
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
    fontSize: 15,
    paddingVertical: 0,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 15,
    paddingVertical: 0,
  },
  errorBorder: {
    borderColor: '#ff0000',
    borderWidth: 1.5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4158D0',
    padding: 16,
    borderRadius: 10,
    marginTop: 24,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#4158D0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLinkText: {
    color: '#4158D0',
    fontWeight: 'bold',
    fontSize: 14,
  },
  eyeIcon: {
    padding: 8,
  },
});

export default SignUpScreen;