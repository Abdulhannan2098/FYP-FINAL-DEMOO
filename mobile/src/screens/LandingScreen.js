import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { productService } from '../api/productService';
import { useAuth } from '../context/AuthContext';
import CachedImage from '../components/CachedImage';
import HomeSkeleton from '../components/skeletons/HomeSkeleton';
import EmptyState from '../components/EmptyState';
import HeroSlider from '../components/HeroSlider';
import Header from '../components/Header';
import theme from '../styles/theme';
import { getImageUrl } from '../api/config';
import { formatPKR } from '../utils/formatters';

const { width } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const FeaturedProductCard = ({ product, onPress }) => {
    const imageUrl = getProductImageUrl(product);
    const productName = product?.name || 'Unknown Product';
    const productPrice = product?.price || 0;
    const productStock = typeof product?.stock === 'number' ? product.stock : null;

    return (
      <TouchableOpacity style={[styles.featuredCard, { width: cardWidth }]} onPress={onPress} activeOpacity={0.9}>
        <View style={[styles.featuredImageWrap, { height: Math.max(130, Math.round(cardWidth * 0.78)) }]}>
          <CachedImage uri={imageUrl} style={styles.featuredImage} resizeMode="cover" placeholderSize={40} />
        </View>
        <View style={styles.featuredContent}>
          <Text style={styles.featuredName} numberOfLines={2}>
            {productName}
          </Text>
          <View style={styles.featuredMeta}>
            <Text style={styles.featuredPrice} numberOfLines={1}>
              {formatPKR(productPrice)}
            </Text>
            {productStock !== null && (
              <View
                style={[styles.stockPill, productStock === 0 && styles.stockPillOut]}
              >
                <Text
                  style={[styles.stockPillText, productStock === 0 && styles.stockPillTextOut]}
                  numberOfLines={1}
                >
                  {productStock === 0 ? 'Out of stock' : `Stock: ${productStock}`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeaturedProduct = ({ item, index }) => {
    const isLeft = index % 2 === 0;
    return (
      <View style={{ marginRight: isLeft ? GRID_GAP : 0, marginBottom: GRID_GAP }}>
        <FeaturedProductCard
          product={item}
          onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
        />
      </View>
    );
  };

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getProducts({ limit: 8 });
      if (response.success) {
        setFeaturedProducts(response.data.slice(0, 8));
      }
    } catch (error) {
      console.log('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <Header />
        <HomeSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Header />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Slider */}
        <HeroSlider onSlidePress={() => navigation.navigate('Products')} />

      {/* Featured Products Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <Text style={styles.sectionSubtitle}>Handpicked performance upgrades from top vendors</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Products')}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {featuredProducts.length === 0 ? (
          <EmptyState
            title="No products yet"
            message="Check back soon for new products!"
          />
        ) : (
          <FlatList
            data={featuredProducts}
            renderItem={renderFeaturedProduct}
            keyExtractor={(item) => item._id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.productsGrid}
          />
        )}
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <View style={styles.ctaOverlay}>
          {!user ? (
            // Not logged in
            <>
              <Text style={styles.ctaTitle}>Ready to Upgrade Your Ride?</Text>
              <Text style={styles.ctaSubtitle}>
                Join thousands of car enthusiasts who trust AutoSphere for premium aftermarket modifications
              </Text>
              <TouchableOpacity
                style={styles.ctaButtonPrimary}
                onPress={() => navigation.navigate('Register')}
              >
                <Text style={styles.ctaButtonPrimaryText}>Create Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaButtonSecondary}
                onPress={() => navigation.navigate('Products')}
              >
                <Text style={styles.ctaButtonSecondaryText}>Browse Catalog</Text>
              </TouchableOpacity>
            </>
          ) : user.role === 'vendor' ? (
            // Vendor
            <>
              <Text style={styles.ctaTitle}>Manage Your Products</Text>
              <Text style={styles.ctaSubtitle}>
                Access your vendor dashboard to manage inventory, track orders, and grow your business
              </Text>
              <TouchableOpacity
                style={styles.ctaButtonPrimary}
                onPress={() => navigation.navigate('VendorProducts')}
              >
                <View style={styles.ctaButtonContent}>
                  <Ionicons name="cube-outline" size={20} color={theme.colors.primary[500]} />
                  <Text style={styles.ctaButtonPrimaryText}>My Products</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaButtonSecondary}
                onPress={() => navigation.navigate('VendorOrders')}
              >
                <View style={styles.ctaButtonContent}>
                  <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.ctaButtonSecondaryText}>View Orders</Text>
                </View>
              </TouchableOpacity>
            </>
          ) : (
            // Customer
            <>
              <Text style={styles.ctaTitle}>Find Your Perfect Upgrade</Text>
              <Text style={styles.ctaSubtitle}>
                Explore our complete catalog of premium automotive parts and accessories
              </Text>
              <TouchableOpacity
                style={styles.ctaButtonPrimary}
                onPress={() => navigation.navigate('Products')}
              >
                <View style={styles.ctaButtonContent}>
                  <Ionicons name="search-outline" size={20} color={theme.colors.primary[500]} />
                  <Text style={styles.ctaButtonPrimaryText}>Shop Now</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaButtonSecondary}
                onPress={() => navigation.navigate('Orders')}
              >
                <View style={styles.ctaButtonContent}>
                  <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.ctaButtonSecondaryText}>My Orders</Text>
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

        {/* Footer Spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900], // #171717
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900], // #171717
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    paddingTop: theme.spacing['3xl'],
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  sectionHeaderLeft: {
    flex: 1,
    paddingRight: theme.spacing.md,
  },
  featuredMeta: {
    marginTop: theme.spacing.xs,
  },
  stockPill: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  stockPillOut: {
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.28)',
  },
  stockPillText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  stockPillTextOut: {
    color: theme.colors.error,
  },
  viewAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, // #E8E8E8
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary, // #B3B3B3
  },
  viewAllText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary[500], // #B91C1C
    fontWeight: theme.typography.fontWeight.semibold,
  },
  productsGrid: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: 0,
  },

  featuredCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  featuredImageWrap: {
    width: '100%',
    backgroundColor: theme.colors.secondary[800],
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredContent: {
    padding: theme.spacing.md,
  },
  featuredName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: 6,
    lineHeight: 20,
  },
  featuredPrice: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
  ctaSection: {
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing['3xl'],
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.primary[700],
  },
  ctaOverlay: {
    padding: theme.spacing['3xl'],
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  ctaSubtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: theme.spacing['3xl'],
    lineHeight: 26,
  },
  ctaButtonPrimary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['3xl'],
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadows.medium,
  },
  ctaButtonPrimaryText: {
    color: theme.colors.primary[500], // #B91C1C
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  ctaButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['3xl'],
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    alignItems: 'center',
  },
  ctaButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  ctaButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});

export default LandingScreen;
