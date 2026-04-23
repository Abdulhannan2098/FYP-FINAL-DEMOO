import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { isValidEmail } from '../../utils/formatters';
import theme from '../../styles/theme';

const LoginScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    // PublicNavigator initial route
    navigation?.navigate?.('Landing');
  };

  const quickLogin = async (quickEmail, quickPassword) => {
    setErrors({});
    setEmail(quickEmail);
    setPassword(quickPassword);

    setLoading(true);
    try {
      await login(quickEmail, quickPassword);
      console.log('Quick login successful');
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await login(email, password);
      // Navigation is handled automatically by RootNavigator based on user state
      console.log('Login successful');
    } catch (error) {
      if (error?.code === 'EMAIL_NOT_VERIFIED' && error?.data?.email) {
        Alert.alert(
          'Email not verified',
          'Please verify your email before logging in.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Verify now',
              onPress: () =>
                navigation.navigate('VerifyEmail', {
                  email: error.data.email,
                  role: error.data.role,
                  phone: error.data.phone,
                  isVendor: error.data.role === 'vendor' || error.data.isVendor,
                }),
            },
          ]
        );
      } else if (error?.code === 'PHONE_NOT_VERIFIED' && error?.data?.email) {
        Alert.alert(
          'Phone not verified',
          'Please verify your phone number before logging in.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Verify now',
              onPress: () =>
                navigation.navigate('VerifyPhone', {
                  email: error.data.email,
                  phone: error.data.phone,
                }),
            },
          ]
        );
      } else {
        Alert.alert('Login Failed', error.message || 'Invalid credentials');
      }
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
                <Ionicons name="car-sport" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>Welcome back</Text>
                <Text style={styles.heroTitle}>Sign in</Text>
                <Text style={styles.heroSubtitle}>Access your account securely</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AutoSphere</Text>
              <Text style={styles.cardSubtitle}>Enter your credentials to continue</Text>

              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
                style={styles.inputSpacing}
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
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

              <View style={styles.linksRow}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.linkBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.linkText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Login"
                onPress={handleLogin}
                loading={loading}
                style={styles.primaryButton}
              />

              <Button
                title="Create an account"
                onPress={() => navigation.navigate('Register')}
                variant="secondary"
                style={styles.secondaryButton}
              />

              <Button
                title="Become a vendor"
                onPress={() => navigation.navigate('VendorRegister')}
                variant="outline"
                style={styles.secondaryButton}
              />

              {__DEV__ && (
                <View style={styles.quickTestContainer}>
                  <Text style={styles.quickTestTitle}>Quick test login</Text>
                  <View style={styles.quickRow}>
                    <Button
                      title="Vendor (Ali Hammad)"
                      onPress={() => quickLogin('abdul.hannan05455@gmail.com', 'Test@1234')}
                      variant="outline"
                      size="small"
                      disabled={loading}
                      style={styles.quickBtn}
                    />
                    <Button
                      title="Customer"
                      onPress={() => quickLogin('Sheikhhannan5455@gmail.com', 'Test@1234')}
                      variant="outline"
                      size="small"
                      disabled={loading}
                      style={styles.quickBtn}
                    />
                  </View>
                </View>
              )}
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
    justifyContent: 'flex-start',
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
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  linkBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  linkText: {
    color: theme.colors.primary[300],
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  primaryButton: {
    marginTop: theme.spacing.sm,
  },
  secondaryButton: {
    marginTop: theme.spacing.md,
  },
  quickTestContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
  },
  quickTestTitle: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  quickBtn: {
    flex: 1,
  },
  oauthDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  oauthDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.secondary[700],
  },
  oauthDividerText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
  },
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    backgroundColor: theme.colors.surface,
  },
  googleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: theme.colors.secondary[800],
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    flex: 1,
    marginLeft: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
});

export default LoginScreen;
