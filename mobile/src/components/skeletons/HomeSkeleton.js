import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonPlaceholder from '../SkeletonPlaceholder';
import theme from '../../styles/theme';

const HomeSkeleton = ({ cardCount = 4 }) => {
  return (
    <View style={styles.container}>
      {/* Header area stub */}
      <View style={styles.headerStub} />

      <SkeletonPlaceholder
        backgroundColor={theme.colors.secondary[800]}
        highlightColor={theme.colors.secondary[700]}
      >
        {/* Hero slider stub */}
        <SkeletonPlaceholder.Item
          width={'100%'}
          height={170}
          borderRadius={theme.borderRadius.lg}
          marginTop={theme.spacing.lg}
          marginBottom={theme.spacing.lg}
          marginLeft={theme.spacing.lg}
          marginRight={theme.spacing.lg}
        />

        {/* Categories title + pills */}
        <SkeletonPlaceholder.Item marginLeft={theme.spacing.lg} marginBottom={theme.spacing.md}>
          <SkeletonPlaceholder.Item width={140} height={18} borderRadius={8} />
        </SkeletonPlaceholder.Item>
        <SkeletonPlaceholder.Item flexDirection="row" marginLeft={theme.spacing.lg} marginBottom={theme.spacing.lg}>
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonPlaceholder.Item
              key={idx}
              width={90}
              height={34}
              borderRadius={theme.borderRadius.full}
              marginRight={theme.spacing.sm}
            />
          ))}
        </SkeletonPlaceholder.Item>

        {/* Featured header */}
        <SkeletonPlaceholder.Item
          flexDirection="row"
          justifyContent="space-between"
          alignItems="center"
          marginLeft={theme.spacing.lg}
          marginRight={theme.spacing.lg}
          marginBottom={theme.spacing.lg}
        >
          <SkeletonPlaceholder.Item width={180} height={18} borderRadius={8} />
          <SkeletonPlaceholder.Item width={72} height={14} borderRadius={8} />
        </SkeletonPlaceholder.Item>

        {/* Product cards */}
        <SkeletonPlaceholder.Item marginLeft={theme.spacing.lg} marginRight={theme.spacing.lg}>
          {Array.from({ length: cardCount }).map((_, idx) => (
            <SkeletonPlaceholder.Item
              key={idx}
              width={'100%'}
              height={120}
              borderRadius={theme.borderRadius.lg}
              marginBottom={theme.spacing.md}
            />
          ))}
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900],
  },
  headerStub: {
    height: 56,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
    opacity: 0.45,
  },
});

export default HomeSkeleton;
