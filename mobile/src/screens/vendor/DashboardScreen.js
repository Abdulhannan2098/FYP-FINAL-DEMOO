import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { productService } from '../../api/productService';
import { orderService } from '../../api/orderService';
import Loading from '../../components/Loading';
import { formatPrice } from '../../utils/formatters';
import { getDisplayOrderNumber } from '../../utils/orderNumber';
import theme from '../../styles/theme';
import { getUserAvatarUri, getUserInitial } from '../../utils/userAvatar';
import { useAuth } from '../../context/AuthContext';

const DashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    revenue: 0,
  });
  const [productStatus, setProductStatus] = useState({ live: 0, pending: 0, rejected: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      let totalProducts = 0;
      let totalOrders = 0;
      let pendingOrders = 0;
      let completedOrders = 0;
      let revenue = 0;
      let live = 0;
      let pending = 0;
      let rejected = 0;
      let recent = [];

      // Fetch products separately with error handling
      try {
        const productsResponse = await productService.getVendorProducts();
        if (productsResponse.success && productsResponse.data) {
          const products = productsResponse.data;
          totalProducts = products.length;

          products.forEach((p) => {
            const raw = (p?.approvalStatus ?? '').toString().trim().toLowerCase();
            if (raw === 'rejected') {
              rejected += 1;
              return;
            }
            if (raw === 'approved' || p?.isApproved === true) {
              live += 1;
              return;
            }
            pending += 1;
          });
        }
      } catch (productError) {
        console.error('Error fetching vendor products:', productError);
        // Continue with other data even if products fail
      }

      // Fetch orders separately with error handling
      try {
        const ordersResponse = await orderService.getVendorOrders();
        if (ordersResponse.success && ordersResponse.data) {
          const orders = ordersResponse.data;
          totalOrders = orders.length;

          recent = orders.slice(0, 4);

          orders.forEach(order => {
            if (order.status === 'Pending Vendor Action') {
              pendingOrders++;
            }
            if (order.status === 'Completed') {
              completedOrders++;
              revenue += order.totalAmount || 0;
            }
          });
        }
      } catch (orderError) {
        console.error('Error fetching vendor orders:', orderError);
        // Continue with other data even if orders fail
      }

      setStats({
        totalProducts,
        totalOrders,
        pendingOrders,
        completedOrders,
        revenue,
      });

      setProductStatus({ live, pending, rejected });
      setRecentOrders(recent);
      setLastUpdatedAt(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const navigateTab = (tabName, params) => {
    const parent = navigation.getParent?.();
    (parent ?? navigation).navigate(tabName, params);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const initials = (name) => {
    const n = String(name || '').trim();
    if (!n) return 'V';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const KpiCard = ({ title, value, icon, tone = 'neutral', onPress }) => (
    <TouchableOpacity
      style={[styles.kpiCard, styles[`kpiCard_${tone}`]]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      <View style={styles.kpiTopRow}>
        <View style={[styles.kpiIcon, styles[`kpiIcon_${tone}`]]}>
          <Ionicons name={icon} size={18} color={styles[`kpiIconText_${tone}`].color} />
        </View>
        {onPress ? (
          <Ionicons name="chevron-forward" size={16} color={theme.colors.text.tertiary} />
        ) : (
          <View style={{ width: 16, height: 16 }} />
        )}
      </View>
      <Text
        style={styles.kpiValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        {value}
      </Text>
      <Text style={styles.kpiTitle} numberOfLines={1}>{title}</Text>
    </TouchableOpacity>
  );

  const RecentOrderRow = ({ order }) => {
    const orderNo = getDisplayOrderNumber(order);
    const status = order?.status || 'Pending';
    const amount = formatPrice(order?.totalAmount || 0);
    const date = order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : '';
    return (
      <View style={styles.recentRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.recentTitle} numberOfLines={1}>Order #{orderNo}</Text>
          <Text style={styles.recentMeta} numberOfLines={1}>{date}</Text>
        </View>
        <View style={styles.recentRight}>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText} numberOfLines={1}>{status}</Text>
          </View>
          <Text style={styles.recentAmount} numberOfLines={1}>{amount}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading />;
  }

  const fulfillmentRate = stats.totalOrders > 0 ? Math.round((stats.completedOrders / stats.totalOrders) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['rgba(185, 28, 28, 0.35)', 'rgba(23, 23, 23, 0.0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: theme.spacing.md }]}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>{getGreeting()}</Text>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {user?.name ? user.name : 'Vendor'}
                </Text>
                {user?.vendorStatus === 'verified' && (
                  <View style={styles.verifiedSmallBadge}>
                    <Ionicons name="checkmark-circle-sharp" size={16} color="#10B981" />
                  </View>
                )}
              </View>
              <Text style={styles.heroSubtitle} numberOfLines={1}>
                Track orders, products, and performance
              </Text>
            </View>
            <View style={styles.avatar}>
              {getUserAvatarUri(user) ? (
                <Image
                  key={getUserAvatarUri(user)}
                  source={{ uri: getUserAvatarUri(user) }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarText}>{getUserInitial(user?.name)}</Text>
              )}
            </View>
          </View>

          <View style={styles.heroPillsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="time-outline" size={14} color={theme.colors.primary[100]} />
              <Text style={styles.heroPillText}>{stats.pendingOrders} pending</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="checkmark-done-outline" size={14} color={theme.colors.primary[100]} />
              <Text style={styles.heroPillText}>{fulfillmentRate}% fulfilled</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.overviewCard}>
            <View style={styles.overviewHeaderRow}>
              <Text style={styles.overviewTitle}>Overview</Text>
              <Text style={styles.overviewHint}>Tap a card</Text>
            </View>

            <View style={styles.kpiGrid}>
              <KpiCard
                title="Revenue"
                value={formatPrice(stats.revenue)}
                icon="cash-outline"
                tone="primary"
              />
              <KpiCard
                title="Orders"
                value={String(stats.totalOrders)}
                icon="receipt-outline"
                tone="neutral"
                onPress={() => navigateTab('VendorOrders')}
              />
              <KpiCard
                title="Products"
                value={String(stats.totalProducts)}
                icon="cube-outline"
                tone="neutral"
                onPress={() => navigateTab('VendorProducts')}
              />
              <KpiCard
                title="Live"
                value={String(productStatus.live)}
                icon="checkmark-circle-outline"
                tone="success"
                onPress={() => navigateTab('VendorProducts')}
              />
            </View>

            <View style={styles.subKpiRow}>
              <View style={styles.subKpi}>
                <Text style={styles.subKpiLabel}>Pending products</Text>
                <Text style={styles.subKpiValue}>{productStatus.pending}</Text>
              </View>
              <View style={styles.subKpiDivider} />
              <View style={styles.subKpi}>
                <Text style={styles.subKpiLabel}>Rejected</Text>
                <Text style={styles.subKpiValue}>{productStatus.rejected}</Text>
              </View>
              <View style={styles.subKpiDivider} />
              <View style={styles.subKpi}>
                <Text style={styles.subKpiLabel}>Completed orders</Text>
                <Text style={styles.subKpiValue}>{stats.completedOrders}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.pricingEntryCard}
            activeOpacity={0.88}
            onPress={() => navigateTab('VendorProfile', { screen: 'VendorPricing' })}
          >
            <View style={styles.pricingEntryLeft}>
              <View style={styles.pricingEntryIconWrap}>
                <Ionicons name="pricetags-outline" size={18} color={theme.colors.primary[500]} />
              </View>
              <View>
                <Text style={styles.pricingEntryTitle}>Pricing Plans</Text>
                <Text style={styles.pricingEntrySubtitle}>Compare Basic, Standard, and Premium plans</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent orders</Text>
            <TouchableOpacity onPress={() => navigateTab('VendorOrders')} activeOpacity={0.85}>
              <Text style={styles.sectionLink}>View all</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={18} color={theme.colors.text.tertiary} />
              <Text style={styles.emptyText}>No orders yet</Text>
            </View>
          ) : (
            <View style={styles.recentCard}>
              {recentOrders.map((o, idx) => (
                <View key={o?._id ?? String(idx)}>
                  <RecentOrderRow order={o} />
                  {idx < recentOrders.length - 1 ? <View style={styles.recentDivider} /> : null}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleString()}` : ''}
          </Text>
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
  contentContainer: {
    paddingBottom: 80,
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  heroKicker: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  heroNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  heroTitle: {
    marginTop: 2,
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  verifiedSmallBadge: {
    padding: theme.spacing.xs,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.extrabold,
    letterSpacing: 0.6,
  },
  heroPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(185, 28, 28, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.25)',
  },
  heroPillText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  overviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  overviewTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  overviewHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLink: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[300],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.md,
  },
  kpiCard: {
    width: '49%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    padding: theme.spacing.lg,
    ...theme.shadows.soft,
  },
  kpiCard_primary: {
    borderColor: 'rgba(185, 28, 28, 0.35)',
    backgroundColor: 'rgba(185, 28, 28, 0.12)',
  },
  kpiCard_success: {
    borderColor: 'rgba(34, 197, 94, 0.30)',
    backgroundColor: 'rgba(34, 197, 94, 0.10)',
  },
  kpiCard_neutral: {},
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  kpiIcon_primary: {
    backgroundColor: 'rgba(185, 28, 28, 0.22)',
    borderColor: 'rgba(185, 28, 28, 0.35)',
  },
  kpiIcon_success: {
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    borderColor: 'rgba(34, 197, 94, 0.30)',
  },
  kpiIcon_neutral: {},
  kpiIconText_primary: { color: theme.colors.primary[100] },
  kpiIconText_success: { color: '#bbf7d0' },
  kpiIconText_neutral: { color: theme.colors.primary[500] },
  kpiValue: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  kpiTitle: {
    marginTop: 4,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  subKpiRow: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subKpi: {
    flex: 1,
  },
  subKpiDivider: {
    width: 1,
    height: 26,
    backgroundColor: theme.colors.secondary[800],
    marginHorizontal: theme.spacing.md,
  },
  subKpiLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  subKpiValue: {
    marginTop: 4,
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  recentCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  recentDivider: {
    height: 1,
    backgroundColor: theme.colors.secondary[800],
  },
  recentTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  recentMeta: {
    marginTop: 4,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  recentRight: {
    alignItems: 'flex-end',
    gap: 8,
    marginLeft: theme.spacing.md,
  },
  recentAmount: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[300],
  },
  statusPill: {
    maxWidth: 140,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  statusPillText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    padding: theme.spacing.lg,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  pricingEntryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadows.soft,
  },
  pricingEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
  },
  pricingEntryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.primary[500]}18`,
    borderWidth: 1,
    borderColor: `${theme.colors.primary[500]}33`,
  },
  pricingEntryTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  pricingEntrySubtitle: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  footer: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
});

export default DashboardScreen;
