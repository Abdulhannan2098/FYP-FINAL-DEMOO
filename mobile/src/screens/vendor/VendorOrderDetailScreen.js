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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OrderStatusTimeline from '../../components/OrderStatusTimeline';
import OrderItemCard from '../../components/OrderItemCard';
import Button from '../../components/Button';
import Loading from '../../components/Loading';
import { getDisplayOrderNumber } from '../../utils/orderNumber';
import { useChat } from '../../context/ChatContext';
import theme from '../../styles/theme';
import apiClient from '../../api/client';

const VendorOrderDetailScreen = ({ navigation, route }) => {
  const { orderId } = route.params;
  const insets = useSafeAreaInsets();
  const { conversations, loadConversations } = useChat();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const renderOrderItem = ({ item }) => <OrderItemCard item={item} />;

  const normalizeOrderStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized === 'accepted') return 'In Progress';
    if (normalized === 'rejected' || normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';
    if (normalized === 'completed') return 'Delivered';
    if (normalized === 'pending') return 'Pending Vendor Action';
    if (normalized === 'in progress') return 'In Progress';
    if (normalized === 'shipped') return 'Shipped';
    if (normalized === 'delivered') return 'Delivered';

    return value;
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/orders/${orderId}`);

      if (response.data.success) {
        setOrder(response.data.data);
        setNewStatus(normalizeOrderStatus(response.data.data.status) || 'In Progress');
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

  const handleContactCustomer = async () => {
    if (!order?.customer?._id) return;

    try {
      setChatLoading(true);

      const customerId = order.customer._id;

      const sourceConversations =
        !conversations || conversations.length === 0
          ? await loadConversations()
          : conversations;

      const conversation = (sourceConversations || []).find((conv) =>
        (conv.participants || []).some((p) => p?.user?._id === customerId)
      );

      const parent = navigation.getParent?.();

      if (!conversation) {
        Alert.alert(
          'No conversation yet',
          'Open Messages to start a chat with this customer.'
        );
        (parent ?? navigation).navigate('VendorChat');
        return;
      }

      (parent ?? navigation).navigate('VendorChat', {
        screen: 'ChatWindow',
        params: { conversation },
      });
    } catch (error) {
      console.error('Failed to open vendor chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    Alert.alert(
      'Start Processing',
      'Move this order into In Progress?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            try {
              setActionLoading(true);
              const response = await apiClient.put(`/orders/${orderId}/status`, {
                status: 'In Progress',
              });

              if (response.data.success) {
                Alert.alert('Success', 'Order updated successfully');
                fetchOrderDetails();
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to update order');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectOrder = async () => {
    try {
      setActionLoading(true);
      const response = await apiClient.put(`/orders/${orderId}/status`, {
        status: 'Cancelled',
        note: rejectReason,
        rejectionReason: rejectReason,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Order cancelled');
        setShowRejectModal(false);
        setRejectReason('');
        fetchOrderDetails();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    const currentStatus = normalizeOrderStatus(order.status);

    if (newStatus === currentStatus) {
      setShowStatusModal(false);
      return;
    }

    try {
      setActionLoading(true);
      const response = await apiClient.put(`/orders/${orderId}/status`, {
        status: newStatus,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Order status updated successfully');
        setShowStatusModal(false);
        fetchOrderDetails();
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setActionLoading(false);
    }
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

  const getAvailableStatuses = () => {
    const currentStatus = normalizeOrderStatus(order?.status);
    const statuses = [
      { value: 'In Progress', label: 'In Progress' },
      { value: 'Shipped', label: 'Shipped' },
      { value: 'Delivered', label: 'Delivered' },
      { value: 'Cancelled', label: 'Cancelled' },
    ];

    if (currentStatus === 'Pending Vendor Action') {
      return statuses;
    }

    const currentIndex = statuses.findIndex((s) => s.value === currentStatus);
    return currentIndex >= 0 ? statuses.slice(currentIndex) : statuses;
  };

  if (loading) {
    return <Loading />;
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Not Found</Text>
          <View style={styles.placeholder} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{getDisplayOrderNumber(order)}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Status Timeline */}
        <OrderStatusTimeline
          currentStatus={order.status}
          createdAt={order.createdAt}
          statusHistory={order.statusHistory}
        />

        {/* Vendor Actions */}
        {normalizeOrderStatus(order.status) === 'Pending Vendor Action' && (
          <View style={styles.actionSection}>
            <Button
              title="Update Status"
              onPress={() => setShowStatusModal(true)}
              disabled={actionLoading}
              style={styles.acceptButton}
            />
          </View>
        )}

        {(normalizeOrderStatus(order.status) === 'In Progress' ||
          normalizeOrderStatus(order.status) === 'Shipped') && (
          <View style={styles.actionSection}>
            <Button
              title="Update Status"
              onPress={() => setShowStatusModal(true)}
              disabled={actionLoading}
              icon={<Ionicons name="sync" size={20} color="#FFFFFF" />}
            />
          </View>
        )}

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order Number:</Text>
              <Text style={styles.infoValue}>{getDisplayOrderNumber(order)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Order Date:</Text>
              <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Method:</Text>
              <Text style={styles.infoValue}>{order.paymentMethod || 'Cash on Delivery'}</Text>
            </View>
          </View>
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

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.card}>
            <View style={styles.customerRow}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{order.customer.name}</Text>
                <Text style={styles.customerEmail}>{order.customer.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactCustomer}
              >
                <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                <Text style={styles.contactButtonText}>Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.card}>
            <Text style={styles.addressText}>{order.shippingAddress.street}</Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
              {order.shippingAddress.zipCode}
            </Text>
            <Text style={styles.addressText}>{order.shippingAddress.country}</Text>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatPrice(order.totalAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping:</Text>
              <Text style={styles.summaryValue}>Free</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatPrice(order.totalAmount)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Order Status</Text>
            <Text style={styles.modalSubtitle}>
              Current status: {normalizeOrderStatus(order.status)}
            </Text>

            <View style={styles.statusOptions}>
              {getAvailableStatuses().map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.statusOption,
                    newStatus === status.value && styles.statusOptionSelected,
                  ]}
                  onPress={() => setNewStatus(status.value)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      newStatus === status.value && styles.statusOptionTextSelected,
                    ]}
                  >
                    {status.label}
                  </Text>
                  {newStatus === status.value && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.brand.main} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowStatusModal(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Update"
                onPress={handleUpdateStatus}
                disabled={actionLoading}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
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
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  addressText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  customerEmail: {
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
  acceptButton: {
    marginBottom: theme.spacing.md,
  },
  rejectButton: {
    borderColor: theme.colors.error,
  },
  bottomSpacer: {
    height: theme.spacing.xl,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  modalSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
  },
  statusOptions: {
    marginBottom: theme.spacing.xl,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary[800],
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionSelected: {
    borderColor: theme.colors.brand.main,
    backgroundColor: `${theme.colors.brand.main}15`,
  },
  statusOptionText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  statusOptionTextSelected: {
    color: theme.colors.brand.main,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  textArea: {
    backgroundColor: theme.colors.secondary[800],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.base,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.xl,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  rejectButtonModal: {
    backgroundColor: theme.colors.error,
  },
});

export default VendorOrderDetailScreen;
