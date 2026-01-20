import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import api from '../../services/api';
import { resolveImageUrl } from '../../utils/imageHelper';
import LoadingSpinner from '../../components/LoadingSpinner';
import ImageCropModal from '../../components/ImageCropModal';
import { getCroppedBlob } from '../../utils/cropImage';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Save,
  ArrowLeft,
  Shield,
  Key,
  Building,
  Briefcase,
} from 'lucide-react';

const VendorSettings = () => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

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
    businessName: '',
    businessAddress: {
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
        businessName: user.businessName || '',
        businessAddress: {
          street: user.businessAddress?.street || '',
          city: user.businessAddress?.city || '',
          state: user.businessAddress?.state || '',
          zipCode: user.businessAddress?.zipCode || '',
          country: user.businessAddress?.country || '',
        },
      });
    }
  }, [user]);

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
    } else if (name.startsWith('businessAddress.')) {
      const addressField = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        businessAddress: {
          ...prev.businessAddress,
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
        businessName: formData.businessName,
        businessAddress: formData.businessAddress,
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
    { id: 'business', label: 'Business', icon: Building },
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
            onClick={() => navigate('/dashboard/vendor')}
            className="flex items-center gap-2 text-text-secondary hover:text-primary-500 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex items-center gap-3">
            <h1 className="heading-1 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
              Vendor Settings
            </h1>
            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-900/30 border border-blue-600/50 text-blue-400">
              Vendor
            </span>
          </div>
          <p className="text-text-secondary mt-2">
            Manage your profile, business information, and account security
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-surface border border-surface-light rounded-xl p-2 mb-6 flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 whitespace-nowrap
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
                {/* Avatar Preview */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-primary-800 to-primary-700 flex items-center justify-center border-4 border-surface-light">
                    {getUserAvatarUrl() ? (
                      <img
                        key={profileImageKey}
                        src={getUserAvatarUrl()}
                        alt={user.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span
                      className={`text-2xl font-bold text-white ${getUserAvatarUrl() ? 'hidden' : 'flex'}`}
                      style={{ display: getUserAvatarUrl() ? 'none' : 'flex' }}
                    >
                      {user.name?.charAt(0).toUpperCase() || 'V'}
                    </span>
                  </div>

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

              {/* Personal Address Section */}
              <div className="bg-surface border border-surface-light rounded-xl p-6 mt-6">
                <h2 className="text-lg font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  Personal Address
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

        {/* Business Tab Content */}
        {activeTab === 'business' && (
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Business Information Section */}
              <div className="bg-surface border border-surface-light rounded-xl p-6">
                <h2 className="text-lg font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary-500" />
                  Business Information
                </h2>

                <div className="space-y-5">
                  {/* Business Name */}
                  <div>
                    <label
                      htmlFor="businessName"
                      className="block text-sm font-semibold text-text-primary mb-2"
                    >
                      Business Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        id="businessName"
                        name="businessName"
                        type="text"
                        value={formData.businessName}
                        onChange={handleChange}
                        className="input-field pl-12"
                        placeholder="Your Business Name"
                      />
                    </div>
                    <p className="mt-1 text-xs text-text-tertiary">
                      This name will be displayed to customers on your product listings
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Address Section */}
              <div className="bg-surface border border-surface-light rounded-xl p-6">
                <h2 className="text-lg font-display font-bold text-text-primary mb-6 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-500" />
                  Business Address
                </h2>

                <div className="space-y-5">
                  {/* Street */}
                  <div>
                    <label
                      htmlFor="businessAddress.street"
                      className="block text-sm font-semibold text-text-primary mb-2"
                    >
                      Street Address
                    </label>
                    <input
                      id="businessAddress.street"
                      name="businessAddress.street"
                      type="text"
                      value={formData.businessAddress.street}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Business Street Address"
                    />
                  </div>

                  {/* City & State Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="businessAddress.city"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        City
                      </label>
                      <input
                        id="businessAddress.city"
                        name="businessAddress.city"
                        type="text"
                        value={formData.businessAddress.city}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Lahore"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="businessAddress.state"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        State / Province
                      </label>
                      <input
                        id="businessAddress.state"
                        name="businessAddress.state"
                        type="text"
                        value={formData.businessAddress.state}
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
                        htmlFor="businessAddress.zipCode"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        ZIP / Postal Code
                      </label>
                      <input
                        id="businessAddress.zipCode"
                        name="businessAddress.zipCode"
                        type="text"
                        value={formData.businessAddress.zipCode}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="54000"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="businessAddress.country"
                        className="block text-sm font-semibold text-text-primary mb-2"
                      >
                        Country
                      </label>
                      <input
                        id="businessAddress.country"
                        name="businessAddress.country"
                        type="text"
                        value={formData.businessAddress.country}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="Pakistan"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Business Info
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
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
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-900/30 border border-blue-600/50 text-blue-400 capitalize">
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

                {user.businessName && (
                  <div className="flex items-center justify-between py-3 border-t border-surface-light">
                    <div>
                      <p className="text-text-primary font-medium">Business Name</p>
                      <p className="text-sm text-text-secondary">Your registered business</p>
                    </div>
                    <span className="text-text-primary font-medium">{user.businessName}</span>
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
    </div>
  );
};

export default VendorSettings;
