import { CustomAlert } from '@/components';
import ScreenWrapper from '@/components/ScreenWrapper';
import fonts from '@/constants/fonts';
import theme from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { supabase } from '@/lib/supabase';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, BackHandler, Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const AllSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [leaveSessionLoading, setLeaveSessionLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    buttons: [] 
  });
  const { user } = useUser();
  const { signOut } = useAuth();
  const navigation = useNavigation();

  // Combined loading state for any blocking operation
  const isBlockingOperation = useMemo(() => 
    isLoading || leaveSessionLoading || logoutLoading, 
    [isLoading, leaveSessionLoading, logoutLoading]
  );

    useEffect(()=>{
      const backHandler = BackHandler.addEventListener('hardwareBackPress',()=>{
        navigation.goBack();
        return true;
      });
  
      return ()=> backHandler.remove();
  },[])

  const showAlert = useCallback((title, message, buttons = []) => {

    if (isBlockingOperation) return;
    
    setCustomAlert({ visible: true, title, message, buttons });
  }, [isBlockingOperation]);

  const handleLogout = useCallback(async () => {
   
    if (isBlockingOperation) return;

    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          disabled: isBlockingOperation
        },
        { 
          text: 'Logout', 
          onPress: async () => {
            if (isBlockingOperation) return;
            
            setLogoutLoading(true);
            setIsLoading(true); // Global loading state
            
            try {
              await signOut();
              // Navigation will be handled by auth context
            } catch (error) {
              console.error('Logout error:', error);
              showAlert('Error', 'Failed to logout. Please try again.', [{ text: 'Ok' }]);
            } finally {
              setLogoutLoading(false);
              setIsLoading(false);
            }
          },
          disabled: isBlockingOperation
        }
      ]
    );
  }, [signOut, showAlert, isBlockingOperation]);

  const handleLeaveSession = useCallback(() => {
    // Prevent multiple triggers
    if (isBlockingOperation) return;

    showAlert(
      'Leave Session',
      'This will clear your current session but keep you logged in. Continue?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          disabled: isBlockingOperation
        },
        { 
          text: 'Leave', 
          onPress: async () => {
            if (isBlockingOperation) return;
            
            setLeaveSessionLoading(true);
            setIsLoading(true); // Global loading state
            
            try {
              const { error } = await supabase
                .from('profiles')
                .update({
                  college_id: null,
                  current_session_id: null,
                  last_joined_at: null
                })
                .eq('id', user.id);

              if (error) throw error;

              showAlert('Success', 'Left session successfully!', [{ text: 'OK' }]);
              navigation.replace('Student');

            } catch (error) {
              console.error('Error leaving session:', error);
              showAlert('Error', error.message || 'Failed to leave session', [{ text: 'OK' }]);
            } finally {
              setLeaveSessionLoading(false);
              setIsLoading(false);
            }
          },
          disabled: isBlockingOperation
        }
      ]
    );
  }, [showAlert, user?.id, navigation, isBlockingOperation]);

  const handleRateUs = useCallback(() => {
    if (isBlockingOperation) return;
    
    const appStoreUrl = 'https://apps.apple.com/app/your-app-id';
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=your.app.id';
    
    Linking.openURL(Platform.OS === 'ios' ? appStoreUrl : playStoreUrl).catch(err => {
      showAlert('Error', 'Could not open app store.', [{ text: 'Ok' }]);
    });
  }, [showAlert, isBlockingOperation]);

  const handleAboutUs = useCallback(() => {
    if (isBlockingOperation) return;
    navigation.navigate('AboutUs');
  }, [navigation, isBlockingOperation]);

  const forgot  = useCallback(()=>{
    if(isBlockingOperation) return;
    navigation.navigate('ForgotChangePass')
  },[navigation,isBlockingOperation]);

  const handleFeedback  = useCallback(()=>{
    if(isBlockingOperation) return;
    navigation.navigate('Feedback')
  },[navigation,isBlockingOperation]);

  const handleChangePassword = useCallback(() => {
    if (isBlockingOperation) return;
    navigation.navigate('ChangePassword'); 
  }, [navigation, isBlockingOperation]);

  const styles = useMemo(() => StyleSheet.create({
    scrollContainer: {
      flex: 1,
      backgroundColor: '#fff',
    },

    backButton:{
        marginTop:10
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
      paddingTop: 0,
    },
    headerTitle: {
      fontSize: fonts.fontSizes.xl,
      fontWeight: fonts.fontWeights.bold,
      color: theme.colors.dark,
      marginBottom: 8,
      fontFamily: fonts.fontFamilies.bold,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: fonts.fontSizes.sm,
      color: theme.colors.gray,
      textAlign: 'center',
      maxWidth: '90%',
      lineHeight: 20,
      fontFamily: fonts.fontFamilies.regular,
    },
    section: {
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: fonts.fontSizes.sm,
      fontWeight: fonts.fontWeights.semibold,
      color: theme.colors.gray,
      fontFamily: fonts.fontFamilies.semibold,
      marginBottom: 16,
      paddingHorizontal: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    menuItem: {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.lightGray,
      paddingHorizontal: 20,
      paddingVertical: 18,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: theme.colors.dark,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    menuItemContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    menuIcon: {
      marginRight: 16,
      width: 24,
      alignItems: 'center',
    },
    menuText: {
      fontSize: fonts.fontSizes.md,
      fontWeight: fonts.fontWeights.medium,
      color: theme.colors.dark,
      fontFamily: fonts.fontFamilies.medium,
      flex: 1,
    },
    arrowIcon: {
      marginLeft: 8,
    },
    destructiveItem: {
      borderColor: '#fed7d7',
      backgroundColor: '#fff5f5',
    },
    destructiveText: {
      color: '#e53e3e',
    },
    versionSection: {
      alignItems: 'center',
      marginTop: 40,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.lightGray,
    },
    versionText: {
      fontSize: fonts.fontSizes.sm,
      color: theme.colors.gray,
      fontFamily: fonts.fontFamilies.regular,
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingText: {
      marginLeft: 8,
      fontSize: fonts.fontSizes.sm,
      color: theme.colors.gray,
    },
    disabledItem: {
      opacity: 0.6,
    },
    blockingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(255, 255, 255, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
  }), []);

  const menuItems = [
    {
      id: 'changePassword',
      title: 'Change Password',
      icon: 'lock-outline',
      onPress: handleChangePassword,
      iconColor: theme.colors.primary,
    },
    {
      id: 'aboutUs',
      title: 'About Us',
      icon: 'info-outline',
      onPress: handleAboutUs,
      iconColor: theme.colors.primary,
    },
    {
      id: 'forgotPassword',
      title: 'Forgot Password',
      icon: 'password',
      onPress: forgot,
      iconColor: theme.colors.primary,
    },
    {
      id: 'feedback',
      title: 'Feedback',
      icon: 'feedback',
      onPress: handleFeedback,
      iconColor: theme.colors.primary,
    },
    {
      id: 'leaveSession',
      title: 'Leave Session',
      icon: 'exit-to-app',
      onPress: handleLeaveSession,
      iconColor: '#f6ad55',
      loading: leaveSessionLoading,
    },
    {
      id: 'logout',
      title: 'Logout',
      icon: 'logout',
      onPress: handleLogout,
      iconColor: '#e53e3e',
      destructive: true,
      loading: logoutLoading,
    },
  ];



  const renderMenuItemContent = (item) => {
    if (item.loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={item.destructive ? '#e53e3e' : theme.colors.primary} />
          <Text style={[
            styles.loadingText,
            item.destructive && styles.destructiveText
          ]}>
            {item.id === 'leaveSession' ? 'Leaving Session...' : 'Logging out...'}
          </Text>
        </View>
      );
    }

    return (
      <>
        <View style={styles.menuIcon}>
          <MaterialIcons 
            name={item.icon} 
            size={22} 
            color={item.iconColor} 
          />
        </View>
        <Text style={[
          styles.menuText,
          item.destructive && styles.destructiveText
        ]}>
          {item.title}
        </Text>
        {!item.destructive && (
          <MaterialIcons 
            name="chevron-right" 
            size={20} 
            color={theme.colors.gray} 
            style={styles.arrowIcon}
          />
        )}
      </>
    );
  };

  return (
    <ScreenWrapper haveTabs={false}>
      {/* Blocking overlay during operations */}
      {isBlockingOperation && (
        <View style={styles.blockingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: theme.colors.gray }}>
            {logoutLoading ? 'Logging out...' : 'Leaving session...'}
          </Text>
        </View>
      )}
      
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!isBlockingOperation} // Disable scrolling during operations
      >
        <View style={styles.container}>
            <TouchableOpacity onPress={()=>navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#4361ee" />
      </TouchableOpacity>
          {/* Header Section */}
          <View style={styles.headerSection}>
            
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>
              Manage your account preferences and app settings
            </Text>
          </View>

          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            {menuItems.slice(0, 4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  item.destructive && styles.destructiveItem,
                  isBlockingOperation && styles.disabledItem
                ]}
                onPress={item.onPress}
                disabled={isBlockingOperation} // Disable all items during blocking operations
              >
                <View style={styles.menuItemContent}>
                  {renderMenuItemContent(item)}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Session Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Session</Text>
            {menuItems.slice(4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  item.destructive && styles.destructiveItem,
                  isBlockingOperation && styles.disabledItem
                ]}
                onPress={item.onPress}
                disabled={isBlockingOperation || item.loading} // Disable during blocking operations or item-specific loading
              >
                <View style={styles.menuItemContent}>
                  {renderMenuItemContent(item)}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Version Info */}
          <View style={styles.versionSection}>
            <Text style={styles.versionText}>
              Version 1.0.0
            </Text>
          </View>
        </View>
      </ScrollView>

      <CustomAlert
        visible={customAlert.visible}
        title={customAlert.title}
        message={customAlert.message}
        buttons={customAlert.buttons.map(button => ({
          ...button,
          disabled: isBlockingOperation // Disable alert buttons during operations
        }))}
        onDismiss={() => {
          if (isBlockingOperation) return; // Prevent dismiss during operations
          setCustomAlert({ visible: false, title: '', message: '', buttons: [] });
        }}
      />
    </ScreenWrapper>
  );
};

export default React.memo(AllSettings);