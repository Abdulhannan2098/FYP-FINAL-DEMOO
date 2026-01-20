import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { orderService } from '../../api/orderService';
import OrderCard from '../../components/OrderCard';
import OrderItemCard from '../../components/OrderItemCard';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import CollapsibleSection from '../../components/CollapsibleSection';
import OrderStatusTimeline from '../../components/OrderStatusTimeline';
import { formatPrice, formatDate } from '../../utils/formatters';
import { getDisplayOrderNumber } from '../../utils/orderNumber';
import theme from '../../styles/theme';
import { useChat } from '../../context/ChatContext';

const VendorOrdersScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { conversations, loadConversations } = useChat();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const renderSelectedOrderItem = ({ item }) => <OrderItemCard item={item} />;

  const handleContactCustomer = async () => {
    if (!selectedOrder?.customer) return;
    const customerId =
      typeof selectedOrder.customer === 'object'
        ? selectedOrder.customer._id
        : selectedOrder.customer;

    if (!customerId) return;

    try {
      setChatLoading(true);

      const sourceConversations =
        !conversations || conversations.length === 0
          ? await loadConversations()
          : conversations;

      const conversation = (sourceConversations || []).find((conv) =>
        (conv.participants || []).some((p) => {
          const participantUserId = p?.user?._id || p?.user;
          return participantUserId?.toString?.() === customerId?.toString?.();
        })
      );

      const parent = navigation.getParent?.();
      setModalVisible(false);

      if (!conversation) {
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderService.getVendorOrders();

      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleAcceptOrder = async () => {
    if (!selectedOrder) return;

    try {
      setProcessing(true);
      const response = await orderService.acceptOrder(selectedOrder._id);

      if (response.success) {
        Alert.alert('Success', 'Order accepted successfully');
        setModalVisible(false);
        fetchOrders();
      } else {
        Alert.alert('Error', response.message || 'Failed to accept order');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      Alert.alert('Error', 'Failed to accept order');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder) return;

    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      const response = await orderService.rejectOrder(selectedOrder._id, rejectionReason);

      if (response.success) {
        Alert.alert('Success', 'Order rejected');
        setModalVisible(false);
        setRejectionReason('');
        fetchOrders();
      } else {
        Alert.alert('Error', response.message || 'Failed to reject order');
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      Alert.alert('Error', 'Failed to reject order');
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async (status) => {
    if (!selectedOrder) return;

    Alert.alert(
      'Update Status',
      `Change order status to "${status}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setProcessing(true);
              const response = await orderService.updateOrderStatus(selectedOrder._id, status);

              if (response.success) {
                Alert.alert('Success', 'Order status updated');
                setModalVisible(false);
                fetchOrders();
              } else {
                Alert.alert('Error', response.message || 'Failed to update status');
              }
            } catch (error) {
              console.error('Error updating status:', error);
              Alert.alert('Error', 'Failed to update status');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const renderOrder = ({ item }) => (
    <OrderCard order={item} onPress={() => handleOrderPress(item)} />
  );

  if (loading) {
    return <Loading />;
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No Orders"
        message="You don't have any orders yet"
        actionLabel="Refresh"
        onAction={handleRefresh}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: theme.spacing.md + insets.top }]}>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.headerSubtitle}>
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </Text>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
            colors={[theme.colors.primary[500]]}
          />
        }
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['left', 'right', 'bottom']}>
          <View style={[styles.modalHeader, { paddingTop: theme.spacing.md + insets.top }]}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalTitle}>Order Details</Text>
              {selectedOrder ? (
                <Text style={styles.modalSubtitle}>#{getDisplayOrderNumber(selectedOrder)}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.section}>
                <CollapsibleSection
                  title="Order status"
                  defaultExpanded={false}
                  rightSummary={selectedOrder?.status ? String(selectedOrder.status) : undefined}
                >
                  <View style={styles.cardNoPadTop}>
                    <OrderStatusTimeline
                      currentStatus={selectedOrder.status}
                      createdAt={selectedOrder.createdAt}
                      statusHistory={selectedOrder.statusHistory}
                    />
                  </View>
                </CollapsibleSection>
              </View>

              <View style={styles.section}>
                <CollapsibleSection title="Order information" defaultExpanded>
                  <View style={styles.cardNoPadTop}>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Order #</Text>
                      <Text style={styles.value}>#{getDisplayOrderNumber(selectedOrder)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.label}>Total</Text>
                      <Text style={styles.priceValue}>{formatPrice(selectedOrder.totalAmount)}</Text>
                    </View>
                    <View style={[styles.infoRow, styles.infoRowLast]}>
                      <Text style={styles.label}>Payment</Text>
                      <Text style={styles.value}>{selectedOrder.paymentMethod || 'Cash on Delivery'}</Text>
                    </View>
                  </View>
                </CollapsibleSection>
              </View>

              {selectedOrder.customer && typeof selectedOrder.customer === 'object' && (
                <View style={styles.section}>
                  <CollapsibleSection title="Customer info" defaultExpanded={false}>
                    <View style={styles.cardNoPadTop}>
                      <View style={styles.customerHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.customerName} numberOfLines={1}>
                            {selectedOrder.customer.name || 'Customer'}
                          </Text>
                          {selectedOrder.customer.email ? (
                            <Text style={styles.customerMeta} numberOfLines={1}>
                              {selectedOrder.customer.email}
                            </Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          style={[styles.chatIconButton, chatLoading && { opacity: 0.6 }]}
                          onPress={handleContactCustomer}
                          disabled={chatLoading}
                          activeOpacity={0.9}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          {chatLoading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      </View>

                      <View style={styles.infoRow}>
                        <Text style={styles.label}>Name</Text>
                        <Text
                          style={[styles.value, styles.valueRight]}
                          numberOfLines={1}
                        >
                          {selectedOrder.customer.name || 'Customer'}
                        </Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.label}>Email</Text>
                        <Text
                          style={[styles.value, styles.valueRight]}
                          numberOfLines={1}
                        >
                          {selectedOrder.customer.email || '—'}
                        </Text>
                      </View>
                      <View style={[styles.infoRow, styles.infoRowLast]}>
                        <Text style={styles.label}>Phone</Text>
                        <Text
                          style={[styles.value, styles.valueRight]}
                          numberOfLines={1}
                        >
                          {selectedOrder.customer.phone || '—'}
                        </Text>
                      </View>
                    </View>
                  </CollapsibleSection>
                </View>
              )}

              <View style={styles.section}>
                <CollapsibleSection
                  title={`Items (${(selectedOrder.items || []).length})`}
                  defaultExpanded
                >
                  <View style={styles.cardNoPadTop}>
                    <FlatList
                      data={selectedOrder.items || []}
                      renderItem={renderSelectedOrderItem}
                      keyExtractor={(item, index) => item?._id || item?.product?._id || String(index)}
                      scrollEnabled={false}
                    />
                  </View>
                </CollapsibleSection>
              </View>

              {selectedOrder.shippingAddress && (
                <View style={styles.section}>
                  <CollapsibleSection title="Shipping address" defaultExpanded={false}>
                    <View style={styles.cardNoPadTop}>
                      <Text style={styles.addressText}>
                        {selectedOrder.shippingAddress.street}
                      </Text>
                      <Text style={styles.addressText}>
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}
                      </Text>
                      <Text style={styles.addressText}>
                        {selectedOrder.shippingAddress.zipCode}
                      </Text>
                    </View>
                  </CollapsibleSection>
                </View>
              )}

              {selectedOrder.status === 'Pending Vendor Action' && (
                <View style={styles.section}>
                  <CollapsibleSection title="Actions" defaultExpanded rightSummary="Pending">
                    <View style={styles.cardNoPadTop}>
                      <View style={styles.actionsRow}>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Accept"
                            onPress={handleAcceptOrder}
                            loading={processing}
                            variant="primary"
                            icon={
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={18}
                                color="#FFFFFF"
                                style={{ marginRight: theme.spacing.sm }}
                              />
                            }
                            style={styles.actionButton}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Reject"
                            onPress={handleRejectOrder}
                            loading={processing}
                            variant="danger"
                            icon={
                              <Ionicons
                                name="close-circle-outline"
                                size={18}
                                color="#FFFFFF"
                                style={{ marginRight: theme.spacing.sm }}
                              />
                            }
                            style={styles.actionButton}
                          />
                        </View>
                      </View>

                      <Input
                        label="Rejection reason (required)"
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                        placeholder="Enter reason for rejection"
                        multiline
                        numberOfLines={3}
                        style={styles.reasonInput}
                      />
                    </View>
                  </CollapsibleSection>
                </View>
              )}

              {selectedOrder.status === 'Accepted' && (
                <View style={styles.section}>
                  <CollapsibleSection title="Actions" defaultExpanded rightSummary="Accepted">
                    <View style={styles.cardNoPadTop}>
                      <Button
                        title="Mark as In Progress"
                        onPress={() => handleUpdateStatus('In Progress')}
                        loading={processing}
                        variant="primary"
                        icon={
                          <Ionicons
                            name="construct-outline"
                            size={18}
                            color="#FFFFFF"
                            style={{ marginRight: theme.spacing.sm }}
                          />
                        }
                        style={styles.actionButtonFull}
                      />
                    </View>
                  </CollapsibleSection>
                </View>
              )}

              {selectedOrder.status === 'In Progress' && (
                <View style={styles.section}>
                  <CollapsibleSection title="Actions" defaultExpanded rightSummary="In Progress">
                    <View style={styles.cardNoPadTop}>
                      <Button
                        title="Mark as Shipped"
                        onPress={() => handleUpdateStatus('Shipped')}
                        loading={processing}
                        variant="primary"
                        icon={
                          <Ionicons
                            name="rocket-outline"
                            size={18}
                            color="#FFFFFF"
                            style={{ marginRight: theme.spacing.sm }}
                          />
                        }
                        style={styles.actionButtonFull}
                      />
                    </View>
                  </CollapsibleSection>
                </View>
              )}

              {selectedOrder.status === 'Shipped' && (
                <View style={styles.section}>
                  <CollapsibleSection title="Actions" defaultExpanded rightSummary="Shipped">
                    <View style={styles.cardNoPadTop}>
                      <Button
                        title="Mark as Completed"
                        onPress={() => handleUpdateStatus('Completed')}
                        loading={processing}
                        variant="primary"
                        icon={
                          <Ionicons
                            name="checkmark-done-outline"
                            size={18}
                            color="#FFFFFF"
                            style={{ marginRight: theme.spacing.sm }}
                          />
                        }
                        style={styles.actionButtonFull}
                      />
                    </View>
                  </CollapsibleSection>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  list: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
    backgroundColor: theme.colors.surface,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  modalSubtitle: {
    marginTop: theme.spacing.xs,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  cardNoPadTop: {
    paddingTop: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  infoRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  value: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  valueRight: {
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.md,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
    marginBottom: theme.spacing.sm,
  },
  customerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  customerMeta: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  chatIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    ...theme.shadows.soft,
  },
  priceValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
  statusPill: {
    maxWidth: '65%',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  statusPillText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  itemName: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  itemQuantity: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginHorizontal: theme.spacing.md,
  },
  itemPrice: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
  addressText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    marginBottom: 0,
  },
  actionButtonFull: {
    marginBottom: 0,
  },
  reasonInput: {
    height: 80,
    textAlignVertical: 'top',
  },
});

export default VendorOrdersScreen;
