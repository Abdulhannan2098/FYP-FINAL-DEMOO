import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { productService } from '../../api/productService';
import CachedImage from '../../components/CachedImage';
import CollapsibleSection from '../../components/CollapsibleSection';
import theme from '../../styles/theme';
import { getImageUrl } from '../../api/config';
import apiClient from '../../api/client';
import { formatPKR } from '../../utils/formatters';

const { width } = Dimensions.get('window');

const VendorProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const insets = useSafeAreaInsets();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);

  const renderStars = (rating) => {
    const r = Math.max(0, Math.min(5, Number(rating) || 0));
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < r ? 'star' : 'star-outline'}
        size={14}
        color="#FBBF24"
        style={{ marginRight: 2 }}
      />
    ));
  };

  const imageUrls = useMemo(() => {
    const imgs = product?.images || [];
    return imgs
      .map(img => (typeof img === 'object' ? img.url : img))
      .filter(Boolean)
      .map(p => getImageUrl(p));
  }, [product]);

  const approvalMeta = useMemo(() => {
    const raw = (product?.approvalStatus ?? '').toString().trim();
    const normalized = raw.toLowerCase();

    if (normalized === 'approved' || product?.isApproved === true) {
      return { label: 'LIVE', icon: 'checkmark-circle-outline', tone: 'live' };
    }
    if (normalized === 'rejected') {
      return { label: 'REJECTED', icon: 'close-circle-outline', tone: 'rejected' };
    }
    return { label: 'PENDING', icon: 'time-outline', tone: 'pending' };
  }, [product]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productService.getProductById(productId);
        if (response.success && response.data) {
          setProduct(response.data);
        } else {
          Alert.alert('Error', 'Product not found');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        Alert.alert('Error', 'Failed to load product');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const res = await apiClient.get(`/reviews/${productId}`);
        setReviews(res.data?.data || []);
      } catch {
        setReviews([]);
      }
    };

    fetchProduct();
    fetchReviews();
  }, [navigation, productId]);

  const handleEdit = () => {
    navigation.navigate('ProductsMain', { openEditProductId: productId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await productService.deleteProduct(productId);
              if (res.success) {
                Alert.alert('Deleted', 'Product deleted successfully');
                navigation.navigate('ProductsMain');
              } else {
                Alert.alert('Error', res.message || 'Failed to delete product');
              }
            } catch (e) {
              console.error('Delete product failed:', e);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ]
    );
  };

  const renderImage = ({ item }) => (
    <View style={styles.imagePage}>
      <CachedImage uri={item} style={styles.heroImage} resizeMode="cover" placeholderSize={48} />
    </View>
  );

  const onViewableItemsChanged = ({ viewableItems }) => {
    if (viewableItems?.length) {
      const idx = viewableItems[0]?.index ?? 0;
      setSelectedImage(idx);
    }
  };

  const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={[styles.header, { paddingTop: theme.spacing.md + insets.top }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconButton} onPress={handleEdit} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color={theme.colors.text.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconButtonDanger} onPress={handleDelete} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary[500]} />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return null;
  }

  const productStock = typeof product?.stock === 'number' ? product.stock : null;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={[styles.header, { paddingTop: theme.spacing.md + insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Product Details
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIconButton} onPress={handleEdit} activeOpacity={0.85}>
            <Ionicons name="create-outline" size={18} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButtonDanger} onPress={handleDelete} activeOpacity={0.85}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <FlatList
            data={imageUrls.length ? imageUrls : [null]}
            keyExtractor={(item, idx) => `${item ?? 'placeholder'}-${idx}`}
            renderItem={renderImage}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />

          <View pointerEvents="none" style={styles.heroTint} />

          <View style={[styles.approvalBadge, styles[`approvalBadge_${approvalMeta.tone}`]]}>
            <Ionicons name={approvalMeta.icon} size={14} color={styles[`approvalText_${approvalMeta.tone}`].color} />
            <Text style={[styles.approvalText, styles[`approvalText_${approvalMeta.tone}`]]}>
              {approvalMeta.label}
            </Text>
          </View>

          {imageUrls.length > 1 ? (
            <View style={styles.dotsRow}>
              {imageUrls.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, idx === selectedImage ? styles.dotActive : styles.dotInactive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{product?.name || 'Product'}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.metaChip, styles[`metaChip_${approvalMeta.tone}`]]}>
              <Ionicons name={approvalMeta.icon} size={14} color={styles[`approvalText_${approvalMeta.tone}`].color} />
              <Text style={[styles.metaChipText, styles[`approvalText_${approvalMeta.tone}`]]}>{approvalMeta.label}</Text>
            </View>
            {product?.category ? (
              <View style={styles.metaChipNeutral}>
                <Ionicons name="pricetag-outline" size={14} color={theme.colors.text.secondary} />
                <Text style={styles.metaChipTextNeutral} numberOfLines={1}>{product.category}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPKR(product?.price || 0)}</Text>
            {productStock !== null ? (
              <View style={[styles.stockPill, productStock === 0 && styles.stockPillOut]}>
                <Text style={[styles.stockPillText, productStock === 0 && styles.stockPillTextOut]}>
                  {productStock === 0 ? 'Out of stock' : `Stock: ${productStock}`}
                </Text>
              </View>
            ) : null}
          </View>

          {approvalMeta.tone === 'rejected' ? (
            <View style={styles.rejectionBox}>
              <View style={styles.statusBoxHeader}>
                <Ionicons name="close-circle-outline" size={16} color="#fca5a5" />
                <Text style={styles.rejectionTitle}>Not Approved</Text>
              </View>
              <Text style={styles.rejectionText}>
                Your product was not approved because it does not belong to the car modification and customisation category, which is against our platform policy.
              </Text>
            </View>
          ) : approvalMeta.tone === 'pending' ? (
            <View style={styles.pendingBox}>
              <View style={styles.statusBoxHeader}>
                <Ionicons name="time-outline" size={16} color="#fde68a" />
                <Text style={styles.pendingTitle}>Under Review</Text>
              </View>
              <Text style={styles.pendingText}>
                Your product is under review. Our team will verify whether it fits within our car modification category.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <CollapsibleSection
            title="Description"
            expanded={descriptionExpanded}
            onToggle={setDescriptionExpanded}
            rightSummary={product?.description ? undefined : 'None'}
          >
            {product?.description ? (
              <Text style={styles.descriptionText}>{product.description}</Text>
            ) : (
              <View style={styles.emptyInline}>
                <Ionicons name="document-text-outline" size={18} color={theme.colors.text.tertiary} />
                <Text style={styles.mutedText}>No description provided.</Text>
              </View>
            )}
          </CollapsibleSection>
        </View>

        <View style={styles.section}>
          <CollapsibleSection
            title={`Reviews (${reviews.length})`}
            expanded={reviewsExpanded}
            onToggle={setReviewsExpanded}
            rightSummary={reviews.length ? `${reviews.length}` : 'New'}
          >
            {reviews.length === 0 ? (
              <View style={styles.emptyInline}>
                <Ionicons name="chatbox-ellipses-outline" size={18} color={theme.colors.text.tertiary} />
                <Text style={styles.mutedText}>No reviews yet.</Text>
              </View>
            ) : (
              <View style={styles.reviewsWrap}>
                {reviews.slice(0, 8).map((r, idx) => (
                  <View key={`${r?._id ?? idx}`} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewName} numberOfLines={1}>
                          {r?.user?.name || 'Customer'}
                        </Text>
                        <View style={styles.starsRow}>{renderStars(r?.rating)}</View>
                      </View>
                      {r?.createdAt ? (
                        <Text style={styles.reviewDate}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </Text>
                      ) : null}
                    </View>
                    {r?.comment ? (
                      <Text style={styles.reviewComment} numberOfLines={4}>
                        {r.comment}
                      </Text>
                    ) : (
                      <Text style={styles.mutedText}>No comment provided.</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </CollapsibleSection>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
    backgroundColor: theme.colors.surface,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  headerIconButtonDanger: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.40)',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: theme.spacing.xl,
  },
  heroWrap: {
    width: '100%',
    backgroundColor: theme.colors.secondary[800],
  },
  heroTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  imagePage: {
    width,
    height: Math.round(width * 0.72),
    backgroundColor: theme.colors.secondary[800],
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    bottom: theme.spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: theme.colors.primary[500],
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  approvalBadge: {
    position: 'absolute',
    top: theme.spacing.lg,
    left: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  approvalText: {
    fontSize: 10,
    fontWeight: theme.typography.fontWeight.extrabold,
    letterSpacing: 0.9,
    includeFontPadding: false,
  },
  approvalBadge_live: {
    borderColor: 'rgba(34, 197, 94, 0.65)',
  },
  approvalText_live: {
    color: '#bbf7d0',
  },
  approvalBadge_pending: {
    borderColor: 'rgba(245, 158, 11, 0.70)',
  },
  approvalText_pending: {
    color: '#fde68a',
  },
  approvalBadge_rejected: {
    borderColor: 'rgba(239, 68, 68, 0.70)',
  },
  approvalText_rejected: {
    color: '#fecaca',
  },
  infoCard: {
    margin: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
  },
  section: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  name: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  metaRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  metaChip_live: {
    borderColor: 'rgba(34, 197, 94, 0.55)',
  },
  metaChip_pending: {
    borderColor: 'rgba(245, 158, 11, 0.60)',
  },
  metaChip_rejected: {
    borderColor: 'rgba(239, 68, 68, 0.60)',
  },
  metaChipText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.extrabold,
    letterSpacing: 0.7,
  },
  metaChipNeutral: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    backgroundColor: 'rgba(255,255,255,0.04)',
    maxWidth: '100%',
  },
  metaChipTextNeutral: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.secondary,
  },
  priceRow: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  price: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
  stockPill: {
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
  statusBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  rejectionBox: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
  },
  rejectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#fecaca',
  },
  rejectionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  pendingBox: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
  },
  pendingTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#fde68a',
  },
  pendingText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  descriptionText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: 22,
  },
  mutedText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  emptyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  reviewsWrap: {
    gap: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: theme.colors.secondary[800],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  reviewName: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  reviewDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: 2,
  },
  reviewComment: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});

export default VendorProductDetailScreen;
