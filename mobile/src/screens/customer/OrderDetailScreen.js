import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import OrderStatusTimeline from '../../components/OrderStatusTimeline';
import OrderItemCard from '../../components/OrderItemCard';
import Button from '../../components/Button';
import CollapsibleSection from '../../components/CollapsibleSection';
import OrderDetailSkeleton from '../../components/skeletons/OrderDetailSkeleton';
import { useChat } from '../../context/ChatContext';
import theme from '../../styles/theme';
import apiClient from '../../api/client';
import textSystem from '../../styles/textSystem';
import { getDisplayOrderNumber } from '../../utils/orderNumber';

const OrderDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { orderId } = route.params;
  const { createOrGetConversation } = useChat();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/orders/${orderId}`);

      if (response.data.success) {
        console.log('Order data:', JSON.stringify(response.data.data, null, 2));
        console.log('Vendor data:', response.data.data.vendor);
        setOrder(response.data.data);
      }
    } catch (err) {
      console.error('Fetch order error:', err);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrderDetails();
    setRefreshing(false);
  };

  const handleContactVendor = async () => {
    if (!order?.vendor) {
      Alert.alert('Error', 'Vendor information not available');
      return;
    }

    try {
      setChatLoading(true);

      // Get the first product from order items to use as context
      const firstProduct = order.items?.[0]?.product;
      const productId = firstProduct?._id || firstProduct;
      const vendorId = order.vendor._id || order.vendor;

      // Create or get existing conversation with this vendor
      const conversation = await createOrGetConversation(productId, vendorId);

      // Navigate to Chat tab, then to ChatWindow screen within ChatScreen's internal navigator
      navigation.navigate('Chat', {
        screen: 'ChatWindow',
        params: { conversation },
      });
    } catch (error) {
      console.error('Failed to open chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiClient.put(`/orders/${orderId}/status`, {
                status: 'cancelled',
              });

              if (response.data.success) {
                Alert.alert('Success', 'Order cancelled successfully');
                fetchOrderDetails();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel order');
            }
          },
        },
      ]
    );
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrderItem = ({ item, index }) => (
    <OrderItemCard
      item={item}
      onPress={(product) => navigation.navigate('ProductDetail', { productId: product._id })}
    />
  );

  if (loading) {
    return <OrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={[styles.headerOuter, { paddingTop: insets.top }]}>
          <View style={styles.headerInner}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Order Not Found</Text>
            <View style={styles.placeholder} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const displayOrderNumber = getDisplayOrderNumber(order);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={[styles.headerOuter, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order #{displayOrderNumber}</Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
      >
        {/* Status Timeline */}
        <View style={styles.section}>
          <CollapsibleSection
            title="Order status"
            defaultExpanded={false}
            rightSummary={order?.status ? String(order.status) : undefined}
          >
            <View style={styles.cardNoPadTop}>
              <OrderStatusTimeline
                currentStatus={order.status}
                createdAt={order.createdAt}
                statusHistory={order.statusHistory}
              />
            </View>
          </CollapsibleSection>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <CollapsibleSection title="Order information" defaultExpanded>
            <View style={styles.cardNoPadTop}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order number</Text>
                <Text style={styles.infoValue}>{displayOrderNumber}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Order date</Text>
                <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payment method</Text>
                <Text style={styles.infoValue}>{order.paymentMethod || 'Cash on Delivery'}</Text>
              </View>
            </View>
          </CollapsibleSection>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <FlatList
            data={order.items || []}
            renderItem={renderOrderItem}
            keyExtractor={(item, index) => item?._id || item?.product?._id || String(index)}
            scrollEnabled={false}
          />
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <CollapsibleSection title="Shipping address" defaultExpanded={false}>
            <View style={styles.cardNoPadTop}>
              <Text style={styles.addressText}>{order.shippingAddress.street}</Text>
              <Text style={styles.addressText}>
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.zipCode}
              </Text>
              <Text style={styles.addressText}>{order.shippingAddress.country}</Text>
            </View>
          </CollapsibleSection>
        </View>

        {/* Vendor Information */}
        {order.vendor && (
          <View style={styles.section}>
            <CollapsibleSection title="Vendor" defaultExpanded>
              <View style={styles.cardNoPadTop}>
                <View style={styles.vendorRow}>
                  <View style={styles.vendorInfo}>
                    <Text style={styles.vendorName}>{order.vendor?.name || 'Vendor'}</Text>
                    {order.vendor?.email && (
                      <Text style={styles.vendorEmail}>{order.vendor.email}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.contactButton, chatLoading && { opacity: 0.6 }]}
                    onPress={handleContactVendor}
                    disabled={chatLoading}
                    activeOpacity={0.9}
                  >
                    {chatLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                    )}
                    <Text style={styles.contactButtonText}>
                      {chatLoading ? 'Opening…' : 'Contact'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </CollapsibleSection>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <CollapsibleSection title="Order summary" defaultExpanded={false}>
            <View style={styles.cardNoPadTop}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>{formatPrice(order.totalAmount)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>Free</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatPrice(order.totalAmount)}</Text>
              </View>
            </View>
          </CollapsibleSection>
        </View>

        {/* Action Buttons */}
        {order.status === 'pending' && (
          <View style={styles.actionSection}>
            <Button
              title="Cancel Order"
              onPress={handleCancelOrder}
              variant="outline"
              style={styles.cancelButton}
            />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerOuter: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
    backgroundColor: theme.colors.background.primary,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    ...textSystem.sectionTitle,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...textSystem.sectionTitle,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  cardNoPadTop: {
    paddingTop: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  infoLabel: {
    ...textSystem.caption,
  },
  infoValue: {
    ...textSystem.bodyStrong,
  },
  addressText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  vendorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  vendorEmail: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.brand.main,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  contactButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },
  summaryValue: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.secondary[800],
    marginVertical: theme.spacing.sm,
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  totalValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.brand.main,
  },
  actionSection: {
    marginBottom: theme.spacing.xl,
  },
  cancelButton: {
    borderColor: theme.colors.error,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
});

export default OrderDetailScreen;
