import { useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';

const ImageCropModal = ({
  isOpen,
  imageSrc,
  title = 'Crop Image',
  aspect = 4 / 3,
  onCancel,
  onConfirm,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [isOpen, imageSrc]);

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-surface-light bg-surface shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-light">
          <h3 className="text-lg font-display font-bold text-text-primary">{title}</h3>
          <button
            type="button"
            className="w-9 h-9 rounded-xl bg-surface-light hover:bg-surface border border-surface-light text-text-secondary hover:text-text-primary transition"
            onClick={onCancel}
            aria-label="Close crop modal"
          >
            ✕
          </button>
        </div>

        <div className="relative w-full h-[420px] bg-secondary-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-5 py-4 border-t border-surface-light bg-surface">
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-secondary w-12">Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-xs text-text-tertiary w-12 text-right">{zoom.toFixed(2)}×</span>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-surface-light border border-surface-light text-text-secondary hover:text-text-primary hover:bg-surface transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(croppedAreaPixels)}
              disabled={!croppedAreaPixels}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-800 to-primary-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
