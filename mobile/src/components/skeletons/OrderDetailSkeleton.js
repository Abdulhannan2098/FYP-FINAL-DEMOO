import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from '../SkeletonPlaceholder';
import theme from '../../styles/theme';

const OrderDetailSkeleton = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerStub} />

      <View style={styles.content}>
        <SkeletonPlaceholder
          backgroundColor={theme.colors.secondary[800]}
          highlightColor={theme.colors.secondary[700]}
        >
          {/* Status timeline card */}
          <SkeletonPlaceholder.Item
            width={'100%'}
            height={160}
            borderRadius={theme.borderRadius.lg}
            marginBottom={theme.spacing.lg}
          />

          {/* Info section */}
          <SkeletonPlaceholder.Item
            width={180}
            height={18}
            borderRadius={8}
            marginBottom={theme.spacing.md}
          />
          <SkeletonPlaceholder.Item
            width={'100%'}
            height={110}
            borderRadius={theme.borderRadius.lg}
            marginBottom={theme.spacing.lg}
          />

          {/* Items section */}
          <SkeletonPlaceholder.Item
            width={140}
            height={18}
            borderRadius={8}
            marginBottom={theme.spacing.md}
          />
          {Array.from({ length: 2 }).map((_, idx) => (
            <SkeletonPlaceholder.Item
              key={idx}
              width={'100%'}
              height={110}
              borderRadius={theme.borderRadius.lg}
              marginBottom={theme.spacing.md}
            />
          ))}

          {/* Summary section */}
          <SkeletonPlaceholder.Item
            width={160}
            height={18}
            borderRadius={8}
            marginTop={theme.spacing.md}
            marginBottom={theme.spacing.md}
          />
          <SkeletonPlaceholder.Item
            width={'100%'}
            height={120}
            borderRadius={theme.borderRadius.lg}
          />
        </SkeletonPlaceholder>
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
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
    opacity: 0.6,
  },
  content: {
    padding: theme.spacing.lg,
  },
});

export default OrderDetailSkeleton;
