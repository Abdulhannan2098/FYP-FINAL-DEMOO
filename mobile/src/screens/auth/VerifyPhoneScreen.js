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

const VerifyPhoneScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { verifyPhone, resendPhoneOTP } = useAuth();

  const email = route?.params?.email || '';
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
      setError('Email is missing. Please restart the verification flow.');
      return;
    }

    if (otpString.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await verifyPhone(email, otpString);
      Alert.alert('Success', 'Phone verified successfully. Welcome!', [{ text: 'OK' }]);
    } catch (err) {
      console.error('Verify phone error:', err);
      setError(err?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Email is missing. Please restart the verification flow.');
      return;
    }

    try {
      setResending(true);
      await resendPhoneOTP(email);
      Alert.alert('Success', 'A new verification code has been sent to your phone');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setError('');
    } catch (err) {
      console.error('Resend phone OTP error:', err);
      Alert.alert('Error', err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const maskedPhone = phone
    ? phone.replace(/^(\+?\d{4})(\d{3})(\d{4})$/, '$1***$3')
    : 'your registered phone';

  if (!email) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.28)', 'rgba(23, 23, 23, 0.0)']}
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
              <View style={[styles.brandIcon, { backgroundColor: '#2563EB' }]}>
                <Ionicons name="phone-portrait-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>Phone verification</Text>
                <Text style={styles.heroTitle}>Verify your phone</Text>
                <Text style={styles.heroSubtitle}>Enter the 6-digit code sent to your phone</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AutoSphere</Text>
              <Text style={styles.cardSubtitle}>We sent a code to:</Text>
              <Text style={styles.emailText}>{maskedPhone}</Text>

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

              <Button title="Verify Phone" onPress={handleSubmit} loading={loading} style={styles.primaryButton} />

              <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <TouchableOpacity onPress={handleResendCode} disabled={resending || loading} activeOpacity={0.85}>
                  <Text style={[styles.resendLink, (resending || loading) && { opacity: 0.6 }]}>
                    {resending ? 'Sending...' : 'Resend code'}
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
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  emailText: {
    marginTop: 6,
    marginBottom: theme.spacing.md,
    color: theme.colors.primary[300],
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  errorBox: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  errorText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 18,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  otpInput: {
    width: 46,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  otpInputFocused: {
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.10)',
  },
  otpInputError: {
    borderColor: theme.colors.error,
  },
  hintText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.xs,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: theme.spacing.md,
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  resendText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
  },
  resendLink: {
    color: '#60A5FA',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  secondaryButton: {
    marginTop: theme.spacing.lg,
  },
});

export default VerifyPhoneScreen;