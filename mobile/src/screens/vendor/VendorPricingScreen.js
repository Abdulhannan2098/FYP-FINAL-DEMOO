import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../../styles/theme';
import {
  VENDOR_PRICING_PLANS,
  WHY_CHOOSE_AUTOSPHERE_TEXT,
} from '../../utils/vendorPricingPlans';

const formatMonthlyPrice = (value) => `Rs ${value}`;

const VendorPricingScreen = ({ navigation }) => {
  console.log('Pricing Screen Loaded');

  const handlePlanCtaPress = () => null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Pricing</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Why Choose Autosphere</Text>
          <Text style={styles.sectionBody}>{WHY_CHOOSE_AUTOSPHERE_TEXT}</Text>
        </View>

        <View style={styles.cardsContainer}>
          {VENDOR_PRICING_PLANS.map((plan) => {
            const cardStyles = [
              styles.planCard,
              plan.highlight && styles.highlightedPlanCard,
            ];

            const ctaStyles = [
              styles.ctaButton,
              plan.ctaVariant === 'primary'
                ? styles.ctaButtonPrimary
                : styles.ctaButtonSecondary,
            ];

            const ctaTextStyles = [
              styles.ctaButtonText,
              plan.ctaVariant === 'primary'
                ? styles.ctaButtonTextPrimary
                : styles.ctaButtonTextSecondary,
            ];

            return (
              <View key={plan.id} style={cardStyles}>
                <View style={styles.planHeaderRow}>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planSubLabel}>Vendor subscription</Text>
                  </View>
                  {plan.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.priceWrap}>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatMonthlyPrice(plan.monthlyPrice)}</Text>
                    <Text style={styles.priceSuffix}>/ month</Text>
                  </View>
                  {(plan.priceLabel || plan.cadence) ? (
                    <Text style={styles.priceMeta}>
                      {[plan.priceLabel, plan.cadence].filter(Boolean).join(' ')}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.featuresList}>
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <View style={styles.featureBullet} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity activeOpacity={0.88} style={ctaStyles} onPress={handlePlanCtaPress}>
                  <Text style={ctaTextStyles}>{plan.ctaLabel}</Text>
                </TouchableOpacity>

                {plan.highlight ? (
                  <Text style={styles.recommendedText}>
                    Recommended for vendors who want AR previews without going all-in.
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
    backgroundColor: theme.colors.secondary[900],
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['4xl'],
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  sectionHeading: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  sectionBody: {
    width: '100%',
    fontSize: theme.typography.fontSize.base,
    lineHeight: 24,
    color: theme.colors.text.secondary,
  },
  cardsContainer: {
    gap: theme.spacing.md,
  },
  planCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    ...theme.shadows.medium,
  },
  highlightedPlanCard: {
    borderColor: 'rgba(185, 28, 28, 0.6)',
    borderWidth: 2,
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  planName: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  planSubLabel: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  badge: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.55)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.warning,
    textTransform: 'uppercase',
  },
  priceWrap: {
    marginBottom: theme.spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  price: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  priceSuffix: {
    marginBottom: 5,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  priceMeta: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  featuresList: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[500],
    marginTop: 6,
    marginRight: theme.spacing.sm,
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 20,
    color: theme.colors.text.secondary,
  },
  ctaButton: {
    minHeight: 48,
    borderRadius: theme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  ctaButtonPrimary: {
    backgroundColor: theme.colors.primary[500],
    ...theme.shadows.soft,
  },
  ctaButtonSecondary: {
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  ctaButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  ctaButtonTextPrimary: {
    color: '#FFFFFF',
  },
  ctaButtonTextSecondary: {
    color: theme.colors.text.primary,
  },
  recommendedText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    lineHeight: 18,
  },
});

export default VendorPricingScreen;
