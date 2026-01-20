import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../styles/theme';
import { formatPKR } from '../utils/formatters';
import { getDisplayOrderNumber } from '../utils/orderNumber';

// Helper function to format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Helper function to get status badge style
const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'delivered':
      return {
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        borderColor: '#15803d',
        textColor: '#86efac',
      };
    case 'shipped':
    case 'processing':
      return {
        backgroundColor: 'rgba(251, 191, 36, 0.3)',
        borderColor: '#ca8a04',
        textColor: '#fde047',
      };
    case 'pending':
      return {
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderColor: '#1d4ed8',
        textColor: '#93c5fd',
      };
    case 'cancelled':
      return {
        backgroundColor: 'rgba(185, 28, 28, 0.3)',
        borderColor: '#7f1d1d',
        textColor: '#fca5a5',
      };
    default:
      return {
        backgroundColor: 'rgba(156, 163, 175, 0.3)',
        borderColor: '#4b5563',
        textColor: '#d1d5db',
      };
  }
};

const OrderCard = ({ order, onPress }) => {
  const totalItems = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const statusStyle = getStatusStyle(order.status);
  const orderNumber = getDisplayOrderNumber(order);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.orderHeading}>Order</Text>
          <View style={[styles.statusBadge, {
            backgroundColor: statusStyle.backgroundColor,
            borderColor: statusStyle.borderColor
          }]}>
            <Text style={[styles.statusText, { color: statusStyle.textColor }]}>
              {order.status || 'Pending'}
            </Text>
          </View>
        </View>

        <Text style={styles.orderNumberText}>#{orderNumber}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>Date: </Text>
          <Text style={styles.value}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Items: </Text>
          <Text style={styles.value}>{totalItems}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total: </Text>
          <Text style={styles.priceValue}>{formatPKR(order.totalAmount)}</Text>
        </View>
      </View>

      {order.shippingAddress && (order.shippingAddress.street || order.shippingAddress.city) && (
        <View style={styles.addressContainer}>
          <Text style={styles.address} numberOfLines={1}>
            {order.shippingAddress.street || ''}{order.shippingAddress.street && order.shippingAddress.city ? ', ' : ''}{order.shippingAddress.city || ''}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'column',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
    gap: theme.spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderHeading: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    flex: 1,
    flexShrink: 1,
    includeFontPadding: false,
    letterSpacing: 0.2,
  },
  orderNumberText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
    includeFontPadding: false,
    letterSpacing: 0.15,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    flexShrink: 0,
  },
  statusText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  content: {
    marginBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
    minWidth: 50,
  },
  value: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  priceValue: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.bold,
  },
  addressContainer: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
  },
  address: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
});

export default OrderCard;
