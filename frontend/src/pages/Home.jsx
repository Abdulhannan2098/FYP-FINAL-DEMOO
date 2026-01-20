import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import HeroSlider from '../components/HeroSlider';

const Home = () => {
  const { user } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      const allProducts = response.data.data;
      setTotalProducts(allProducts.length);
      // Show only first 8 products as featured
      setFeaturedProducts(allProducts.slice(0, 8));
    } catch (err) {
      console.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-900">
      {/* Hero Slider */}
      <HeroSlider />

      {/* Featured Products Section */}
      <section className="py-20 bg-secondary-900">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <h2 className="heading-2 mb-3">Featured Products</h2>
              <p className="text-body">Handpicked performance upgrades from top vendors</p>
            </div>
            {user?.role !== 'vendor' && (
              <Link to="/products" className="btn-primary whitespace-nowrap">
                View All Products
              </Link>
            )}
          </div>

          {loading ? (
            <LoadingSpinner size="lg" message="Loading featured products..." />
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-24">
              <svg className="w-24 h-24 text-text-tertiary mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="heading-3 mb-3">No products available yet</h3>
              <p className="text-muted">Check back soon for new products!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-20 relative overflow-hidden bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700"
        style={{
          boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container-custom text-center relative z-10">
          {!user ? (
            // CTA for non-logged-in users
            <>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">
                Ready to Upgrade Your Ride?
              </h2>
              <p className="text-xl text-white/95 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of car enthusiasts who trust AutoSphere for premium aftermarket modifications
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/register" className="bg-white text-primary-500 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-strong">
                  Create Account
                </Link>
                <Link to="/products" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary-500 transform hover:scale-105 transition-all duration-300">
                  Browse Catalog
                </Link>
              </div>
            </>
          ) : user.role === 'vendor' ? (
            // CTA for vendors
            <>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">
                Manage Your Products
              </h2>
              <p className="text-xl text-white/95 mb-10 max-w-2xl mx-auto leading-relaxed">
                Access your vendor dashboard to manage inventory, track orders, and grow your business
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/dashboard/vendor" className="bg-white text-primary-500 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-strong flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  My Products
                </Link>
                <Link to="/dashboard/vendor" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary-500 transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  View Orders
                </Link>
              </div>
            </>
          ) : user.role === 'admin' ? (
            // CTA for admins
            <>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">
                Admin Control Panel
              </h2>
              <p className="text-xl text-white/95 mb-10 max-w-2xl mx-auto leading-relaxed">
                Manage products, vendors, and oversee all platform operations
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/dashboard/admin" className="bg-white text-primary-500 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-strong flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Dashboard
                </Link>
                <Link to="/products" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary-500 transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Browse Products
                </Link>
              </div>
            </>
          ) : (
            // CTA for customers
            <>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 text-white tracking-tight">
                Find Your Perfect Upgrade
              </h2>
              <p className="text-xl text-white/95 mb-10 max-w-2xl mx-auto leading-relaxed">
                Explore our complete catalog of premium automotive parts and accessories
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/products" className="bg-white text-primary-500 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-300 shadow-strong flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Shop Now
                </Link>
                <Link to="/dashboard/customer" className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-primary-500 transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  My Orders
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
