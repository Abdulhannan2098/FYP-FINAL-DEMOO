import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getPlaceholderImage } from '../../utils/constants';
import { formatPKR } from '../../utils/currency';

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);


  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/user');
      setOrders(response.data.data);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending Vendor Action': 'bg-yellow-900/30 border border-yellow-600/50 text-yellow-400',
      'Accepted': 'bg-blue-900/30 border border-blue-600/50 text-blue-400',
      'In Progress': 'bg-indigo-900/30 border border-indigo-600/50 text-indigo-400',
      'Shipped': 'bg-purple-900/30 border border-purple-600/50 text-purple-400',
      'Completed': 'bg-green-900/30 border border-green-600/50 text-green-400',
      'Rejected': 'bg-red-900/30 border border-red-600/50 text-red-400',
      'Cancelled': 'bg-red-900/30 border border-red-600/50 text-red-400',
    };
    return colors[status] || 'bg-gray-900/30 border border-gray-600/50 text-gray-400';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Pending Vendor Action': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'Accepted': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'In Progress': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      'Shipped': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      'Completed': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      'Rejected': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      'Cancelled': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    };
    return icons[status] || null;
  };

  // Group orders by checkout session
  const groupOrdersBySession = (orders) => {
    const grouped = {};
    const standalone = [];

    orders.forEach(order => {
      if (order.checkoutSessionId) {
        if (!grouped[order.checkoutSessionId]) {
          grouped[order.checkoutSessionId] = [];
        }
        grouped[order.checkoutSessionId].push(order);
      } else {
        standalone.push(order);
      }
    });

    return { grouped: Object.values(grouped), standalone };
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') {
      return ['Pending Vendor Action', 'Accepted', 'In Progress', 'Shipped'].includes(order.status);
    }
    if (activeTab === 'completed') {
      return order.status === 'Completed';
    }
    if (activeTab === 'cancelled') {
      return ['Rejected', 'Cancelled'].includes(order.status);
    }
    return true;
  });

  const { grouped: groupedOrders, standalone: standaloneOrders } = groupOrdersBySession(filteredOrders);

  const stats = {
    totalOrders: orders.length,
    activeOrders: orders.filter(o => ['Pending Vendor Action', 'Accepted', 'In Progress', 'Shipped'].includes(o.status)).length,
    completedOrders: orders.filter(o => o.status === 'Completed').length,
    totalSpent: orders.reduce((sum, o) => sum + o.totalAmount, 0),
  };

  const tabs = [
    { id: 'all', label: 'All Orders', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    )},
    { id: 'active', label: 'Active', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )},
    { id: 'completed', label: 'Completed', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'cancelled', label: 'Cancelled', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
  ];

  return (
    <div className="min-h-screen bg-secondary-900 py-8">
      <div className="container-custom max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
            My Orders
          </h1>
          <p className="text-text-secondary mt-2">
            Welcome back, {user?.name}! Track and manage your orders.
          </p>
        </div>
            {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="group relative bg-gradient-to-br from-surface via-surface to-surface-light border border-primary-500/20 rounded-xl p-6 hover:border-primary-500/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1 font-medium">Total Orders</p>
                <p className="text-3xl font-display font-bold text-text-primary">{stats.totalOrders}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-surface via-surface to-surface-light border border-blue-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1 font-medium">Active Orders</p>
                <p className="text-3xl font-display font-bold text-blue-400">{stats.activeOrders}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-surface via-surface to-surface-light border border-green-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1 font-medium">Completed</p>
                <p className="text-3xl font-display font-bold text-green-400">{stats.completedOrders}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-surface via-surface to-surface-light border border-primary-500/20 rounded-xl p-6 hover:border-primary-500/40 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1 font-medium">Total Spent</p>
                <p className="text-3xl font-display font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
                  {formatPKR(stats.totalSpent)}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-primary-800/20 to-primary-700/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-surface border border-surface-light rounded-xl p-2 mb-6 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-700 to-primary-600 text-white shadow-lg shadow-primary-700/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className={`
                ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                ${activeTab === tab.id ? 'bg-white/20' : 'bg-surface-light'}
              `}>
                {tab.id === 'all' ? orders.length :
                 tab.id === 'active' ? stats.activeOrders :
                 tab.id === 'completed' ? stats.completedOrders :
                 orders.filter(o => ['Rejected', 'Cancelled'].includes(o.status)).length}
              </span>
            </button>
          ))}
        </div>

        {/* Orders Section */}
        <div className="space-y-6">
          {loading ? (
            <div className="bg-surface border border-surface-light rounded-xl p-12">
              <LoadingSpinner size="md" message="Loading orders..." />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-surface border border-surface-light rounded-xl p-12 text-center">
              <div className="w-24 h-24 bg-surface-light rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="heading-3 mb-2">No {activeTab === 'all' ? '' : activeTab} orders</h3>
              <p className="text-text-secondary mb-6">
                {activeTab === 'all'
                  ? 'Start shopping to see your orders here'
                  : `You don't have any ${activeTab} orders at the moment`}
              </p>
              <a href="/products" className="btn-primary inline-block">Browse Products</a>
            </div>
          ) : (
            <>
              {/* Grouped Orders (Multi-vendor checkout) */}
              {groupedOrders.map((orderGroup, groupIndex) => (
                <div key={groupIndex} className="space-y-3">
                  {orderGroup.length > 1 && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                      <svg className="w-5 h-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <div>
                        <p className="text-sm font-semibold text-primary-300">Multi-Vendor Purchase</p>
                        <p className="text-xs text-text-secondary">
                          {orderGroup.length} orders from {orderGroup.length} vendors • Grand Total: {formatPKR(orderGroup[0].grandTotal || orderGroup.reduce((sum, o) => sum + o.totalAmount, 0))}
                        </p>
                      </div>
                    </div>
                  )}

                  {orderGroup.map((order) => (
                    <div key={order._id} className="bg-surface border border-surface-light rounded-xl p-6 hover:border-primary-500/30 transition-all duration-300 group">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        {/* Order Info */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-display font-bold text-text-primary">
                                  Order #{order._id.slice(-8).toUpperCase()}
                                </h3>
                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                                  {getStatusIcon(order.status)}
                                  {order.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-text-secondary">
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {order.vendor?.name || 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-text-secondary">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            <span className="text-sm">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                          </div>
                        </div>

                        {/* Order Total & Actions */}
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-text-secondary mb-1">Total Amount</p>
                            <p className="text-2xl font-display font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
                              {formatPKR(order.totalAmount)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedOrder(order);
                              setShowOrderDetail(true);
                            }}
                            className="w-9 h-9 bg-gradient-to-r from-primary-700 to-primary-600 text-white rounded-lg hover:shadow-lg hover:shadow-primary-700/30 transition-all duration-200 flex items-center justify-center group"
                            title="View order details"
                          >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* Standalone Orders (Single-vendor purchases) */}
              {standaloneOrders.map((order) => (
                <div key={order._id} className="bg-surface border border-surface-light rounded-xl p-6 hover:border-primary-500/30 transition-all duration-300 group">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Order Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-display font-bold text-text-primary">
                              Order #{order._id.slice(-8).toUpperCase()}
                            </h3>
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                              {getStatusIcon(order.status)}
                              {order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-text-secondary">
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {new Date(order.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {order.vendor?.name || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-text-secondary">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="text-sm">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                      </div>
                    </div>

                    {/* Order Total & Actions */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-text-secondary mb-1">Total Amount</p>
                        <p className="text-2xl font-display font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
                          {formatPKR(order.totalAmount)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedOrder(order);
                          setShowOrderDetail(true);
                        }}
                        className="w-9 h-9 bg-gradient-to-r from-primary-700 to-primary-600 text-white rounded-lg hover:shadow-lg hover:shadow-primary-700/30 transition-all duration-200 flex items-center justify-center group"
                        title="View order details"
                      >
                        <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Order Detail Modal */}
        {showOrderDetail && selectedOrder ? (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-fadeIn"
            onClick={() => setShowOrderDetail(false)}
          >
            <div
              className="bg-gradient-to-br from-surface via-surface to-surface-light border border-primary-500/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-surface-light p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-display font-bold text-text-primary mb-1">
                    Order Details
                  </h2>
                  <p className="text-text-secondary">#{selectedOrder._id.slice(-8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setShowOrderDetail(false)}
                  className="p-2 hover:bg-surface-light rounded-lg transition-colors group"
                >
                  <svg className="w-6 h-6 text-text-secondary group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Order Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-surface-light rounded-xl p-4 border border-surface-light hover:border-primary-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-text-secondary font-medium">Status</p>
                    </div>
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      {selectedOrder.status}
                    </span>
                  </div>

                  <div className="bg-surface-light rounded-xl p-4 border border-surface-light hover:border-primary-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-text-secondary font-medium">Order Date</p>
                    </div>
                    <p className="text-text-primary font-semibold">
                      {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      {new Date(selectedOrder.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="bg-surface-light rounded-xl p-4 border border-surface-light hover:border-primary-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-sm text-text-secondary font-medium">Vendor</p>
                    </div>
                    <p className="text-text-primary font-semibold">{selectedOrder.vendor?.name || 'N/A'}</p>
                    {selectedOrder.vendor?.email && (
                      <p className="text-sm text-text-secondary mt-1">{selectedOrder.vendor.email}</p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-primary-800/10 to-primary-700/10 rounded-xl p-4 border border-primary-700/30">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-text-secondary font-medium">Total Amount</p>
                    </div>
                    <p className="text-3xl font-display font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
                      {formatPKR(selectedOrder.totalAmount)}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-surface-light/50 rounded-xl p-5 border border-surface-light">
                  <h3 className="text-lg font-display font-bold text-text-primary mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Order Items ({selectedOrder.items?.length || 0})
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.items && selectedOrder.items.length > 0 ? (
                      selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 bg-surface rounded-xl p-4 hover:bg-surface-light transition-colors border border-surface-light">
                          <div className="w-20 h-20 bg-surface-light rounded-lg overflow-hidden flex-shrink-0 border border-surface-light">
                            {item.product?.images?.[0] ? (
                              <img
                                src={item.product.images[0].startsWith('http') ? item.product.images[0] : `http://localhost:5000${item.product.images[0]}`}
                                alt={item.product?.name || 'Product'}
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = getPlaceholderImage(item.product?.category);
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-surface">
                                <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-text-primary mb-1 truncate">
                              {item.product?.name || 'Product Name Unavailable'}
                            </h4>
                            <div className="flex items-center gap-4 text-sm text-text-secondary">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                Qty: {item.quantity}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {formatPKR(item.price || 0)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-text-secondary mb-1">Subtotal</p>
                            <p className="text-xl font-display font-bold text-primary-500">
                              {formatPKR((item.quantity || 0) * (item.price || 0))}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-text-secondary">
                        <svg className="w-12 h-12 mx-auto mb-2 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p>No items found in this order</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-surface-light/50 rounded-xl p-5 border border-surface-light">
                  <h3 className="text-lg font-display font-bold text-text-primary mb-3 flex items-center gap-2">
                    <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Shipping Address
                  </h3>
                  <div className="bg-surface rounded-lg p-4 border border-surface-light">
                    {selectedOrder.shippingAddress ? (
                      typeof selectedOrder.shippingAddress === 'string' ? (
                        <p className="text-text-primary font-medium leading-relaxed">
                          {selectedOrder.shippingAddress}
                        </p>
                      ) : (
                        <div className="text-text-primary font-medium leading-relaxed space-y-1">
                          <p>{selectedOrder.shippingAddress.street}</p>
                          <p>
                            {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}
                          </p>
                          <p>{selectedOrder.shippingAddress.country}</p>
                        </div>
                      )
                    ) : (
                      <p className="text-text-secondary">No shipping address provided</p>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                {selectedOrder.paymentMethod && (
                  <div className="bg-surface-light/50 rounded-xl p-5 border border-surface-light">
                    <h3 className="text-lg font-display font-bold text-text-primary mb-3 flex items-center gap-2">
                      <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Payment Method
                    </h3>
                    <div className="bg-surface rounded-lg p-4 border border-surface-light">
                      <p className="text-text-primary font-medium capitalize">
                        {selectedOrder.paymentMethod}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CustomerDashboard;
