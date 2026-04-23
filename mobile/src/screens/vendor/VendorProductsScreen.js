import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../../api/productService';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import ImagePickerGrid from '../../components/vendor/ImagePickerGrid';
import theme from '../../styles/theme';
import CachedImage from '../../components/CachedImage';
import { getImageUrl } from '../../api/config';
import { formatPKR } from '../../utils/formatters';

const CATEGORIES = [
  'Rims & Wheels',
  'Spoilers',
  'Body Kits',
  'Hoods',
  'LED Lights',
  'Body Wraps / Skins',
  'Exhaust Systems',
  'Interior Accessories',
];

const VendorProductsScreen = ({ navigation, route }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: CATEGORIES[0],
    price: '',
    stock: '',
  });
  const [selectedImages, setSelectedImages] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProducts();
    }, [])
  );

  const GRID_PADDING = theme.spacing.lg;
  const GRID_GAP = theme.spacing.lg;
  const cardWidth = Math.floor((width - GRID_PADDING * 2 - GRID_GAP) / 2);

  const getProductImageUrl = (product) => {
    if (product?.images && product.images.length > 0) {
      const firstImage = product.images[0];
      const imagePath = typeof firstImage === 'object' ? firstImage.url : firstImage;
      return getImageUrl(imagePath);
    }
    return null;
  };

  const getApprovalMeta = (product) => {
    const raw = (product?.approvalStatus ?? '').toString().trim();
    const normalized = raw.toLowerCase();

    if (normalized === 'approved' || product?.isApproved === true) {
      return {
        label: 'LIVE',
        icon: 'checkmark-circle-outline',
        style: styles.approvalBadgeLive,
        textStyle: styles.approvalBadgeTextLive,
      };
    }

    if (normalized === 'rejected') {
      return {
        label: 'REJECTED',
        icon: 'close-circle-outline',
        style: styles.approvalBadgeRejected,
        textStyle: styles.approvalBadgeTextRejected,
      };
    }

    return {
      label: 'PENDING',
      icon: 'time-outline',
      style: styles.approvalBadgePending,
      textStyle: styles.approvalBadgeTextPending,
    };
  };

  const fetchProducts = async () => {
    try {
      const response = await productService.getVendorProducts();

      if (response.success && response.data) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const productId = route?.params?.openEditProductId;
    if (!productId) return;

    const open = async () => {
      try {
        let product = products.find(p => p?._id === productId);

        if (!product) {
          const resp = await productService.getProductById(productId);
          if (resp.success && resp.data) product = resp.data;
        }

        if (product) {
          openEditModal(product);
        } else {
          Alert.alert('Error', 'Product not found');
        }
      } catch (e) {
        console.error('Failed to open edit modal:', e);
        Alert.alert('Error', 'Failed to open product editor');
      } finally {
        navigation.setParams({ openEditProductId: undefined });
      }
    };

    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.openEditProductId, products]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      category: CATEGORIES[0],
      price: '',
      stock: '',
    });
    setSelectedImages([]);
    setFormErrors({});
    setModalVisible(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price.toString(),
      stock: product.stock.toString(),
    });
    // Convert existing images to the format expected by ImagePickerGrid
    const existingImages = product.images?.map((img, index) => ({
      uri: img.url || img,
      type: 'image/jpeg',
      name: `existing_${index}.jpg`,
      isExisting: true,
    })) || [];
    setSelectedImages(existingImages);
    setFormErrors({});
    setModalVisible(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      errors.price = 'Valid price is required';
    }

    if (!formData.stock || isNaN(formData.stock) || parseInt(formData.stock) < 0) {
      errors.stock = 'Valid stock is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = async () => {
    if (saving) return;
    if (!validateForm()) return;

    // Validate images for new product
    const newImages = selectedImages.filter(img => !img.isExisting);
    if (!editingProduct && newImages.length === 0) {
      Alert.alert('Error', 'Please add at least one product image');
      return;
    }

    try {
      setSaving(true);

      let response;

      if (editingProduct) {
        // Update existing product - send JSON data
        const productData = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
        };

        response = await productService.updateProduct(editingProduct._id, productData);

        if (!response.success) {
          Alert.alert('Error', response.message || 'Failed to update product');
          return;
        }

        // Upload new images if any
        if (newImages.length > 0) {
          try {
            const imageFormData = new FormData();
            newImages.forEach((image, index) => {
              imageFormData.append('images', {
                uri: image.uri,
                type: image.type || 'image/jpeg',
                name: image.name || `product_${index}.jpg`,
              });
            });
            await productService.uploadProductImages(editingProduct._id, imageFormData);
          } catch (uploadError) {
            console.error('Error uploading images:', uploadError);
            Alert.alert(
              'Warning',
              'Product updated but some images failed to upload. You can edit the product to retry.'
            );
          }
        }
      } else {
        // Create new product - send FormData with images
        const productFormData = new FormData();
        productFormData.append('name', formData.name);
        productFormData.append('description', formData.description);
        productFormData.append('category', formData.category);
        productFormData.append('price', parseFloat(formData.price));
        productFormData.append('stock', parseInt(formData.stock));

        // Append images
        newImages.forEach((image, index) => {
          productFormData.append('images', {
            uri: image.uri,
            type: image.type || 'image/jpeg',
            name: image.name || `product_${index}.jpg`,
          });
        });

        response = await productService.createProductWithImages(productFormData);

        if (!response.success) {
          Alert.alert('Error', response.message || 'Failed to create product');
          return;
        }
      }

      // Use AI-decision message from backend for new products; generic message for edits
      const successMessage = editingProduct
        ? 'Product updated successfully'
        : response.data?.message || 'Product submitted successfully';

      Alert.alert('Success', successMessage);
      setModalVisible(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await productService.deleteProduct(product._id);
              if (response.success) {
                Alert.alert('Success', 'Product deleted successfully');
                fetchProducts();
              } else {
                Alert.alert('Error', response.message || 'Failed to delete product');
              }
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const getStatusMessage = (product) => {
    const normalized = (product?.approvalStatus ?? '').toString().trim().toLowerCase();
    if (normalized === 'rejected') {
      return {
        text: 'Not approved — does not fit our car modification & customisation category.',
        style: styles.statusMsgRejected,
      };
    }
    if (normalized !== 'approved' && product?.isApproved !== true) {
      return {
        text: 'Under review. Our team will verify it shortly.',
        style: styles.statusMsgPending,
      };
    }
    return null;
  };

  const GridProductCard = ({ product }) => {
    const imageUrl = getProductImageUrl(product);
    const productName = product?.name || 'Unknown Product';
    const productPrice = product?.price || 0;
    const productStock = typeof product?.stock === 'number' ? product.stock : null;
    const approvalMeta = getApprovalMeta(product);
    const statusMsg = getStatusMessage(product);

    return (
      <View style={[styles.gridItemWrap, { width: cardWidth }]}>
        <TouchableOpacity
          style={styles.gridCard}
          onPress={() => navigation.navigate('VendorProductDetail', { productId: product._id })}
          activeOpacity={0.9}
        >
          <View style={[styles.gridImageWrap, { height: Math.max(130, Math.round(cardWidth * 0.78)) }]}>
            <CachedImage uri={imageUrl} style={styles.gridImage} resizeMode="cover" placeholderSize={40} />

            <View style={[styles.approvalBadge, approvalMeta.style]}>
              <Ionicons name={approvalMeta.icon} size={13} color={approvalMeta.textStyle.color} />
              <Text style={[styles.approvalBadgeText, approvalMeta.textStyle]}>{approvalMeta.label}</Text>
            </View>

            {product?.stock === 0 && (
              <View style={styles.gridOutOfStockOverlay}>
                <Text style={styles.gridOutOfStockText}>OUT OF STOCK</Text>
              </View>
            )}
          </View>

          <View style={styles.gridContent}>
            <Text style={styles.gridName} numberOfLines={2}>
              {productName}
            </Text>
            <View style={styles.gridMeta}>
              <Text style={styles.gridPrice} numberOfLines={1}>
                {formatPKR(productPrice)}
              </Text>
              {productStock !== null && (
                <View style={[styles.stockPill, productStock === 0 && styles.stockPillOut]}>
                  <Text
                    style={[styles.stockPillText, productStock === 0 && styles.stockPillTextOut]}
                    numberOfLines={1}
                  >
                    {productStock === 0 ? 'Out of stock' : `Stock: ${productStock}`}
                  </Text>
                </View>
              )}
            </View>
            {statusMsg && (
              <View style={[styles.statusMsgStrip, statusMsg.style]}>
                <Text style={styles.statusMsgText} numberOfLines={3}>
                  {statusMsg.text}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>My Products</Text>
            <Text style={styles.headerSubtitle}>
              {products.length} {products.length === 1 ? 'product' : 'products'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addIconButton}
            onPress={openAddModal}
            activeOpacity={0.9}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {products.length === 0 ? (
        <EmptyState
          title="No Products"
          message="You haven't added any products yet"
          actionLabel="Add Product"
          onAction={openAddModal}
        />
      ) : (
        <FlatList
          data={products}
          renderItem={({ item }) => <GridProductCard product={item} />}
          keyExtractor={(item) => item._id}
          numColumns={2}
          key="vendor-products-grid"
          contentContainerStyle={styles.gridList}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary[500]}
              colors={[theme.colors.primary[500]]}
            />
          }
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['left', 'right', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.modalHeader, { paddingTop: theme.spacing.md + insets.top }]}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </Text>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <ImagePickerGrid
                images={selectedImages}
                onImagesChange={setSelectedImages}
                maxImages={5}
              />

              <Input
                label="Product Name"
                value={formData.name}
                onChangeText={(value) => setFormData({ ...formData, name: value })}
                placeholder="Enter product name"
                error={formErrors.name}
              />

              <Input
                label="Description"
                value={formData.description}
                onChangeText={(value) => setFormData({ ...formData, description: value })}
                placeholder="Enter product description"
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />

              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.categoryButtons}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryButton,
                        formData.category === cat && styles.categoryButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category: cat })}
                    >
                      <Text
                        style={[
                          styles.categoryButtonText,
                          formData.category === cat && styles.categoryButtonTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Price (PKR)"
                value={formData.price}
                onChangeText={(value) => setFormData({ ...formData, price: value })}
                placeholder="Enter price"
                keyboardType="decimal-pad"
                error={formErrors.price}
              />

              <Input
                label="Stock Quantity"
                value={formData.stock}
                onChangeText={(value) => setFormData({ ...formData, stock: value })}
                placeholder="Enter stock quantity"
                keyboardType="number-pad"
                error={formErrors.stock}
              />

              <Button
                title={editingProduct ? 'Update Product' : 'Create Product'}
                onPress={handleSaveProduct}
                loading={saving}
                style={styles.saveButton}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
    backgroundColor: theme.colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  headerTextWrap: {
    flex: 1,
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
  addIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    ...theme.shadows.neonRed,
  },
  gridList: {
    paddingTop: theme.spacing.lg,
    paddingBottom: 80,
    paddingHorizontal: theme.spacing.lg,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.lg,
  },
  gridItemWrap: {
    flexGrow: 0,
  },
  gridCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  gridImageWrap: {
    width: '100%',
    backgroundColor: theme.colors.secondary[800],
    overflow: 'hidden',
  },
  approvalBadge: {
    position: 'absolute',
    top: theme.spacing.sm,
    left: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 5,
  },
  approvalBadgeText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.extrabold,
    letterSpacing: 0.9,
    includeFontPadding: false,
  },
  approvalBadgeLive: {
    borderColor: 'rgba(34, 197, 94, 0.65)',
  },
  approvalBadgeTextLive: {
    color: '#bbf7d0',
  },
  approvalBadgePending: {
    borderColor: 'rgba(245, 158, 11, 0.70)',
  },
  approvalBadgeTextPending: {
    color: '#fde68a',
  },
  approvalBadgeRejected: {
    borderColor: 'rgba(239, 68, 68, 0.70)',
  },
  approvalBadgeTextRejected: {
    color: '#fecaca',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridOutOfStockOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: theme.spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  gridOutOfStockText: {
    textAlign: 'center',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  gridContent: {
    padding: theme.spacing.md,
  },
  gridName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    minHeight: 38,
  },
  gridMeta: {
    marginTop: theme.spacing.sm,
  },
  gridPrice: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
  stockPill: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.28)',
  },
  stockPillOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  stockPillText: {
    fontSize: theme.typography.fontSize.xs,
    color: '#86efac',
    fontWeight: theme.typography.fontWeight.semibold,
  },
  stockPillTextOut: {
    color: '#fca5a5',
  },
  statusMsgStrip: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  statusMsgRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  statusMsgPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  statusMsgText: {
    fontSize: 9.5,
    color: theme.colors.text.secondary,
    lineHeight: 13,
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
    backgroundColor: theme.colors.surface,
  },
  cancelText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.medium,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing['2xl'],
  },
  fieldContainer: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    backgroundColor: theme.colors.surface,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  categoryButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing['3xl'],
  },
});

export default VendorProductsScreen;
