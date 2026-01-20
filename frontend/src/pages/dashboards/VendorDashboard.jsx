import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import api from '../../services/api';
import { PRODUCT_CATEGORIES, getPlaceholderImage } from '../../utils/constants';
import LoadingSpinner from '../../components/LoadingSpinner';
import ImageCropModal from '../../components/ImageCropModal';
import { getCroppedBlob } from '../../utils/cropImage';
import { formatPKR } from '../../utils/currency';
import ModelUpload3D from '../../components/ar/ModelUpload3D';

const VendorDashboard = ({ initialTab = 'home' }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(0);

  // Crop modal state (client-side only; upload stays as FormData)
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropIndex, setCropIndex] = useState(null);
  const [cropSrc, setCropSrc] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: PRODUCT_CATEGORIES[0],
    stock: '',
  });

  const [fieldErrors, setFieldErrors] = useState({
    price: '',
    stock: '',
  });

  useEffect(() => {
    fetchVendorData();
    
    // Cleanup function to revoke blob URLs when component unmounts
    return () => {
      imagePreviews.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const fetchVendorData = async () => {
    try {
      console.log('=== FETCHING VENDOR DATA ===');
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/products/vendor/my-products'),
        api.get('/orders/vendor'),
      ]);
      console.log('Products fetched:', productsRes.data.data.length);
      if (productsRes.data.data.length > 0) {
        console.log('Sample product:', {
          name: productsRes.data.data[0].name,
          images: productsRes.data.data[0].images,
          approvalStatus: productsRes.data.data[0].approvalStatus
        });
      }
      setProducts(productsRes.data.data);
      setOrders(ordersRes.data.data);
    } catch (err) {
      console.error('Failed to fetch vendor data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'price' || name === 'stock') {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validatePriceAndStock = () => {
    const nextErrors = { price: '', stock: '' };

    const priceRaw = String(formData.price ?? '').trim();
    const stockRaw = String(formData.stock ?? '').trim();

    // Avoid scientific notation and non-numeric chars.
    // Accept: 10, 10.5, 10.50
    const priceRegex = /^\d+(?:\.\d{1,2})?$/;
    const stockRegex = /^\d+$/;

    if (!priceRaw) {
      nextErrors.price = 'Price is required.';
    } else if (!priceRegex.test(priceRaw)) {
      nextErrors.price = 'Invalid price. Use numbers only (e.g., 1999.99).';
    } else {
      const priceValue = Number(priceRaw);
      if (!Number.isFinite(priceValue) || priceValue <= 0) {
        nextErrors.price = 'Invalid price. Must be greater than 0.';
      }
    }

    if (!stockRaw) {
      nextErrors.stock = 'Stock is required.';
    } else if (!stockRegex.test(stockRaw)) {
      nextErrors.stock = 'Invalid stock. Use a whole number (e.g., 10).';
    } else {
      const stockValue = Number(stockRaw);
      if (!Number.isInteger(stockValue) || stockValue <= 0) {
        nextErrors.stock = 'Invalid stock. Must be at least 1.';
      }
    }

    setFieldErrors(nextErrors);
    const firstError = nextErrors.price || nextErrors.stock;
    if (firstError) {
      // Popup/toast as requested
      showToast(firstError.includes('price') ? 'Invalid price' : 'Invalid stock', 'error');
      return false;
    }

    return true;
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    console.log('Files selected:', files.length);
    
    const validFiles = files.filter(file =>
      ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
    );

    if (validFiles.length === 0) {
      showToast('Please select valid image files (.jpg, .jpeg, .png)', 'error');
      return;
    }

    // Check file sizes (max 2MB per image)
    const maxSize = 2 * 1024 * 1024; // 2MB
    const oversizedFiles = validFiles.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      showToast(`Some images are too large. Maximum size is 2MB per image.`, 'error');
      return;
    }

    console.log('Valid files:', validFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));

    // Append new files (so user can replace/remove individual images without losing all selections)
    const existingSignatures = new Set(
      images.map((f) => `${f.name}-${f.size}-${f.lastModified}`)
    );

    const uniqueNewFiles = validFiles.filter((file) => {
      const signature = `${file.name}-${file.size}-${file.lastModified}`;
      if (existingSignatures.has(signature)) return false;
      existingSignatures.add(signature);
      return true;
    });

    if (uniqueNewFiles.length === 0) {
      showToast('These images are already selected.', 'info');
      return;
    }

    setImages((prev) => [...prev, ...uniqueNewFiles]);
    const newPreviews = uniqueNewFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);

    console.log('Previews added:', newPreviews.length);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        // Force file input reset so selecting the same file again triggers onChange
        setFileInputKey((k) => k + 1);
      }
      return next;
    });

    setImagePreviews((prev) => {
      const next = [...prev];
      const removedUrl = next[index];
      next.splice(index, 1);
      if (removedUrl && removedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removedUrl);
      }
      return next;
    });
  };

  const handleClearImages = () => {
    imagePreviews.forEach((url) => {
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    setImages([]);
    setImagePreviews([]);
    setFileInputKey((k) => k + 1);
  };

  const handleOpenCrop = (index) => {
    const previewUrl = imagePreviews[index];
    if (!previewUrl) return;
    setCropIndex(index);
    setCropSrc(previewUrl);
    setIsCropOpen(true);
  };

  const handleCancelCrop = () => {
    setIsCropOpen(false);
    setCropIndex(null);
    setCropSrc(null);
  };

  const handleConfirmCrop = async (croppedAreaPixels) => {
    try {
      if (cropIndex === null || cropIndex === undefined) return;
      const sourceFile = images[cropIndex];
      if (!sourceFile) return;

      const blob = await getCroppedBlob(
        cropSrc,
        croppedAreaPixels,
        0,
        sourceFile.type || 'image/jpeg'
      );

      const maxSize = 2 * 1024 * 1024; // 2MB
      if (blob.size > maxSize) {
        showToast('Cropped image is too large (max 2MB). Try a tighter crop or a smaller source image.', 'error');
        return;
      }

      const originalName = sourceFile.name || `image-${cropIndex + 1}.jpg`;
      const nextName = originalName.replace(/(\.[a-z0-9]+)$/i, '-cropped$1');
      const croppedFile = new File([blob], nextName, {
        type: sourceFile.type || blob.type || 'image/jpeg',
        lastModified: Date.now(),
      });

      // Replace the file and refresh the preview URL
      setImages((prev) => prev.map((f, i) => (i === cropIndex ? croppedFile : f)));
      setImagePreviews((prev) => {
        const next = [...prev];
        const oldUrl = next[cropIndex];
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        next[cropIndex] = URL.createObjectURL(croppedFile);
        return next;
      });

      showToast('Image crop saved', 'success');
      handleCancelCrop();
    } catch (err) {
      console.error('Crop failed:', err);
      showToast('Failed to crop image', 'error');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();

    if (!validatePriceAndStock()) {
      return;
    }

    console.log('=== PRODUCT CREATION START ===');
    console.log('Images array:', images);
    console.log('Images count:', images.length);

    if (images.length === 0) {
      showToast('Please upload at least one product image', 'warning');
      return;
    }

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Append text fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', parseFloat(formData.price));
      formDataToSend.append('category', formData.category);
      formDataToSend.append('stock', parseInt(formData.stock));
      
      // Append image files
      images.forEach((image, index) => {
        console.log(`Appending image ${index + 1}:`, {
          name: image.name,
          type: image.type,
          size: image.size,
          isFile: image instanceof File
        });
        formDataToSend.append('images', image);
      });

      console.log('Sending request to backend...');

      // Send as multipart/form-data
      const response = await api.post('/products', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Backend response:', response.data);
      console.log('Created product images:', response.data.data?.images);

      showToast('Product created successfully! Pending admin approval.', 'success');
      setShowAddProduct(false);
      
      // Clean up preview URLs to prevent memory leaks
      console.log('Cleaning up', imagePreviews.length, 'preview URLs');
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        category: PRODUCT_CATEGORIES[0],
        stock: '',
      });
      setImages([]);
      setImagePreviews([]);
      setFileInputKey(prev => prev + 1); // Force file input reset
      
      console.log('Form reset complete');
      console.log('=== PRODUCT CREATION END ===');
      
      fetchVendorData();
    } catch (err) {
      console.error('Product creation error:', err);
      console.error('Error response:', err.response?.data);
      showToast(err.response?.data?.message || 'Failed to create product', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await api.delete(`/products/${id}`);
      showToast('Product deleted successfully', 'success');
      fetchVendorData();
    } catch (err) {
      console.error('Failed to delete product', err);
      showToast('Failed to delete product', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      let rejectionReason = '';

      if (newStatus === 'Rejected') {
        rejectionReason = prompt('Please provide a reason for rejection:');
        if (!rejectionReason) {
          showToast('Rejection reason is required', 'warning');
          return;
        }
      }

      await api.put(`/orders/${orderId}/status`, {
        status: newStatus,
        rejectionReason,
      });

      showToast('Order status updated successfully', 'success');
      setSelectedOrder(null);
      fetchVendorData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update order status', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Approved': 'bg-green-500 text-white',
      'Pending': 'bg-amber-500 text-white',
      'Rejected': 'bg-red-500 text-white'
    };
    return styles[status] || styles['Pending'];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-900 py-8">
        <div className="container-custom">
          <LoadingSpinner size="lg" message="Loading vendor dashboard..." />
        </div>
      </div>
    );
  }

  const approvedProducts = products.filter(p => p.approvalStatus === 'Approved');
  const stats = {
    totalProducts: products.length,
    liveProducts: approvedProducts.length,
    pendingProducts: products.filter(p => p.approvalStatus === 'Pending').length,
    totalOrders: orders.length,
  };

  return (
    <div className="min-h-screen bg-secondary-900">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#1a0000] via-[#4a0000] to-[#6b0000] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTI0IDQyYzMuMzEgMCA2IDIuNjkgNiA2cy0yLjY5IDYtNiA2LTYtMi42OS02LTYgMi42OS02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>

        <div className="container-custom relative z-10">
          <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="font-display text-4xl font-bold mb-2">Vendor Hub</h1>
                <p className="text-white/90 text-lg">Welcome back, {user.name}!</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <p className="text-white/70 text-sm mb-1">Total Products</p>
                <p className="text-3xl font-bold">{stats.totalProducts}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <p className="text-white/70 text-sm mb-1">Live Products</p>
                <p className="text-3xl font-bold text-green-400">{stats.liveProducts}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <p className="text-white/70 text-sm mb-1">Pending Approval</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.pendingProducts}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                <p className="text-white/70 text-sm mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-blue-400">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="bg-surface border-b border-surface-light sticky top-0 z-40">
        <div className="container-custom">
          <div className="flex gap-1">
            {[
              { id: 'home', label: 'My Products', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
              { id: 'orders', label: 'Orders', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (location.pathname.endsWith('/pricing')) navigate('/dashboard/vendor');
                }}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-all duration-300 border-b-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary-900/20 to-primary-800/20 text-primary-500 border-primary-500'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Home Tab - Products Grid */}
        {activeTab === 'home' && (
          <div>
            {/* Add Product CTA */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-display font-bold text-text-primary">Your Product Inventory</h2>
                <p className="text-text-secondary mt-1">Manage and track all your listed products</p>
              </div>
              <button
                onClick={() => setShowAddProduct(!showAddProduct)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-800 to-primary-700 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-primary-700/30 hover:shadow-primary-700/50 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {showAddProduct ? 'Cancel' : 'Add New Product'}
              </button>
            </div>

            {/* Add Product Form */}
            {showAddProduct && (
              <form onSubmit={handleAddProduct} className="mb-8 bg-surface border border-surface-light rounded-xl p-6 shadow-lg">
                <h3 className="text-xl font-display font-bold text-text-primary mb-6">Create New Product</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-text-primary font-medium mb-2">
                      Product Name*
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Enter product name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-text-primary font-medium mb-2">
                      Category*
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-text-primary font-medium mb-2">
                      Price (PKR)*
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      inputMode="decimal"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                      }}
                      className="input-field"
                      placeholder="0.00"
                      required
                    />
                    {fieldErrors.price && (
                      <p className="mt-1 text-sm text-red-400">{fieldErrors.price}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-text-primary font-medium mb-2">
                      Stock*
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      inputMode="numeric"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
                      }}
                      className="input-field"
                      placeholder="1"
                      required
                    />
                    {fieldErrors.stock && (
                      <p className="mt-1 text-sm text-red-400">{fieldErrors.stock}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-text-primary font-medium mb-2">
                      Description*
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="input-field"
                      rows="4"
                      placeholder="Enter detailed product description"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-text-primary font-medium mb-2">
                      Product Images* (.jpg, .jpeg, .png)
                    </label>
                    <input
                      key={fileInputKey}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      multiple
                      onChange={handleImageChange}
                      className="input-field"
                      required
                    />
                    <p className="text-xs text-text-tertiary mt-1">
                      Upload at least 1 image. Maximum 2MB per image. Accepted formats: JPG, JPEG, PNG
                    </p>

                    {imagePreviews.length > 0 && (
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={handleClearImages}
                          className="px-4 py-2 rounded-lg bg-surface-light hover:bg-red-500/10 border border-surface-light hover:border-red-500/30 text-text-tertiary hover:text-red-400 transition-all text-sm font-semibold"
                        >
                          Clear all images
                        </button>
                      </div>
                    )}

                    {imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {imagePreviews.map((preview, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={preview}
                              alt={`Preview ${i + 1}`}
                              className="w-full h-32 object-cover rounded-lg border-2 border-primary-700 shadow-lg"
                            />
                            <div className="absolute top-2 right-2 bg-primary-700 text-white text-xs px-2 py-1 rounded-lg font-bold">
                              #{i + 1}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(i)}
                              className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-red-500/20 text-red-200 text-xs font-semibold border border-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove image"
                            >
                              Remove
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenCrop(i)}
                              className="absolute bottom-2 left-2 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Crop
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="mt-6 px-8 py-3 bg-gradient-to-r from-primary-800 to-primary-700 hover:from-primary-700 hover:to-primary-600 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-primary-700/30">
                  Create Product
                </button>
              </form>
            )}

            <ImageCropModal
              isOpen={isCropOpen}
              imageSrc={cropSrc}
              title="Crop Product Image"
              aspect={4 / 3}
              onCancel={handleCancelCrop}
              onConfirm={handleConfirmCrop}
            />

            {/* Products Grid */}
            {products.length === 0 ? (
              <div className="bg-surface border border-surface-light rounded-xl p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-800/20 to-primary-700/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">No Products Yet</h3>
                <p className="text-text-secondary mb-6">Start building your inventory by adding your first product</p>
                <button
                  onClick={() => setShowAddProduct(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-800 to-primary-700 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                  const imagePath = product.images[0];
                  const imageUrl = imagePath?.startsWith('http') ? imagePath : `http://localhost:5000${imagePath}`;
                  console.log(`Product: ${product.name}`);
                  console.log(`  - Raw path from DB: ${imagePath}`);
                  console.log(`  - Constructed URL: ${imageUrl}`);
                  console.log(`  - Is external URL: ${imagePath?.startsWith('http')}`);
                  
                  return (
                  <div key={product._id} className="bg-surface border border-surface-light rounded-xl overflow-hidden hover:border-primary-500/50 transition-all duration-300 hover:shadow-xl group">
                    {/* Product Image */}
                    <div className="relative h-48 bg-secondary-900 overflow-hidden">
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onLoad={() => console.log(`✅ SUCCESS: Image loaded for ${product.name}`)}
                          onError={(e) => {
                            console.error(`❌ FAILED: Image could not load for ${product.name}`);
                            console.error(`   Attempted URL: ${imageUrl}`);
                            console.error(`   Falling back to placeholder`);
                            e.target.onerror = null; // Prevent infinite loop
                            e.target.src = getPlaceholderImage(product.category);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <div className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide shadow-md ${getStatusBadge(product.approvalStatus || 'Pending')}`}>
                          {product.approvalStatus === 'Approved' ? 'Live' : product.approvalStatus === 'Rejected' ? 'Rejected' : 'Pending'}
                        </div>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-5">
                      <div className="mb-3">
                        <h3 className="text-lg font-bold text-text-primary mb-1 line-clamp-1">{product.name}</h3>
                        <p className="text-sm text-text-tertiary">{product.category}</p>
                      </div>

                      <p className="text-sm text-text-secondary mb-4 line-clamp-2">{product.description}</p>

                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-2xl font-display font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
                            {formatPKR(product.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-text-secondary">Stock</p>
                          <p className={`text-lg font-bold ${product.stock > 10 ? 'text-green-400' : product.stock > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {product.stock}
                          </p>
                        </div>
                      </div>

                      {product.approvalStatus === 'Rejected' && product.rejectionReason && (
                        <div className="mb-4 p-3 bg-red-900/20 border border-red-600/30 rounded-lg">
                          <p className="text-xs text-red-400"><strong>Rejection Reason:</strong> {product.rejectionReason}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteProduct(product._id)}
                          className="flex-1 group/del px-3 py-2 bg-surface-light hover:bg-red-500/10 border border-surface-light hover:border-red-500/30 text-text-tertiary hover:text-red-400 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                          title="Delete product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <ModelUpload3D product={product} onSuccess={fetchVendorData} />
                    </div>
                  </div>
                )})}              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-display font-bold text-text-primary">Incoming Orders</h2>
              <p className="text-text-secondary mt-1">Manage and fulfill customer orders</p>
            </div>

            {orders.length === 0 ? (
              <div className="bg-surface border border-surface-light rounded-xl p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-800/20 to-primary-700/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2">No Orders Yet</h3>
                <p className="text-text-secondary">Orders from customers will appear here</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {orders.map((order) => (
                  <div key={order._id} className="bg-surface border border-surface-light rounded-xl p-6 hover:border-primary-500/30 transition-all duration-300">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                      <div className="flex-1">
                        <h3 className="text-lg font-display font-bold text-text-primary mb-2">
                          Order #{order._id.slice(-8).toUpperCase()}
                        </h3>
                        <p className="text-text-secondary">Customer: {order.customer?.name || 'N/A'}</p>
                        {order.customer?.email && (
                          <p className="text-sm text-text-tertiary">{order.customer.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-2xl font-display font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
                          {formatPKR(order.totalAmount)}
                        </p>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="w-9 h-9 bg-gradient-to-r from-primary-800 to-primary-700 hover:from-primary-700 hover:to-primary-600 text-white rounded-lg transition-all duration-200 flex items-center justify-center"
                          title="View order details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 border-b border-surface-light last:border-0">
                          <div className="flex items-center gap-3">
                            {item.product?.images?.[0] && (
                              <img src={item.product.images[0].startsWith('http') ? item.product.images[0] : `http://localhost:5000${item.product.images[0]}`} alt={item.product.name} className="w-12 h-12 object-cover rounded-lg" />
                            )}
                            <span className="text-text-primary font-medium">{item.product?.name || 'Unknown Product'}</span>
                          </div>
                          <span className="text-text-secondary">
                            Qty: {item.quantity} × {formatPKR(item.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-surface border border-surface-light rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 p-6 border-b border-primary-700/50 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display font-bold text-white">Order Details</h2>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-all"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-secondary mb-1">Order ID</p>
                  <p className="font-bold text-text-primary">#{selectedOrder._id.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary mb-1">Order Date</p>
                  <p className="font-bold text-text-primary">{new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-surface-light rounded-xl p-4">
                <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Customer Information
                </h3>
                <p className="text-text-primary font-semibold">{selectedOrder.customer?.name || 'N/A'}</p>
                {selectedOrder.customer?.email && (
                  <p className="text-sm text-text-secondary mt-1">{selectedOrder.customer.email}</p>
                )}
              </div>

              {/* Shipping Address */}
              <div className="bg-surface-light rounded-xl p-4">
                <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Shipping Address
                </h3>
                {selectedOrder.shippingAddress ? (
                  typeof selectedOrder.shippingAddress === 'string' ? (
                    <p className="text-text-primary font-medium leading-relaxed">
                      {selectedOrder.shippingAddress}
                    </p>
                  ) : (
                    <div className="text-text-primary font-medium leading-relaxed space-y-1">
                      <p>{selectedOrder.shippingAddress.street}</p>
                      <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                      <p>{selectedOrder.shippingAddress.country}</p>
                    </div>
                  )
                ) : (
                  <p className="text-text-secondary">No shipping address provided</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-surface-light rounded-xl p-4">
                <h3 className="font-bold text-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Payment Method
                </h3>
                <p className="text-text-primary font-medium">{selectedOrder.paymentMethod || 'N/A'}</p>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-bold text-text-primary mb-4">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 bg-surface-light rounded-lg">
                      {item.product?.images?.[0] && (
                        <img src={item.product.images[0].startsWith('http') ? item.product.images[0] : `http://localhost:5000${item.product.images[0]}`} alt={item.product.name} className="w-16 h-16 object-cover rounded-lg" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">{item.product?.name || 'Unknown Product'}</p>
                        <p className="text-sm text-text-secondary">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-primary-500">{formatPKR(item.price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-gradient-to-br from-primary-800/10 to-primary-700/10 rounded-xl p-4 border border-primary-700/30">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-text-primary">Total Amount</p>
                  <p className="text-3xl font-display font-bold bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
                    {formatPKR(selectedOrder.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Update Status */}
              <div className="bg-surface-light rounded-xl p-4">
                <label className="block font-bold text-text-primary mb-3">Update Order Status</label>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleUpdateOrderStatus(selectedOrder._id, e.target.value)}
                  className="input-field w-full"
                >
                  <option value="Pending Vendor Action">Pending Vendor Action</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;
