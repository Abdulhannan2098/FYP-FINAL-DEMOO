import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import theme from '../../styles/theme';
import { useAuth } from '../../context/AuthContext';
import { vendorService } from '../../api/vendorService';

// ─── Verification Timeline ────────────────────────────────────────────────────

const VerificationTimeline = ({ cnicDone = false }) => {
  const steps = [
    { label: 'Email Verified', done: true },
    { label: 'Phone Verified', done: true },
    { label: 'CNIC Verification', done: cnicDone, active: !cnicDone },
  ];

  return (
    <View style={styles.timeline}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.label}>
          <View style={styles.timelineStep}>
            <View
              style={[
                styles.timelineDot,
                step.done && styles.timelineDotDone,
                step.active && styles.timelineDotActive,
              ]}
            >
              {step.done ? (
                <Ionicons name="checkmark" size={13} color="#fff" />
              ) : step.active ? (
                <View style={styles.timelineDotInner} />
              ) : null}
            </View>
            <Text
              style={[
                styles.timelineLabel,
                step.done && styles.timelineLabelDone,
                step.active && styles.timelineLabelActive,
              ]}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </View>
          {idx < steps.length - 1 && (
            <View
              style={[
                styles.timelineConnector,
                step.done && styles.timelineConnectorDone,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

// ─── Document Upload Card ─────────────────────────────────────────────────────

const DocumentCard = ({ label, icon, asset, onPress }) => (
  <TouchableOpacity style={styles.docCard} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.docHeader}>
      <View style={styles.docIconWrap}>
        <Ionicons name={icon} size={16} color={theme.colors.primary[500]} />
      </View>
      <Text style={styles.docLabel}>{label}</Text>
    </View>

    {asset?.uri ? (
      <>
        <Image source={{ uri: asset.uri }} style={styles.docPreview} resizeMode="cover" />
        <View style={styles.docReuploadBadge}>
          <Ionicons name="refresh-outline" size={12} color={theme.colors.text.tertiary} />
          <Text style={styles.docReuploadText}>Tap to change</Text>
        </View>
      </>
    ) : (
      <View style={styles.docPlaceholder}>
        <Ionicons name="cloud-upload-outline" size={28} color={theme.colors.text.tertiary} />
        <Text style={styles.docPlaceholderText}>Tap to upload</Text>
      </View>
    )}
  </TouchableOpacity>
);

// Format a raw 13-digit CNIC string (or already-formatted) for display
const formatCnicDisplay = (raw) => {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 13) return raw;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const VendorVerificationScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, refreshUser, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  // 'success' | 'failure' | null
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationData, setVerificationData] = useState(null);

  const vendorStatus = statusData?.vendorStatus || user?.vendorStatus || 'unverified';
  const isVerified = vendorStatus === 'verified';
  const isRejected = vendorStatus === 'rejected';

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getVerificationStatus();
      setStatusData(response?.data?.data || null);
    } catch (err) {
      console.error('Failed to load verification status:', err);
    } finally {
      setLoading(false);
    }
  };

  // Convert any image (including HEIC/HEIF on iOS) to a JPEG suitable for OCR.
  // 1600 px wide at 0.88 quality (~350-500 KB) gives Tesseract enough resolution
  // to read the small digit rows on a Pakistani CNIC card reliably.
  // The previous 800 px / 0.72 setting introduced heavy JPEG blocking artifacts
  // that pushed Tesseract confidence below the extraction threshold.
  const toJpegPayload = async (asset, fieldName) => {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1600 } }],
        { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
      );
      return {
        uri: manipulated.uri,
        name: `${fieldName}.jpg`,
        type: 'image/jpeg',
      };
    } catch {
      return {
        uri: asset.uri,
        name: `${fieldName}.jpg`,
        type: 'image/jpeg',
      };
    }
  };

  const pickImage = async (target) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera roll access is needed to upload CNIC images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType
        ? [ImagePicker.MediaType.IMAGE]
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (target === 'front') setFrontImage(asset);
    else setBackImage(asset);
  };

  const handleSubmit = async () => {
    if (!frontImage || !backImage) {
      Alert.alert('Missing images', 'Please upload both CNIC front and back images.');
      return;
    }

    try {
      setProcessing(true);

      // Step 1: Convert both images to JPEG (handles HEIC/HEIF and oversized files)
      const [frontPayload, backPayload] = await Promise.all([
        toJpegPayload(frontImage, 'cnic-front'),
        toJpegPayload(backImage, 'cnic-back'),
      ]);

      // Step 2: Upload CNIC images
      await vendorService.uploadCnic(frontPayload, backPayload);

      // Step 3: Trigger OCR + matching
      const response = await vendorService.processVerification();
      const data = response?.data?.data || {};

      if (data.status === 'verified') {
        const step1 = data.steps?.find((s) => s.step === 1);
        setVerificationData({
          type: 'success',
          extractedName: step1?.data?.extractedName || user?.name || 'N/A',
          // Prefer formatted (with dashes); fall back to raw digits
          extractedCnic:
            step1?.data?.extractedCNICFormatted ||
            step1?.data?.extractedCNIC ||
            'N/A',
          stepsPassed: data.stepsPassed ?? 3,
          totalSteps: data.totalSteps ?? 3,
        });
        setVerificationResult('success');
      } else {
        // Failure — build comparison data
        const step1 = data.steps?.find((s) => s.step === 1);
        const step3 = data.steps?.find((s) => s.step === 3);

        // Build a user-friendly reason rather than raw step names
        const buildReason = () => {
          const extractionFailed = step1?.status === 'failed';
          const nameFailed = data.steps?.find((s) => s.step === 2)?.status === 'failed';
          const cnicFailed = step3?.status === 'failed';

          if (extractionFailed && !step1?.data?.extractedName && !step1?.data?.extractedCNIC) {
            return 'OCR could not read the uploaded CNIC. Please upload a clearer, well-lit photo.';
          }
          if (extractionFailed && step1?.data?.extractedName && !step1?.data?.extractedCNIC) {
            return 'CNIC number could not be extracted from the image. Ensure the number is fully visible.';
          }
          if (nameFailed && cnicFailed) {
            return 'Neither the name nor CNIC number on the card match your registration details.';
          }
          if (nameFailed) {
            return 'The name on the CNIC does not match your registered name.';
          }
          if (cnicFailed) {
            return 'The CNIC number on the card does not match the number you registered with.';
          }
          return 'The details on the CNIC do not match your registration information.';
        };

        setVerificationData({
          type: 'failure',
          enteredName: user?.name || 'N/A',
          extractedName: step1?.data?.extractedName || 'Could not extract',
          // Prefer status API (formatted), then auth context raw field, then fallback
          enteredCnic:
            statusData?.registeredCnic ||
            formatCnicDisplay(user?.cnicNumber) ||
            'Not registered',
          // Prefer formatted extracted; fall back to raw; if absent say extraction failed
          extractedCnic:
            step1?.data?.extractedCNICFormatted ||
            step1?.data?.extractedCNIC ||
            'Could not extract',
          reason: buildReason(),
        });
        setVerificationResult('failure');
      }
    } catch (err) {
      let message = 'Verification failed. Please try again.';
      if (!err?.message) {
        message = 'Network issue detected. Please check your connection.';
      } else if (err.message.toLowerCase().includes('image')) {
        message = 'Unable to process the uploaded images. Please upload clear CNIC photos.';
      } else {
        message = err.message;
      }
      Alert.alert('Verification Failed', message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRetry = async () => {
    try {
      setProcessing(true);
      await vendorService.retryVerification();
    } catch (err) {
      Alert.alert('Retry failed', err.message || 'Unable to reset. Please try again.');
      return;
    } finally {
      setProcessing(false);
    }
    // Reset local state after retry API call succeeds
    setFrontImage(null);
    setBackImage(null);
    setVerificationResult(null);
    setVerificationData(null);
    await loadStatus();
  };

  const handleContinueToDashboard = async () => {
    setVerificationResult(null);
    setVerificationData(null);
    await refreshUser();
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
      </SafeAreaView>
    );
  }

  // ── Processing overlay ───────────────────────────────────────────────────

  if (processing) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        <Text style={styles.processingTitle}>Verifying your identity...</Text>
        <Text style={styles.processingSubtitle}>Please wait. This may take a moment.</Text>
      </SafeAreaView>
    );
  }

  // ── Already verified ─────────────────────────────────────────────────────

  if (isVerified && !verificationResult) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <VerificationTimeline cnicDone />
          <View style={styles.resultHero}>
            <View style={[styles.resultIconWrap, { backgroundColor: `${theme.colors.success}18` }]}>
              <Ionicons name="checkmark-circle" size={52} color={theme.colors.success} />
            </View>
            <Text style={styles.resultTitle}>Account Verified</Text>
            <Text style={styles.resultSubtitle}>Your vendor account is fully verified and active.</Text>
          </View>
          <Button title="Refresh Status" onPress={refreshUser} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Success hold screen ──────────────────────────────────────────────────

  if (verificationResult === 'success') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <VerificationTimeline cnicDone />

          <View style={styles.resultHero}>
            <View style={[styles.resultIconWrap, { backgroundColor: `${theme.colors.success}18` }]}>
              <Ionicons name="checkmark-circle" size={52} color={theme.colors.success} />
            </View>
            <Text style={styles.resultTitle}>Verification Successful</Text>
            <Text style={styles.resultSubtitle}>
              Your identity has been successfully verified. Review the extracted details below.
            </Text>
          </View>

          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>EXTRACTED NAME</Text>
              <Text style={styles.resultValue}>{verificationData?.extractedName}</Text>
            </View>
            <View style={[styles.resultRow, styles.resultRowLast]}>
              <Text style={styles.resultLabel}>EXTRACTED CNIC</Text>
              <Text style={styles.resultValue}>{verificationData?.extractedCnic}</Text>
            </View>
          </View>

          <View style={styles.matchBadge}>
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.success} />
            <Text style={styles.matchBadgeText}>
              Match Status:{' '}
              {verificationData?.stepsPassed}/{verificationData?.totalSteps} steps passed
            </Text>
          </View>

          <Button
            title="Continue to Dashboard"
            onPress={handleContinueToDashboard}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Failure hold screen ──────────────────────────────────────────────────

  if (verificationResult === 'failure') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <VerificationTimeline cnicDone={false} />

          <View style={styles.resultHero}>
            <View style={[styles.resultIconWrap, { backgroundColor: `${theme.colors.error}18` }]}>
              <Ionicons name="close-circle" size={52} color={theme.colors.error} />
            </View>
            <Text style={[styles.resultTitle, { color: theme.colors.error }]}>Verification Failed</Text>
            <Text style={styles.resultSubtitle}>
              The details on your CNIC do not match your registration information. Please review below and try again.
            </Text>
          </View>

          <View style={styles.comparisonCard}>
            <Text style={styles.comparisonHeader}>Name Comparison</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonColLabel}>Entered</Text>
                <Text style={styles.comparisonColValue} numberOfLines={2}>
                  {verificationData?.enteredName}
                </Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={theme.colors.text.tertiary}
                style={{ marginTop: 18 }}
              />
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonColLabel}>Extracted</Text>
                <Text style={styles.comparisonColValue} numberOfLines={2}>
                  {verificationData?.extractedName}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.comparisonHeader}>CNIC Comparison</Text>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonColLabel}>Entered</Text>
                <Text style={styles.comparisonColValue} numberOfLines={2}>
                  {verificationData?.enteredCnic}
                </Text>
              </View>
              <Ionicons
                name="arrow-forward"
                size={16}
                color={theme.colors.text.tertiary}
                style={{ marginTop: 18 }}
              />
              <View style={styles.comparisonCol}>
                <Text style={styles.comparisonColLabel}>Extracted</Text>
                <Text style={styles.comparisonColValue} numberOfLines={2}>
                  {verificationData?.extractedCnic}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.reasonBadge}>
            <Ionicons name="information-circle-outline" size={16} color={theme.colors.error} />
            <Text style={styles.reasonText}>Reason: {verificationData?.reason}</Text>
          </View>

          <Button title="Try Again" onPress={handleRetry} loading={processing} />
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Main upload UI ───────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <VerificationTimeline cnicDone={false} />

        {isRejected && (
          <View style={styles.rejectedBanner}>
            <Ionicons name="warning-outline" size={18} color={theme.colors.error} />
            <Text style={styles.rejectedBannerText}>
              Previous verification failed. Upload fresh CNIC images to try again.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Your CNIC</Text>
          <Text style={styles.sectionSubtitle}>
            Upload clear, well-lit photos of both sides of your National Identity Card.
          </Text>

          <View style={styles.uploadGrid}>
            <DocumentCard
              label="Front Side"
              icon="id-card-outline"
              asset={frontImage}
              onPress={() => pickImage('front')}
            />
            <DocumentCard
              label="Back Side"
              icon="card-outline"
              asset={backImage}
              onPress={() => pickImage('back')}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Upload & Verify"
            onPress={handleSubmit}
            disabled={!frontImage || !backImage}
          />
          <Button
            title="Check Pricing Plans"
            onPress={() => navigation.navigate('VendorPricing')}
            variant="secondary"
            style={{ marginTop: 12 }}
          />
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
    padding: theme.spacing.xl,
  },
  content: {
    padding: theme.spacing.lg,
  },

  // ── Processing ─────────────────────────────────────────────────────────────
  processingTitle: {
    marginTop: theme.spacing.xl,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  processingSubtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },

  // ── Timeline ───────────────────────────────────────────────────────────────
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  timelineStep: {
    alignItems: 'center',
    flexShrink: 0,
    maxWidth: 80,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 1.5,
    borderColor: theme.colors.secondary[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  timelineDotActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  timelineLabel: {
    marginTop: 6,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
    textAlign: 'center',
  },
  timelineLabelDone: {
    color: theme.colors.success,
  },
  timelineLabelActive: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  timelineConnector: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.secondary[800],
    marginHorizontal: 4,
    marginBottom: 10,
  },
  timelineConnectorDone: {
    backgroundColor: theme.colors.success,
  },

  // ── Section ────────────────────────────────────────────────────────────────
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
    marginBottom: theme.spacing.lg,
  },

  // ── Document cards ─────────────────────────────────────────────────────────
  uploadGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  docCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    overflow: 'hidden',
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  docIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: `${theme.colors.primary[500]}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  docPreview: {
    width: '100%',
    height: 150,
    backgroundColor: theme.colors.secondary[800],
  },
  docReuploadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: theme.spacing.sm,
  },
  docReuploadText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  docPlaceholder: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondary[900],
    gap: theme.spacing.sm,
  },
  docPlaceholderText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },

  // ── Actions ────────────────────────────────────────────────────────────────
  actions: {
    gap: 0,
  },

  // ── Rejected banner ────────────────────────────────────────────────────────
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: `${theme.colors.error}12`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.error}30`,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  rejectedBannerText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    lineHeight: 20,
  },

  // ── Result screens shared ──────────────────────────────────────────────────
  resultHero: {
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  resultIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  resultTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  resultSubtitle: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: theme.spacing.sm,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
  },
  resultRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  resultRowLast: {
    borderBottomWidth: 0,
  },
  resultLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: theme.spacing.xs,
  },
  resultValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },

  // ── Match badge ────────────────────────────────────────────────────────────
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: `${theme.colors.success}15`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.success}35`,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  matchBadgeText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.success,
  },

  // ── Comparison card (failure) ──────────────────────────────────────────────
  comparisonCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  comparisonHeader: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  comparisonCol: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
  },
  comparisonColLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  comparisonColValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.secondary[800],
    marginVertical: theme.spacing.md,
  },

  // ── Reason badge ───────────────────────────────────────────────────────────
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: `${theme.colors.error}10`,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.error}28`,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  reasonText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    lineHeight: 20,
  },
});

export default VendorVerificationScreen;
