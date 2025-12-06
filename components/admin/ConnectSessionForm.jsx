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
import ScreenWrapper from '../ScreenWrapper';
import { styles } from './adminStyles';

const ConnectSessionForm = ({ onBack, onSubmit, loading, sessionId, setSessionId }) => {
  
  useEffect(() => {
    const backAction = () => {
      onBack();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [onBack]); 
  
  return (
    <ScreenWrapper>
      <View style={styles.connectFormContainer}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#4361ee" />
          </TouchableOpacity>
          <Text style={styles.formTitle}>Connect to Existing Session</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formSubtitle}>Enter the Session ID provided by another admin</Text>
          <TextInput
            style={styles.input}
            placeholder='Enter session ID'
            value={sessionId}
            onChangeText={setSessionId}
            placeholderTextColor="#999"
            autoCapitalize="none"
          />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={onSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Connect Session</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default ConnectSessionForm;