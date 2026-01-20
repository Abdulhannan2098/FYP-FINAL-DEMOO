import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from '../SkeletonPlaceholder';
import theme from '../../styles/theme';

const ProductDetailSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Image area */}
      <SkeletonPlaceholder
        backgroundColor={theme.colors.secondary[800]}
        highlightColor={theme.colors.secondary[700]}
      >
        <SkeletonPlaceholder.Item width={'100%'} height={360} />

        <SkeletonPlaceholder.Item padding={theme.spacing.lg}>
          <SkeletonPlaceholder.Item
            width={'75%'}
            height={22}
            borderRadius={10}
            marginBottom={theme.spacing.sm}
          />
          <SkeletonPlaceholder.Item
            width={'40%'}
            height={14}
            borderRadius={8}
            marginBottom={theme.spacing.lg}
          />

          <SkeletonPlaceholder.Item
            width={120}
            height={22}
            borderRadius={10}
            marginBottom={theme.spacing.lg}
          />

          {/* Collapsible sections stubs */}
          {Array.from({ length: 2 }).map((_, idx) => (
            <SkeletonPlaceholder.Item
              key={idx}
              width={'100%'}
              height={110}
              borderRadius={theme.borderRadius.lg}
              marginBottom={theme.spacing.lg}
            />
          ))}

          <SkeletonPlaceholder.Item
            width={'100%'}
            height={52}
            borderRadius={theme.borderRadius.lg}
          />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
});

export default ProductDetailSkeleton;
