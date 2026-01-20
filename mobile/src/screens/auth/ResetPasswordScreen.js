import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Input from '../../components/Input';
import theme from '../../styles/theme';
import apiClient from '../../api/client';

const ResetPasswordScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { email, resetToken } = route.params;
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validatePassword = (password) => {
    const errors = {};

    if (!password) {
      errors.newPassword = 'Password is required';
      return errors;
    }

    if (password.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
      return errors;
    }

    if (!/[A-Z]/.test(password)) {
      errors.newPassword = 'Password must contain at least one uppercase letter';
      return errors;
    }

    if (!/[a-z]/.test(password)) {
      errors.newPassword = 'Password must contain at least one lowercase letter';
      return errors;
    }

    if (!/[0-9]/.test(password)) {
      errors.newPassword = 'Password must contain at least one number';
      return errors;
    }

    if (!/[!@#$%^&*]/.test(password)) {
      errors.newPassword = 'Password must contain at least one special character (!@#$%^&*)';
      return errors;
    }

    return errors;
  };

  const handleSubmit = async () => {
    const newErrors = {};

    // Validate new password
    const passwordErrors = validatePassword(newPassword);
    Object.assign(newErrors, passwordErrors);

    // Validate confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      setErrors({});

      const response = await apiClient.post(`/auth/reset-password/${resetToken}`, {
        password: newPassword,
      });

      if (response.data.success) {
        // Show success message and navigate to login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });

        // You might want to show a toast notification here
        setTimeout(() => {
          alert('Password reset successful! Please login with your new password.');
        }, 100);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setErrors({
        submit: err.response?.data?.message || 'Failed to reset password. Please try again.',
      });
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
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                <Ionicons name="key-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>Security</Text>
                <Text style={styles.heroTitle}>Reset password</Text>
                <Text style={styles.heroSubtitle}>Create a strong password to protect your account</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Create a new password</Text>
              <Text style={styles.cardSubtitle}>
                For <Text style={styles.email}>{email}</Text>
              </Text>

              <Input
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setErrors((prev) => ({ ...prev, newPassword: '', submit: '' }));
                }}
                secureTextEntry={!showNewPassword}
                error={errors.newPassword}
                style={styles.inputSpacing}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.colors.text.tertiary}
                    />
                  </TouchableOpacity>
                }
              />

              <Input
                label="Confirm Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors((prev) => ({ ...prev, confirmPassword: '', submit: '' }));
                }}
                secureTextEntry={!showConfirmPassword}
                error={errors.confirmPassword}
                style={styles.inputSpacing}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.colors.text.tertiary}
                    />
                  </TouchableOpacity>
                }
              />

              <View style={styles.requirementsContainer}>
                <Text style={styles.requirementsTitle}>Password must contain</Text>
                <View style={styles.requirementsList}>
                  <Text style={styles.requirement}>• At least 8 characters</Text>
                  <Text style={styles.requirement}>• One uppercase letter (A–Z)</Text>
                  <Text style={styles.requirement}>• One lowercase letter (a–z)</Text>
                  <Text style={styles.requirement}>• One number (0–9)</Text>
                  <Text style={styles.requirement}>• One special character (!@#$%^&*)</Text>
                </View>
              </View>

              {errors.submit ? <Text style={styles.submitError}>{errors.submit}</Text> : null}

              <Button
                title={loading ? 'Resetting...' : 'Reset password'}
                onPress={handleSubmit}
                disabled={loading}
                style={styles.primaryButton}
              />
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
  backButton: {
    alignSelf: 'flex-start',
    padding: theme.spacing.sm,
    marginLeft: -theme.spacing.sm,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing['2xl'],
  },
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
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
  email: {
    color: theme.colors.primary[300],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  inputSpacing: {
    marginBottom: theme.spacing.md,
  },
  requirementsContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  requirementsTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  requirementsList: {
    gap: 4,
  },
  requirement: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  submitError: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    marginTop: theme.spacing.md,
  },
});

export default ResetPasswordScreen;
