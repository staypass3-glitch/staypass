import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Clipboard } from 'react-native';

import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// If not using Expo, use: import Clipboard from '@react-native-clipboard/clipboard'
import { useRoute } from '@react-navigation/native';
import ScreenWrapper from './ScreenWrapper';

const ShowCredentials = () => {
  const { user } = useAuth()
  const route = useRoute();
  const [credentials, setCredentials] = useState({ guard_id: '', session_id: '' })
  const [loading, setLoading] = useState(true)
  const navigation = useNavigation()
  const { sessionId } = route.params;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const { data: userData, error: userError } = await supabase
          .from('sessions')
          .select('guard_id, session_id')
          .eq('id', sessionId)
          .single()

        if (userError) throw userError

        if (userData) {
          setCredentials({
            guard_id: userData.guard_id || '',
            session_id: userData.session_id || ''
          })
        }
      } catch (error) {
        console.error('Error fetching credentials:', error)
        Alert.alert('Error', 'Failed to fetch credentials')
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchData()
    }
  }, [user?.id])

  const copyToClipboard = (text, type) => {
    try {
      Clipboard.setString(String(text))   // ✅ ensure string
    } catch (error) {
      console.error('Copy failed:', error)
      Alert.alert('Error', 'Failed to copy to clipboard')
    }
  }
  
  const handleBack = () => {
    navigation.goBack()
  }

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading credentials...</Text>
        </View>
      </ScreenWrapper>
    )
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
      
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
            
          </TouchableOpacity>
          <Text style={styles.title}>Your Credentials</Text>
          <View style={{ width: 60 }} /> {/* Spacer */}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Credentials Card */}
          <View style={styles.card}>
            {/* Guard ID */}
            <View style={styles.credentialItem}>
              <Text style={styles.label}>Guard ID:</Text>
              <View style={styles.valueContainer}>
                <Text style={styles.value} selectable={true}>
                  {String(credentials.guard_id || 'Not available')}
                </Text>
                {credentials.guard_id ? (
                  <TouchableOpacity
                    onPress={() => copyToClipboard(credentials.guard_id, 'Guard ID')}
                    style={styles.copyButton}
                  >
                    <Ionicons name="copy-outline" size={20} color="white" />
                    <Text style={styles.copyText}>Copy</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Session ID */}
            <View style={styles.credentialItem}>
              <Text style={styles.label}>Session ID:</Text>
              <View style={styles.valueContainer}>
                <Text style={styles.value} selectable={true}>
                  {String(credentials.session_id || 'Not available')}
                </Text>
                {credentials.session_id ? (
                  <TouchableOpacity
                    onPress={() => copyToClipboard(credentials.session_id, 'Session ID')}
                    style={styles.copyButton}
                  >
                    <Ionicons name="copy-outline" size={20} color="white" />
                    <Text style={styles.copyText}>Copy</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              These credentials are used for authentication. Keep them secure and don't share them with anyone.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backText: {
    color: '#007AFF',
    marginLeft: 4,
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 20,
  },
  credentialItem: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 12,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    justifyContent: 'center',
  },
  copyText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f4f8',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
})

export default ShowCredentials
