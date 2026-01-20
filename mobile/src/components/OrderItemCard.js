import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { getImageUrl } from '../api/config';
import CachedImage from './CachedImage';

const OrderItemCard = ({ item, onPress }) => {
  const { product, quantity, price } = item;

  // Get primary image
  const getProductImageUrl = () => {
    if (product?.images && product.images.length > 0) {
      const firstImage = product.images[0];
      const imagePath = typeof firstImage === 'object' ? firstImage.url : firstImage;
      return getImageUrl(imagePath);
    }
    return null;
  };

  const imageUrl = getProductImageUrl();
  const productName = product?.name || 'Product';
  const productBrand = product?.brand || '';

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress && onPress(product)}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.imageContainer}>
        <CachedImage uri={imageUrl} style={styles.image} resizeMode="cover" placeholderSize={32} />
      </View>

      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>
          {productName}
        </Text>

        {productBrand && (
          <Text style={styles.brand} numberOfLines={1}>
            {productBrand}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Qty:</Text>
            <Text style={styles.quantityValue}>{quantity}</Text>
          </View>

          <Text style={styles.price}>{formatPrice(price)}</Text>
        </View>

        <View style={styles.subtotalContainer}>
          <Text style={styles.subtotalLabel}>Subtotal:</Text>
          <Text style={styles.subtotal}>{formatPrice(price * quantity)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginRight: theme.spacing.md,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.secondary[800],
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  brand: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary[800],
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  quantityLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  quantityValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  price: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  subtotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[800],
  },
  subtotalLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  subtotal: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
});

export default OrderItemCard;
