import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from '../SkeletonPlaceholder';
import theme from '../../styles/theme';

const OrderCardSkeleton = () => {
  return (
    <View style={styles.card}>
      <SkeletonPlaceholder
        backgroundColor={theme.colors.secondary[800]}
        highlightColor={theme.colors.secondary[700]}
      >
        <SkeletonPlaceholder.Item flexDirection="row" justifyContent="space-between" alignItems="center">
          <SkeletonPlaceholder.Item width={140} height={16} borderRadius={8} />
          <SkeletonPlaceholder.Item width={90} height={20} borderRadius={10} />
        </SkeletonPlaceholder.Item>

        <SkeletonPlaceholder.Item marginTop={16}>
          <SkeletonPlaceholder.Item width={220} height={12} borderRadius={6} />
          <SkeletonPlaceholder.Item marginTop={10} width={180} height={12} borderRadius={6} />
          <SkeletonPlaceholder.Item marginTop={10} width={160} height={12} borderRadius={6} />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </View>
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
});

export default OrderCardSkeleton;
