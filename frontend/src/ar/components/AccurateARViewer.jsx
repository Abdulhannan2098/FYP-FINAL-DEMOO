/**
 * Accurate AR Viewer Component
 *
 * Main AR experience component that integrates:
 * - Color customization
 * - Core 3D/AR preview
 *
 * Replaces the previous AdvancedARViewer with improved accuracy.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import '@google/model-viewer';

import {
  getColorManager,
  getProductType,
  UI_MESSAGES,
  AUTOMOTIVE_COLORS,
} from '../core/index.js';

import ColorPicker from './ColorPicker.jsx';

/**
 * AccurateARViewer Component
 * @param {Object} props
 * @param {Object} props.product - Product data with model3D
 * @param {Function} props.onClose - Callback to close viewer
 */
const AccurateARViewer = ({ product, onClose }) => {
  // Refs
  const modelViewerRef = useRef(null);
  const colorManagerRef = useRef(null);

  // Core state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(UI_MESSAGES.initializing);
  const [error, setError] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);

  // AR state
  const [isARSupported, setIsARSupported] = useState(false);
  const [isInARMode, setIsInARMode] = useState(false);

  // Feature state
  const [selectedColor, setSelectedColor] = useState(AUTOMOTIVE_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Derived values
  const productType = getProductType(product);
  const has3DModel = product?.model3D?.glbFile;

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize AR system
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        if (!mounted) return;

        // Initialize color manager (will be set up when model loads)
        colorManagerRef.current = getColorManager();

        console.log('[AccurateARViewer] Initialization complete');
      } catch (err) {
        console.error('[AccurateARViewer] Initialization error:', err);
        if (mounted) {
          setError('Failed to initialize AR viewer');
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Check AR support when model-viewer ready
   */
  useEffect(() => {
    const checkARSupport = async () => {
      if (modelViewerRef.current) {
        try {
          // Wait for model-viewer to initialize
          await new Promise((resolve) => setTimeout(resolve, 500));
          const canAR = await modelViewerRef.current.canActivateAR;
          setIsARSupported(canAR);
          console.log('[AccurateARViewer] AR support:', canAR);
        } catch (err) {
          setIsARSupported(false);
        }
      }
    };

    checkARSupport();
  }, [isModelReady]);

  // ============================================================================
  // MODEL EVENTS
  // ============================================================================

  /**
   * Handle model load
   */
  const handleModelLoad = useCallback(() => {
    setIsModelReady(true);
    setIsLoading(false);
    setLoadingMessage('');
    console.log('[AccurateARViewer] Model loaded');

    // Initialize color manager with model-viewer
    if (colorManagerRef.current && modelViewerRef.current) {
      colorManagerRef.current.initWithModelViewer(modelViewerRef.current);
      // Apply default color
      colorManagerRef.current.applyColor(selectedColor);
    }
  }, [selectedColor]);

  /**
   * Handle model error
   */
  const handleModelError = useCallback((event) => {
    console.error('[AccurateARViewer] Model error:', event);
    setError('Failed to load 3D model');
    setIsLoading(false);
  }, []);

  /**
   * Handle AR status changes
   */
  const handleARStatus = useCallback(
    (event) => {
      const status = event.detail.status;
      console.log('[AccurateARViewer] AR status:', status);

      if (status === 'session-started') {
        setIsInARMode(true);
      } else if (status === 'not-presenting') {
        setIsInARMode(false);
      }
    },
    []
  );

  // ============================================================================
  // COLOR HANDLING
  // ============================================================================

  /**
   * Handle color change
   */
  const handleColorChange = useCallback((color) => {
    setSelectedColor(color);
    if (colorManagerRef.current) {
      colorManagerRef.current.applyColor(color);
    }
  }, []);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  /**
   * Get status message
   */
  const getStatusMessage = () => {
    if (error) return error;
    if (isLoading) return loadingMessage;
    return isARSupported ? 'Ready for AR' : '3D Preview Mode';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // No 3D model available
  if (!has3DModel) {
    return (
      <div style={styles.container}>
        <div style={styles.errorPanel}>
          <div style={styles.errorIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h3 style={styles.errorTitle}>3D Model Unavailable</h3>
          <p style={styles.errorText}>This product doesn't have a 3D model for AR preview.</p>
          <button style={styles.closeBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h2 style={styles.headerTitle}>{product.name}</h2>
            <p style={styles.headerSubtitle}>
              <span style={styles.statusDot} className={isModelReady ? 'active' : ''} />
              {getStatusMessage()}
            </p>
          </div>
        </div>
        <button style={styles.closeButton} onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 3D Viewer */}
      <div style={styles.viewerContainer}>
        <model-viewer
          ref={modelViewerRef}
          src={product.model3D.glbFile}
          ios-src={product.model3D.usdzFile || product.model3D.glbFile}
          alt={product.name}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          shadow-intensity="2"
          environment-image="neutral"
          exposure="1.3"
          poster={product.model3D.thumbnailAR || product.images?.[0]}
          loading="eager"
          reveal="auto"
          ar-scale="auto"
          ar-placement="floor"
          style={styles.modelViewer}
          onLoad={handleModelLoad}
          onError={handleModelError}
        >
          {/* AR Button */}
          {isARSupported && isModelReady && (
            <button slot="ar-button" style={styles.arButton}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div style={styles.arButtonText}>
                <span style={styles.arButtonMain}>View in Your Space</span>
                <span style={styles.arButtonSub}>
                  {selectedColor.name} • {productType}
                </span>
              </div>
            </button>
          )}

          {/* Loading State */}
          {isLoading && (
            <div slot="poster" style={styles.loadingOverlay}>
              <div style={styles.spinner} />
              <p style={styles.loadingText}>{loadingMessage}</p>
            </div>
          )}
        </model-viewer>
      </div>

      {/* Color Picker Modal */}
      <ColorPicker
        isOpen={showColorPicker}
        selectedColor={selectedColor}
        onColorSelect={handleColorChange}
        onClose={() => setShowColorPicker(false)}
      />

      {/* Controls Panel (non-overlapping) */}
      {isModelReady && !isLoading && !isInARMode && (
        <div style={styles.controlsPanel}>
          <div style={styles.controlsContent}>
            <div style={styles.controlsInfo}>
              <p style={styles.controlsTitle}>Controls</p>
              <p style={styles.controlsHint}>Rotate: drag. Zoom: pinch or scroll.</p>
            </div>

            <button
              style={styles.controlsColorButton}
              onClick={() => setShowColorPicker(true)}
              title="Change Color"
            >
              <div style={{ ...styles.controlsColorSwatch, backgroundColor: selectedColor.hex }} />
              <span style={styles.controlsColorLabel}>Color</span>
              <span style={styles.controlsColorValue}>{selectedColor.name}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" />
              </svg>
            </button>

            <div style={styles.controlsMeta}>
              Selected: {selectedColor.name}
            </div>
          </div>
        </div>
      )}

      {/* Event Listeners Setup */}
      <EventListenerSetup
        modelViewerRef={modelViewerRef}
        onLoad={handleModelLoad}
        onError={handleModelError}
        onARStatus={handleARStatus}
      />
    </div>
  );
};

/**
 * Component to set up event listeners on model-viewer
 */
const EventListenerSetup = ({ modelViewerRef, onLoad, onError, onARStatus }) => {
  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;

    mv.addEventListener('load', onLoad);
    mv.addEventListener('error', onError);
    mv.addEventListener('ar-status', onARStatus);

    return () => {
      mv.removeEventListener('load', onLoad);
      mv.removeEventListener('error', onError);
      mv.removeEventListener('ar-status', onARStatus);
    };
  }, [modelViewerRef, onLoad, onError, onARStatus]);

  return null;
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#111827',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#1f2937',
    borderBottom: '1px solid #374151',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: '#4f46e5',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
  },
  headerTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#9ca3af',
  },
  closeButton: {
    width: '40px',
    height: '40px',
    backgroundColor: '#374151',
    border: 'none',
    borderRadius: '10px',
    color: '#9ca3af',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerContainer: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  modelViewer: {
    width: '100%',
    height: '100%',
    '--poster-color': '#111827',
    '--progress-bar-color': '#6366f1',
  },
  arButton: {
    position: 'absolute',
    bottom: '32px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 48px)',
    maxWidth: '400px',
    height: '64px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '16px',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    boxShadow: '0 20px 40px rgba(99, 102, 241, 0.4)',
  },
  arButtonText: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
  },
  arButtonMain: {
    fontSize: '16px',
    fontWeight: '700',
  },
  arButtonSub: {
    fontSize: '12px',
    opacity: 0.8,
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '3px solid #374151',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: 'white',
    fontSize: '14px',
  },
  controlsPanel: {
    borderTop: '1px solid #374151',
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    padding: '12px 16px',
    backdropFilter: 'blur(8px)',
  },
  controlsContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  controlsInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '180px',
    flex: '1 1 240px',
  },
  controlsTitle: {
    margin: 0,
    fontSize: '12px',
    fontWeight: '600',
    color: '#e5e7eb',
  },
  controlsHint: {
    margin: 0,
    fontSize: '12px',
    color: '#9ca3af',
  },
  controlsColorButton: {
    border: '1px solid rgba(99, 102, 241, 0.45)',
    borderRadius: '12px',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    minHeight: '42px',
    flex: '0 0 auto',
  },
  controlsColorSwatch: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.9)',
  },
  controlsColorLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#dbeafe',
  },
  controlsColorValue: {
    fontSize: '12px',
    color: '#e5e7eb',
  },
  controlsMeta: {
    fontSize: '11px',
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  errorPanel: {
    backgroundColor: '#1f2937',
    borderRadius: '24px',
    padding: '32px',
    margin: 'auto',
    maxWidth: '400px',
    textAlign: 'center',
  },
  errorIcon: {
    width: '72px',
    height: '72px',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    color: '#f87171',
  },
  errorTitle: {
    margin: '0 0 8px',
    fontSize: '20px',
    fontWeight: '700',
    color: 'white',
  },
  errorText: {
    margin: '0 0 24px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  closeBtn: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#4f46e5',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};

// Add keyframes
if (typeof document !== 'undefined') {
  const styleId = 'accurate-ar-viewer-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .active {
        background-color: #22c55e !important;
        animation: pulse-dot 2s ease-in-out infinite;
      }
      @keyframes pulse-dot {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default AccurateARViewer;
