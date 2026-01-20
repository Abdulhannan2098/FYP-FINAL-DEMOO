import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

const OrderStatusTimeline = ({ currentStatus, createdAt, statusHistory = [] }) => {
  const normalize = (value) => String(value || '').trim().toLowerCase();

  const normalizeToFlowKey = (status) => {
    const s = normalize(status);

    if (
      s === 'cancelled' ||
      s === 'canceled' ||
      s === 'cancelled by customer' ||
      s === 'canceled by customer'
    ) {
      return 'cancelled';
    }

    if (s === 'rejected' || s === 'declined' || s === 'rejected by vendor') {
      return 'rejected';
    }

    if (
      s === 'pending' ||
      s === 'pending vendor action' ||
      s === 'awaiting vendor' ||
      s === 'awaiting confirmation' ||
      s === 'placed'
    ) {
      return 'pending';
    }

    if (s === 'accepted' || s === 'confirmed' || s === 'approved') {
      return 'accepted';
    }

    if (s === 'in progress' || s === 'in_progress' || s === 'processing') {
      return 'in_progress';
    }

    if (s === 'shipped' || s === 'out for delivery' || s === 'out_for_delivery') {
      return 'shipped';
    }

    if (s === 'completed' || s === 'delivered') {
      return 'completed';
    }

    return '';
  };

  // Define the order status flow
  const statusFlow = [
    { key: 'pending', label: 'Pending', icon: 'time-outline' },
    { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
    { key: 'in_progress', label: 'In Progress', icon: 'construct-outline' },
    { key: 'shipped', label: 'Shipped', icon: 'airplane-outline' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-done-circle-outline' },
  ];

  // Handle cancelled and rejected status separately
  const normalizedKey = normalizeToFlowKey(currentStatus);
  if (normalizedKey === 'cancelled' || normalizedKey === 'rejected') {
    return (
      <View style={styles.container}>
        <View style={styles.cancelledContainer}>
          <Ionicons name="close-circle" size={48} color={theme.colors.error} />
          <Text style={styles.cancelledTitle}>
            {normalizedKey === 'cancelled' ? 'Order Cancelled' : 'Order Rejected'}
          </Text>
          <Text style={styles.cancelledText}>
            This order was {normalizedKey} by the {normalizedKey === 'cancelled' ? 'customer' : 'vendor'}
          </Text>
        </View>
      </View>
    );
  }

  const getCurrentStatusIndex = () => {
    const idx = statusFlow.findIndex((s) => s.key === normalizedKey);
    return idx >= 0 ? idx : 0;
  };

  const getTimestampForKey = (key) => {
    const match = (statusHistory || []).find((h) => normalizeToFlowKey(h?.status) === key);
    if (match?.timestamp) return match.timestamp;
    if (key === 'pending' && createdAt) return createdAt;
    return null;
  };

  const currentIndex = getCurrentStatusIndex();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order Status</Text>

      <View style={styles.timeline}>
        {statusFlow.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const ts = isCompleted ? getTimestampForKey(status.key) : null;
          const nextLabel =
            isCurrent && index + 1 < statusFlow.length ? statusFlow[index + 1].label : null;

          return (
            <View key={status.key} style={styles.timelineItem}>
              {/* Connector Line (except for first item) */}
              {index > 0 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && styles.connectorCompleted,
                    isCurrent && styles.connectorCurrent,
                  ]}
                />
              )}

              {/* Status Icon */}
              <View style={styles.iconWrap}>
                {isCurrent ? <View style={styles.currentHalo} /> : null}
                <View
                  style={[
                    styles.iconContainer,
                    isCompleted && styles.iconContainerCompleted,
                    isCurrent && styles.iconContainerCurrent,
                    isPending && styles.iconContainerPending,
                  ]}
                >
                  <Ionicons
                    name={isCompleted ? 'checkmark' : status.icon}
                    size={isCurrent ? 28 : 24}
                    color={isCompleted || isCurrent ? '#FFFFFF' : theme.colors.text.tertiary}
                  />
                </View>
              </View>

              {/* Status Label */}
              <View style={styles.labelContainer}>
                <View style={styles.labelRow}>
                  <Text
                    style={[styles.label, (isCompleted || isCurrent) && styles.labelActive]}
                  >
                    {status.label}
                  </Text>
                  {isCurrent ? (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>Current</Text>
                    </View>
                  ) : null}
                </View>

                {/* Show timestamp if available */}
                {isCurrent && nextLabel ? (
                  <Text style={styles.timestamp}>Next: {nextLabel}</Text>
                ) : null}
                {ts ? (
                  <Text style={styles.timestamp}>Updated: {new Date(ts).toLocaleDateString()}</Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  timeline: {
    paddingLeft: theme.spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    marginBottom: theme.spacing.lg,
  },
  connector: {
    position: 'absolute',
    left: 19,
    top: -theme.spacing.lg,
    width: 2,
    height: theme.spacing.lg + 20,
    backgroundColor: theme.colors.secondary[700],
  },
  connectorCompleted: {
    backgroundColor: theme.colors.primary[500],
  },
  connectorCurrent: {
    backgroundColor: theme.colors.primary[500],
  },
  iconWrap: {
    width: 40,
    height: 40,
    marginRight: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentHalo: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.primary[500],
    opacity: 0.18,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.secondary[700],
  },
  iconContainerCompleted: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  iconContainerCurrent: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[200],
    borderWidth: 2,
    ...theme.shadows.medium,
  },
  iconContainerPending: {
    backgroundColor: theme.colors.secondary[800],
    borderColor: theme.colors.secondary[700],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  currentPill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  currentPillText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  labelContainer: {
    flex: 1,
    paddingTop: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  labelActive: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  timestamp: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  // Cancelled/Rejected styles
  cancelledContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  cancelledTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.error,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cancelledText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});

export default OrderStatusTimeline;
