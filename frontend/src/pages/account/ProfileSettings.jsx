import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageHelper';
import LoadingSpinner from '../../components/LoadingSpinner';
import ImageCropModal from '../../components/ImageCropModal';
import { getCroppedBlob } from '../../utils/cropImage';
import { User, Mail, Phone, MapPin, Camera, Save, ArrowLeft, Shield, Key, X, ZoomIn, Download } from 'lucide-react';

const ProfileSettings = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Image viewer modal state
  const [showImageViewer, setShowImageViewer] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Image crop state
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Profile image state with cache busting
  const [profileImageKey, setProfileImageKey] = useState(Date.now());

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || '',
        },
      });
    }
  }, [user]);

  // Handle image viewer modal - Escape key and body scroll
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showImageViewer) {
        setShowImageViewer(false);
      }
    };

    if (showImageViewer) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [showImageViewer]);

  // Get user avatar URL with priority: profileImage > avatar > null
  const getUserAvatarUrl = () => {
    if (user?.profileImage) {
      return `${resolveImageUrl(user.profileImage)}?t=${profileImageKey}`;
    }
    if (user?.avatar) {
      return user.avatar;
    }
    return null;
  };

  // Download profile image
  const handleDownloadImage = async () => {
    const imageUrl = getUserAvatarUrl();
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${user?.name || 'profile'}-photo.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Image downloaded successfully', 'success');
    } catch {
      showToast('Failed to download image', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await api.put('/auth/profile', {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      });

      updateUser(response.data.data);
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Profile update error:', error);
      showToast(
        error.response?.data?.message || 'Failed to update profile. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  // Image upload handling
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Please select a valid image file (JPEG, PNG, or WEBP)', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    // Open crop modal
    setSelectedFile(file);
    setCropSrc(URL.createObjectURL(file));
    setIsCropOpen(true);
  };

  const handleCropCancel = () => {
    setIsCropOpen(false);
    setCropSrc(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropConfirm = async (croppedAreaPixels) => {
    if (!selectedFile || !croppedAreaPixels) return;

    setUploadingImage(true);
    setIsCropOpen(false);

    try {
      // Get cropped blob
      const croppedBlob = await getCroppedBlob(
        cropSrc,
        croppedAreaPixels,
        0,
        selectedFile.type || 'image/jpeg'
      );

      // Create FormData
      const formDataToSend = new FormData();
      const fileName = `profile-${Date.now()}.${selectedFile.type.split('/')[1] || 'jpg'}`;
      formDataToSend.append('profileImage', croppedBlob, fileName);

      // Upload image
      const response = await api.put('/auth/profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      updateUser(response.data.data);
      setProfileImageKey(Date.now()); // Force image refresh
      showToast('Profile image updated successfully', 'success');
    } catch (error) {
      console.error('Image upload error:', error);
      showToast(
        error.response?.data?.message || 'Failed to upload image. Please try again.',
        'error'
      );
    } finally {
      setUploadingImage(false);
      setCropSrc(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary-900 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-900 py-8">
      <div className="container-custom max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-text-secondary hover:text-primary-500 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>

          <h1 className="heading-1 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-text-secondary mt-2">
            Manage your profile information and account security
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-surface border border-surface-light rounded-xl p-2 mb-6 flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200
                ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-primary-700 to-primary-600 text-white shadow-lg shadow-primary-700/20'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
                }
              `}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Image Section */}
            <div className="bg-surface border border-surface-light rounded-xl p-6">
              <h2 className="text-lg font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary-500" />
                Profile Photo
              </h2>

              <div className="flex items-center gap-6">
                {/* Avatar Preview - Clickable to view full image */}
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => getUserAvatarUrl() && setShowImageViewer(true)}
                    disabled={!getUserAvatarUrl()}
                    className={`w-28 h-28 rounded-full overflow-hidden bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center border-4 border-surface-light transition-all duration-300 ${
                      getUserAvatarUrl()
                        ? 'cursor-zoom-in hover:border-primary-500 hover:shadow-lg hover:shadow-primary-500/20 hover:scale-105'
                        : 'cursor-default'
                    }`}
                    title={getUserAvatarUrl() ? 'Click to view full image' : ''}
                  >
                    {getUserAvatarUrl() ? (
                      <img
                        key={profileImageKey}
                        src={getUserAvatarUrl()}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span
                      className={`text-3xl font-bold text-white ${getUserAvatarUrl() ? 'hidden' : 'flex'}`}
                      style={{ display: getUserAvatarUrl() ? 'none' : 'flex' }}
                    >
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </button>

                  {/* View overlay on hover */}
                  {getUserAvatarUrl() && !uploadingImage && (
                    <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-300 pointer-events-none">
                      <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}

                  {/* Upload overlay */}
                  {uploadingImage && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="profile-image-input"
                  />
                  <label
                    htmlFor="profile-image-input"
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-light border border-surface-light text-text-primary font-medium cursor-pointer hover:border-primary-500/50 hover:bg-surface transition-all duration-200 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <Camera className="w-4 h-4" />
                    {uploadingImage ? 'Uploading...' : 'Change Photo'}
                  </label>
                  <p className="text-sm text-text-tertiary mt-2">
                    JPG, PNG or WEBP. Max size 5MB. Square images work best.
                  </p>
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
            <form onSubmit={handleSubmit}>
              <div className="bg-surface border border-surface-light rounded-xl p-6">
                <h2 className="text-lg font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary-500" />
                  Personal Information
                </h2>

                <div className="space-y-5">
                  {/* Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-semibold text-text-primary mb-2"
                    >
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        className={`input-field pl-12 ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="Enter your full name"
                      />
                    </div>
                    {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-text-primary mb-2"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="input-field pl-12 bg-surface-light/50 cursor-not-allowed opacity-70"
                        placeholder="your@email.com"
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      Email cannot be changed for security reasons
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-semibold text-text-primary mb-2"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        className={`input-field pl-12 ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder="03001234567"
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Address Section */}
              <div className="bg-surface border border-surface-light rounded-xl p-6 mt-6">
                <h2 className="text-lg font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  Address Information
                </h2>

                <div className="space-y-5">
                  {/* Street */}
                  <div>
                    <label
                      htmlFor="address.street"
                      className="block text-sm font-semibold text-text-primary mb-2"
                    >
                      Street Address
                    </label>
                    <input
                      id="address.street"
                      name="address.street"
                      type="text"
                      value={formData.address.street}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="123 Main Street"
                    />
                  </div>

                  {/* City & State Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="address.city"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        City
                      </label>
                      <input
                        id="address.city"
                        name="address.city"
                        type="text"
                        value={formData.address.city}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Lahore"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="address.state"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        State / Province
                      </label>
                      <input
                        id="address.state"
                        name="address.state"
                        type="text"
                        value={formData.address.state}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Punjab"
                      />
                    </div>
                  </div>

                  {/* ZIP & Country Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="address.zipCode"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        ZIP / Postal Code
                      </label>
                      <input
                        id="address.zipCode"
                        name="address.zipCode"
                        type="text"
                        value={formData.address.zipCode}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="54000"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="address.country"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        Country
                      </label>
                      <input
                        id="address.country"
                        name="address.country"
                        type="text"
                        value={formData.address.country}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Pakistan"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6 flex justify-end">
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Security Tab Content */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password Section */}
            <div className="bg-surface border border-surface-light rounded-xl p-6">
              <h2 className="text-lg font-display font-bold text-text-primary mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary-500" />
                Password
              </h2>

              <p className="text-text-secondary mb-4">
                Change your password to keep your account secure. We recommend using a strong
                password that you don't use elsewhere.
              </p>

              <button
                onClick={() => navigate('/account/password')}
                className="btn-secondary flex items-center gap-2"
              >
                <Key className="w-4 h-4" />
                Change Password
              </button>
            </div>

            {/* Account Info */}
            <div className="bg-surface border border-surface-light rounded-xl p-6">
              <h2 className="text-lg font-display font-bold text-text-primary mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-500" />
                Account Information
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-surface-light">
                  <div>
                    <p className="text-text-primary font-medium">Account Type</p>
                    <p className="text-sm text-text-secondary">Your role on the platform</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-900/30 border border-green-600/50 text-green-400 capitalize">
                    {user.role}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-surface-light">
                  <div>
                    <p className="text-text-primary font-medium">Email Verified</p>
                    <p className="text-sm text-text-secondary">Your email verification status</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      user.emailVerified
                        ? 'bg-green-900/30 border border-green-600/50 text-green-400'
                        : 'bg-yellow-900/30 border border-yellow-600/50 text-yellow-400'
                    }`}
                  >
                    {user.emailVerified ? 'Verified' : 'Not Verified'}
                  </span>
                </div>

                {user.authProvider && user.authProvider !== 'local' && (
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-text-primary font-medium">Connected Account</p>
                      <p className="text-sm text-text-secondary">Third-party login provider</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-900/30 border border-blue-600/50 text-blue-400 capitalize">
                      {user.authProvider}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Crop Modal */}
      <ImageCropModal
        isOpen={isCropOpen}
        imageSrc={cropSrc}
        title="Crop Profile Photo"
        aspect={1}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

      {/* Profile Image Viewer Modal */}
      {showImageViewer && getUserAvatarUrl() && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={() => setShowImageViewer(false)}
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fadeIn" />

          {/* Modal Content */}
          <div
            className="relative z-10 w-full max-w-3xl mx-4 animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar with controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-primary-700 to-primary-600 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{user?.name}</h3>
                  <p className="text-sm text-white/60">Profile Photo</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download Button */}
                <button
                  onClick={handleDownloadImage}
                  className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all duration-200 hover:scale-110"
                  title="Download Image"
                >
                  <Download className="w-5 h-5" />
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setShowImageViewer(false)}
                  className="p-3 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-all duration-200 hover:scale-110"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div className="relative bg-surface/50 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
              {/* Premium frame effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-primary-700/10 pointer-events-none" />

              {/* High quality image */}
              <div className="flex items-center justify-center p-4 min-h-[300px] max-h-[70vh]">
                <img
                  src={getUserAvatarUrl()}
                  alt={user?.name || 'Profile Photo'}
                  className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg"
                  referrerPolicy="no-referrer"
                  style={{ imageRendering: 'high-quality' }}
                />
              </div>
            </div>

            {/* Bottom info bar */}
            <div className="mt-4 flex items-center justify-center gap-6 text-white/50 text-sm">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {user?.email}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="capitalize">{user?.role} Account</span>
            </div>

            {/* Hint text */}
            <p className="text-center text-white/40 text-xs mt-3">
              Press <kbd className="px-2 py-0.5 bg-white/10 rounded text-white/60">Esc</kbd> or click outside to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettings;
