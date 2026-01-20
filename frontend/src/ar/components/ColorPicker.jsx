/**
 * Color Picker Component
 *
 * Premium automotive color selection panel for AR viewer.
 * Supports metallic, glossy, and matte finishes.
 */

import { useState, useCallback } from 'react';
import { AUTOMOTIVE_COLORS } from '../core/constants.js';

/**
 * ColorPicker Component
 * @param {Object} props
 * @param {ColorConfig} props.selectedColor - Currently selected color
 * @param {Function} props.onColorSelect - Callback when color is selected
 * @param {Function} props.onClose - Callback to close picker
 * @param {boolean} props.isOpen - Whether picker is open
 */
const ColorPicker = ({ selectedColor, onColorSelect, onClose, isOpen }) => {
  const [hoveredColor, setHoveredColor] = useState(null);

  const handleColorClick = useCallback(
    (color) => {
      onColorSelect(color);
    },
    [onColorSelect]
  );

  const getFinishLabel = (color) => {
    if (color.metallic >= 0.8) return '✨ Metallic';
    if (color.roughness >= 0.6) return '🎨 Matte';
    if (color.metallic <= 0.3 && color.roughness <= 0.3) return '💎 Glossy';
    return '🌟 Pearl';
  };

  const getFinishType = (color) => {
    if (color.metallic >= 0.8) return 'metallic';
    if (color.roughness >= 0.6) return 'matte';
    if (color.metallic <= 0.3 && color.roughness <= 0.3) return 'glossy';
    return 'pearl';
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <div style={styles.iconWrap}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </div>
            <div>
              <h4 style={styles.title}>Select Finish</h4>
              <p style={styles.subtitle}>Color persists in AR mode</p>
            </div>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Color Grid */}
        <div style={styles.colorGrid}>
          {AUTOMOTIVE_COLORS.map((color) => {
            const isSelected = selectedColor?.hex === color.hex;
            const isHovered = hoveredColor?.hex === color.hex;
            const finishType = getFinishType(color);

            return (
              <button
                key={color.hex}
                style={{
                  ...styles.colorSwatch,
                  backgroundColor: color.hex,
                  ...(isSelected ? styles.colorSwatchSelected : {}),
                  ...(isHovered ? styles.colorSwatchHovered : {}),
                  ...(finishType === 'metallic'
                    ? styles.metallicEffect
                    : finishType === 'glossy'
                    ? styles.glossyEffect
                    : {}),
                }}
                onClick={() => handleColorClick(color)}
                onMouseEnter={() => setHoveredColor(color)}
                onMouseLeave={() => setHoveredColor(null)}
                title={color.name}
              >
                {isSelected && (
                  <div style={styles.checkmark}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Color Info */}
        {(selectedColor || hoveredColor) && (
          <div style={styles.selectedInfo}>
            <div
              style={{
                ...styles.selectedPreview,
                backgroundColor: (hoveredColor || selectedColor).hex,
              }}
            />
            <div style={styles.selectedDetails}>
              <span style={styles.selectedName}>
                {(hoveredColor || selectedColor).name}
              </span>
              <span style={styles.selectedFinish}>
                {getFinishLabel(hoveredColor || selectedColor)}
              </span>
            </div>
            <div style={styles.selectedValues}>
              <span style={styles.valueLabel}>
                M: {Math.round(((hoveredColor || selectedColor).metallic || 0) * 100)}%
              </span>
              <span style={styles.valueLabel}>
                R: {Math.round(((hoveredColor || selectedColor).roughness || 0) * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Apply Note */}
        <div style={styles.note}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span>Color applies instantly • No model reload required</span>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '80px',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  panel: {
    backgroundColor: '#1f2937',
    borderRadius: '24px',
    padding: '20px',
    width: '320px',
    maxWidth: '90vw',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconWrap: {
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#a78bfa',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: 'white',
  },
  subtitle: {
    margin: 0,
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  closeButton: {
    width: '36px',
    height: '36px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '10px',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  colorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginBottom: '16px',
  },
  colorSwatch: {
    aspectRatio: '1',
    borderRadius: '14px',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    border: '3px solid #8b5cf6',
    transform: 'scale(1.08)',
    boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.3)',
  },
  colorSwatchHovered: {
    transform: 'scale(1.05)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  metallicEffect: {
    backgroundImage:
      'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.1) 100%)',
    backgroundBlendMode: 'overlay',
  },
  glossyEffect: {
    backgroundImage:
      'linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, transparent 40%)',
    backgroundBlendMode: 'overlay',
  },
  checkmark: {
    width: '24px',
    height: '24px',
    backgroundColor: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b5cf6',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  selectedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: '14px',
    marginBottom: '12px',
    border: '1px solid rgba(139, 92, 246, 0.2)',
  },
  selectedPreview: {
    width: '44px',
    height: '44px',
    borderRadius: '10px',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    flexShrink: 0,
  },
  selectedDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  selectedName: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'white',
  },
  selectedFinish: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  selectedValues: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    alignItems: 'flex-end',
  },
  valueLabel: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.4)',
    fontFamily: 'monospace',
  },
  note: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
};

export default ColorPicker;
