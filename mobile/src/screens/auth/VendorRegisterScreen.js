import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Input from '../../components/Input';
import Button from '../../components/Button';
import theme from '../../styles/theme';
import { isValidEmail, validatePassword } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';

const BUSINESS_TYPES = [
  { value: 'sole_proprietor', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'private_limited', label: 'Private Limited Company' },
  { value: 'retailer', label: 'Retail Shop' },
  { value: 'wholesaler', label: 'Wholesaler / Distributor' },
  { value: 'manufacturer', label: 'Manufacturer' },
];

const YEARS_IN_BUSINESS = [
  { value: 'new', label: 'New (< 1 yr)' },
  { value: '1-3', label: '1–3 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
];

const ACCESSORY_CATEGORIES = [
  'Interior',
  'Exterior',
  'Performance',
  'Lighting',
  'Audio & Electronics',
  'Safety & Security',
  'Wheels & Tires',
  'Body Parts',
  'Engine Parts',
  'Maintenance & Care',
  'Multiple Categories',
  'Other',
];

const createEmptyAddress = () => ({
  street: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Pakistan',
});

const createEmptyOtp = () => ['', '', '', '', '', ''];

const renderOtpBoxes = ({ otp, onChange, onKeyPress, refs, disabled, error }) => (
  <View style={styles.otpRow}>
    {otp.map((digit, index) => (
      <TextInput
        key={index}
        ref={(ref) => {
          refs.current[index] = ref;
        }}
        value={digit}
        onChangeText={(value) => onChange(value, index)}
        onKeyPress={(event) => onKeyPress(event, index)}
        keyboardType="number-pad"
        maxLength={1}
        editable={!disabled}
        style={[styles.otpInput, error && styles.otpInputError]}
        selectionColor={theme.colors.primary[500]}
      />
    ))}
  </View>
);

const VendorRegisterScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const {
    sendVendorPreRegEmailOTP,
    sendVendorPreRegPhoneOTP,
    verifyVendorPreRegEmailOTP,
    verifyVendorPreRegPhoneOTP,
    checkVendorPreRegVerification,
    registerVendor,
  } = useAuth();

  const prefill = route?.params?.prefill || {};
  const { width } = useWindowDimensions();
  const isCompactLayout = width < 390;

  const [currentStep, setCurrentStep] = useState(1);
  const [showVerification, setShowVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingEmailOTP, setSendingEmailOTP] = useState(false);
  const [sendingPhoneOTP, setSendingPhoneOTP] = useState(false);
  const [verifyingEmailOTP, setVerifyingEmailOTP] = useState(false);
  const [verifyingPhoneOTP, setVerifyingPhoneOTP] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailResendTimer, setEmailResendTimer] = useState(0);
  const [phoneResendTimer, setPhoneResendTimer] = useState(0);

  const [formData, setFormData] = useState({
    name: prefill.name || '',
    email: prefill.email || '',
    phone: prefill.phone || '',
    cnicNumber: '',
    businessName: '',
    businessType: '',
    businessRegistrationNumber: '',
    yearsInBusiness: '',
    businessAddress: createEmptyAddress(),
    accessoryCategory: '',
    hasPhysicalStore: false,
    password: prefill.password || '',
    confirmPassword: prefill.password || '',
    agreeToTerms: false,
    agreeToVerification: false,
  });
  const [errors, setErrors] = useState({});
  const [emailOtp, setEmailOtp] = useState(createEmptyOtp());
  const [phoneOtp, setPhoneOtp] = useState(createEmptyOtp());
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpErrors, setOtpErrors] = useState({ email: '', phone: '' });

  const emailOtpRefs = useRef([]);
  const phoneOtpRefs = useRef([]);

  const syncPreRegVerificationState = async (email, phone, advanceOnMatch = false) => {
    const trimmedEmail = email?.trim();
    const trimmedPhone = phone?.trim();

    if (!trimmedEmail || !trimmedPhone) {
      return { emailVerified: false, phoneVerified: false, bothVerified: false };
    }

    try {
      const response = await checkVendorPreRegVerification(trimmedEmail, trimmedPhone);
      const status = response?.data || {};

      setEmailVerified(Boolean(status.emailVerified));
      setPhoneVerified(Boolean(status.phoneVerified));

      if (status.bothVerified) {
        setShowVerification(false);
        setOtpErrors({ email: '', phone: '' });

        if (advanceOnMatch) {
          setCurrentStep((value) => (value < 2 ? 2 : value));
        }
      }

      return status;
    } catch (error) {
      return { emailVerified: false, phoneVerified: false, bothVerified: false };
    }
  };

  useEffect(() => {
    let emailInterval;
    if (emailResendTimer > 0) {
      emailInterval = setInterval(() => {
        setEmailResendTimer((value) => value - 1);
      }, 1000);
    }

    return () => clearInterval(emailInterval);
  }, [emailResendTimer]);

  useEffect(() => {
    let phoneInterval;
    if (phoneResendTimer > 0) {
      phoneInterval = setInterval(() => {
        setPhoneResendTimer((value) => value - 1);
      }, 1000);
    }

    return () => clearInterval(phoneInterval);
  }, [phoneResendTimer]);

  useEffect(() => {
    if (!prefill.email || !prefill.phone) {
      return;
    }

    let isActive = true;

    const hydrateVerificationState = async () => {
      const status = await syncPreRegVerificationState(prefill.email, prefill.phone, true);

      if (!isActive || !status?.bothVerified) {
        return;
      }
    };

    hydrateVerificationState();

    return () => {
      isActive = false;
    };
  }, [prefill.email, prefill.phone]);

  const updateField = (field, value) => {
    if (field.startsWith('businessAddress.')) {
      const addressField = field.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        businessAddress: {
          ...prev.businessAddress,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    setErrors((prev) => {
      if (!prev[field]) return prev;
      const nextErrors = { ...prev };
      delete nextErrors[field];
      return nextErrors;
    });

    if (field === 'email') {
      setEmailVerified(false);
      setShowVerification(false);
      setEmailOtp(createEmptyOtp());
      setPhoneOtp(createEmptyOtp());
      setOtpErrors({ email: '', phone: '' });
    }

    if (field === 'phone') {
      setPhoneVerified(false);
      setShowVerification(false);
      setEmailOtp(createEmptyOtp());
      setPhoneOtp(createEmptyOtp());
      setOtpErrors({ email: '', phone: '' });
    }
  };

  const formatCnic = (value) => {
    let digits = String(value || '').replace(/\D/g, '').slice(0, 13);
    if (digits.length > 5) {
      digits = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    if (digits.length > 13) {
      digits = `${digits.slice(0, 13)}-${digits.slice(13)}`;
    }
    return digits;
  };

  const handleCnicChange = (value) => {
    setFormData((prev) => ({ ...prev, cnicNumber: formatCnic(value) }));
    setErrors((prev) => {
      if (!prev.cnicNumber) return prev;
      const nextErrors = { ...prev };
      delete nextErrors.cnicNumber;
      return nextErrors;
    });
  };

  const handleOtpChange = (kind, value, index) => {
    if (value && !/^\d$/.test(value)) return;

    const nextOtp = kind === 'email' ? [...emailOtp] : [...phoneOtp];
    nextOtp[index] = value;

    if (kind === 'email') {
      setEmailOtp(nextOtp);
      setOtpErrors((prev) => ({ ...prev, email: '' }));
    } else {
      setPhoneOtp(nextOtp);
      setOtpErrors((prev) => ({ ...prev, phone: '' }));
    }

    if (value && index < 5) {
      const refs = kind === 'email' ? emailOtpRefs : phoneOtpRefs;
      refs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (kind, event, index) => {
    const refs = kind === 'email' ? emailOtpRefs : phoneOtpRefs;
    const otp = kind === 'email' ? emailOtp : phoneOtp;

    if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const validatePersonalStep = () => {
    const nextErrors = {};

    if (!formData.name?.trim()) {
      nextErrors.name = 'Full name is required';
    }

    if (!formData.email?.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      nextErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone?.trim()) {
      nextErrors.phone = 'Mobile number is required';
    } else if (!/^03[0-9]{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      nextErrors.phone = 'Enter a valid 11-digit number (e.g. 03001234567)';
    }

    if (!formData.cnicNumber?.trim()) {
      nextErrors.cnicNumber = 'CNIC number is required';
    } else if (!/^\d{5}-\d{7}-\d{1}$/.test(formData.cnicNumber)) {
      nextErrors.cnicNumber = 'CNIC must be in format XXXXX-XXXXXXX-X';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateBusinessStep = () => {
    const nextErrors = {};

    if (!formData.businessName?.trim()) {
      nextErrors.businessName = 'Business name is required';
    }

    if (!formData.businessType) {
      nextErrors.businessType = 'Select your business type';
    }

    if (!formData.businessAddress.city?.trim()) {
      nextErrors['businessAddress.city'] = 'City is required';
    }

    if (!formData.accessoryCategory) {
      nextErrors.accessoryCategory = 'Select your primary product category';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateSecurityStep = () => {
    const nextErrors = {};
    const passwordValidation = validatePassword(formData.password);

    if (!passwordValidation.isValid) {
      nextErrors.password = passwordValidation.message;
    }

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.confirmPassword !== formData.password) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      nextErrors.agreeToTerms = 'You must agree to the terms';
    }

    if (!formData.agreeToVerification) {
      nextErrors.agreeToVerification = 'You must agree to the verification process';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const sendEmailOTP = async () => {
    try {
      setSendingEmailOTP(true);
      setOtpErrors((prev) => ({ ...prev, email: '' }));
      await sendVendorPreRegEmailOTP(formData.email.trim(), formData.name.trim());
      setEmailResendTimer(60);
    } catch (error) {
      const message = error?.message || 'Failed to send email OTP';
      setOtpErrors((prev) => ({ ...prev, email: message }));
      throw error;
    } finally {
      setSendingEmailOTP(false);
    }
  };

  const sendPhoneOTP = async () => {
    try {
      setSendingPhoneOTP(true);
      setOtpErrors((prev) => ({ ...prev, phone: '' }));
      await sendVendorPreRegPhoneOTP(formData.phone.trim(), formData.name.trim());
      setPhoneResendTimer(60);
    } catch (error) {
      const message = error?.message || 'Failed to send phone OTP';
      setOtpErrors((prev) => ({ ...prev, phone: message }));
      throw error;
    } finally {
      setSendingPhoneOTP(false);
    }
  };

  const verifyEmailOTP = async () => {
    const code = emailOtp.join('');
    if (code.length !== 6) {
      setOtpErrors((prev) => ({ ...prev, email: 'Enter the 6-digit email code' }));
      return;
    }

    try {
      setVerifyingEmailOTP(true);
      setOtpErrors((prev) => ({ ...prev, email: '' }));
      await verifyVendorPreRegEmailOTP(formData.email.trim(), code);
      setEmailVerified(true);
      Alert.alert('Email verified', 'Your email has been verified successfully.');
    } catch (error) {
      const message = error?.message || 'Invalid or expired email code';
      setOtpErrors((prev) => ({ ...prev, email: message }));
    } finally {
      setVerifyingEmailOTP(false);
    }
  };

  const verifyPhoneOTP = async () => {
    const code = phoneOtp.join('');
    if (code.length !== 6) {
      setOtpErrors((prev) => ({ ...prev, phone: 'Enter the 6-digit phone code' }));
      return;
    }

    try {
      setVerifyingPhoneOTP(true);
      setOtpErrors((prev) => ({ ...prev, phone: '' }));
      await verifyVendorPreRegPhoneOTP(formData.phone.trim(), code);
      setPhoneVerified(true);
      Alert.alert('Phone verified', 'Your phone number has been verified successfully.');
    } catch (error) {
      const message = error?.message || 'Invalid or expired phone code';
      setOtpErrors((prev) => ({ ...prev, phone: message }));
    } finally {
      setVerifyingPhoneOTP(false);
    }
  };

  const startContactVerification = async () => {
    if (!validatePersonalStep()) return;

    try {
      setLoading(true);
      const status = await syncPreRegVerificationState(formData.email, formData.phone, true);

      if (status?.bothVerified) {
        setShowVerification(false);
        setCurrentStep((value) => (value < 2 ? 2 : value));
        return;
      }

      setShowVerification(true);

      const otpRequests = [];

      if (!status?.emailVerified) {
        otpRequests.push(sendEmailOTP());
      }

      if (!status?.phoneVerified) {
        otpRequests.push(sendPhoneOTP());
      }

      await Promise.all(otpRequests);
    } catch (error) {
      Alert.alert('Verification failed', error?.message || 'Unable to send OTP codes');
    } finally {
      setLoading(false);
    }
  };

  const continueToBusinessStep = () => {
    if (!emailVerified || !phoneVerified) {
      Alert.alert('Verification required', 'Please verify both your email and phone number first.');
      return;
    }

    setShowVerification(false);
    setCurrentStep(2);
  };

  const goBackToPersonalInfo = () => {
    setShowVerification(false);
    setEmailOtp(createEmptyOtp());
    setPhoneOtp(createEmptyOtp());
    setOtpErrors({ email: '', phone: '' });
  };

  const handleSubmit = async () => {
    if (!validateSecurityStep()) return;

    if (!emailVerified || !phoneVerified) {
      Alert.alert('Verification required', 'Please complete email and phone verification first.');
      setCurrentStep(1);
      setShowVerification(true);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        cnicNumber: formData.cnicNumber.trim(),
        businessName: formData.businessName.trim(),
        businessType: formData.businessType,
        businessRegistrationNumber: formData.businessRegistrationNumber.trim() || undefined,
        yearsInBusiness: formData.yearsInBusiness || undefined,
        businessAddress: {
          ...formData.businessAddress,
          street: formData.businessAddress.street.trim(),
          city: formData.businessAddress.city.trim(),
          state: formData.businessAddress.state.trim(),
          zipCode: formData.businessAddress.zipCode.trim(),
        },
        accessoryCategory: formData.accessoryCategory,
        hasPhysicalStore: formData.hasPhysicalStore,
      };

      await registerVendor(payload);
      Alert.alert(
        'Vendor account created',
        'Your vendor account is ready. Complete identity verification from your dashboard to start selling.'
      );
    } catch (error) {
      const backendErrors = Array.isArray(error?.errors) ? error.errors : null;
      if (backendErrors?.length) {
        const nextErrors = {};
        backendErrors.forEach((item) => {
          if (item?.path) {
            nextErrors[item.path] = item.msg;
          }
        });

        if (Object.keys(nextErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...nextErrors }));
          return;
        }
      }

      if (error?.code === 'VERIFICATION_REQUIRED') {
        Alert.alert('Verification required', 'Please verify your email and phone number first.');
        setCurrentStep(1);
        setShowVerification(true);
        return;
      }

      Alert.alert('Registration failed', error?.message || 'Could not create your vendor account');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (showVerification) {
      goBackToPersonalInfo();
      return;
    }

    if (currentStep > 1) {
      setCurrentStep((value) => value - 1);
      return;
    }

    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('Landing');
  };

  const renderStepOne = () => {
    if (showVerification) {
      return (
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.sectionTitle}>Verify your contact</Text>
          </View>

          <Text style={styles.helperText}>
            We sent verification codes to your email and phone. Enter both codes to continue.
          </Text>

          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <View style={styles.verificationTitleRow}>
                <View style={styles.verificationIcon}>
                  <Ionicons name={emailVerified ? 'checkmark' : 'mail-outline'} size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.verificationTitle}>Email Verification</Text>
                  <Text style={styles.verificationSubtitle}>{formData.email}</Text>
                </View>
              </View>
              {emailVerified && <Text style={styles.verifiedBadge}>Verified</Text>}
            </View>

            {renderOtpBoxes({
              otp: emailOtp,
              onChange: (value, index) => handleOtpChange('email', value, index),
              onKeyPress: (event, index) => handleOtpKeyPress('email', event, index),
              refs: emailOtpRefs,
              disabled: verifyingEmailOTP || loading,
              error: !!otpErrors.email,
            })}

            {!!otpErrors.email && <Text style={styles.otpErrorText}>{otpErrors.email}</Text>}

            <View style={styles.verificationActions}>
              <TouchableOpacity
                onPress={sendEmailOTP}
                disabled={sendingEmailOTP || emailResendTimer > 0 || loading}
                style={styles.linkButton}
                activeOpacity={0.8}
              >
                <Text style={styles.linkButtonText}>
                  {sendingEmailOTP ? 'Sending...' : emailResendTimer > 0 ? `Resend in ${emailResendTimer}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>

              <Button
                title={verifyingEmailOTP ? 'Verifying...' : 'Verify Email'}
                onPress={verifyEmailOTP}
                loading={verifyingEmailOTP}
                disabled={emailVerified || loading}
                size="small"
              />
            </View>
          </View>

          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <View style={styles.verificationTitleRow}>
                <View style={[styles.verificationIcon, { backgroundColor: theme.colors.primary[500] }]}>
                  <Ionicons name={phoneVerified ? 'checkmark' : 'call-outline'} size={16} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.verificationTitle}>Phone Verification</Text>
                  <Text style={styles.verificationSubtitle}>{formData.phone}</Text>
                </View>
              </View>
              {phoneVerified && <Text style={styles.verifiedBadge}>Verified</Text>}
            </View>

            {renderOtpBoxes({
              otp: phoneOtp,
              onChange: (value, index) => handleOtpChange('phone', value, index),
              onKeyPress: (event, index) => handleOtpKeyPress('phone', event, index),
              refs: phoneOtpRefs,
              disabled: verifyingPhoneOTP || loading,
              error: !!otpErrors.phone,
            })}

            {!!otpErrors.phone && <Text style={styles.otpErrorText}>{otpErrors.phone}</Text>}

            <View style={styles.verificationActions}>
              <TouchableOpacity
                onPress={sendPhoneOTP}
                disabled={sendingPhoneOTP || phoneResendTimer > 0 || loading}
                style={styles.linkButton}
                activeOpacity={0.8}
              >
                <Text style={styles.linkButtonText}>
                  {sendingPhoneOTP ? 'Sending...' : phoneResendTimer > 0 ? `Resend in ${phoneResendTimer}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>

              <Button
                title={verifyingPhoneOTP ? 'Verifying...' : 'Verify Phone'}
                onPress={verifyPhoneOTP}
                loading={verifyingPhoneOTP}
                disabled={phoneVerified || loading}
                size="small"
              />
            </View>
          </View>

          <View style={[styles.verificationFooter, isCompactLayout && styles.stackedActions]}>
            <Button
              title="Edit Details"
              onPress={goBackToPersonalInfo}
              variant="secondary"
              size="small"
              style={[styles.footerButton, isCompactLayout && styles.fullWidthButton]}
            />
            <Button
              title="Continue to Business Details"
              onPress={continueToBusinessStep}
              disabled={!emailVerified || !phoneVerified}
              size="small"
              style={[styles.footerButton, isCompactLayout && styles.fullWidthButton]}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-outline" size={20} color={theme.colors.primary[500]} />
          <Text style={styles.sectionTitle}>Personal information</Text>
        </View>

        <Input
          label="Full Name (As per CNIC)"
          value={formData.name}
          onChangeText={(value) => updateField('name', value)}
          placeholder="Muhammad Ahmed Khan"
          error={errors.name}
          style={styles.inputSpacing}
        />

        <Input
          label="CNIC Number"
          value={formData.cnicNumber}
          onChangeText={handleCnicChange}
          placeholder="35201-1234567-9"
          error={errors.cnicNumber}
          style={styles.inputSpacing}
        />

        <Input
          label="Mobile Number"
          value={formData.phone}
          onChangeText={(value) => updateField('phone', value.replace(/[^\d]/g, '').slice(0, 11))}
          placeholder="03001234567"
          keyboardType="number-pad"
          maxLength={11}
          error={errors.phone}
          style={styles.inputSpacing}
        />

        <Input
          label="Business Email"
          value={formData.email}
          onChangeText={(value) => updateField('email', value)}
          placeholder="your.business@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
          style={styles.inputSpacing}
        />

        <Button
          title={loading ? 'Checking verification...' : emailVerified && phoneVerified ? 'Continue to Business Details' : 'Continue to verification'}
          onPress={startContactVerification}
          loading={loading}
          style={styles.primaryButton}
        />
      </View>
    );
  };

  const renderStepTwo = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Ionicons name="business-outline" size={20} color={theme.colors.primary[500]} />
        <Text style={styles.sectionTitle}>Business details</Text>
      </View>

      <Input
        label="Business / Shop Name"
        value={formData.businessName}
        onChangeText={(value) => updateField('businessName', value)}
        placeholder="AutoSphere Accessories"
        error={errors.businessName}
        style={styles.inputSpacing}
      />

      <Text style={styles.pickerLabel}>Business Type</Text>
      <View style={styles.chipGrid}>
        {BUSINESS_TYPES.map((item) => {
          const selected = formData.businessType === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => updateField('businessType', item.value)}
              style={[styles.chip, selected && styles.chipSelected]}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!errors.businessType && <Text style={styles.errorText}>{errors.businessType}</Text>}

      <Input
        label="NTN Number (Optional)"
        value={formData.businessRegistrationNumber}
        onChangeText={(value) => updateField('businessRegistrationNumber', value)}
        placeholder="e.g. 1234567-8"
        style={styles.inputSpacing}
      />

      <Text style={styles.pickerLabel}>Years in Business (Optional)</Text>
      <View style={styles.chipGrid}>
        {YEARS_IN_BUSINESS.map((item) => {
          const selected = formData.yearsInBusiness === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => updateField('yearsInBusiness', selected ? '' : item.value)}
              style={[styles.chip, selected && styles.chipSelected]}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Input
        label="Street Address"
        value={formData.businessAddress.street}
        onChangeText={(value) => updateField('businessAddress.street', value)}
        placeholder="Shop / office address"
        style={styles.inputSpacing}
      />

      <Input
        label="City"
        value={formData.businessAddress.city}
        onChangeText={(value) => updateField('businessAddress.city', value)}
        placeholder="Lahore"
        error={errors['businessAddress.city']}
        style={styles.inputSpacing}
      />

      <View style={styles.rowGap}>
        <View style={styles.halfWidth}>
          <Input
            label="State / Province"
            value={formData.businessAddress.state}
            onChangeText={(value) => updateField('businessAddress.state', value)}
            placeholder="Punjab"
            style={styles.inputSpacing}
          />
        </View>
        <View style={styles.halfWidth}>
          <Input
            label="Zip Code"
            value={formData.businessAddress.zipCode}
            onChangeText={(value) => updateField('businessAddress.zipCode', value)}
            placeholder="54000"
            keyboardType="number-pad"
            style={styles.inputSpacing}
          />
        </View>
      </View>

      <Text style={styles.pickerLabel}>Accessory Category</Text>
      <View style={styles.chipGrid}>
        {ACCESSORY_CATEGORIES.map((item) => {
          const selected = formData.accessoryCategory === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => updateField('accessoryCategory', item)}
              style={[styles.chip, selected && styles.chipSelected]}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!errors.accessoryCategory && <Text style={styles.errorText}>{errors.accessoryCategory}</Text>}

      <Text style={styles.pickerLabel}>Physical Store</Text>
      <View style={styles.choiceRow}>
        <TouchableOpacity
          onPress={() => updateField('hasPhysicalStore', true)}
          style={[styles.choiceButton, formData.hasPhysicalStore && styles.choiceButtonActive]}
          activeOpacity={0.85}
        >
          <Text style={[styles.choiceButtonText, formData.hasPhysicalStore && styles.choiceButtonTextActive]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => updateField('hasPhysicalStore', false)}
          style={[styles.choiceButton, !formData.hasPhysicalStore && styles.choiceButtonActive]}
          activeOpacity={0.85}
        >
          <Text style={[styles.choiceButtonText, !formData.hasPhysicalStore && styles.choiceButtonTextActive]}>
            No
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.navigationRow, isCompactLayout && styles.stackedActions]}>
        <Button title="Back" onPress={() => setCurrentStep(1)} variant="secondary" size="small" style={[styles.navButton, isCompactLayout && styles.fullWidthButton]} />
        <Button title="Continue" onPress={() => {
          if (validateBusinessStep()) {
            setCurrentStep(3);
          }
        }} size="small" style={[styles.navButton, isCompactLayout && styles.fullWidthButton]} />
      </View>
    </View>
  );

  const renderStepThree = () => (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary[500]} />
        <Text style={styles.sectionTitle}>Security and consent</Text>
      </View>

      <Input
        label="Password"
        value={formData.password}
        onChangeText={(value) => updateField('password', value)}
        placeholder="Create a strong password"
        secureTextEntry={!showPassword}
        error={errors.password}
        style={styles.inputSpacing}
        rightIcon={
          <TouchableOpacity
            onPress={() => setShowPassword((value) => !value)}
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
            onPress={() => setShowConfirmPassword((value) => !value)}
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

      <TouchableOpacity
        onPress={() => updateField('agreeToTerms', !formData.agreeToTerms)}
        style={styles.checkboxRow}
        activeOpacity={0.8}
      >
        <Ionicons
          name={formData.agreeToTerms ? 'checkbox' : 'square-outline'}
          size={20}
          color={formData.agreeToTerms ? theme.colors.primary[500] : theme.colors.text.tertiary}
        />
        <Text style={styles.checkboxText}>I agree to the Terms and Conditions</Text>
      </TouchableOpacity>
      {!!errors.agreeToTerms && <Text style={styles.errorText}>{errors.agreeToTerms}</Text>}

      <TouchableOpacity
        onPress={() => updateField('agreeToVerification', !formData.agreeToVerification)}
        style={styles.checkboxRow}
        activeOpacity={0.8}
      >
        <Ionicons
          name={formData.agreeToVerification ? 'checkbox' : 'square-outline'}
          size={20}
          color={formData.agreeToVerification ? theme.colors.primary[500] : theme.colors.text.tertiary}
        />
        <Text style={styles.checkboxText}>I understand my vendor account will be verified</Text>
      </TouchableOpacity>
      {!!errors.agreeToVerification && <Text style={styles.errorText}>{errors.agreeToVerification}</Text>}

      <View style={[styles.navigationRow, isCompactLayout && styles.stackedActions]}>
        <Button title="Back" onPress={() => setCurrentStep(2)} variant="secondary" size="small" style={[styles.navButton, isCompactLayout && styles.fullWidthButton]} />
        <Button title="Create Vendor Account" onPress={handleSubmit} loading={loading} size="small" style={[styles.navButton, isCompactLayout && styles.fullWidthButton]} />
      </View>
    </View>
  );

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
              style={[styles.backButton, { top: insets.top + theme.spacing.md, left: theme.spacing.lg }]}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={18} color={theme.colors.text.primary} />
            </TouchableOpacity>

            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="storefront-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroKicker}>Vendor onboarding</Text>
                <Text style={styles.heroTitle}>Become a vendor</Text>
                <Text style={styles.heroSubtitle}>Complete verification and set up your AutoSphere store</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.stepRow}>
              {[
                { step: 1, label: 'Info' },
                { step: 2, label: 'Business' },
                { step: 3, label: 'Security' },
              ].map((item, index) => {
                const active = currentStep === item.step;
                const completed = currentStep > item.step;
                return (
                  <React.Fragment key={item.step}>
                    <View style={styles.stepItem}>
                      <View style={[styles.stepCircle, active && styles.stepCircleActive, completed && styles.stepCircleCompleted]}>
                        <Text style={[styles.stepNumber, (active || completed) && styles.stepNumberActive]}>
                          {completed ? '✓' : item.step}
                        </Text>
                      </View>
                      <Text style={[styles.stepLabel, active && styles.stepLabelActive, completed && styles.stepLabelCompleted]}>
                        {item.label}
                      </Text>
                    </View>
                    {index < 2 && <View style={[styles.stepConnector, currentStep > item.step && styles.stepConnectorActive]} />}
                  </React.Fragment>
                );
              })}
            </View>

            {currentStep === 1 && renderStepOne()}
            {currentStep === 2 && renderStepTwo()}
            {currentStep === 3 && renderStepThree()}
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.secondary[800],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  stepCircleCompleted: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  stepNumber: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLabel: {
    marginTop: 6,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  stepLabelActive: {
    color: theme.colors.text.primary,
  },
  stepLabelCompleted: {
    color: theme.colors.success,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.secondary[800],
    marginHorizontal: theme.spacing.sm,
    marginBottom: 10,
  },
  stepConnectorActive: {
    backgroundColor: theme.colors.success,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    ...theme.shadows.soft,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  helperText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  inputSpacing: {
    marginBottom: theme.spacing.md,
  },
  primaryButton: {
    marginTop: theme.spacing.xs,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    marginTop: -theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    fontWeight: theme.typography.fontWeight.medium,
  },
  pickerLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  chip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  chipSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  chipText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  rowGap: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  choiceButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    alignItems: 'center',
  },
  choiceButtonActive: {
    backgroundColor: 'rgba(185, 28, 28, 0.18)',
    borderColor: theme.colors.primary[500],
  },
  choiceButtonText: {
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  choiceButtonTextActive: {
    color: theme.colors.text.primary,
  },
  navigationRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  navButton: {
    flex: 1,
  },
  fullWidthButton: {
    width: '100%',
  },
  stackedActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  verificationCard: {
    backgroundColor: theme.colors.secondary[900],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    marginBottom: theme.spacing.md,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  verificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  verificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
  },
  verificationTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  verificationSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  verifiedBadge: {
    color: theme.colors.success,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
  },
  otpInput: {
    flex: 1,
    minWidth: 40,
    height: 52,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  otpInputError: {
    borderColor: theme.colors.error,
  },
  otpErrorText: {
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing.sm,
  },
  verificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  linkButton: {
    flex: 1,
  },
  linkButtonText: {
    color: theme.colors.primary[300],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  verificationFooter: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  checkboxText: {
    flex: 1,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 20,
  },
});

export default VendorRegisterScreen;
