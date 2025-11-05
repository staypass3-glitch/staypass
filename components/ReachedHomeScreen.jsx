import ScreenWrapper from '@/components/ScreenWrapper';
import fonts from '@/constants/fonts';
import theme from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CustomAlert from '../components/CustomAlert.jsx';
import { supabase } from '../lib/supabase';

const ReachedHomeScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { requestId } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ visible: false, title: '', message: '', buttons: [] });

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Exit the app when back button is pressed
        BackHandler.exitApp();
        return true; // Prevent default behavior
      }
    );

    // Cleanup the event listener
    return () => backHandler.remove();
  }, []);

  const handleConfirm = async () => {
    try {
      setLoading(true);

      // Get location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAlert({
          visible: true,
          title: 'Permission Required',
          message: 'Location permission is needed to confirm arrival',
          buttons: [{ text: 'OK' }]
        });
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationString = `${location.coords.latitude},${location.coords.longitude}`;

      // Save to database
      const { error } = await supabase
        .from('requests')
        .update({ location: locationString })
        .eq('id', requestId);

      if (error) throw error;

      setAlert({
        visible: true,
        title: 'Success',
        message: 'Location saved! Your return QR code will be available shortly.',
        buttons: [{ 
          text: 'OK', 
          onPress: () => {
            // Exit the app after successful confirmation
            navigation.goBack();
          }
        }]
      });
    } catch (error) {
      console.error('Error:', error);
      setAlert({
        visible: true,
        title: 'Error',
        message: error.message || 'Failed to save location',
        buttons: [{ text: 'OK' }]
      });
    } finally {
      setLoading(false);
    }
  };

  const showConfirmationAlert = () => {
    setAlert({
      visible: true,
      title: 'Reached Home?',
      message: 'Are you sure you have reached home? Your location will be recorded.',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, I have', style: 'success', onPress: handleConfirm }
      ]
    });
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="home" size={100} color="#10b981" />
          
          <Text style={styles.title}>Reached Home?</Text>
          
          <Text style={styles.description}>
            Confirm your arrival to generate your return QR code
          </Text>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={showConfirmationAlert}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Confirm Arrival</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.note}>
            Your current location will be saved
          </Text>
        </View>
      </View>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onDismiss={() => setAlert({ visible: false, title: '', message: '', buttons: [] })}
      />
    </ScreenWrapper>
  );
};

export default ReachedHomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: fonts.fontWeights.bold,
    color: '#1e293b',
    marginTop: 32,
    marginBottom: 12,
  },
  description: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: fonts.fontSizes.lg,
    fontWeight: fonts.fontWeights.bold,
  },
  note: {
    fontSize: fonts.fontSizes.sm,
    color: theme.colors.gray,
    marginTop: 24,
    textAlign: 'center',
  },
});