import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import { PRODUCT_CATEGORIES } from '../utils/constants';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);
  const latestRequestIdRef = useRef(0);
  const productsCacheRef = useRef(new Map());
  const inflightUrlRef = useRef('');
  const lastFilterKeyRef = useRef('');
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
    vendorId: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    sortBy: '',
    inStock: false,
  });
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const categories = PRODUCT_CATEGORIES;

  // Category icons mapping
  const categoryIcons = {
    'Spoilers': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    'Rims & Wheels': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
      </svg>
    ),
    'Body Kits': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    'LED Lights': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    'Hoods': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    'Body Wraps/Skins': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    'Exhaust Systems': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    'Interior Accessories': (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  };

  // PERFORMANCE: Memoize fetchProducts to avoid recreating on every render
  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams();

    // Add pagination params
    params.append('page', pagination.currentPage);
    params.append('limit', pagination.itemsPerPage);

    // Add filter params
    const searchText = (filters.search || '').trim();
    if (searchText) params.append('search', searchText);
    if (filters.category) params.append('category', filters.category);
    if (filters.vendorId) params.append('vendorId', filters.vendorId);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.minRating) params.append('minRating', filters.minRating);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.inStock) params.append('inStock', 'true');

    const url = `/products?${params.toString()}`;

    // If the same request is already in-flight, don't start another one.
    if (inflightUrlRef.current === url) return;

    const requestId = ++latestRequestIdRef.current;

    // Abort previous request (different URL) to avoid wasted work.
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Serve from cache when possible (avoids network + prevents UI flicker).
    const cached = productsCacheRef.current.get(url);
    if (cached) {
      setError('');
      setProducts(cached.products);
      setPagination(cached.pagination);
      setLoading(false);
      return;
    }

    inflightUrlRef.current = url;

    try {
      setLoading(true);
      setError('');

      const response = await api.get(url, {
        signal: controller.signal,
      });

      if (requestId !== latestRequestIdRef.current) return;
      const nextProducts = response.data.data;
      setProducts(nextProducts);

      // Update pagination state with response data
      if (response.data.pagination) {
        const nextPagination = response.data.pagination;
        setPagination(nextPagination);

        // Cache successful responses (bounded to avoid unbounded memory growth)
        productsCacheRef.current.set(url, {
          products: nextProducts,
          pagination: nextPagination,
        });
        if (productsCacheRef.current.size > 50) {
          const oldestKey = productsCacheRef.current.keys().next().value;
          productsCacheRef.current.delete(oldestKey);
        }
      }
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      setError('Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      if (inflightUrlRef.current === url) {
        inflightUrlRef.current = '';
      }
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters]);

  // PERFORMANCE: Debounce search to avoid excessive API calls
  useEffect(() => {
    const searchText = (filters.search || '').trim();
    const typedKey = lastFilterKeyRef.current;

    let delayMs = 0;
    // Preserve existing behavior: any active search delays requests by 500ms
    if (searchText) {
      delayMs = 500;
    } else if (typedKey === 'minPrice' || typedKey === 'maxPrice' || typedKey === 'minRating') {
      delayMs = 300;
    }

    const timeoutId = setTimeout(() => {
      fetchProducts();
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [filters, pagination.currentPage, fetchProducts]);

  // Prevent setting state after unmount / route change
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Load vendor options for vendor filter dropdown
  useEffect(() => {
    let isMounted = true;

    const fetchVendors = async () => {
      try {
        setVendorsLoading(true);
        const response = await api.get('/vendors');
        if (!isMounted) return;
        setVendors(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (!isMounted) return;
        setVendors([]);
        console.error('Failed to load vendor options:', err);
      } finally {
        if (isMounted) setVendorsLoading(false);
      }
    };

    fetchVendors();

    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCategoryDropdown && !event.target.closest('.category-dropdown')) {
        setShowCategoryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCategoryDropdown]);

  // PERFORMANCE: Memoize handlers to avoid re-renders
  const handleSearchChange = useCallback((e) => {
    lastFilterKeyRef.current = 'search';
    setFilters(prev => ({ ...prev, search: e.target.value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const handleCategoryChange = useCallback((category) => {
    lastFilterKeyRef.current = 'category';
    setFilters(prev => ({ ...prev, category: category === prev.category ? '' : category }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    const firstKey = Object.keys(newFilters || {})[0] || '';
    if (firstKey) lastFilterKeyRef.current = firstKey;
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const handlePriceWheel = useCallback((e) => {
    // Prevent wheel increments/decrements when the number input is focused.
    e.currentTarget.blur();
  }, []);

  const handlePriceChange = useCallback((key, value) => {
    let nextValue = value;

    if (nextValue !== '') {
      const parsed = Number(nextValue);
      if (Number.isNaN(parsed)) {
        nextValue = '';
      } else {
        nextValue = String(Math.max(0, parsed));
      }
    }

    handleFilterChange({ [key]: nextValue });
  }, [handleFilterChange]);

  const clearAllFilters = useCallback(() => {
    lastFilterKeyRef.current = 'clear';
    setFilters({
      search: '',
      category: '',
      vendorId: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      sortBy: '',
      inStock: false,
    });
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, []);

  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const nextPage = useCallback(() => {
    setPagination(prev => {
      if (prev.hasNextPage) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return { ...prev, currentPage: prev.currentPage + 1 };
      }
      return prev;
    });
  }, []);

  const prevPage = useCallback(() => {
    setPagination(prev => {
      if (prev.hasPrevPage) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return { ...prev, currentPage: prev.currentPage - 1 };
      }
      return prev;
    });
  }, []);

  const selectedVendorName = vendors.find((vendor) => vendor.id === filters.vendorId)?.name || 'Selected Vendor';
  const hasInvalidPriceRange =
    filters.minPrice !== '' &&
    filters.maxPrice !== '' &&
    Number(filters.minPrice) > Number(filters.maxPrice);

  const hasActiveFilters = filters.category || filters.vendorId || filters.minPrice || filters.maxPrice || filters.minRating || filters.sortBy || filters.inStock;

  return (
    <div className="min-h-screen bg-secondary-900">
      {/* Compact Page Header */}
      <section className="relative bg-gradient-to-r from-[#1a0000] via-[#4a0000] to-[#6b0000] text-white py-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE2YzAtNy43MzIgNi4yNjgtMTQgMTQtMTRzMTQgNi4yNjggMTQgMTQtNi4yNjggMTQtMTQgMTQtMTQtNi4yNjgtMTQtMTR6TTAgMzBjMC03LjczMiA2LjI2OC0xNCAxNC0xNHMxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNC0xNC02LjI2OC0xNC0xNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent"></div>
        <div className="container-custom relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Browse Products</h1>
                <p className="text-white/80 text-sm mt-0.5">
                  Premium automotive accessories
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-white text-sm font-medium">Quality Verified</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search & Filter Section */}
      <section className="bg-surface border-b border-surface-light py-5 sticky top-16 z-40 backdrop-blur-md shadow-lg">
        <div className="container-custom">
          <div className="flex flex-col gap-4">
            {/* Top Row - Search, Category, Sort, Filters Button */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    value={filters.search}
                    onChange={handleSearchChange}
                    className="w-full bg-surface-light border border-surface-light rounded-xl px-5 py-3 pl-12 text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Search products..."
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {filters.search && (
                    <button
                      onClick={() => {
                        lastFilterKeyRef.current = 'search';
                        setFilters({ ...filters, search: '' });
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-surface-lighter rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Category Dropdown */}
              <div className="relative category-dropdown">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className={`w-full md:w-56 flex items-center justify-between gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
                    filters.category
                      ? 'bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 border-primary-700 text-white shadow-lg shadow-primary-700/30'
                      : 'bg-surface-light border-surface-light hover:border-primary-500/50 text-text-primary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {filters.category && categoryIcons[filters.category] ? (
                      <div className="w-5 h-5">{categoryIcons[filters.category]}</div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    )}
                    <span className="font-medium text-sm truncate">
                      {filters.category || 'Category'}
                    </span>
                  </div>
                  <svg className={`w-5 h-5 transition-transform flex-shrink-0 ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Category Dropdown Menu */}
                {showCategoryDropdown && (
                  <div className="absolute top-full mt-2 w-full md:w-80 bg-surface border border-surface-light rounded-xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                    <button
                      onClick={() => {
                        handleCategoryChange('');
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                        !filters.category
                          ? 'bg-gradient-to-r from-primary-900/20 to-primary-700/20 border-l-4 border-primary-700'
                          : 'hover:bg-surface-light'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        !filters.category ? 'bg-gradient-to-br from-primary-800 to-primary-700 text-white' : 'bg-surface-light text-primary-500'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </div>
                      <span className={`font-medium ${!filters.category ? 'text-primary-500' : 'text-text-primary'}`}>
                        All Categories
                      </span>
                    </button>

                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          handleCategoryChange(cat);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                          filters.category === cat
                            ? 'bg-gradient-to-r from-primary-900/20 to-primary-700/20 border-l-4 border-primary-700'
                            : 'hover:bg-surface-light'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          filters.category === cat ? 'bg-gradient-to-br from-primary-800 to-primary-700 text-white' : 'bg-surface-light text-primary-500'
                        }`}>
                          {categoryIcons[cat] || (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          )}
                        </div>
                        <span className={`font-medium text-sm ${filters.category === cat ? 'text-primary-500' : 'text-text-primary'}`}>
                          {cat}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange({ sortBy: e.target.value })}
                className="w-full md:w-56 bg-surface-light border border-surface-light rounded-xl px-5 py-3 text-text-primary text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">Sort By</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Rating: High to Low</option>
                <option value="rating_asc">Rating: Low to High</option>
                <option value="name_asc">Name: A to Z</option>
                <option value="name_desc">Name: Z to A</option>
              </select>

              {/* Advanced Filters Toggle Button */}
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl border-2 transition-all font-medium text-sm ${
                  hasActiveFilters || showFiltersPanel
                    ? 'bg-primary-700 border-primary-700 text-white shadow-lg'
                    : 'bg-surface-light border-surface-light hover:border-primary-500/50 text-text-primary'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="hidden sm:inline">Filters</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-2 py-0.5 bg-white text-primary-700 rounded-full text-xs font-bold">
                    {[filters.vendorId, filters.minPrice, filters.maxPrice, filters.minRating, filters.inStock].filter(Boolean).length}
                  </span>
                )}
              </button>

              {/* Results Count */}
              <div className="hidden lg:flex items-center gap-2 px-5 py-3 bg-surface-light rounded-xl border border-surface-light">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-text-secondary text-sm font-medium whitespace-nowrap">
                  {loading ? '...' : `${products.length} Items`}
                </span>
              </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFiltersPanel && (
              <div className="bg-surface-light border border-surface-light rounded-xl p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Vendor */}
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Vendor</label>
                    <select
                      value={filters.vendorId}
                      onChange={(e) => handleFilterChange({ vendorId: e.target.value })}
                      className="w-full bg-surface border border-surface-light rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                      disabled={vendorsLoading}
                    >
                      <option value="">{vendorsLoading ? 'Loading vendors...' : 'All Vendors'}</option>
                      {vendors.map((vendor) => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Price Range</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Enter minimum price"
                        value={filters.minPrice}
                        onWheel={handlePriceWheel}
                        onChange={(e) => handlePriceChange('minPrice', e.target.value)}
                        className="w-full bg-surface border border-surface-light rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <span className="text-text-tertiary">-</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Enter maximum price"
                        value={filters.maxPrice}
                        onWheel={handlePriceWheel}
                        onChange={(e) => handlePriceChange('maxPrice', e.target.value)}
                        className="w-full bg-surface border border-surface-light rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    {hasInvalidPriceRange && (
                      <p className="text-xs text-yellow-400 mt-2">
                        Minimum price should be less than or equal to maximum price.
                      </p>
                    )}
                  </div>

                  {/* Minimum Rating */}
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Minimum Rating</label>
                    <select
                      value={filters.minRating}
                      onChange={(e) => handleFilterChange({ minRating: e.target.value })}
                      className="w-full bg-surface border border-surface-light rounded-lg px-3 py-2 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    >
                      <option value="">Any Rating</option>
                      <option value="4">4★ & above</option>
                      <option value="3">3★ & above</option>
                      <option value="2">2★ & above</option>
                      <option value="1">1★ & above</option>
                    </select>
                  </div>

                  {/* Stock Status */}
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-2">Availability</label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.inStock}
                        onChange={(e) => handleFilterChange({ inStock: e.target.checked })}
                        className="w-5 h-5 rounded border-surface-light bg-surface text-primary-500 focus:ring-2 focus:ring-primary-500 cursor-pointer"
                      />
                      <span className="text-sm text-text-secondary">In Stock Only</span>
                    </label>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {hasActiveFilters && (
                  <div className="mt-4 pt-4 border-t border-surface-light">
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-primary-500 hover:text-primary-400 font-medium flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12">
        <div className="container-custom">

          {/* Active Filters */}
          {(filters.search || hasActiveFilters) && (
            <div className="mb-8 flex items-center gap-3 flex-wrap">
              <span className="text-sm text-text-secondary font-medium">Active:</span>
              {filters.search && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface-light border border-surface-light rounded-lg text-sm">
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-text-primary font-medium">"{filters.search}"</span>
                  <button
                    onClick={() => {
                      lastFilterKeyRef.current = 'search';
                      setFilters({ ...filters, search: '' });
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.category && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface-light border border-surface-light rounded-lg text-sm">
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-text-primary font-medium">{filters.category}</span>
                  <button
                    onClick={() => {
                      lastFilterKeyRef.current = 'category';
                      setFilters({ ...filters, category: '' });
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.vendorId && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface-light border border-surface-light rounded-lg text-sm">
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6m10 0H7" />
                  </svg>
                  <span className="text-text-primary font-medium">{selectedVendorName}</span>
                  <button
                    onClick={() => {
                      lastFilterKeyRef.current = 'vendorId';
                      setFilters({ ...filters, vendorId: '' });
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {(filters.minPrice || filters.maxPrice) && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface-light border border-surface-light rounded-lg text-sm">
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-text-primary font-medium">
                    PKR {filters.minPrice || '0'} - PKR {filters.maxPrice || '∞'}
                  </span>
                  <button
                    onClick={() => {
                      lastFilterKeyRef.current = 'minPrice';
                      setFilters({ ...filters, minPrice: '', maxPrice: '' });
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.minRating && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface-light border border-surface-light rounded-lg text-sm">
                  <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-text-primary font-medium">{filters.minRating}★ & above</span>
                  <button
                    onClick={() => {
                      lastFilterKeyRef.current = 'minRating';
                      setFilters({ ...filters, minRating: '' });
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              {filters.inStock && (
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-surface-light border border-surface-light rounded-lg text-sm">
                  <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-primary font-medium">In Stock</span>
                  <button
                    onClick={() => {
                      lastFilterKeyRef.current = 'inStock';
                      setFilters({ ...filters, inStock: false });
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-sm text-primary-500 hover:text-primary-400 font-medium flex items-center gap-1"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Products Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" message="Loading products..." />
            </div>
          ) : error ? (
            <div className="bg-surface border border-surface-light rounded-2xl p-16 text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">Error Loading Products</h3>
              <p className="text-text-secondary mb-6">{error}</p>
              <button
                onClick={fetchProducts}
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-surface border border-surface-light rounded-2xl p-16 text-center">
              <div className="w-24 h-24 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-2">No Products Found</h3>
              <p className="text-text-secondary mb-6">
                {filters.search || filters.category || filters.vendorId
                  ? 'Try adjusting your filters or search terms'
                  : 'No products available at the moment'}
              </p>
              {(filters.search || filters.category || filters.vendorId) && (
                <button
                  onClick={() => {
                    lastFilterKeyRef.current = 'clear';
                    setFilters((prev) => ({
                      ...prev,
                      search: '',
                      category: '',
                      vendorId: '',
                    }));
                  }}
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-surface-light">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-800 to-primary-700 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Search Results</p>
                    <p className="text-text-primary font-semibold">
                      {products.length} Product{products.length !== 1 ? 's' : ''} Found
                    </p>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {/* Pagination Controls */}
              {pagination.totalPages > 1 && (
                <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 p-6 bg-surface border border-surface-light rounded-xl">
                  {/* Pagination Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-text-primary font-semibold text-sm">
                        Page {pagination.currentPage} of {pagination.totalPages}
                      </p>
                      <p className="text-text-tertiary text-xs">
                        Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} - {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} products
                      </p>
                    </div>
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={prevPage}
                      disabled={!pagination.hasPrevPage}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        pagination.hasPrevPage
                          ? 'bg-surface-light hover:bg-primary-700 hover:text-white text-text-primary border border-surface-light hover:border-primary-700'
                          : 'bg-surface-light text-text-tertiary cursor-not-allowed opacity-50 border border-surface-light'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="hidden sm:inline">Previous</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {[...Array(pagination.totalPages)].map((_, index) => {
                        const pageNumber = index + 1;
                        // Show first page, last page, current page, and pages around current
                        const showPage =
                          pageNumber === 1 ||
                          pageNumber === pagination.totalPages ||
                          (pageNumber >= pagination.currentPage - 1 && pageNumber <= pagination.currentPage + 1);

                        const showEllipsis =
                          (pageNumber === 2 && pagination.currentPage > 3) ||
                          (pageNumber === pagination.totalPages - 1 && pagination.currentPage < pagination.totalPages - 2);

                        if (showEllipsis) {
                          return (
                            <span key={pageNumber} className="px-3 py-2 text-text-tertiary">
                              ...
                            </span>
                          );
                        }

                        if (!showPage) return null;

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => goToPage(pageNumber)}
                            className={`min-w-[40px] h-10 px-3 rounded-lg font-semibold text-sm transition-all ${
                              pageNumber === pagination.currentPage
                                ? 'bg-gradient-to-r from-primary-700 to-primary-600 text-white shadow-lg shadow-primary-700/30'
                                : 'bg-surface-light hover:bg-surface-lighter text-text-primary border border-surface-light hover:border-primary-500/50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={nextPage}
                      disabled={!pagination.hasNextPage}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        pagination.hasNextPage
                          ? 'bg-surface-light hover:bg-primary-700 hover:text-white text-text-primary border border-surface-light hover:border-primary-700'
                          : 'bg-surface-light text-text-tertiary cursor-not-allowed opacity-50 border border-surface-light'
                      }`}
                    >
                      <span className="hidden sm:inline">Next</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Products;
