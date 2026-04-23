import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

const ModelUpload3D = ({ product, onSuccess }) => {
  const { showToast } = useToast();
  // Always start collapsed — user must explicitly open the panel
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    glbUrl: '',
    usdzUrl: '',
    length: '',
    width: '',
    height: '',
  });

  const hasExistingModel = Boolean(
    product?.model3D?.glbFile || product?.model3D?.usdzFile || product?.model3D?.isARReady
  );

  // Sync form fields when the product changes (e.g. after a save)
  useEffect(() => {
    const model3D = product?.model3D || {};
    setFormData({
      glbUrl:  model3D.glbFile                         || '',
      usdzUrl: model3D.usdzFile                        || '',
      length:  model3D.dimensions?.length?.toString?.() || '',
      width:   model3D.dimensions?.width?.toString?.()  || '',
      height:  model3D.dimensions?.height?.toString?.() || '',
    });
    // Always collapse when the underlying product data refreshes
    setExpanded(false);
  }, [product?._id, product?.model3D?.glbFile, product?.model3D?.usdzFile]);

  const handleToggle = () => setExpanded((prev) => !prev);

  const handleCancel = () => {
    // Reset fields back to saved values on cancel
    const model3D = product?.model3D || {};
    setFormData({
      glbUrl:  model3D.glbFile                          || '',
      usdzUrl: model3D.usdzFile                         || '',
      length:  model3D.dimensions?.length?.toString?.() || '',
      width:   model3D.dimensions?.width?.toString?.()  || '',
      height:  model3D.dimensions?.height?.toString?.() || '',
    });
    setExpanded(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const glbUrl  = formData.glbUrl.trim();
    const usdzUrl = formData.usdzUrl.trim();

    if (!hasExistingModel && !glbUrl) {
      showToast('Please enter the GLB file URL', 'warning');
      return;
    }

    setUploading(true);
    try {
      await api.post(`/products/${product._id}/upload-3d-model`, {
        glbFile:    glbUrl,
        usdzFile:   usdzUrl,
        dimensions: {
          length: parseFloat(formData.length) || 0,
          width:  parseFloat(formData.width)  || 0,
          height: parseFloat(formData.height) || 0,
        },
      });

      showToast(
        hasExistingModel ? '3D model updated successfully!' : '3D model uploaded successfully!',
        'success'
      );
      setExpanded(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save 3D model', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remove the 3D model from this product?')) return;

    setUploading(true);
    try {
      await api.delete(`/products/${product._id}/3d-model`);
      showToast('3D model removed', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast('Failed to remove 3D model', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-3">
      {/* ── Collapsed toggle button ──────────────────────────────────────── */}
      {!expanded && (
        hasExistingModel ? (
          /* Model exists → compact status row */
          <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-green-400 truncate">3D Model Active</span>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className="ml-2 px-2.5 py-1 bg-surface-light hover:bg-surface text-text-secondary rounded-md text-xs font-medium transition-all flex-shrink-0"
            >
              Edit
            </button>
          </div>
        ) : (
          /* No model → "+ Add 3D Model" button */
          <button
            type="button"
            onClick={handleToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 hover:border-blue-500/50 text-blue-400 hover:text-blue-300 rounded-lg text-sm font-medium transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add 3D Model
          </button>
        )
      )}

      {/* ── Expanded form panel ──────────────────────────────────────────── */}
      {expanded && (
        <div className="border border-surface-light rounded-xl overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-light border-b border-surface-light">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-sm font-semibold text-text-primary">
                {hasExistingModel ? 'Edit 3D Model' : 'Add 3D Model'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-surface text-text-tertiary hover:text-text-secondary transition-all"
              title="Collapse"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-surface">
            {/* GLB URL */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                GLB File URL {!hasExistingModel && <span className="text-red-400">*</span>}
              </label>
              <input
                type="url"
                value={formData.glbUrl}
                onChange={(e) => setFormData({ ...formData, glbUrl: e.target.value })}
                placeholder="https://example.com/model.glb"
                className="w-full px-3 py-2 bg-surface-light border border-surface-light rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                required={!hasExistingModel}
              />
              <p className="text-[11px] text-text-tertiary mt-1">
                {hasExistingModel
                  ? 'Leave blank to keep the existing GLB URL.'
                  : 'Upload your .glb file to a hosting service and paste the URL.'}
              </p>
            </div>

            {/* USDZ URL */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                USDZ File URL <span className="text-text-tertiary font-normal">(Optional — iOS AR)</span>
              </label>
              <input
                type="url"
                value={formData.usdzUrl}
                onChange={(e) => setFormData({ ...formData, usdzUrl: e.target.value })}
                placeholder="https://example.com/model.usdz"
                className="w-full px-3 py-2 bg-surface-light border border-surface-light rounded-lg text-sm text-text-primary placeholder-text-tertiary focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Dimensions */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Real-World Dimensions (cm) <span className="text-text-tertiary font-normal">Optional</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'length', label: 'L' },
                  { key: 'width',  label: 'W' },
                  { key: 'height', label: 'H' },
                ].map(({ key, label }) => (
                  <div key={key} className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-text-tertiary pointer-events-none">
                      {label}
                    </span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData[key]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      placeholder="0"
                      className="w-full pl-6 pr-2 py-2 bg-surface-light border border-surface-light rounded-lg text-sm text-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  hasExistingModel ? 'Save Changes' : 'Upload'
                )}
              </button>

              {hasExistingModel && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={uploading}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                  title="Remove 3D model"
                >
                  Remove
                </button>
              )}

              <button
                type="button"
                onClick={handleCancel}
                disabled={uploading}
                className="px-3 py-2 bg-surface-light hover:bg-surface text-text-secondary rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ModelUpload3D;
