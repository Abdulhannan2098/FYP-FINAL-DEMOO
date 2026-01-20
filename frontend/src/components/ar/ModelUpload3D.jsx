import { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const ModelUpload3D = ({ product, onSuccess }) => {
  const { showToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    glbUrl: '',
    usdzUrl: '',
    length: '',
    width: '',
    height: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.glbUrl.trim()) {
      showToast('Please enter the GLB file URL', 'warning');
      return;
    }

    setUploading(true);
    try {
      await api.post(`/products/${product._id}/upload-3d-model`, {
        glbFile: formData.glbUrl,
        usdzFile: formData.usdzUrl || null,
        dimensions: {
          length: parseFloat(formData.length) || 0,
          width: parseFloat(formData.width) || 0,
          height: parseFloat(formData.height) || 0,
        },
      });

      showToast('3D Model uploaded successfully!', 'success');
      setShowForm(false);
      setFormData({
        glbUrl: '',
        usdzUrl: '',
        length: '',
        width: '',
        height: '',
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to upload 3D model', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove the 3D model from this product?')) {
      return;
    }

    setUploading(true);
    try {
      await api.delete(`/products/${product._id}/3d-model`);
      showToast('3D Model removed successfully', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast('Failed to remove 3D model', 'error');
    } finally {
      setUploading(false);
    }
  };

  const hasModel = product.model3D?.isARReady;

  return (
    <div className="mt-3">
      {!hasModel ? (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium text-sm transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Add 3D Model
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3 p-4 bg-surface-light rounded-lg border border-surface-light space-y-3">
              <h4 className="font-semibold text-text-primary text-sm mb-2">Upload 3D Model</h4>

              {/* GLB URL */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  GLB File URL* (Required)
                </label>
                <input
                  type="url"
                  value={formData.glbUrl}
                  onChange={(e) => setFormData({ ...formData, glbUrl: e.target.value })}
                  placeholder="https://example.com/model.glb"
                  className="w-full px-3 py-2 bg-surface border border-surface-light rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-text-tertiary mt-1">
                  Upload your .glb file to a hosting service (Cloudinary, AWS S3, etc.) and paste the URL here
                </p>
              </div>

              {/* USDZ URL */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  USDZ File URL (Optional - iOS)
                </label>
                <input
                  type="url"
                  value={formData.usdzUrl}
                  onChange={(e) => setFormData({ ...formData, usdzUrl: e.target.value })}
                  placeholder="https://example.com/model.usdz"
                  className="w-full px-3 py-2 bg-surface border border-surface-light rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Real-World Dimensions (cm) - Optional
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                    placeholder="Length"
                    className="px-3 py-2 bg-surface border border-surface-light rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                    placeholder="Width"
                    className="px-3 py-2 bg-surface border border-surface-light rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-primary-500"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    placeholder="Height"
                    className="px-3 py-2 bg-surface border border-surface-light rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-500 text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-surface-light hover:bg-surface-lighter text-text-secondary rounded-lg font-medium text-sm transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-green-400">AR Ready</span>
          </div>
          <button
            onClick={handleDelete}
            disabled={uploading}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
          >
            {uploading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ModelUpload3D;
