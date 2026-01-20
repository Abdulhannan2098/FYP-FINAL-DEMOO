import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { isValidEmail, validatePassword } from '../../utils/formatters';
import theme from '../../styles/theme';

const RegisterScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { register } = useAuth();
  const requestedRole = route?.params?.role;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: requestedRole === 'vendor' ? 'vendor' : 'customer',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (requestedRole === 'vendor' || requestedRole === 'customer') {
      setFormData((prev) => ({ ...prev, role: requestedRole }));
    }
  }, [requestedRole]);

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.message;
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone,
      };

      await register(userData);
      // Navigation is handled automatically by RootNavigator based on user state
      console.log('Registration successful');
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation?.navigate?.('Landing');
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
              onPress={handleBack}
              style={[
                styles.backButton,
                { top: insets.top + theme.spacing.md + theme.spacing.xs, left: theme.spacing.lg },
              ]}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={18} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="person-add" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>Let’s get started</Text>
                <Text style={styles.heroTitle}>Create account</Text>
                <Text style={styles.heroSubtitle}>A premium experience for buyers and vendors</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AutoSphere</Text>
              <Text style={styles.cardSubtitle}>Create your account in seconds</Text>

              <View style={styles.roleContainer}>
                <Text style={styles.label}>Account type</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'customer' && styles.roleButtonActive,
                    ]}
                    onPress={() => updateField('role', 'customer')}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={formData.role === 'customer' ? 'person' : 'person-outline'}
                      size={16}
                      color={
                        formData.role === 'customer'
                          ? theme.colors.text.primary
                          : theme.colors.text.tertiary
                      }
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'customer' && styles.roleButtonTextActive,
                      ]}
                    >
                      Customer
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleButton, formData.role === 'vendor' && styles.roleButtonActive]}
                    onPress={() => updateField('role', 'vendor')}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={formData.role === 'vendor' ? 'briefcase' : 'briefcase-outline'}
                      size={16}
                      color={
                        formData.role === 'vendor'
                          ? theme.colors.text.primary
                          : theme.colors.text.tertiary
                      }
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'vendor' && styles.roleButtonTextActive,
                      ]}
                    >
                      Vendor
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Input
                label="Full Name"
                value={formData.name}
                onChangeText={(value) => updateField('name', value)}
                placeholder="Enter your full name"
                error={errors.name}
                style={styles.inputSpacing}
              />

              <Input
                label="Email"
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                style={styles.inputSpacing}
              />

              <Input
                label="Password"
                value={formData.password}
                onChangeText={(value) => updateField('password', value)}
                placeholder="Create a password"
                secureTextEntry={!showPassword}
                error={errors.password}
                style={styles.inputSpacing}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={theme.colors.text.tertiary}
                    />
                  </TouchableOpacity>
                }
              />

              <Input
                label="Confirm Password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
                error={errors.confirmPassword}
                style={styles.inputSpacing}
                rightIcon={
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((v) => !v)}
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

              <Input
                label="Phone (Optional)"
                value={formData.phone}
                onChangeText={(value) => updateField('phone', value)}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                style={styles.inputSpacing}
              />

              <Button
                title="Create account"
                onPress={handleRegister}
                loading={loading}
                style={styles.primaryButton}
              />

              <Button
                title="Already have an account? Login"
                onPress={() => navigation.navigate('Login')}
                variant="secondary"
                style={styles.secondaryButton}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing['2xl'],
  },
  hero: {
    position: 'relative',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
    position: 'absolute',
    padding: theme.spacing.xs,
    borderRadius: 999,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingTop: theme.spacing['4xl'],
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
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface, // #1E1E1E
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
  roleContainer: {
    marginBottom: theme.spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, // #E8E8E8
    marginBottom: theme.spacing.sm,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  roleButtonActive: {
    backgroundColor: 'rgba(185, 28, 28, 0.18)',
    borderColor: 'rgba(185, 28, 28, 0.55)',
  },
  roleButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.tertiary,
  },
  roleButtonTextActive: {
    color: theme.colors.text.primary,
  },
  primaryButton: {
    marginTop: theme.spacing.sm,
  },
  secondaryButton: {
    marginTop: theme.spacing.md,
  },
});

export default RegisterScreen;
