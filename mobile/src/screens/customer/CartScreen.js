import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../../context/CartContext';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import CachedImage from '../../components/CachedImage';
import { formatPrice } from '../../utils/formatters';
import { getImageUrl } from '../../api/config';
import theme from '../../styles/theme';

const CartScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart before checkout');
      return;
    }

    navigation.navigate('Checkout');
  };

  const handleClearAll = () => {
    if (!cartItems?.length || clearing || loading) return;

    Alert.alert('Clear Cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            setClearing(true);
            await clearCart();
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  };

  const handleRemoveItem = (productId, productName) => {
    Alert.alert('Remove Item', `Remove ${productName} from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeFromCart(productId),
      },
    ]);
  };

  const incrementQuantity = (item) => {
    updateQuantity(item._id, item.quantity + 1);
  };

  const decrementQuantity = (item) => {
    if (item.quantity > 1) {
      updateQuantity(item._id, item.quantity - 1);
    }
  };

  const renderCartItem = ({ item }) => {
    const itemName = item.name || 'Unknown Product';
    const itemPrice = item.price || 0;
    const itemQuantity = item.quantity || 1;
    const itemId = item._id || item.id || '';

    const getProductImageUrl = () => {
      if (item.images && item.images.length > 0) {
        const firstImage = item.images[0];
        const imagePath = typeof firstImage === 'object' ? firstImage.url : firstImage;
        return getImageUrl(imagePath);
      }
      return null;
    };

    const imageUrl = getProductImageUrl();
    const itemTotal = itemPrice * itemQuantity;

    return (
      <View style={styles.cartItem}>
        <CachedImage uri={imageUrl} style={styles.itemImage} resizeMode="cover" placeholderSize={32} />

        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>
            {itemName}
          </Text>

          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.quantityButton} onPress={() => decrementQuantity(item)}>
              <Ionicons name="remove" size={16} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{itemQuantity}</Text>
            <TouchableOpacity style={styles.quantityButton} onPress={() => incrementQuantity(item)}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemRight}>
          <TouchableOpacity
            onPress={() => handleRemoveItem(itemId, itemName)}
            style={styles.removeButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
          <Text style={styles.itemTotal} numberOfLines={1}>
            {formatPrice(itemTotal)}
          </Text>
        </View>
      </View>
    );
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <EmptyState
          title="Your Cart is Empty"
          message="Add some products to get started"
          actionLabel="Browse Products"
          onAction={() => navigation.navigate('Home')}
        />
      </SafeAreaView>
    );
  }

  const total = getCartTotal();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={[styles.headerOuter, { paddingTop: insets.top }]}>
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Shopping Cart</Text>
            <Text style={styles.headerSubtitle}>
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

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
        </View>
      </View>

      <FlatList
        data={cartItems}
        renderItem={renderCartItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
        </View>
        <Button
          title="Proceed to Checkout"
          onPress={handleCheckout}
          loading={loading}
          style={styles.checkoutButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  headerOuter: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
    backgroundColor: theme.colors.surface,
  },
  headerInner: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
    paddingRight: theme.spacing.lg,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
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
  cartItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.secondary[800],
  },
  itemDetails: {
    flex: 1,
    marginLeft: theme.spacing.md,
    justifyContent: 'space-between',
    paddingRight: theme.spacing.md,
  },
  itemName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  itemPrice: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
    marginBottom: theme.spacing.sm,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  quantityButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    minWidth: 24,
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: theme.spacing.sm,
    minWidth: 92,
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  itemTotal: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  footer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[800],
    ...theme.shadows.strong,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  totalAmount: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
  checkoutButton: {
    backgroundColor: theme.colors.primary[500],
  },
});

export default CartScreen;
