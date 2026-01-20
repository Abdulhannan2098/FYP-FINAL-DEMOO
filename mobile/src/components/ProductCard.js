import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import { formatPKR } from '../utils/formatters';
import { getImageUrl } from '../api/config';
import CachedImage from './CachedImage';

const ProductCard = ({ product, onPress }) => {
  const productName = product.name || 'Unknown Product';
  const productCategory = product.category || 'Uncategorized';
  const productPrice = product.price || 0;
  const productStock = product.stock || 0;
  const productRating = product.rating || 0;
  const productReviews = product.numReviews || 0;

  // Properly handle image URL from different formats
  const getProductImageUrl = () => {
    if (product.images && product.images.length > 0) {
      const firstImage = product.images[0];
      // Handle both object format {url: '...'} and string format
      const imagePath = typeof firstImage === 'object' ? firstImage.url : firstImage;
      // Use the helper function to construct full URL
      return getImageUrl(imagePath);
    }
    return null;
  };

  const imageUrl = getProductImageUrl();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Product Image Container */}
      <View style={styles.imageContainer}>
        <CachedImage
          uri={imageUrl}
          style={styles.image}
          resizeMode="cover"
          placeholderSize={48}
        />

        {/* Stock Overlay for Out of Stock */}
        {productStock === 0 && (
          <View style={styles.outOfStockOverlay}>
            <Ionicons name="close-circle" size={24} color="#FFFFFF" />
            <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
          </View>
        )}

        {/* Verified Badge */}
        {product.isApproved && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}

        {/* Discount Badge if applicable */}
        {product.discount && product.discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discount}% OFF</Text>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.content}>
        {/* Category */}
        <Text style={styles.category} numberOfLines={1}>
          {productCategory}
        </Text>

        {/* Product Name */}
        <Text style={styles.name} numberOfLines={2}>
          {productName}
        </Text>

        {/* Rating Stars */}
        {productRating > 0 && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= productRating ? 'star' : star - 0.5 <= productRating ? 'star-half' : 'star-outline'}
                  size={14}
                  color="#fbbf24"
                  style={styles.starIcon}
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {productRating.toFixed(1)} ({productReviews})
            </Text>
          </View>
        )}

        {/* Price & Stock */}
        <View style={styles.footer}>
          <Text style={styles.price}>{formatPKR(productPrice)}</Text>
          {productStock > 0 && (
            <Text style={styles.stockText}>{productStock} in stock</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.secondary[800],
  },
  image: {
    width: '100%',
    height: '100%',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  outOfStockText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 1.5,
  },
  verifiedBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  verifiedText: {
    color: '#22c55e',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  discountBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  content: {
    padding: theme.spacing.lg,
  },
  category: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: 0.4,
    marginBottom: theme.spacing.xs,
  },
  name: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    lineHeight: 24,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
  },
  price: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
  stockText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
});

export default ProductCard;
