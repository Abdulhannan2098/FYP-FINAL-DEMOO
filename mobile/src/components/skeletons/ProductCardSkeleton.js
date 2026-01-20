import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from '../SkeletonPlaceholder';
import theme from '../../styles/theme';

const ProductCardSkeleton = () => {
  return (
    <View style={styles.card}>
      <SkeletonPlaceholder
        backgroundColor={theme.colors.secondary[800]}
        highlightColor={theme.colors.secondary[700]}
      >
        <SkeletonPlaceholder.Item width="100%" height={220} borderRadius={0} />
        <SkeletonPlaceholder.Item padding={theme.spacing.lg}>
          <SkeletonPlaceholder.Item width={120} height={12} borderRadius={6} />
          <SkeletonPlaceholder.Item marginTop={10} width="90%" height={16} borderRadius={8} />
          <SkeletonPlaceholder.Item marginTop={8} width="70%" height={16} borderRadius={8} />
          <SkeletonPlaceholder.Item marginTop={16} flexDirection="row" justifyContent="space-between" alignItems="center">
            <SkeletonPlaceholder.Item width={90} height={18} borderRadius={9} />
            <SkeletonPlaceholder.Item width={70} height={12} borderRadius={6} />
          </SkeletonPlaceholder.Item>
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
});

export default ProductCardSkeleton;
