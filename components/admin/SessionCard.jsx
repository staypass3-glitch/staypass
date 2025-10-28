import { findRequest } from '@/services/findRequest';
import { Ionicons } from '@expo/vector-icons';
import Entypo from '@expo/vector-icons/Entypo';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { styles } from './adminStyles';


const SessionCard = ({ session, isSelected, onPress,collegeId }) => {
  console.log(collegeId);
  const [isRequest,setIsRequests] = useState(false);
  
  useFocusEffect(
    useCallback(() => {
      const checkRequests = async () => {
        if (collegeId) {
          try {
            const hasRequests = await findRequest(collegeId);
            setIsRequests(hasRequests);
          } catch (error) {
            console.error('Error checking requests:', error);
            setIsRequests(false);
          }
        }
      };

      checkRequests();
    }, [collegeId])
  );



return(

  <TouchableOpacity
    style={[
      styles.sessionCard,
      session.status === 'expired' ? styles.expiredSession : styles.activeSession,
      isSelected && styles.selectedSession
    ]}
    onPress={onPress}
  >
  

  
    <View style={styles.sessionDetails}>
      <View style={styles.sessionHeaderRow}>
        <View style={styles.sessionDetailRow}>
          <Ionicons name="calendar-outline" size={14} color="#666" />
          <Text style={styles.sessionDetail}>
            {new Date(session.start_time).toLocaleDateString()}
          </Text>
        </View>
        <View style={{marginLeft:10,marginBottom:6}}>
        <Ionicons
          name={session.status === 'active' ? 'radio-button-on' : 'radio-button-off'}
          size={16}
          color={session.status === 'active' ? '#4cc9f0' : '#adb5bd'}
        />
        </View>
        {isRequest && (
        <View style={{marginLeft:100,marginBottom:6}}>
 
        <Entypo name="bell" size={24} color="blue" />
        
        </View>)}
      </View>
      <View style={styles.sessionDetailRow}>
        <Ionicons name="time-outline" size={14} color="#666" />
        <Text style={styles.sessionDetail}>
          {new Date(session.start_time).toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.sessionDetailRow}>
        <Ionicons name="school-outline" size={14} color="#666" />
        <Text style={styles.sessionDetail}>
          {session?.colleges?.name || 'Unknown college'}
        </Text>
      </View>
    </View>

    <View style={styles.sessionCardFooter}>
      <TouchableOpacity
        style={styles.viewQRButton}
        onPress={onPress}
      >
        <Text style={styles.viewQRButtonText}>View QR</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);
};

export default SessionCard;