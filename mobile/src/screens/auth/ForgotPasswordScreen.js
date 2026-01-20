import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/Input';
import Button from '../../components/Button';
import theme from '../../styles/theme';
import apiClient from '../../api/client';

const ForgotPasswordScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail()) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await apiClient.post('/auth/forgot-password', { email });

      if (response.data.success) {
        Alert.alert(
          'Success',
          'We have sent a verification code to your email. Please check your inbox.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('VerifyOTP', { email }),
            },
          ]
        );
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={['rgba(185, 28, 28, 0.35)', 'rgba(23, 23, 23, 0.0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { paddingTop: theme.spacing.md + insets.top }]}
          >
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>

            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>Account recovery</Text>
                <Text style={styles.heroTitle}>Forgot password</Text>
                <Text style={styles.heroSubtitle}>We’ll email you a 6-digit verification code</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Reset your password</Text>
              <Text style={styles.cardSubtitle}>Enter your email to receive the code</Text>

              <Input
                label="Email Address"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError('');
                }}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                error={error}
                leftIcon={<Ionicons name="mail-outline" size={20} color={theme.colors.text.secondary} />}
                style={styles.inputSpacing}
              />

              <Button
                title={loading ? 'Sending...' : 'Send reset code'}
                onPress={handleSubmit}
                disabled={loading}
                style={styles.primaryButton}
              />

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Remembered your password?</Text>
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.footerLink}>Back to login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing['2xl'],
  },
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...theme.shadows.neonRed,
  },
  heroKicker: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  heroTitle: {
    marginTop: 2,
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    ...theme.shadows.soft,
  },
  cardTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  cardSubtitle: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  inputSpacing: {
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    marginTop: theme.spacing.sm,
  },
  footerRow: {
    marginTop: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  footerLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[300],
    fontWeight: theme.typography.fontWeight.semibold,
  },
});

export default ForgotPasswordScreen;
