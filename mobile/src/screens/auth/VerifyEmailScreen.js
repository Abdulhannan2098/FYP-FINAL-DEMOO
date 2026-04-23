import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import theme from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';

const VerifyEmailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { verifyEmail, resendVerificationOTP } = useAuth();

  const email = route?.params?.email || '';
  const isVendor = route?.params?.isVendor === true;
  const phone = route?.params?.phone || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRefs = useRef([]);

  const handleOtpChange = (rawValue, index) => {
    const value = String(rawValue || '').replace(/\D/g, '').slice(0, 1);
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const otpString = otp.join('');

    if (!email) {
      setError('Email is missing. Please register again.');
      return;
    }

    if (otpString.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const verificationResult = await verifyEmail(email, otpString, { isVendor });

      if (verificationResult?.requiresPhoneVerification) {
        Alert.alert('Success', 'Email verified successfully. Please verify your phone number.', [
          {
            text: 'Continue',
            onPress: () =>
              navigation.navigate('VerifyPhone', {
                email: verificationResult.email || email,
                phone: verificationResult.phone || phone,
              }),
          },
        ]);
        return;
      }

      Alert.alert('Success', 'Email verified successfully. Welcome!', [{ text: 'OK' }]);
      // RootNavigator will switch to authenticated navigator automatically.
    } catch (err) {
      console.error('Verify email error:', err);
      const message = err?.message || 'Invalid or expired code. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Email is missing. Please register again.');
      return;
    }

    try {
      setResending(true);
      await resendVerificationOTP(email);
      Alert.alert('Success', 'A new verification code has been sent to your email');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setError('');
    } catch (err) {
      console.error('Resend verification OTP error:', err);
      Alert.alert('Error', err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
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
            colors={['rgba(16, 185, 129, 0.28)', 'rgba(23, 23, 23, 0.0)']}
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
              <View style={[styles.brandIcon, { backgroundColor: '#16A34A' }]}>
                <Ionicons name="mail-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>Email verification</Text>
                <Text style={styles.heroTitle}>Verify your email</Text>
                <Text style={styles.heroSubtitle}>Enter the 6-digit code we emailed you</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AutoSphere</Text>
              <Text style={styles.cardSubtitle}>We sent a code to:</Text>
              <Text style={styles.emailText}>{email || '—'}</Text>

              {!!error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => {
                  const isFocused = focusedIndex === index;
                  return (
                    <TextInput
                      key={index}
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      style={[
                        styles.otpInput,
                        isFocused && styles.otpInputFocused,
                        !!error && styles.otpInputError,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      onFocus={() => setFocusedIndex(index)}
                      onBlur={() => setFocusedIndex(-1)}
                      keyboardType="number-pad"
                      maxLength={1}
                      editable={!loading}
                      selectionColor={theme.colors.primary[500]}
                    />
                  );
                })}
              </View>

              <Text style={styles.hintText}>The code expires in 10 minutes.</Text>

              <Button
                title="Verify Email"
                onPress={handleSubmit}
                loading={loading}
                style={styles.primaryButton}
              />

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn’t receive the code?</Text>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={resending || loading}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.resendLink, (resending || loading) && { opacity: 0.6 }]}>
                    {resending ? 'Sending…' : 'Resend code'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Back to Login"
                onPress={() => navigation.navigate('Login')}
                variant="secondary"
                disabled={loading || resending}
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
    top: theme.spacing.md,
    left: theme.spacing.lg,
    padding: theme.spacing.xs,
    borderRadius: 999,
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: theme.colors.text.primary,
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  heroSubtitle: {
    color: theme.colors.text.secondary,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 18,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  cardTitle: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: theme.colors.text.secondary,
    marginTop: 6,
    fontSize: 13,
  },
  emailText: {
    color: theme.colors.primary[400],
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  otpInput: {
    width: 46,
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    backgroundColor: theme.colors.background.primary,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  otpInputFocused: {
    borderColor: theme.colors.primary[500],
  },
  otpInputError: {
    borderColor: theme.colors.error,
  },
  hintText: {
    color: theme.colors.text.tertiary,
    fontSize: 12,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: theme.spacing.lg,
  },
  resendRow: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  resendText: {
    color: theme.colors.text.secondary,
    fontSize: 13,
  },
  resendLink: {
    color: theme.colors.primary[400],
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: theme.spacing.lg,
  },
});

export default VerifyEmailScreen;
