import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import ScreenWrapper from '../common/ScreenWrapper';
import { styles } from './adminStyles';

const CollegeForm = ({ onBack, onSubmit, loading, collegeName, setCollegeName }) => {
  useEffect(() => {
    const backAction = () => {
      onBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBack]);
  
  return (
    <ScreenWrapper style={styles.formContainer}>
      <View style={styles.formHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4361ee" />
        </TouchableOpacity>
        <Text style={styles.formTitle}>New Session Setup</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formSubtitle}>Enter your college details to create a new session</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>College Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter college name"
            value={collegeName}
            onChangeText={setCollegeName}
            placeholderTextColor="#999"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (!collegeName.trim() || loading) && styles.disabledButton
            ]}
            onPress={onSubmit}
            disabled={loading || !collegeName.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Create Session</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default CollegeForm;