import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { productService } from '../../api/productService';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import apiClient from '../../api/client';
import Button from '../../components/Button';
import ProductDetailSkeleton from '../../components/skeletons/ProductDetailSkeleton';
import CollapsibleSection from '../../components/CollapsibleSection';
import StickyBottomBar from '../../components/StickyBottomBar';
import CachedImage from '../../components/CachedImage';
import { formatPrice } from '../../utils/formatters';
import theme from '../../styles/theme';
import textSystem from '../../styles/textSystem';
import { getImageUrl } from '../../api/config';

const { width } = Dimensions.get('window');

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const insets = useSafeAreaInsets();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const { createOrGetConversation } = useChat();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  const renderReviewItem = ({ item: review }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <View>
          <Text style={styles.reviewerName}>{review.user?.name || 'Anonymous'}</Text>
          <View style={styles.starsContainer}>{renderStars(review.rating)}</View>
        </View>
        <Text style={styles.reviewDate}>
          {new Date(review.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
    </View>
  );

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [productId]);

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
      Alert.alert('Error', 'Failed to load product details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await apiClient.get(`/reviews/${productId}`);
      setReviews(response.data.data || []);
    } catch (error) {
      console.error('Failed to load reviews');
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to submit a review', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    if (!reviewForm.comment.trim()) {
      Alert.alert('Validation Error', 'Please write a comment');
      return;
    }

    try {
      setSubmittingReview(true);
      await apiClient.post(`/reviews/${productId}`, {
        rating: reviewForm.rating,
        comment: reviewForm.comment,
      });

      Alert.alert('Success', 'Review submitted successfully!');
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: '' });
      fetchReviews();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = () => {
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login to add items to cart',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') },
        ]
      );
      return;
    }

    if (product.stock <= 0) {
      Alert.alert('Out of Stock', 'This product is currently out of stock');
      return;
    }

    if (quantity > product.stock) {
      Alert.alert('Limited Stock', `Only ${product.stock} items available`);
      return;
    }

    addToCart(product, quantity);
    Alert.alert('Success', 'Product added to cart', [
      { text: 'Continue Shopping', style: 'cancel' },
      { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
    ]);
  };

  const handleViewAR = () => {
    Alert.alert('AR View', 'AR functionality will be implemented here');
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to add items to wishlist', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    await toggleWishlist(productId);
  };

  const handleChatWithVendor = async () => {
    if (!user) {
      Alert.alert('Login Required', 'Please login to chat with vendor', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }

    if (!product?.vendor) {
      Alert.alert('Error', 'Vendor information not available');
      return;
    }

    try {
      setChatLoading(true);

      // Create or get existing conversation with this vendor
      const conversation = await createOrGetConversation(
        product._id,
        product.vendor._id || product.vendor
      );

      // Navigate to Chat tab, then to ChatWindow screen within ChatScreen's internal navigator
      // ChatScreen contains a Stack Navigator with 'Conversations' and 'ChatWindow' screens
      navigation.navigate('Chat', {
        screen: 'ChatWindow',
        params: { conversation },
      });
    } catch (error) {
      console.error('Failed to open chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Ionicons
        key={index}
        name={index < rating ? 'star' : 'star-outline'}
        size={16}
        color="#FFA500"
      />
    ));
  };

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return null;
  }

  // Properly handle image URLs from different formats
  const getImageUrls = () => {
    if (product.images && product.images.length > 0) {
      return product.images.map((img) => {
        const imagePath = typeof img === 'object' ? img.url : img;
        return getImageUrl(imagePath);
      });
    }
    return null;
  };

  const images = getImageUrls();
  const hasImages = images && images.length > 0;

  const vendorObj = product?.vendor && typeof product.vendor === 'object' ? product.vendor : null;
  const vendorName = vendorObj?.name || (typeof product?.vendor === 'string' ? 'Vendor' : null);
  const vendorEmail = vendorObj?.email || null;

  const bottomBarHeight = 86;

  return (
    <View style={styles.screen}>
      <View style={[styles.headerBar, { paddingTop: insets.top + theme.spacing.sm }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {product?.name || 'Product'}
        </Text>

        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={handleToggleWishlist}
        >
          <Ionicons
            name={isInWishlist(productId) ? 'heart' : 'heart-outline'}
            size={22}
            color={isInWishlist(productId) ? theme.colors.error : theme.colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: bottomBarHeight + insets.bottom + theme.spacing['3xl'],
        }}
      >
      {/* Image Carousel */}
      <View style={styles.imageContainer}>
        {hasImages ? (
          <>
            {/* Backdrop fill so the main image never looks "floating" */}
            <CachedImage
              uri={images[selectedImage]}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              placeholderSize={56}
            />
            <View style={styles.imageBackdropTint} />

            <CachedImage
              uri={images[selectedImage]}
              style={styles.mainImage}
              resizeMode="contain"
              placeholderSize={56}
            />
            {images.length > 1 && (
              <View style={styles.paginationContainer}>
                {images.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      selectedImage === index && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.placeholderContainer}>
            <Ionicons name="image-outline" size={80} color={theme.colors.text.tertiary} />
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}
      </View>

      {/* Thumbnail ScrollView */}
      {hasImages && images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailScrollView}
          contentContainerStyle={styles.thumbnailContainer}
        >
          {images.map((image, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => setSelectedImage(index)}
              style={[
                styles.thumbnail,
                selectedImage === index && styles.thumbnailActive,
              ]}
            >
              <CachedImage
                uri={image}
                style={styles.thumbnailImage}
                resizeMode="cover"
                placeholderSize={20}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.name}>{product.name}</Text>
            <Text style={styles.category}>{product.category}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
        </View>

        <View style={styles.stockContainer}>
          {product.stock > 0 ? (
            <Text style={styles.inStock}>In Stock ({product.stock} available)</Text>
          ) : (
            <Text style={styles.outOfStock}>Out of Stock</Text>
          )}
        </View>

        {vendorName ? (
          <View style={styles.vendorCard}>
            <View style={styles.vendorRow}>
              <View style={styles.vendorLeft}>
                <View style={styles.vendorIconWrap}>
                  <Ionicons name="storefront-outline" size={18} color={theme.colors.text.secondary} />
                </View>
                <View style={styles.vendorTextWrap}>
                  <Text style={styles.vendorLabel}>Published by</Text>
                  <Text style={styles.vendorName} numberOfLines={1}>{vendorName}</Text>
                  {vendorEmail ? (
                    <Text style={styles.vendorEmail} numberOfLines={1}>{vendorEmail}</Text>
                  ) : null}
                </View>
              </View>

              {product?.vendor ? (
                <TouchableOpacity
                  style={[styles.vendorChatButton, chatLoading && styles.vendorChatButtonDisabled]}
                  onPress={handleChatWithVendor}
                  activeOpacity={0.85}
                  disabled={chatLoading}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {chatLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.text.primary} />
                  ) : (
                    <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.colors.text.primary} />
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ) : null}

        <CollapsibleSection title="Description" defaultExpanded>
          <Text
            style={styles.description}
            numberOfLines={descriptionExpanded ? undefined : 4}
          >
            {product.description || 'No description available'}
          </Text>
          {(product.description || '').length > 120 ? (
            <TouchableOpacity
              style={styles.readMoreButton}
              onPress={() => setDescriptionExpanded((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.readMoreText}>
                {descriptionExpanded ? 'Show less' : 'Read more'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </CollapsibleSection>

        {product.specifications && Object.keys(product.specifications).length > 0 ? (
          <CollapsibleSection title="Specifications" defaultExpanded={false}>
            {Object.entries(product.specifications).map(([key, value]) => (
              <View key={key} style={styles.specRow}>
                <Text style={styles.specKey}>{key}:</Text>
                <Text style={styles.specValue}>{value}</Text>
              </View>
            ))}
          </CollapsibleSection>
        ) : null}

        <TouchableOpacity
          style={styles.arAction}
          onPress={handleViewAR}
          activeOpacity={0.9}
        >
          <View style={styles.arActionLeft}>
            <View style={styles.arActionIconWrap}>
              <Ionicons name="cube-outline" size={18} color={theme.colors.primary[500]} />
            </View>
            <View style={styles.arActionTextWrap}>
              <Text style={styles.arActionTitle}>AR Preview</Text>
              <Text style={styles.arActionSubtitle} numberOfLines={1}>
                Preview how it looks on your car
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.text.tertiary} />
        </TouchableOpacity>

        <CollapsibleSection
          title="Reviews"
          expanded={reviewsExpanded}
          onToggle={setReviewsExpanded}
          rightSummary={reviews.length > 0 ? `(${reviews.length})` : undefined}
        >
          {!showReviewForm && (
            <TouchableOpacity
              style={styles.writeReviewButton}
              onPress={() => {
                setReviewsExpanded(true);
                setShowReviewForm(true);
              }}
              activeOpacity={0.9}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.primary[500]} />
              <Text style={styles.writeReviewText}>Write a review</Text>
            </TouchableOpacity>
          )}

          {/* Review Form */}
          {showReviewForm && (
            <View style={styles.reviewForm}>
              <Text style={styles.reviewFormTitle}>Write Your Review</Text>

              {/* Star Rating Selector */}
              <View style={styles.ratingSelector}>
                <Text style={styles.ratingLabel}>Rating</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setReviewForm({ ...reviewForm, rating: star })}
                    >
                      <Ionicons
                        name={star <= reviewForm.rating ? 'star' : 'star-outline'}
                        size={32}
                        color="#FFA500"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Comment Input */}
              <View style={styles.commentInputGroup}>
                <Text style={styles.commentLabel}>Your Review</Text>
                <TextInput
                  style={styles.commentInput}
                  value={reviewForm.comment}
                  onChangeText={(text) => setReviewForm({ ...reviewForm, comment: text })}
                  placeholder="Share your experience with this product..."
                  placeholderTextColor={theme.colors.text.tertiary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Form Actions */}
              <View style={styles.reviewFormActions}>
                <TouchableOpacity
                  style={styles.cancelReviewButton}
                  onPress={() => {
                    setShowReviewForm(false);
                    setReviewForm({ rating: 5, comment: '' });
                  }}
                >
                  <Text style={styles.cancelReviewText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitReviewButton}
                  onPress={handleSubmitReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitReviewText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <View style={styles.noReviews}>
              <Ionicons
                name="chatbubble-outline"
                size={36}
                color={theme.colors.text.tertiary}
              />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSubtext}>Be the first to review this product.</Text>
            </View>
          ) : (
            <FlatList
              data={reviews}
              renderItem={renderReviewItem}
              keyExtractor={(review, index) => review?._id || String(index)}
              scrollEnabled={false}
              contentContainerStyle={styles.reviewsList}
            />
          )}
        </CollapsibleSection>
      </View>
      </ScrollView>

      <StickyBottomBar>
        <View style={styles.bottomBarRow}>
          <View style={styles.bottomQty}>
            <TouchableOpacity
              style={[styles.qtyButton, quantity <= 1 && styles.qtyButtonDisabled]}
              onPress={decrementQuantity}
              disabled={quantity <= 1}
              activeOpacity={0.8}
            >
              <Text style={styles.qtyButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity
              style={[
                styles.qtyButton,
                quantity >= product.stock && styles.qtyButtonDisabled,
              ]}
              onPress={incrementQuantity}
              disabled={quantity >= product.stock}
              activeOpacity={0.8}
            >
              <Text style={styles.qtyButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomCTA}>
            <Button
              title={product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              onPress={handleAddToCart}
              disabled={product.stock <= 0}
              style={styles.addToCartCTA}
            />
          </View>
        </View>
      </StickyBottomBar>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: width,
    height: width,
    backgroundColor: theme.colors.secondary[800],
    position: 'relative',
  },
  imageBackdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary[800],
  },
  placeholderText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: theme.spacing.lg,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  paginationDotActive: {
    backgroundColor: theme.colors.brand.main,
    width: 24,
  },
  thumbnailScrollView: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  thumbnailContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.secondary[700],
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: theme.colors.brand.main,
    borderWidth: 3,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  headerLeft: {
    flex: 1,
    marginRight: theme.spacing.lg,
  },
  name: {
    ...textSystem.screenTitle,
    marginBottom: theme.spacing.xs,
  },
  category: {
    ...textSystem.screenSubtitle,
  },
  price: {
    ...textSystem.price,
  },
  stockContainer: {
    marginBottom: theme.spacing.lg,
  },
  inStock: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.success,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  outOfStock: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  vendorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    padding: theme.spacing.md,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  vendorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minWidth: 0,
  },
  vendorIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.secondary[800],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  vendorTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  vendorLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
    marginBottom: 2,
  },
  vendorName: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  vendorEmail: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  vendorChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorChatButtonDisabled: {
    opacity: 0.6,
  },
  arAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    backgroundColor: theme.colors.surface,
    ...theme.shadows.soft,
  },
  arActionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    minWidth: 0,
  },
  arActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(185, 28, 28, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arActionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  arActionTitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  arActionSubtitle: {
    marginTop: 2,
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  description: {
    ...textSystem.body,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    paddingTop: theme.spacing.sm,
  },
  readMoreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[800],
  },
  specKey: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, // #E8E8E8
    width: 120,
  },
  specValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary, // #B3B3B3
    flex: 1,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  secondaryButton: {
    flex: 1,
    marginBottom: 0,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  bottomQty: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  qtyButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  qtyButtonDisabled: {
    opacity: 0.4,
  },
  qtyButtonText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  qtyText: {
    width: 40,
    textAlign: 'center',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.secondary[900],
  },
  bottomCTA: {
    flex: 1,
  },
  addToCartCTA: {
    marginBottom: 0,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  writeReviewText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  reviewForm: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  reviewFormTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  ratingSelector: {
    marginBottom: theme.spacing.lg,
  },
  ratingLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  commentInputGroup: {
    marginBottom: theme.spacing.lg,
  },
  commentLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  commentInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary[600],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
    minHeight: 100,
  },
  reviewFormActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  cancelReviewButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.text.tertiary,
    alignItems: 'center',
  },
  cancelReviewText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  submitReviewButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
  },
  submitReviewText: {
    fontSize: theme.typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: theme.typography.fontWeight.bold,
  },
  noReviews: {
    alignItems: 'center',
    padding: theme.spacing['3xl'],
  },
  noReviewsText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  noReviewsSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  reviewsList: {
    gap: theme.spacing.md,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  reviewerName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  reviewDate: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
  },
  reviewComment: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});

export default ProductDetailScreen;
