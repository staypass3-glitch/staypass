import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const [role, setRole] = useState('student');
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
  const [loading,setLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Handle keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false)
      }
    );

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[0-9]{10,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const validateField = (fieldName, value) => {
    const newErrors = { ...errors };
    
    switch (fieldName) {
      case 'name':
        if (!value.trim()) {
          newErrors.name = 'Name is required';
        } else if (value.trim().length < 2) {
          newErrors.name = 'Name must be at least 2 characters long';
        } else {
          delete newErrors.name;
        }
        break;

      case 'email':
        if (!value.trim()) {
          newErrors.email = 'Email is required';
        } else if (!validateEmail(value)) {
          newErrors.email = 'Please enter a valid email address';
        } else {
          delete newErrors.email;
        }
        break;

      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (!validatePassword(value)) {
          newErrors.password = 'Password must be at least 6 characters long';
        } else {
          delete newErrors.password;
        }
        break;

      case 'phone':
        if (!value.trim()) {
          newErrors.phone = 'Phone number is required';
        } else if (!validatePhone(value)) {
          newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
        } else {
          delete newErrors.phone;
        }
        break;

      case 'roomNumber':
        if (role === 'student' && !value.trim()) {
          newErrors.roomNumber = 'Room number is required for students';
        } else {
          delete newErrors.roomNumber;
        }
        break;

      case 'parentPhone':
        if (role === 'student' && !value.trim()) {
          newErrors.parentPhone = "Parent's phone number is required for students";
        } else if (role === 'student' && value.trim() && !validatePhone(value)) {
          newErrors.parentPhone = 'Please enter a valid parent phone number';
        } else {
          delete newErrors.parentPhone;
        }
        break;

      case 'department':
        if ((role === 'admin'|| role==='student')&&!value.trim()) {
          newErrors.department = 'Department is required';
        } else {
          delete newErrors.department;
        }
        break;

      case 'shift':
        if (role === 'guard' && !value.trim()) {
          newErrors.shift = 'Shift information is required for guards';
        } else {
          delete newErrors.shift;
        }
        break;

      case 'profileImage':
        if (!value) {
          newErrors.profileImage = 'Profile photo is required';
        } else {
          delete newErrors.profileImage;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAllFields = () => {
    const newErrors = {};

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
      newErrors.phone = 'Please enter a valid phone number (10-15 digits)';
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
        newErrors.parentPhone = 'Please enter a valid parent phone number';
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

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Validate field if it has been touched
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  };

  const handleFieldBlur = (fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
    validateField(fieldName, formData[fieldName]);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to select a profile photo.');
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
        validateField('profileImage', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const takePicture = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData({ ...formData, profileImage: result.assets[0].uri });
        validateField('profileImage', result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Profile Photo',
      'Choose how you want to add your profile photo',
      [
        { text: 'Camera', onPress: takePicture },
        { text: 'Gallery', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSignUp = async () => {
    try {
      // Mark all fields as touched to show errors
      const allFields = ['name', 'email', 'password', 'phone', 'profileImage'];
      if (role === 'student') allFields.push('roomNumber', 'parentPhone');
      if (role === 'admin') allFields.push('department');
      if (role === 'guard') allFields.push('shift');

      const newTouched = {};
      allFields.forEach(field => {
        newTouched[field] = true;
      });
      setTouched(newTouched);

      // Validate all fields
      if (!validateAllFields()) {
        Alert.alert('Validation Error', 'Please fix all errors before submitting.');
        return;
      }

      setLoading(true);

      const completeFormData = { ...formData, role: role };
      navigation.navigate('EnterOtp', { formData: completeFormData });
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
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

  // Dismiss keyboard when tapping outside inputs
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const renderError = (fieldName) => {
    if (errors[fieldName] && touched[fieldName]) {
      return <Text style={styles.errorText}>{errors[fieldName]}</Text>;
    }
    return null;
  };

  return (
    <View style={{flex: 1}}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#2563eb', '#3b82f6', '#60a5fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.welcomeSmall}>Welcome to</Text>
          <Text style={styles.welcome}> StayPass</Text>
          <View style={styles.roleSelector}>
            <MaterialIcons name={getRoleIcon()} size={24} color="#fff" style={styles.headerIcon} />
            <Text style={styles.roleText}>{role.charAt(0).toUpperCase() + role.slice(1)} Registration</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.formContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={dismissKeyboard}
            bounces={true}
            alwaysBounceVertical={false}
          >
            {/* Profile Photo Section */}
            <View style={styles.profilePhotoContainer}>
              <Text style={styles.profilePhotoLabel}>Profile Photo *</Text>
              <TouchableOpacity
                style={[
                  styles.profilePhotoButton,
                  errors.profileImage && touched.profileImage && styles.errorBorder
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
              {renderError('profileImage')}
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Your Role *</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={role}
                  onValueChange={setRole}
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

            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={24} color="#4158D0" style={styles.icon} />
              <TextInput
                placeholder="Full Name *"
                value={formData.name}
                onChangeText={(text) => handleFieldChange('name', text)}
                onBlur={() => handleFieldBlur('name')}
                style={[
                  styles.input,
                  errors.name && touched.name && styles.errorInput
                ]}
                placeholderTextColor="#999"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
            {renderError('name')}

            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={24} color="#4158D0" style={styles.icon} />
              <TextInput
                placeholder="Email *"
                value={formData.email}
                onChangeText={(text) => handleFieldChange('email', text)}
                onBlur={() => handleFieldBlur('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[
                  styles.input,
                  errors.email && touched.email && styles.errorInput
                ]}
                placeholderTextColor="#999"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
            {renderError('email')}

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={24} color="#4158D0" style={styles.icon} />
              <TextInput
                placeholder="Password *"
                value={formData.password}
                onChangeText={(text) => handleFieldChange('password', text)}
                onBlur={() => handleFieldBlur('password')}
                secureTextEntry
                style={[
                  styles.input,
                  errors.password && touched.password && styles.errorInput
                ]}
                placeholderTextColor="#999"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
            {renderError('password')}

            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={24} color="#4158D0" style={styles.icon} />
              <TextInput
                placeholder="Phone Number *"
                value={formData.phone}
                onChangeText={(text) => handleFieldChange('phone', text)}
                onBlur={() => handleFieldBlur('phone')}
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  errors.phone && touched.phone && styles.errorInput
                ]}
                placeholderTextColor="#999"
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>
            {renderError('phone')}

            {role === 'student' && (
              <>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="meeting-room" size={24} color="#4158D0" style={styles.icon} />
                  <TextInput
                    placeholder="Room Number *"
                    value={formData.roomNumber}
                    onChangeText={(text) => handleFieldChange('roomNumber', text)}
                    onBlur={() => handleFieldBlur('roomNumber')}
                    style={[
                      styles.input,
                      errors.roomNumber && touched.roomNumber && styles.errorInput
                    ]}
                    placeholderTextColor="#999"
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
                {renderError('roomNumber')}

                <View style={styles.inputContainer}>
                  <MaterialIcons name="contact-phone" size={24} color="#4158D0" style={styles.icon} />
                  <TextInput
                    placeholder="Parent's Phone Number *"
                    value={formData.parentPhone}
                    onChangeText={(text) => handleFieldChange('parentPhone', text)}
                    onBlur={() => handleFieldBlur('parentPhone')}
                    keyboardType="phone-pad"
                    style={[
                      styles.input,
                      errors.parentPhone && touched.parentPhone && styles.errorInput
                    ]}
                    placeholderTextColor="#999"
                    returnKeyType="done"
                  />
                </View>
                {renderError('parentPhone')}
              </>
            )}

            {(role === 'admin' || role == 'student') && (
              <>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="business" size={24} color="#4158D0" style={styles.icon} />
                  <TextInput
                    placeholder="Department *"
                    value={formData.department}
                    onChangeText={(text) => handleFieldChange('department', text)}
                    onBlur={() => handleFieldBlur('department')}
                    style={[
                      styles.input,
                      errors.department && touched.department && styles.errorInput
                    ]}
                    placeholderTextColor="#999"
                    returnKeyType="done"
                  />
                </View>
                {renderError('department')}
              </>
            )}

            {role === 'guard' && (
              <>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="schedule" size={24} color="#4158D0" style={styles.icon} />
                  <TextInput
                    placeholder="Shift Schedule (e.g., Morning 8-4) *"
                    value={formData.shift}
                    onChangeText={(text) => handleFieldChange('shift', text)}
                    onBlur={() => handleFieldBlur('shift')}
                    style={[
                      styles.input,
                      errors.shift && touched.shift && styles.errorInput
                    ]}
                    placeholderTextColor="#999"
                    returnKeyType="done"
                  />
                </View>
                {renderError('shift')}
              </>
            )}

            <TouchableOpacity
              style={styles.button}
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

            {/* Add extra space only when keyboard is visible */}
            {isKeyboardVisible && <View style={{ height: 0 }} />}
          </ScrollView>
        </View>
      </View>
   </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  gradient: {
    height: 200,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  header: {
    marginLeft: 25,
    marginTop: 50,
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
    flex: 1,
    marginTop: -40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  formContainer: {
    paddingVertical: 20,
    flexGrow: 1,
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 20,
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
    ...Platform.select({
      android: {
        elevation: 0,
      },
    }),
  },
  picker: {
    height: 50,
    width: '100%',
    backgroundColor: '#ffffff',
    color: '#333333',
    ...Platform.select({
      android: {
        color: '#333333',
      },
    }),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    height: 55,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#333',
    fontSize: 15,
  },
  errorInput: {
    borderColor: '#ff0000',
  },
  errorBorder: {
    borderColor: '#ff0000',
  },
  errorText: {
    color: '#ff0000',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
    marginLeft: 5,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4158D0',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    elevation: 2,
    shadowColor: '#4158D0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    marginTop: 25,
    marginBottom: 10,
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
});

export default SignUpScreen;