import { useAlert } from '@/context/AlertContext';
import { useAuth } from '@/context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as MailComposer from 'expo-mail-composer';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const Feedback = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const {showAlert} = useAlert();
  const [feedback, setFeedback] = useState({
    subject: '',
    message: '',
    type: 'suggestion'
  });

  const feedbackTypes = [
    { id: 'suggestion', label: 'Suggestion', icon: 'lightbulb-outline', color: '#3b82f6', bgColor: '#eff6ff' },
    { id: 'bug', label: 'Bug Report', icon: 'bug-report', color: '#ef4444', bgColor: '#fef2f2' },
    { id: 'complaint', label: 'Complaint', icon: 'warning', color: '#f59e0b', bgColor: '#fffbeb' },
    { id: 'compliment', label: 'Compliment', icon: 'favorite', color: '#10b981', bgColor: '#f0fdf4' },
  ];

  const handleSendFeedback = async () => {
    if (!feedback.subject.trim() || !feedback.message.trim()) {
      showAlert('Missing Information', 'Please fill in both subject and message fields.');
      return;
    }

    if (feedback.message.trim().length < 10) {
      showAlert('Message Too Short', 'Please provide more details (at least 10 characters).');
      return;
    }

    try {
      setLoading(true);

      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        showAlert(
          'Email Not Available', 
          'Your device does not have email configured. Please set up an email account in your device settings.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const userInfo = user ? `
User Information:
━━━━━━━━━━━━━━━━━━━━
Name: ${user.name || 'Not provided'}
Email: ${user.email || 'Not provided'}
Phone: ${user.phone || 'Not provided'}
Role: ${user.role || 'Not provided'}
` : '━━━━━━━━━━━━━━━━━━━━\nUser: Not logged in';

      const selectedType = feedbackTypes.find(f => f.id === feedback.type);
      
      const options = {
        recipients: ['staypass13@gmail.com'],
        subject: `[StayPass - ${selectedType?.label}] ${feedback.subject}`,
        body: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STAYPASS FEEDBACK SUBMISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Feedback Type: ${selectedType?.label}
Subject: ${feedback.subject}

MESSAGE:
━━━━━━━━━━━━━━━━━━━━
${feedback.message}
━━━━━━━━━━━━━━━━━━━━

${userInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sent from StayPass Mobile App
Date: ${new Date().toLocaleString()}
        `.trim(),
      };

      const result = await MailComposer.composeAsync(options);
      
      // Check the result status
      if (result.status === 'sent' || result.status === 'undetermined') 
        {

      } else if (result.status === 'cancelled') {
        // User cancelled the email
        showAlert('Cancelled', 'Feedback was not sent.');
      }
      
    } catch (error) {
      console.error('Error sending feedback:', error);
      showAlert(
        'Error', 
        'Failed to open email composer. Please check your email settings or contact support at staypass13@gmail.com',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getCharacterCountColor = () => {
    const length = feedback.message.length;
    if (length === 0) return '#9ca3af';
    if (length < 10) return '#ef4444';
    if (length < 50) return '#f59e0b';
    return '#10b981';
  };

  const selectedType = feedbackTypes.find(f => f.id === feedback.type);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={{ flex: 1 }}>
        <LinearGradient 
          colors={['#1e40af', '#2563eb', '#3b82f6']} 
          style={styles.gradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="feedback" size={32} color="#fff" />
            </View>
            <Text style={styles.headerTitle}>Feedback</Text>
            <Text style={styles.headerSubtitle}>Help us improve StayPass</Text>
          </View>
        </LinearGradient>

        <View style={styles.container}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Feedback Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What type of feedback?</Text>
              <View style={styles.typeContainer}>
                {feedbackTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      feedback.type === type.id && [
                        styles.typeButtonSelected,
                        { backgroundColor: type.color }
                      ]
                    ]}
                    onPress={() => setFeedback({ ...feedback, type: type.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.iconContainer,
                      feedback.type === type.id 
                        ? { backgroundColor: 'rgba(255,255,255,0.2)' }
                        : { backgroundColor: type.bgColor }
                    ]}>
                      <MaterialIcons 
                        name={type.icon} 
                        size={24} 
                        color={feedback.type === type.id ? '#fff' : type.color} 
                      />
                    </View>
                    <Text style={[
                      styles.typeButtonText,
                      feedback.type === type.id && styles.typeButtonTextSelected
                    ]}>
                      {type.label}
                    </Text>
                    {feedback.type === type.id && (
                      <MaterialIcons name="check-circle" size={20} color="#fff" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Subject Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subject</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="subject" size={20} color="#9ca3af" style={styles.inputIcon} />
                <TextInput
                  placeholder="Brief description of your feedback"
                  value={feedback.subject}
                  onChangeText={(text) => setFeedback({ ...feedback, subject: text })}
                  style={styles.input}
                  placeholderTextColor="#9ca3af"
                  maxLength={100}
                />
              </View>
              <Text style={styles.charCount}>
                {feedback.subject.length}/100
              </Text>
            </View>

            {/* Message Input */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Message</Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                <TextInput
                  placeholder="Tell us more about your experience. What worked well? What can we improve?"
                  value={feedback.message}
                  onChangeText={(text) => setFeedback({ ...feedback, message: text })}
                  style={[styles.input, styles.textArea]}
                  placeholderTextColor="#9ca3af"
                  multiline
                  textAlignVertical="top"
                  numberOfLines={6}
                  maxLength={1000}
                />
              </View>
              <View style={styles.charCountContainer}>
                <Text style={[styles.charCount, { color: getCharacterCountColor() }]}>
                  {feedback.message.length}/1000
                </Text>
                {feedback.message.length < 10 && feedback.message.length > 0 && (
                  <View style={styles.warningBadge}>
                    <MaterialIcons name="error-outline" size={12} color="#ef4444" />
                    <Text style={styles.minCharsWarning}>Min. 10 characters</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Info Box */}
            <View style={[styles.infoBox, { backgroundColor: selectedType?.bgColor }]}>
              <View style={[styles.infoIconCircle, { backgroundColor: selectedType?.color }]}>
                <MaterialIcons name="info-outline" size={16} color="#fff" />
              </View>
              <Text style={styles.infoText}>
                Your feedback will open your email app. We typically respond within 24-48 hours.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: selectedType?.color },
                (loading || !feedback.subject.trim() || !feedback.message.trim() || feedback.message.length < 10) && 
                styles.submitButtonDisabled
              ]}
              onPress={handleSendFeedback}
              disabled={
                loading || 
                !feedback.subject.trim() || 
                !feedback.message.trim() || 
                feedback.message.length < 10
              }
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialIcons name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Send Feedback</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.6}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  gradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  typeButtonSelected: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.15,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1f2937',
  },
  textAreaWrapper: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 130,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  charCountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  minCharsWarning: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 19,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0.05,
    elevation: 1,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Feedback;