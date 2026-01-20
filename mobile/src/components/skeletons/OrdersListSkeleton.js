import React from 'react';
import { View, StyleSheet } from 'react-native';
import OrderCardSkeleton from './OrderCardSkeleton';
import theme from '../../styles/theme';

const OrdersListSkeleton = ({ count = 5 }) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerStub} />
      <View style={styles.list}>
        {Array.from({ length: count }).map((_, idx) => (
          <OrderCardSkeleton key={idx} />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerStub: {
    height: 92,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
    opacity: 0.5,
  },
  list: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
});

export default OrdersListSkeleton;
