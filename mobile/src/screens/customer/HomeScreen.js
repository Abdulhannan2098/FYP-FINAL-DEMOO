import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
  Dimensions,
} from 'react-native';
import { productService } from '../../api/productService';
import HomeSkeleton from '../../components/skeletons/HomeSkeleton';
import EmptyState from '../../components/EmptyState';
import HeroSlider from '../../components/HeroSlider';
import Header from '../../components/Header';
import theme from '../../styles/theme';
import CachedImage from '../../components/CachedImage';
import { getImageUrl } from '../../api/config';
import { formatPKR } from '../../utils/formatters';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  'All',
  'Rims & Wheels',
  'Spoilers',
  'Body Kits',
  'Hoods',
  'LED Lights',
  'Body Wraps / Skins',
  'Exhaust Systems',
  'Interior Accessories',
];

const HomeScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const GRID_PADDING = theme.spacing.lg;
  const GRID_GAP = theme.spacing.lg;
  const cardWidth = Math.floor((width - GRID_PADDING * 2 - GRID_GAP) / 2);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = selectedCategory !== 'All' ? { category: selectedCategory } : {};
      const response = await productService.getProducts(params);

      if (response.success && response.data) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { productId: product._id });
  };

  const navigateToProductsTab = () => {
    const parent = navigation.getParent?.();
    if (parent) {
      parent.navigate('Products');
      return;
    }
    navigation.navigate('Products');
  };

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
      <TouchableOpacity
        style={[styles.featuredCard, { width: cardWidth }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={[styles.featuredImageWrap, { height: Math.max(130, Math.round(cardWidth * 0.78)) }]}>
          <CachedImage
            uri={imageUrl}
            style={styles.featuredImage}
            resizeMode="cover"
            placeholderSize={40}
          />
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

  const renderProduct = ({ item }) => {
    return (
      <View style={{ marginBottom: GRID_GAP }}>
        <FeaturedProductCard product={item} onPress={() => handleProductPress(item)} />
      </View>
    );
  };

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <View style={styles.wrapper}>
      <Header />
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.gridRow}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
        ListHeaderComponent={
          <>
            <HeroSlider onSlidePress={navigateToProductsTab} />

            <View style={styles.categoriesSection}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
              >
                {CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.categoryButton,
                      selectedCategory === item && styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selectedCategory === item && styles.categoryTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.productsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured Products</Text>
                <TouchableOpacity onPress={navigateToProductsTab}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {products.length === 0 ? (
                <EmptyState
                  title="No Products Found"
                  message={`No products available${selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}`}
                  actionLabel="Refresh"
                  onAction={handleRefresh}
                />
              ) : null}
            </View>
          </>
        }
        ListEmptyComponent={
          products.length === 0 ? null : undefined
        }
      />
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
  listContent: {
    backgroundColor: theme.colors.secondary[900],
    paddingBottom: theme.spacing.xl,
  },
  gridRow: {
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  categoriesSection: {
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.secondary[900],
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, // #E8E8E8
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  viewAllText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary[500], // #B91C1C
    fontWeight: theme.typography.fontWeight.semibold,
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
  categoriesList: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  categoryButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.secondary[800], // #2A2A2A
    marginRight: theme.spacing.sm,
  },
  categoryButtonActive: {
    backgroundColor: theme.colors.primary[500], // #B91C1C
    ...theme.shadows.neonRed,
  },
  categoryText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, // #E8E8E8 - more visible
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  productsSection: {
    paddingVertical: theme.spacing.lg,
  },
  productsGrid: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg,
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
    lineHeight: 20,
    marginBottom: theme.spacing.xs,
  },
  featuredPrice: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
  },
});

export default HomeScreen;
