import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProductCardSkeleton from './ProductCardSkeleton';
import theme from '../../styles/theme';

const ProductListSkeleton = ({ count = 4 }) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchBarStub} />
      {Array.from({ length: count }).map((_, idx) => (
        <ProductCardSkeleton key={idx} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900],
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  searchBarStub: {
    height: 104,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.secondary[900],
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    opacity: 0.4,
  },
});

export default ProductListSkeleton;
