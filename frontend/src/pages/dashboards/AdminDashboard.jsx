import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api';
import { getPlaceholderImage } from '../../utils/constants';
import { formatPKR } from '../../utils/currency';
import { resolveImageUrl } from '../../utils/imageHelper';

const normalizeOrderStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'accepted') return 'In Progress';
  if (normalized === 'rejected') return 'Cancelled';
  if (normalized === 'completed') return 'Delivered';
  if (normalized === 'pending') return 'Pending Vendor Action';
  if (normalized === 'in progress') return 'In Progress';
  if (normalized === 'shipped') return 'Shipped';
  if (normalized === 'delivered') return 'Delivered';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'Cancelled';

  return status;
};

const getDisplayOrderId = (order) => String(order?.orderId || order?.orderNumber || order?._id || 'N/A');

const AdminDashboard = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productActionLoading, setProductActionLoading] = useState(false);

  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set());
  const [deletingOrders, setDeletingOrders] = useState(false);
  const selectAllOrdersRef = useRef(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/products/admin/all'),
        api.get('/orders'),
      ]);
      setProducts(productsRes.data.data);
      setOrders(ordersRes.data.data);
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const ordersRes = await api.get('/orders');
      setOrders(ordersRes.data.data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    }
  };

  const applyProductUpdate = (updatedProduct) => {
    if (!updatedProduct?._id) return;

    setProducts((prev) => prev.map((p) => (p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p)));
    setSelectedProduct((prev) => {
      if (!prev || prev._id !== updatedProduct._id) return prev;
      return { ...prev, ...updatedProduct };
    });
  };

  const removeProductFromState = (productId) => {
    setProducts((prev) => prev.filter((p) => p._id !== productId));
    setSelectedProduct((prev) => (prev?._id === productId ? null : prev));
  };

  const isOrderDeletable = (order) => {
    const normalized = normalizeOrderStatus(order?.status);
    return normalized === 'Shipped' || normalized === 'Delivered';
  };

  const selectableOrderIds = useMemo(() => {
    return (orders || []).filter(isOrderDeletable).map((o) => o._id);
  }, [orders]);

  const selectedDeletableCount = useMemo(() => {
    let count = 0;
    for (const id of selectedOrderIds) {
      if (selectableOrderIds.includes(id)) count += 1;
    }
    return count;
  }, [selectedOrderIds, selectableOrderIds]);

  const allSelectableSelected = selectableOrderIds.length > 0 && selectedDeletableCount === selectableOrderIds.length;
  const hasSomeSelected = selectedDeletableCount > 0;

  useEffect(() => {
    if (!selectAllOrdersRef.current) return;
    selectAllOrdersRef.current.indeterminate = hasSomeSelected && !allSelectableSelected;
  }, [hasSomeSelected, allSelectableSelected]);

  // Keep selection clean when data changes or tab changes
  useEffect(() => {
    if (activeTab !== 'orders') {
      setSelectedOrderIds(new Set());
      return;
    }
    const existingIds = new Set((orders || []).map((o) => o._id));
    setSelectedOrderIds((prev) => {
      const next = new Set();
      for (const id of prev) {
        if (existingIds.has(id)) next.add(id);
      }
      return next;
    });
  }, [orders, activeTab]);

  const toggleOrderSelection = (orderId) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectAllOrders = () => {
    if (selectableOrderIds.length === 0) return;
    setSelectedOrderIds((prev) => {
      if (allSelectableSelected) {
        // Remove all selectable from current selection
        const next = new Set(prev);
        for (const id of selectableOrderIds) next.delete(id);
        return next;
      }
      // Select all deletable
      return new Set(selectableOrderIds);
    });
  };

  const handleBulkDeleteOrders = async () => {
    const idsToDelete = selectableOrderIds.filter((id) => selectedOrderIds.has(id));
    if (idsToDelete.length === 0) return;

    const ok = confirm(
      `Delete ${idsToDelete.length} shipped/delivered order${idsToDelete.length === 1 ? '' : 's'}? This cannot be undone.`
    );
    if (!ok) return;

    try {
      setDeletingOrders(true);
      await api.post('/orders/admin/bulk-delete', { orderIds: idsToDelete });
      setSelectedOrderIds(new Set());

      // Fast UI update + re-fetch to stay consistent across tabs
      setOrders((prev) => prev.filter((o) => !idsToDelete.includes(o._id)));
      await fetchOrders();
      alert('Orders deleted successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete orders');
    } finally {
      setDeletingOrders(false);
    }
  };

  const handleApproveProduct = async (productId, action) => {
    try {
      setProductActionLoading(true);
      let rejectionReason = '';

      if (action === 'reject') {
        rejectionReason = prompt('Please provide a reason for rejection:');
        if (!rejectionReason) {
          alert('Rejection reason is required');
          return;
        }
      }

      const response = await api.put(`/products/${productId}/approve`, {
        action,
        rejectionReason
      });

      const serverProduct = response?.data?.data;
      const updatedProduct = serverProduct || {
        _id: productId,
        approvalStatus: action === 'approve' ? 'Approved' : 'Rejected',
        isApproved: action === 'approve',
        rejectionReason: action === 'reject' ? rejectionReason : '',
      };

      applyProductUpdate(updatedProduct);

      alert(`Product ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
      fetchAdminData();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update product status');
    } finally {
      setProductActionLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      setProductActionLoading(true);
      await api.delete(`/products/${productId}`);
      removeProductFromState(productId);
      alert('Product deleted successfully');
      setShowProductModal(false);
      setSelectedProduct(null);
      fetchAdminData();
    } catch (error) {
      console.error('Failed to delete product', error);
      alert('Failed to delete product');
    } finally {
      setProductActionLoading(false);
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const handleCloseModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  useEffect(() => {
    if (!selectedProduct) return;

    const refreshedProduct = products.find((p) => p._id === selectedProduct._id);

    if (!refreshedProduct) {
      setShowProductModal(false);
      setSelectedProduct(null);
      return;
    }

    if (refreshedProduct !== selectedProduct) {
      setSelectedProduct(refreshedProduct);
    }
  }, [products, selectedProduct]);

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-900 py-8">
        <div className="container-custom">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-text-secondary mt-4">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    totalProducts: products.length,
    pendingApproval: products.filter((p) => p.approvalStatus === 'Pending').length,
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'Pending Vendor Action').length,
  };

  return (
    <div className="min-h-screen bg-secondary-900 py-8">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1">Admin Dashboard</h1>
          <p className="text-text-secondary mt-2">Welcome back, {user.name}!</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-surface border border-surface-light rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">Total Products</p>
                <p className="text-2xl font-display font-bold text-text-primary">{stats.totalProducts}</p>
              </div>
              <div className="w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-surface-light rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">Pending Approval</p>
                <p className="text-2xl font-display font-bold text-text-primary">{stats.pendingApproval}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-surface-light rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">Total Orders</p>
                <p className="text-2xl font-display font-bold text-text-primary">{stats.totalOrders}</p>
              </div>
              <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-surface-light rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary mb-1">Pending Orders</p>
                <p className="text-2xl font-display font-bold text-text-primary">{stats.pendingOrders}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          {[
            { id: 'products', label: 'Products', count: products.length },
            { id: 'orders', label: 'Orders', count: orders.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-neon-red'
                  : 'bg-surface border border-surface-light text-text-secondary hover:bg-surface-light hover:text-text-primary'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-surface border border-surface-light rounded-lg p-6">
            <h2 className="heading-2 mb-6">All Products</h2>
            {products.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-text-secondary">No products found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead className="bg-surface-light border-b border-surface-light">
                    <tr>
                      <th className="w-[30%] px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Product</th>
                      <th className="w-[15%] px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Category</th>
                      <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Price</th>
                      <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Stock</th>
                      <th className="w-[15%] px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="w-[20%] px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-surface-light">
                    {products.map((product) => (
                      <tr key={product._id} className="hover:bg-surface-light transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 flex-shrink-0">
                              {product.images && product.images.length > 0 ? (
                                <img
                                  src={resolveImageUrl(product.images[0])}
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded-lg border border-surface-light"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = getPlaceholderImage(product.category);
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-surface-light rounded-lg flex items-center justify-center">
                                  <svg className="w-6 h-6 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-text-primary truncate">{product.name}</p>
                              <p className="text-xs text-text-tertiary">By: {product.vendor?.name || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary truncate block">{product.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-display font-semibold text-primary-500">{formatPKR(product.price)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-text-secondary">{product.stock}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block w-fit ${
                              product.approvalStatus === 'Approved'
                                ? 'bg-green-900/30 border border-green-600 text-green-400'
                                : product.approvalStatus === 'Rejected'
                                ? 'bg-red-900/30 border border-red-600 text-red-400'
                                : 'bg-yellow-900/30 border border-yellow-600 text-yellow-400'
                            }`}>
                              {product.approvalStatus || 'Pending'}
                            </span>
                            {product.aiDecision && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide w-fit ${
                                product.aiDecision === 'auto_approved'
                                  ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                                  : product.aiDecision === 'auto_rejected'
                                  ? 'bg-red-900/40 text-red-300 border border-red-700/40'
                                  : 'bg-blue-900/40 text-blue-300 border border-blue-700/40'
                              }`}>
                                {product.aiDecision === 'auto_approved' ? '✓ Auto Approved' :
                                 product.aiDecision === 'auto_rejected' ? '✗ Auto Rejected' :
                                 '⚑ AI Flagged'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewProduct(product)}
                            className="w-8 h-8 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 rounded-lg transition-all duration-200 flex items-center justify-center"
                            title="View product details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-surface border border-surface-light rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="heading-2">All Orders</h2>
                <p className="text-sm text-text-tertiary mt-1">Select shipped/delivered orders to delete</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-sm text-text-secondary">
                  {hasSomeSelected ? `${selectedDeletableCount} selected` : 'No selection'}
                </div>
                <button
                  onClick={handleBulkDeleteOrders}
                  disabled={!hasSomeSelected || deletingOrders}
                  className={`w-10 h-10 rounded-lg border transition-all duration-200 flex items-center justify-center ${
                    !hasSomeSelected || deletingOrders
                      ? 'bg-surface-light border-surface-light text-text-tertiary cursor-not-allowed'
                      : 'bg-red-900/20 border-red-600/30 text-red-400 hover:bg-red-900/30 hover:border-red-500/50'
                  }`}
                  title={hasSomeSelected ? 'Delete selected shipped orders' : 'Select shipped/delivered orders to delete'}
                  aria-label="Delete selected orders"
                >
                  {deletingOrders ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3m-4 0h14" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-text-tertiary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-text-secondary">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-surface-light border-b border-surface-light">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <input
                            ref={selectAllOrdersRef}
                            type="checkbox"
                            checked={allSelectableSelected}
                            onChange={toggleSelectAllOrders}
                            disabled={selectableOrderIds.length === 0}
                            className="h-4 w-4 rounded border-surface-light bg-surface text-primary-500 focus:ring-primary-500"
                            aria-label="Select all shipped/delivered orders"
                          />
                          <span>Select</span>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Vendor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Items</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-surface-light">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-surface-light transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.has(order._id)}
                            onChange={() => toggleOrderSelection(order._id)}
                            disabled={!isOrderDeletable(order)}
                            className={`h-4 w-4 rounded border-surface-light bg-surface focus:ring-primary-500 ${
                              isOrderDeletable(order) ? 'text-primary-500' : 'text-text-tertiary cursor-not-allowed'
                            }`}
                            aria-label={`Select order ${getDisplayOrderId(order)}`}
                            title={isOrderDeletable(order) ? 'Select to delete' : 'Only shipped/delivered orders can be deleted'}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                          #{getDisplayOrderId(order)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {order.customer?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {order.vendor?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {order.items?.length || 0} item(s)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-display font-semibold text-primary-500">
                          {formatPKR(order.totalAmount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            normalizeOrderStatus(order.status) === 'Delivered'
                              ? 'bg-green-900/30 border border-green-600 text-green-400'
                              : normalizeOrderStatus(order.status) === 'Cancelled'
                              ? 'bg-red-900/30 border border-red-600 text-red-400'
                              : normalizeOrderStatus(order.status) === 'Shipped'
                              ? 'bg-blue-900/30 border border-blue-600 text-blue-400'
                              : normalizeOrderStatus(order.status) === 'In Progress'
                              ? 'bg-purple-900/30 border border-purple-600 text-purple-400'
                              : normalizeOrderStatus(order.status) === 'Pending Vendor Action'
                              ? 'bg-amber-900/30 border border-amber-600 text-amber-400'
                              : 'bg-yellow-900/30 border border-yellow-600 text-yellow-400'
                          }`}>
                            {normalizeOrderStatus(order.status) || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Product Detail Modal */}
        {showProductModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={handleCloseModal}>
            <div className="bg-gradient-to-br from-surface via-surface to-surface-light border border-primary-500/20 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-primary-500/10 animate-scaleIn" onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-r from-surface to-surface-light border-b border-primary-500/20 backdrop-blur-xl px-8 py-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="font-display text-3xl font-bold text-text-primary mb-1">Product Review</h2>
                  <p className="text-sm text-text-secondary">Review product details and take action</p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-light hover:bg-primary-500/10 hover:border-primary-500 border border-surface-light transition-all duration-300 group"
                >
                  <svg className="w-6 h-6 text-text-secondary group-hover:text-primary-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-88px)]">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 p-8">

                  {/* Left Column - Images & Gallery */}
                  <div className="lg:col-span-3 space-y-6">
                    {selectedProduct.images && selectedProduct.images.length > 0 && (
                      <div className="space-y-4">
                        {/* Main Featured Image */}
                        <div className="relative group">
                          <div className="aspect-[4/3] rounded-2xl overflow-hidden border-2 border-primary-500/20 shadow-xl">
                            <img
                              src={resolveImageUrl(selectedProduct.images[0])}
                              alt={selectedProduct.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = getPlaceholderImage(selectedProduct.category);
                              }}
                            />
                          </div>
                          {/* Image Count Badge */}
                          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/10">
                            <span className="text-white text-sm font-medium flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {selectedProduct.images.length} {selectedProduct.images.length === 1 ? 'Image' : 'Images'}
                            </span>
                          </div>
                        </div>

                        {/* Thumbnail Gallery */}
                        {selectedProduct.images.length > 1 && (
                          <div className="grid grid-cols-4 gap-3">
                            {selectedProduct.images.slice(1).map((image, index) => (
                              <div key={index} className="aspect-square rounded-lg overflow-hidden border border-surface-light hover:border-primary-500 transition-all duration-300 cursor-pointer group">
                                <img
                                  src={resolveImageUrl(image)}
                                  alt={`${selectedProduct.name} - ${index + 2}`}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = getPlaceholderImage(selectedProduct.category);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Description Card */}
                    <div className="bg-surface-light border border-surface-light rounded-xl p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        <h3 className="text-lg font-semibold text-text-primary">Product Description</h3>
                      </div>
                      <p className="text-text-secondary leading-relaxed">{selectedProduct.description || 'No description provided'}</p>
                    </div>

                    {/* Rejection Reason */}
                    {selectedProduct.approvalStatus === 'Rejected' && selectedProduct.rejectionReason && (
                      <div className="bg-red-900/10 border-2 border-red-600/30 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <h3 className="text-lg font-semibold text-red-400">Rejection Reason</h3>
                        </div>
                        <p className="text-red-300">{selectedProduct.rejectionReason}</p>
                      </div>
                    )}

                    {/* AI Flagged Notice (Pending products with AI reason) */}
                    {selectedProduct.approvalStatus === 'Pending' && selectedProduct.aiDecision === 'pending_review' && selectedProduct.aiReason && (
                      <div className="bg-blue-900/10 border-2 border-blue-600/30 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="text-lg font-semibold text-blue-400">AI Flagged for Review</h3>
                        </div>
                        <p className="text-blue-300">{selectedProduct.aiReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Product Details & Actions */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Product Title & Status */}
                    <div className="space-y-4">
                      <div>
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-3 ${
                          selectedProduct.approvalStatus === 'Approved'
                            ? 'bg-green-900/30 border border-green-500 text-green-400 shadow-lg shadow-green-500/20'
                            : selectedProduct.approvalStatus === 'Rejected'
                            ? 'bg-red-900/30 border border-red-500 text-red-400 shadow-lg shadow-red-500/20'
                            : 'bg-yellow-900/30 border border-yellow-500 text-yellow-400 shadow-lg shadow-yellow-500/20'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            selectedProduct.approvalStatus === 'Approved' ? 'bg-green-400 animate-pulse' :
                            selectedProduct.approvalStatus === 'Rejected' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'
                          }`}></span>
                          {selectedProduct.approvalStatus || 'Pending'}
                        </span>
                        <h1 className="font-display text-3xl font-bold text-text-primary mb-2">{selectedProduct.name}</h1>
                        <p className="text-text-secondary flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {selectedProduct.category}
                        </p>
                      </div>

                      {/* Price Card */}
                      <div className="bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-2 border-primary-500/30 rounded-xl p-6">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-5xl font-bold text-primary-500">{formatPKR(selectedProduct.price)}</span>
                          <span className="text-text-tertiary text-sm">PKR</span>
                        </div>
                        <p className="text-text-secondary text-sm mt-2">Product Price</p>
                      </div>
                    </div>

                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-light border border-surface-light rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-text-primary">{selectedProduct.stock}</p>
                            <p className="text-xs text-text-tertiary">In Stock</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-surface-light border border-surface-light rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary truncate">{selectedProduct.vendor?.name || 'N/A'}</p>
                            <p className="text-xs text-text-tertiary">Vendor</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Review Panel */}
                    {selectedProduct.aiReviewed && (() => {
                      const score     = selectedProduct.aiConfidenceScore ?? 0;
                      const dec       = selectedProduct.aiDecision;
                      const isApprove = dec === 'auto_approved';
                      const isReject  = dec === 'auto_rejected';

                      // Static Tailwind class sets — no dynamic interpolation
                      const panelCls  = isApprove
                        ? 'bg-emerald-900/10 border-emerald-600/30'
                        : isReject
                        ? 'bg-red-900/10 border-red-600/30'
                        : 'bg-blue-900/10 border-blue-600/30';
                      const headerCls = isApprove
                        ? 'border-emerald-600/20 bg-emerald-900/20'
                        : isReject
                        ? 'border-red-600/20 bg-red-900/20'
                        : 'border-blue-600/20 bg-blue-900/20';
                      const titleCls  = isApprove ? 'text-emerald-400' : isReject ? 'text-red-400' : 'text-blue-400';
                      const badgeCls  = isApprove
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : isReject
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                      const scoreColor = score >= 90 ? 'text-emerald-400' : score < 60 ? 'text-red-400' : 'text-blue-400';
                      const barColor   = score >= 90 ? 'bg-emerald-500' : score < 60 ? 'bg-red-500' : 'bg-blue-400';
                      const label      = isApprove ? '✓ Auto Approved' : isReject ? '✗ Auto Rejected' : '⚑ Flagged for Review';
                      const phraseLayer   = score >= 90 ? 'Strong match' : score < 60 ? 'Weak / off-domain' : 'Partial match';
                      const semanticLayer = score >= 90 ? 'High similarity' : score < 60 ? 'Low similarity' : 'Moderate similarity';

                      return (
                        <div className={`rounded-xl border-2 overflow-hidden ${panelCls}`}>
                          {/* Header row */}
                          <div className={`flex items-center justify-between px-5 py-3 border-b ${headerCls}`}>
                            <span className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${titleCls}`}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                              AI Classification
                            </span>
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeCls}`}>
                              {label}
                            </span>
                          </div>

                          <div className="px-5 py-4 space-y-4">
                            {/* Confidence score bar */}
                            <div>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">Confidence Score</span>
                                <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{score}/100</span>
                              </div>
                              <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
                                <div className={`h-2 rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-text-tertiary">Reject &lt;60</span>
                                <span className="text-[10px] text-text-tertiary">Pending 60–89</span>
                                <span className="text-[10px] text-text-tertiary">Approve ≥90</span>
                              </div>
                            </div>

                            {/* Layer breakdown */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-surface rounded-lg px-3 py-2">
                                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-0.5">Hard Rules</p>
                                <p className="text-xs font-semibold text-text-primary">Passed</p>
                              </div>
                              <div className="bg-surface rounded-lg px-3 py-2">
                                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-0.5">Phrase Engine</p>
                                <p className="text-xs font-semibold text-text-primary">{phraseLayer}</p>
                              </div>
                              <div className="bg-surface rounded-lg px-3 py-2 col-span-2">
                                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-0.5">TF-IDF Semantic Similarity</p>
                                <p className="text-xs font-semibold text-text-primary">{semanticLayer}</p>
                              </div>
                            </div>

                            {/* AI Reason — technical detail for admin only */}
                            {selectedProduct.aiReason && (
                              <div className="bg-surface rounded-lg px-3 py-2.5">
                                <p className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">AI Reasoning (Admin Only)</p>
                                <p className="text-xs text-text-secondary leading-relaxed">{selectedProduct.aiReason}</p>
                              </div>
                            )}

                            {/* Feedback loop indicator */}
                            <p className="text-[10px] text-text-tertiary flex items-center gap-1.5 pt-1 border-t border-surface-light">
                              <svg className="w-3 h-3 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Your decision is logged for AI model improvement. You can override any time.
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Vendor Details */}
                    <div className="bg-surface-light border border-surface-light rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Vendor Information
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Name:</span>
                          <span className="text-text-primary font-medium">{selectedProduct.vendor?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Email:</span>
                          <span className="text-text-primary font-medium">{selectedProduct.vendor?.email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <div className="bg-surface-light border border-surface-light rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Quick Actions
                        </h3>
                        <div className="flex items-center gap-3">
                          {selectedProduct.approvalStatus === 'Pending' && (
                            <>
                              <button
                                onClick={() => {
                                  handleApproveProduct(selectedProduct._id, 'approve');
                                }}
                                disabled={productActionLoading}
                                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                  productActionLoading
                                    ? 'bg-green-600/60 text-white/70 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                }`}
                                title="Approve product"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleApproveProduct(selectedProduct._id, 'reject');
                                }}
                                disabled={productActionLoading}
                                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                  productActionLoading
                                    ? 'bg-yellow-600/60 text-white/70 cursor-not-allowed'
                                    : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                }`}
                                title="Reject product"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span>Reject</span>
                              </button>
                            </>
                          )}
                          {selectedProduct.approvalStatus === 'Approved' && (
                            <button
                              onClick={() => {
                                handleApproveProduct(selectedProduct._id, 'reject');
                              }}
                              disabled={productActionLoading}
                              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                productActionLoading
                                  ? 'bg-yellow-600/60 text-white/70 cursor-not-allowed'
                                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                              }`}
                              title="Reject product"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              <span>Reject</span>
                            </button>
                          )}
                          {selectedProduct.approvalStatus === 'Rejected' && (
                            <button
                              onClick={() => {
                                handleApproveProduct(selectedProduct._id, 'approve');
                              }}
                              disabled={productActionLoading}
                              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                productActionLoading
                                  ? 'bg-green-600/60 text-white/70 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                              title="Approve product"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Approve</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteProduct(selectedProduct._id)}
                            disabled={productActionLoading}
                            className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                              productActionLoading
                                ? 'bg-red-600/60 text-white/70 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700 text-white'
                            }`}
                            title="Delete product"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminDashboard;
