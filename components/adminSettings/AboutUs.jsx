import ScreenWrapper from '@/components/ScreenWrapper';
import fonts from '@/constants/fonts';
import theme from '@/constants/theme';
import { Feather, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import React from 'react';
import { useEffect } from 'react';
import {
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const AboutUs = () => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleSocialPress = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigation.goBack();
        return true; // Prevent default behavior
      }
    );

    // Cleanup the event listener when component unmounts
    return () => backHandler.remove();
  }, [navigation]);

  const features = [
    {
      icon: 'security',
      title: 'Secure Access',
      description: 'Advanced security protocols ensuring safe entry and exit for all residents.'
    },
    {
      icon: 'qr-code',
      title: 'Digital Passes',
      description: 'QR code based digital passes for seamless and contactless access control.'
    },
    {
      icon: 'notifications',
      title: 'Real-time Alerts',
      description: 'Instant notifications for entry/exit activities and security updates.'
    },
    {
      icon: 'history',
      title: 'Activity Logs',
      description: 'Comprehensive logs of all access activities for complete transparency.'
    }
  ];

  const teamMembers = [
    {
      name: 'Guru Bhamare',
      role: 'Security Lead',
      image: '👨‍💻'
    },
    {
      name: 'Yashraj Chavan',
      role: 'Tech Director',
      image: '👨‍💼'
    },
    {
      name: 'Himanshu Patil',
      role: 'Operations Manager',
      image: '👨‍💼'
    },
    {
      name: 'Shubham Dhongade',
      role: 'Support Specialist',
      image: '👨‍💼'
    },
    {
      name: 'Janhavi Nandan',
      role: 'Support Specialist',
      image: '👩‍💼'
    }
  ];

  return (
    <ScreenWrapper haveTabs={false}>
      <StatusBar backgroundColor={theme.colors.primary} barStyle="light-content" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Us</Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <MaterialIcons name="security" size={48} color={theme.colors.primary} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Safe Entry Exit System</Text>
          <Text style={styles.heroSubtitle}>
            Ensuring campus safety through advanced digital security solutions
          </Text>
        </View>

        {/* Mission Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.sectionText}>
            We are committed to providing a secure and efficient access control system 
            that ensures the safety of all campus residents. Our platform combines 
            cutting-edge technology with user-friendly design to create a seamless 
            entry and exit experience while maintaining the highest security standards.
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <MaterialIcons 
                    name={feature.icon} 
                    size={28} 
                    color={theme.colors.primary} 
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Team Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Team</Text>
          <Text style={styles.sectionText}>
            Meet the dedicated professionals working tirelessly to ensure your safety 
            and provide the best user experience.
          </Text>
          <View style={styles.teamGrid}>
            {teamMembers.map((member, index) => (
              <View key={index} style={styles.teamCard}>
                <Text style={styles.teamEmoji}>{member.image}</Text>
                <Text style={styles.teamName}>{member.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Get In Touch</Text>
          <Text style={styles.contactText}>
            Have questions or need support? We're here to help you.
          </Text>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <MaterialIcons name="email" size={20} color={theme.colors.primary} />
              <Text style={styles.contactDetail}>staypass3@gmail.com</Text>
            </View>
            <View style={styles.contactItem}>
              <MaterialIcons name="phone" size={20} color={theme.colors.primary} />
              <Text style={styles.contactDetail}>+91 8180063824</Text>
            </View>
            <View style={styles.contactItem}>
              <MaterialIcons name="location-on" size={20} color={theme.colors.primary} />
              <Text style={styles.contactDetail}>Government Polytechnic, Nashik</Text>
            </View>
          </View>

          {/* Social Media Links */}
          <View style={styles.socialSection}>
            <Text style={styles.socialTitle}>Follow Us</Text>
            <View style={styles.socialIcons}>
              <TouchableOpacity 
                style={styles.socialIcon}
                onPress={() => handleSocialPress('https://instagram.com')}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="instagram" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialIcon}
                onPress={() => handleSocialPress('https://linkedin.com')}
                activeOpacity={0.7}
              >
                <FontAwesome5 name="linkedin" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.socialIcon}
                onPress={() => handleSocialPress('https://twitter.com')}
                activeOpacity={0.7}
              >
                <Feather name="twitter" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 Staypass. All rights reserved.
          </Text>
          <Text style={styles.footerSubtext}>
            Building safer campuses, one entry at a time.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: theme.colors.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: fonts.fontSizes.xl,
    fontWeight: fonts.fontWeights.bold,
    color: theme.colors.white,
    fontFamily: fonts.fontFamilies.bold,
  },
  placeholder: {
    width: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    backgroundColor: theme.colors.lightBackground,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    marginBottom: 10,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.dark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    fontSize: fonts.fontSizes.xl,
    fontWeight: fonts.fontWeights.bold,
    color: theme.colors.dark,
    fontFamily: fonts.fontFamilies.bold,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.gray,
    textAlign: 'center',
    fontFamily: fonts.fontFamilies.regular,
    lineHeight: 24,
    maxWidth: '90%',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: theme.colors.white,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
    shadowColor: theme.colors.dark,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: fonts.fontSizes.lg,
    fontWeight: fonts.fontWeights.bold,
    color: theme.colors.dark,
    fontFamily: fonts.fontFamilies.bold,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionText: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.gray,
    fontFamily: fonts.fontFamilies.regular,
    lineHeight: 24,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  featureCard: {
    width: '48%',
    backgroundColor: theme.colors.lightBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: theme.colors.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureTitle: {
    fontSize: fonts.fontSizes.sm,
    fontWeight: fonts.fontWeights.semibold,
    color: theme.colors.dark,
    fontFamily: fonts.fontFamilies.semibold,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: fonts.fontSizes.xs,
    color: theme.colors.gray,
    fontFamily: fonts.fontFamilies.regular,
    textAlign: 'center',
    lineHeight: 16,
  },
  teamGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  teamCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.lightBackground,
    borderRadius: 12,
    marginBottom: 16,
  },
  teamEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  teamName: {
    fontSize: fonts.fontSizes.sm,
    fontWeight: fonts.fontWeights.semibold,
    color: theme.colors.dark,
    fontFamily: fonts.fontFamilies.semibold,
    marginBottom: 4,
    textAlign: 'center',
  },
  teamRole: {
    fontSize: fonts.fontSizes.xs,
    color: theme.colors.primary,
    fontFamily: fonts.fontFamilies.medium,
    textAlign: 'center',
  },
  contactSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: theme.colors.lightBackground,
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 16,
  },
  contactText: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.gray,
    fontFamily: fonts.fontFamilies.regular,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  contactInfo: {
    marginBottom: 30,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  contactDetail: {
    fontSize: fonts.fontSizes.md,
    color: theme.colors.dark,
    fontFamily: fonts.fontFamilies.regular,
    marginLeft: 12,
  },
  socialSection: {
    alignItems: 'center',
  },
  socialTitle: {
    fontSize: fonts.fontSizes.lg,
    fontWeight: fonts.fontWeights.semibold,
    color: theme.colors.dark,
    fontFamily: fonts.fontFamilies.semibold,
    marginBottom: 20,
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  socialIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.dark,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
    backgroundColor: theme.colors.dark,
    marginTop: 20,
  },
  footerText: {
    fontSize: fonts.fontSizes.sm,
    color: theme.colors.white,
    fontFamily: fonts.fontFamilies.medium,
    marginBottom: 8,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: fonts.fontSizes.xs,
    color: theme.colors.gray,
    fontFamily: fonts.fontFamilies.regular,
    textAlign: 'center',
  },
});

export default AboutUs;