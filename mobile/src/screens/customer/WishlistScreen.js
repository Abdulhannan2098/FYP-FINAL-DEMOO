import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import Header from '../../components/Header';
import theme from '../../styles/theme';
import { formatPKR } from '../../utils/formatters';
import { getImageUrl } from '../../api/config';

const WishlistScreen = ({ navigation }) => {
  const { wishlist, loading, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [clearing, setClearing] = useState(false);

  const handleRemove = (productId) => {
    Alert.alert(
      'Remove Item',
      'Remove this item from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromWishlist(productId),
        },
      ]
    );
  };

  const handleAddToCart = async (item) => {
    const product = item.product || item;
    addToCart(product, 1);
    Alert.alert('Success', 'Added to cart');
  };

  const handleClearAll = () => {
    if (!wishlist?.length || clearing) return;

    Alert.alert(
      'Clear Wishlist',
      'Remove all items from your wishlist?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setClearing(true);
              await clearWishlist();
            } finally {
              setClearing(false);
            }
          },
        },
      ]
    );
  };

  const renderWishlistItem = ({ item }) => {
    const product = item.product || item;
    const productName = product.name || 'Unknown Product';
    const productCategory = product.category || 'Uncategorized';
    const productPrice = product.price || 0;
    const productStock = product.stock || 0;
    const productRating = product.rating || 0;
    const productReviews = product.numReviews || 0;
    const productId = product._id || product.id || '';

    const getProductImageUrl = () => {
      if (product.images && product.images.length > 0) {
        const firstImage = product.images[0];
        const imagePath = typeof firstImage === 'object' ? firstImage.url : firstImage;
        return getImageUrl(imagePath);
      }
      return null;
    };

    const imageUrl = getProductImageUrl();

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => navigation.navigate('ProductDetail', { productId })}
          activeOpacity={0.9}
        >
          {/* Product Image */}
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, { justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={40} color={theme.colors.text.tertiary} />
            </View>
          )}

          {/* Product Info */}
          <View style={styles.info}>
            <Text style={styles.category}>{productCategory}</Text>
            <Text style={styles.name} numberOfLines={2}>{productName}</Text>
            {productRating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFA500" />
                <Text style={styles.ratingText}>
                  {productRating.toFixed(1)} ({productReviews})
                </Text>
              </View>
            )}
            <Text style={styles.price}>{formatPKR(productPrice)}</Text>
            {productStock > 0 ? (
              <Text style={styles.stockInStock}>{productStock} in stock</Text>
            ) : (
              <Text style={styles.stockOutOfStock}>Out of stock</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.addToCartButton]}
            onPress={() => handleAddToCart(item)}
            disabled={productStock === 0}
          >
            <Ionicons name="cart-outline" size={18} color="#FFFFFF" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => handleRemove(productId)}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.primary[500]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading message="Loading wishlist..." />;
  }

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>My Wishlist</Text>
          <Text style={styles.count}>{wishlist.length} items</Text>
        </View>

        {wishlist.length > 0 && (
          <TouchableOpacity
            style={[styles.clearButton, (clearing || loading) && styles.clearButtonDisabled]}
            onPress={handleClearAll}
            activeOpacity={0.7}
            disabled={clearing || loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={theme.colors.primary[500]} />
            ) : (
              <Text style={styles.clearButtonText}>Clear All</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {wishlist.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="Your wishlist is empty"
          message="Start adding products you love!"
          actionLabel="Browse Products"
          onAction={() => navigation.navigate('Products')}
        />
      ) : (
        <FlatList
          data={wishlist}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => (item.product?._id || item._id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900],
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    paddingRight: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  count: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    backgroundColor: theme.colors.surface,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonDisabled: {
    opacity: 0.6,
  },
  clearButtonText: {
    color: theme.colors.primary[500],
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  list: {
    padding: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.medium,
    elevation: 3,
  },
  cardContent: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.secondary[800],
  },
  info: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
  },
  category: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  name: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  ratingText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  price: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
    marginTop: theme.spacing.xs,
  },
  stockInStock: {
    fontSize: theme.typography.fontSize.xs,
    color: '#22c55e',
    marginTop: theme.spacing.xs,
  },
  stockOutOfStock: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  addToCartButton: {
    flex: 1,
    backgroundColor: theme.colors.primary[500],
    elevation: 2,
    shadowColor: theme.colors.primary[500],
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 0.5,
  },
  removeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.md,
  },
});

export default WishlistScreen;
