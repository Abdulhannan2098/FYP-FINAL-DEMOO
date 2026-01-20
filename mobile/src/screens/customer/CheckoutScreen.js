import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import Header from '../../components/Header';
import StickyBottomBar from '../../components/StickyBottomBar';
import theme from '../../styles/theme';
import { formatPKR } from '../../utils/formatters';

const CheckoutScreen = ({ navigation }) => {
  const { cartItems, getCartTotal, clearCart, getCartByVendor, getVendorCount } = useCart();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const vendorGroups = getCartByVendor();

  const [shippingAddress, setShippingAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || '',
  });

  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigation.navigate('Login');
      return;
    }

    if (cartItems.length === 0) {
      navigation.navigate('Cart');
      return;
    }
  }, [user, cartItems]);

  const handleInputChange = (name, value) => {
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state ||
        !shippingAddress.zipCode || !shippingAddress.country) {
      Alert.alert('Validation Error', 'Please fill in all shipping address fields');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Prepare order items
      const items = cartItems.map((item) => ({
        product: item._id || item.product?._id,
        quantity: item.quantity,
        price: item.price || item.product?.price,
      }));

      // Create order (backend will handle multi-vendor splitting)
      const response = await apiClient.post('/orders', {
        items,
        shippingAddress,
        paymentMethod,
      });

      const { vendorCount } = response.data.data;

      if (vendorCount > 1) {
        Alert.alert('Success', `Successfully created ${vendorCount} orders from ${vendorCount} vendors!`);
      } else {
        Alert.alert('Success', 'Order placed successfully!');
      }

      clearCart();
      navigation.navigate('Orders');
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const renderVendorItem = ({ item, index }) => {
    const itemName = item.name || 'Unknown Product';
    const itemPrice = item.price || 0;
    const itemQuantity = item.quantity || 1;

    return (
      <View style={styles.orderItem}>
        <Text style={styles.orderItemName}>
          {itemName} x {itemQuantity}
        </Text>
        <Text style={styles.orderItemPrice}>{formatPKR(itemPrice * itemQuantity)}</Text>
      </View>
    );
  };

  const renderVendorGroup = ({ item: vendorGroup }) => (
    <View style={styles.vendorGroup}>
      {getVendorCount() > 1 && (
        <View style={styles.vendorHeader}>
          <Ionicons name="storefront-outline" size={16} color={theme.colors.primary[500]} />
          <Text style={styles.vendorName}>{vendorGroup.vendorName || 'Unknown Vendor'}</Text>
        </View>
      )}
      <View style={styles.orderItems}>
        <FlatList
          data={vendorGroup.items || []}
          renderItem={renderVendorItem}
          keyExtractor={(item, index) => item?._id || item?.productId || `${vendorGroup.vendorId}-${index}`}
          scrollEnabled={false}
        />
      </View>
    </View>
  );

  if (!user || cartItems.length === 0) {
    return null;
  }

  const bottomBarHeight = 78;

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: bottomBarHeight + insets.bottom + theme.spacing.xl,
        }}
      >
        <View style={styles.content}>
          <Text style={styles.pageTitle}>Checkout</Text>

          {/* Shipping Address */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shipping Address</Text>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address</Text>
                <TextInput
                  style={styles.input}
                  value={shippingAddress.street}
                  onChangeText={(value) => handleInputChange('street', value)}
                  placeholder="123 Main St"
                  placeholderTextColor={theme.colors.text.tertiary}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={shippingAddress.city}
                    onChangeText={(value) => handleInputChange('city', value)}
                    placeholder="New York"
                    placeholderTextColor={theme.colors.text.tertiary}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>State</Text>
                  <TextInput
                    style={styles.input}
                    value={shippingAddress.state}
                    onChangeText={(value) => handleInputChange('state', value)}
                    placeholder="NY"
                    placeholderTextColor={theme.colors.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Zip Code</Text>
                  <TextInput
                    style={styles.input}
                    value={shippingAddress.zipCode}
                    onChangeText={(value) => handleInputChange('zipCode', value)}
                    placeholder="10001"
                    placeholderTextColor={theme.colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Country</Text>
                  <TextInput
                    style={styles.input}
                    value={shippingAddress.country}
                    onChangeText={(value) => handleInputChange('country', value)}
                    placeholder="USA"
                    placeholderTextColor={theme.colors.text.tertiary}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {['Credit Card', 'Debit Card', 'PayPal', 'Cash on Delivery'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={styles.paymentOption}
                  onPress={() => setPaymentMethod(method)}
                >
                  <View style={styles.radio}>
                    {paymentMethod === method && <View style={styles.radioSelected} />}
                  </View>
                  <Text style={styles.paymentText}>{method}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>

            {/* Multi-vendor info */}
            {getVendorCount() > 1 && (
              <View style={styles.multiVendorInfo}>
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary[400]} />
                <Text style={styles.multiVendorText}>
                  {getVendorCount()} separate orders will be created
                </Text>
              </View>
            )}

            {/* Vendor groups */}
            <FlatList
              data={vendorGroups}
              renderItem={renderVendorGroup}
              keyExtractor={(vendorGroup) => vendorGroup.vendorId}
              scrollEnabled={false}
            />

            {/* Totals */}
            <View style={styles.totals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatPKR(getCartTotal())}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Shipping</Text>
                <Text style={styles.totalValueFree}>Free</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>{formatPKR(0)}</Text>
              </View>
              <View style={styles.totalRowGrand}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatPKR(getCartTotal())}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.termsText}>
            By placing your order, you agree to our terms and conditions
          </Text>

          {/* Footer Spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <StickyBottomBar>
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </StickyBottomBar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  pageTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xl,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  form: {
    gap: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 1,
    borderColor: theme.colors.secondary[600],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  paymentMethods: {
    gap: theme.spacing.sm,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: theme.colors.secondary[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    width: 12,
    height: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[500],
  },
  paymentText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
  },
  multiVendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(185, 28, 28, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.3)',
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  multiVendorText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  vendorGroup: {
    marginBottom: theme.spacing.lg,
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
  },
  vendorName: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary[400],
  },
  orderItems: {
    gap: theme.spacing.sm,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemName: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  orderItemPrice: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  totals: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  totalValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  totalValueFree: {
    fontSize: theme.typography.fontSize.sm,
    color: '#22c55e',
  },
  totalRowGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  grandTotalLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  grandTotalValue: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
  placeOrderButton: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.neonRed,
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
});

export default CheckoutScreen;
