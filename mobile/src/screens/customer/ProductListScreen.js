import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';
import BottomSheet from '../../components/BottomSheet';
import EmptyState from '../../components/EmptyState';
import Header from '../../components/Header';
import theme from '../../styles/theme';
import ProductListSkeleton from '../../components/skeletons/ProductListSkeleton';
import CachedImage from '../../components/CachedImage';
import { getImageUrl } from '../../api/config';
import { formatPKR } from '../../utils/formatters';

const { width } = Dimensions.get('window');

const PRODUCT_CATEGORIES = [
  'Spoilers',
  'Rims & Wheels',
  'Body Kits',
  'LED Lights',
  'Hoods',
  'Body Wraps/Skins',
  'Exhaust Systems',
  'Interior Accessories',
];

const ProductListScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const nextPageRequestedRef = useRef(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 8,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    sortBy: '',
    inStock: false,
  });
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

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

  const GridProductCard = ({ product, onPress }) => {
    const imageUrl = getProductImageUrl(product);
    const productName = product?.name || 'Unknown Product';
    const productPrice = product?.price || 0;
    const productStock = typeof product?.stock === 'number' ? product.stock : null;

    return (
      <TouchableOpacity
        style={[styles.gridCard, { width: cardWidth }]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        <View style={[styles.gridImageWrap, { height: Math.max(130, Math.round(cardWidth * 0.78)) }]}>
          <CachedImage
            uri={imageUrl}
            style={styles.gridImage}
            resizeMode="cover"
            placeholderSize={40}
          />
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
        </View>
      </TouchableOpacity>
    );
  };

  const fetchProducts = async ({ pageOverride } = {}) => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      setLoading(true);

      const pageToFetch = pageOverride ?? pagination.currentPage;

      const params = new URLSearchParams();

      params.append('page', pageToFetch);
      params.append('limit', pagination.itemsPerPage);

      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.minRating) params.append('minRating', filters.minRating);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.inStock) params.append('inStock', 'true');

      const response = await apiClient.get(`/products?${params.toString()}`);
      const nextProducts = response.data.data || [];

      if (pageToFetch > 1) {
        setProducts(prev => {
          const seen = new Set(prev.map(p => p?._id));
          const merged = [...prev];
          for (const p of nextProducts) {
            if (p?._id && !seen.has(p._id)) merged.push(p);
          }
          return merged;
        });
      } else {
        setProducts(nextProducts);
      }

      if (response.data.pagination) {
        setPagination(prev => ({
          ...prev,
          ...response.data.pagination,
          currentPage: response.data.pagination.currentPage ?? pageToFetch,
        }));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      nextPageRequestedRef.current = false;
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, filters.search ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [filters, pagination.currentPage]);

  const handleRefresh = async () => {
    setRefreshing(true);

    if (pagination.currentPage !== 1) {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
      return;
    }

    await fetchProducts({ pageOverride: 1 });
    setRefreshing(false);
  };

  useEffect(() => {
    if (refreshing && !loading) setRefreshing(false);
  }, [loading, refreshing]);

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleCategorySelect = (category) => {
    setFilters(prev => ({ ...prev, category: category === prev.category ? '' : category }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setShowCategoryModal(false);
  };

  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { productId: product._id });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      sortBy: '',
      inStock: false,
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setShowFiltersModal(false);
  };

  const renderProduct = ({ item }) => (
    <View style={styles.gridItem}>
      <GridProductCard product={item} onPress={() => handleProductPress(item)} />
    </View>
  );

  const loadNextPage = useCallback(() => {
    if (nextPageRequestedRef.current) return;
    if (isFetchingRef.current || loading) return;
    if (!pagination.hasNextPage) return;
    nextPageRequestedRef.current = true;
    setPagination(prev => ({ ...prev, currentPage: (prev.currentPage || 1) + 1 }));
  }, [loading, pagination.hasNextPage]);

  const renderListFooter = () => {
    if (loading && (pagination.currentPage || 1) > 1) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator color={theme.colors.primary[500]} />
        </View>
      );
    }

    if (pagination.hasNextPage) {
      return (
        <View style={styles.loadMoreWrap}>
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={loadNextPage}
            activeOpacity={0.8}
          >
            <Text style={styles.loadMoreText}>Load more</Text>
            <Ionicons name="chevron-down" size={18} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      );
    }

    return <View style={{ height: 24 }} />;
  };

  if (loading && pagination.currentPage === 1) {
    return (
      <View style={styles.wrapper}>
        <Header />
        <ProductListSkeleton count={4} />
      </View>
    );
  }

  const activeFiltersCount = [
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    filters.minRating,
    filters.sortBy,
    filters.inStock ? 'true' : '',
  ].filter(Boolean).length;

  return (
    <View style={styles.wrapper}>
      <Header />
      <View style={styles.container}>
        {/* Search and Filter Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={20} color={theme.colors.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={filters.search}
              onChangeText={(text) => handleFilterChange({ search: text })}
              autoCapitalize="none"
            />
            {filters.search !== '' && (
              <TouchableOpacity onPress={() => handleFilterChange({ search: '' })}>
                <Ionicons name="close-circle" size={20} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowCategoryModal(true)}
            >
              <Ionicons name="grid-outline" size={20} color={theme.colors.text.secondary} />
              <Text style={styles.filterButtonText}>Category</Text>
              {filters.category && <View style={styles.filterBadgeDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFiltersModal(true)}
            >
              <Ionicons name="options-outline" size={20} color={theme.colors.text.secondary} />
              <Text style={styles.filterButtonText}>Filters</Text>
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Category Filter */}
        {filters.category && (
          <View style={styles.activeFilterBadge}>
            <Text style={styles.activeFilterText}>{filters.category}</Text>
            <TouchableOpacity onPress={() => handleFilterChange({ category: '' })}>
              <Ionicons name="close-circle" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Products List */}
        {products.length === 0 ? (
          <EmptyState
            title="No Products Found"
            message={filters.search ? `No results for "${filters.search}"` : "No products available"}
            actionLabel="Clear Filters"
            onAction={clearFilters}
          />
        ) : (
          <>
            <FlatList
              data={products}
              renderItem={renderProduct}
              keyExtractor={(item) => item._id}
              numColumns={2}
              contentContainerStyle={styles.productsList}
              columnWrapperStyle={styles.gridRow}
              onEndReached={loadNextPage}
              onEndReachedThreshold={0.6}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.colors.primary[500]}
                />
              }
              ListFooterComponent={renderListFooter}
            />
          </>
        )}
      </View>

      {/* Category Bottom Sheet */}
      <BottomSheet
        visible={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        height={520}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.modalTitle}>Select Category</Text>
          <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
            <Ionicons name="close" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.categoryItem, !filters.category && styles.categoryItemActive]}
            onPress={() => handleCategorySelect('')}
          >
            <Text style={[styles.categoryItemText, !filters.category && styles.categoryItemTextActive]}>
              All Categories
            </Text>
            {!filters.category && (
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[500]} />
            )}
          </TouchableOpacity>
          {PRODUCT_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryItem, filters.category === category && styles.categoryItemActive]}
              onPress={() => handleCategorySelect(category)}
            >
              <Text style={[styles.categoryItemText, filters.category === category && styles.categoryItemTextActive]}>
                {category}
              </Text>
              {filters.category === category && (
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[500]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>

      {/* Filters Bottom Sheet */}
      <BottomSheet
        visible={showFiltersModal}
        onClose={() => setShowFiltersModal(false)}
        height={620}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.modalTitle}>Filters</Text>
          <TouchableOpacity onPress={() => setShowFiltersModal(false)}>
            <Ionicons name="close" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.filtersScroll} showsVerticalScrollIndicator={false}>
          {/* Price Range */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Price Range</Text>
            <View style={styles.priceInputs}>
              <TextInput
                style={styles.priceInput}
                placeholder="Min"
                placeholderTextColor={theme.colors.text.tertiary}
                value={filters.minPrice}
                onChangeText={(text) => handleFilterChange({ minPrice: text })}
                keyboardType="numeric"
              />
              <Text style={styles.priceSeparator}>-</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Max"
                placeholderTextColor={theme.colors.text.tertiary}
                value={filters.maxPrice}
                onChangeText={(text) => handleFilterChange({ maxPrice: text })}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Minimum Rating */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Minimum Rating</Text>
            <View style={styles.ratingButtons}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingButton,
                    filters.minRating === rating.toString() && styles.ratingButtonActive,
                  ]}
                  onPress={() =>
                    handleFilterChange({
                      minRating:
                        filters.minRating === rating.toString() ? '' : rating.toString(),
                    })
                  }
                >
                  <Ionicons
                    name="star"
                    size={16}
                    color={
                      filters.minRating === rating.toString() ? '#FFFFFF' : '#FFA500'
                    }
                  />
                  <Text
                    style={[
                      styles.ratingButtonText,
                      filters.minRating === rating.toString() && styles.ratingButtonTextActive,
                    ]}
                  >
                    {rating}+
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort By */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Sort By</Text>
            {[
              { value: '', label: 'Default' },
              { value: 'price:asc', label: 'Price: Low to High' },
              { value: 'price:desc', label: 'Price: High to Low' },
              { value: 'name:asc', label: 'Name: A-Z' },
              { value: 'name:desc', label: 'Name: Z-A' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.sortOption, filters.sortBy === option.value && styles.sortOptionActive]}
                onPress={() => handleFilterChange({ sortBy: option.value })}
              >
                <Text style={[styles.sortOptionText, filters.sortBy === option.value && styles.sortOptionTextActive]}>
                  {option.label}
                </Text>
                {filters.sortBy === option.value && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* In Stock Only */}
          <TouchableOpacity
            style={styles.checkboxOption}
            onPress={() => handleFilterChange({ inStock: !filters.inStock })}
          >
            <View style={[styles.checkbox, filters.inStock && styles.checkboxChecked]}>
              {filters.inStock && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Show In Stock Only</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Filter Actions */}
        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyFiltersButton}
            onPress={() => setShowFiltersModal(false)}
          >
            <Text style={styles.applyFiltersText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900],
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900],
  },
  searchContainer: {
    backgroundColor: theme.colors.secondary[900],
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.soft,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    position: 'relative',
  },
  filterButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  filterBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary[500],
    position: 'absolute',
    top: 6,
    right: 6,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: theme.typography.fontWeight.bold,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  productsList: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing['2xl'],
    backgroundColor: theme.colors.secondary[900],
  },
  gridRow: {
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'space-between',
  },
  gridItem: {
    marginBottom: theme.spacing.lg,
  },
  loadingMore: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  loadMoreWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  loadMoreText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  gridCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  gridImageWrap: {
    position: 'relative',
    width: '100%',
    backgroundColor: theme.colors.secondary[800],
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
  },
  gridOutOfStockText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
    letterSpacing: 0.6,
  },
  gridContent: {
    padding: theme.spacing.md,
  },
  gridName: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  gridMeta: {
    marginTop: theme.spacing.xs,
  },
  gridPrice: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary[500],
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.secondary[800],
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
    ...theme.shadows.strong,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.secondary[700],
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  categoryList: {
    paddingVertical: theme.spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  categoryItemActive: {
    backgroundColor: 'rgba(185, 28, 28, 0.1)',
  },
  categoryItemText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },
  categoryItemTextActive: {
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  filtersScroll: {
    padding: theme.spacing.lg,
  },
  filterSection: {
    marginBottom: theme.spacing.xl,
  },
  filterLabel: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  priceInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
  },
  priceSeparator: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.tertiary,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    borderRadius: theme.borderRadius.md,
  },
  ratingButtonActive: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  ratingButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  ratingButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: theme.typography.fontWeight.semibold,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  sortOptionActive: {
    backgroundColor: 'rgba(185, 28, 28, 0.1)',
    borderColor: theme.colors.primary[500],
  },
  sortOptionText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
  },
  sortOptionTextActive: {
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeight.semibold,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.secondary[700],
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  checkboxLabel: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.primary,
  },
  filterActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.text.tertiary,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.tertiary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[500],
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: theme.typography.fontSize.base,
    color: '#FFFFFF',
    fontWeight: theme.typography.fontWeight.bold,
  },
});

export default ProductListScreen;
