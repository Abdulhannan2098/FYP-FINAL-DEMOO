/**
 * Placement Guide Component
 *
 * Visual overlay showing where the accessory will be placed on the car.
 * Displays bounding box, target indicator, and instruction text.
 */

import { useMemo } from 'react';

/**
 * PlacementGuide Component
 * @param {Object} props
 * @param {Object} props.detection - Detection result with bounding box
 * @param {Object} props.guide - Placement guide with target part
 * @param {string} props.productType - Type of product being placed
 * @param {boolean} props.isPlacing - Whether currently placing
 */
const PlacementGuide = ({ detection, guide, productType, isPlacing }) => {
  // Calculate overlay positions
  const overlayStyles = useMemo(() => {
    if (!detection?.boundingBox) return null;

    const { x, y, width, height } = detection.boundingBox;

    return {
      carBox: {
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${width * 100}%`,
        height: `${height * 100}%`,
      },
      targetBox: guide?.targetPart?.bounds
        ? {
            left: `${guide.targetPart.bounds.x * 100}%`,
            top: `${guide.targetPart.bounds.y * 100}%`,
            width: `${guide.targetPart.bounds.width * 100}%`,
            height: `${guide.targetPart.bounds.height * 100}%`,
          }
        : null,
      targetCenter: guide?.targetPart?.center
        ? {
            left: `${guide.targetPart.center.x * 100}%`,
            top: `${guide.targetPart.center.y * 100}%`,
          }
        : null,
    };
  }, [detection, guide]);

  if (!overlayStyles) return null;

  const confidenceColors = {
    high: '#22c55e',
    medium: '#f59e0b',
    low: '#ef4444',
  };

  const confidence = guide?.confidence || 'medium';
  const confidenceColor = confidenceColors[confidence];

  return (
    <div className="placement-guide-overlay" style={styles.overlay}>
      {/* Car Bounding Box */}
      <div
        style={{
          ...styles.carBox,
          ...overlayStyles.carBox,
          borderColor: detection.detected ? '#6366f1' : '#9ca3af',
        }}
      >
        {/* View Angle Badge */}
        <div style={styles.viewBadge}>
          <span style={styles.viewBadgeText}>
            {detection.viewAngle?.toUpperCase() || 'DETECTING'}
          </span>
          <span style={styles.confidenceText}>
            {Math.round((detection.confidence || 0) * 100)}%
          </span>
        </div>
      </div>

      {/* Target Part Box */}
      {overlayStyles.targetBox && (
        <div
          style={{
            ...styles.targetBox,
            ...overlayStyles.targetBox,
            borderColor: confidenceColor,
            backgroundColor: `${confidenceColor}15`,
          }}
        >
          {/* Target Label */}
          <div
            style={{
              ...styles.targetLabel,
              backgroundColor: confidenceColor,
            }}
          >
            {guide?.label || 'Target'}
          </div>
        </div>
      )}

      {/* Crosshair at Target Center */}
      {overlayStyles.targetCenter && (
        <div
          style={{
            ...styles.crosshairContainer,
            ...overlayStyles.targetCenter,
          }}
        >
          <div style={{ ...styles.crosshair, borderColor: confidenceColor }}>
            <div style={{ ...styles.crosshairInner, backgroundColor: confidenceColor }} />
          </div>
          {isPlacing && (
            <div style={styles.pulseRing} />
          )}
        </div>
      )}

      {/* Instructions Bar */}
      <div style={styles.instructionsBar}>
        <div style={styles.instructionsContent}>
          <div style={styles.productIcon}>
            {getProductIcon(productType)}
          </div>
          <div style={styles.instructionsText}>
            <span style={styles.instructionsMain}>
              {guide?.instructions || 'Point camera at car'}
            </span>
            <span style={styles.instructionsSub}>
              {isPlacing ? 'Tap to confirm placement' : 'Adjust position if needed'}
            </span>
          </div>
          <div
            style={{
              ...styles.confidenceIndicator,
              backgroundColor: confidenceColor,
            }}
          >
            {confidence.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Get icon for product type
 */
function getProductIcon(productType) {
  const icons = {
    spoiler: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 15h16M4 15l2-8h12l2 8M4 15v2a1 1 0 001 1h14a1 1 0 001-1v-2" />
      </svg>
    ),
    rim: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v6M12 15v6M3 12h6M15 12h6" />
      </svg>
    ),
    hood: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 17h18M5 17V9l7-4 7 4v8" />
      </svg>
    ),
    sideskirt: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="10" width="20" height="4" rx="1" />
      </svg>
    ),
    bumper: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12h18M5 12a2 2 0 00-2 2v2a2 2 0 002 2h14a2 2 0 002-2v-2a2 2 0 00-2-2" />
      </svg>
    ),
  };

  return icons[productType] || icons.spoiler;
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 10,
  },
  carBox: {
    position: 'absolute',
    border: '2px solid',
    borderRadius: '8px',
    transition: 'all 0.15s ease-out',
  },
  viewBadge: {
    position: 'absolute',
    top: '-28px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 12px',
    backgroundColor: 'rgba(99, 102, 241, 0.9)',
    borderRadius: '12px',
    backdropFilter: 'blur(4px)',
  },
  viewBadgeText: {
    color: 'white',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
  },
  confidenceText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '11px',
    fontWeight: '600',
  },
  targetBox: {
    position: 'absolute',
    border: '2px dashed',
    borderRadius: '6px',
    transition: 'all 0.15s ease-out',
  },
  targetLabel: {
    position: 'absolute',
    bottom: '-24px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '2px 10px',
    borderRadius: '10px',
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    whiteSpace: 'nowrap',
  },
  crosshairContainer: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshair: {
    width: '32px',
    height: '32px',
    border: '2px solid',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  crosshairInner: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  pulseRing: {
    position: 'absolute',
    width: '48px',
    height: '48px',
    border: '2px solid rgba(99, 102, 241, 0.5)',
    borderRadius: '50%',
    animation: 'pulse 1.5s ease-out infinite',
  },
  instructionsBar: {
    position: 'absolute',
    bottom: '100px',
    left: '16px',
    right: '16px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '16px',
    padding: '12px 16px',
    backdropFilter: 'blur(8px)',
  },
  instructionsContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  productIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#a5b4fc',
    flexShrink: 0,
  },
  instructionsText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  instructionsMain: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
  },
  instructionsSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
  },
  confidenceIndicator: {
    padding: '4px 10px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '10px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
};

// Add keyframes for pulse animation via style tag
if (typeof document !== 'undefined') {
  const styleId = 'placement-guide-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes pulse {
        0% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(2);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default PlacementGuide;
