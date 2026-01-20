/**
 * AR System Constants for Mobile
 *
 * Shared configuration for the AR detection and placement system.
 * Mobile-optimized settings with adjusted thresholds for performance.
 */

// ============================================================================
// DETECTION SETTINGS
// ============================================================================

/**
 * Minimum confidence threshold for car detection (0-1)
 */
export const CAR_DETECTION_CONFIDENCE = 0.55; // Slightly lower for mobile

/**
 * Detection interval in milliseconds
 */
export const DETECTION_INTERVAL_MS = 300; // Slower for battery conservation

/**
 * Maximum detection attempts before showing manual fallback
 */
export const MAX_DETECTION_ATTEMPTS = 12;

/**
 * Detection timeout in milliseconds
 */
export const DETECTION_TIMEOUT_MS = 8000;

// ============================================================================
// PRODUCT TYPE MAPPINGS
// ============================================================================

export const CATEGORY_TO_PRODUCT_TYPE = {
  'spoilers': 'spoiler',
  'spoiler': 'spoiler',
  'rims & wheels': 'rim',
  'rims': 'rim',
  'wheels': 'rim',
  'hoods': 'hood',
  'hood': 'hood',
  'body kits': 'sideskirt',
  'side skirts': 'sideskirt',
  'bumpers': 'bumper',
  'bumper': 'bumper',
};

export const PRODUCT_TYPE_TO_TARGET_PART = {
  spoiler: ['trunk'],
  rim: ['frontWheel', 'rearWheel', 'frontLeftWheel', 'frontRightWheel', 'rearLeftWheel', 'rearRightWheel'],
  hood: ['bonnet'],
  sideskirt: ['sideSkirt'],
  bumper: ['frontBumper', 'rearBumper'],
};

// ============================================================================
// GEOMETRIC RATIOS FOR PART ESTIMATION
// ============================================================================

export const PART_RATIOS = {
  side: {
    trunk: { xOffset: 0.70, yOffset: 0.0, width: 0.30, height: 0.35 },
    bonnet: { xOffset: 0.0, yOffset: 0.0, width: 0.35, height: 0.40 },
    frontWheel: { xOffset: 0.15, yOffset: 0.65, width: 0.15, height: 0.30 },
    rearWheel: { xOffset: 0.65, yOffset: 0.65, width: 0.15, height: 0.30 },
    sideSkirt: { xOffset: 0.25, yOffset: 0.60, width: 0.50, height: 0.35 },
  },
  rear: {
    trunk: { xOffset: 0.20, yOffset: 0.0, width: 0.60, height: 0.30 },
    rearLeftWheel: { xOffset: 0.10, yOffset: 0.65, width: 0.25, height: 0.30 },
    rearRightWheel: { xOffset: 0.65, yOffset: 0.65, width: 0.25, height: 0.30 },
  },
  front: {
    bonnet: { xOffset: 0.20, yOffset: 0.0, width: 0.60, height: 0.35 },
    frontLeftWheel: { xOffset: 0.10, yOffset: 0.65, width: 0.25, height: 0.30 },
    frontRightWheel: { xOffset: 0.65, yOffset: 0.65, width: 0.25, height: 0.30 },
  },
  angle: {
    trunk: { xOffset: 0.60, yOffset: 0.05, width: 0.35, height: 0.30 },
    bonnet: { xOffset: 0.10, yOffset: 0.10, width: 0.40, height: 0.35 },
    frontWheel: { xOffset: 0.15, yOffset: 0.60, width: 0.20, height: 0.30 },
    rearWheel: { xOffset: 0.60, yOffset: 0.60, width: 0.20, height: 0.30 },
  },
};

export const VIEW_ANGLE_THRESHOLDS = {
  side: { minAspect: 1.8, maxAspect: Infinity },
  frontRear: { minAspect: 0, maxAspect: 1.2 },
};

// ============================================================================
// AUTOMOTIVE COLOR PALETTE
// ============================================================================

export const AUTOMOTIVE_COLORS = [
  { name: 'Carbon Black', hex: '#1a1a1a', metallic: 0.8, roughness: 0.3 },
  { name: 'Glossy Black', hex: '#0a0a0a', metallic: 0.9, roughness: 0.1 },
  { name: 'Matte Black', hex: '#2b2b2b', metallic: 0.2, roughness: 0.8 },
  { name: 'Silver', hex: '#c0c0c0', metallic: 0.95, roughness: 0.2 },
  { name: 'Gunmetal', hex: '#5a5a5a', metallic: 0.85, roughness: 0.3 },
  { name: 'Chrome', hex: '#e8e8e8', metallic: 1.0, roughness: 0.05 },
  { name: 'Racing Red', hex: '#dc2626', metallic: 0.7, roughness: 0.3 },
  { name: 'Sapphire Blue', hex: '#2563eb', metallic: 0.7, roughness: 0.3 },
  { name: 'Pearl White', hex: '#f5f5f5', metallic: 0.6, roughness: 0.4 },
  { name: 'British Racing Green', hex: '#004225', metallic: 0.7, roughness: 0.3 },
  { name: 'Gold', hex: '#ffd700', metallic: 0.95, roughness: 0.2 },
  { name: 'Bronze', hex: '#cd7f32', metallic: 0.9, roughness: 0.25 },
];

// ============================================================================
// UI MESSAGES
// ============================================================================

export const UI_MESSAGES = {
  initializing: 'Initializing AR...',
  loadingModel: 'Loading 3D model...',
  loadingDetector: 'Preparing car detection...',
  searchingCar: 'Point camera at a car',
  carDetected: 'Car detected!',
  adjusting: 'Tap to place, drag to adjust',
  noCarFound: 'No car detected. Try moving closer.',
  poorLighting: 'Low light detected. Move to brighter area.',
  manualMode: 'Manual placement mode',
  error: 'Something went wrong. Please try again.',
  cameraPermission: 'Camera permission required for AR',
  arNotSupported: 'AR not supported on this device',
};

// ============================================================================
// PERFORMANCE SETTINGS
// ============================================================================

export const MAX_DETECTION_FPS = 3; // Lower for mobile battery
export const BBOX_SMOOTHING = 0.4;
export const MIN_BBOX_SIZE = 0.08;
export const MAX_BBOX_SIZE = 0.95;

export default {
  CAR_DETECTION_CONFIDENCE,
  DETECTION_INTERVAL_MS,
  MAX_DETECTION_ATTEMPTS,
  DETECTION_TIMEOUT_MS,
  CATEGORY_TO_PRODUCT_TYPE,
  PRODUCT_TYPE_TO_TARGET_PART,
  PART_RATIOS,
  VIEW_ANGLE_THRESHOLDS,
  AUTOMOTIVE_COLORS,
  UI_MESSAGES,
  MAX_DETECTION_FPS,
  BBOX_SMOOTHING,
  MIN_BBOX_SIZE,
  MAX_BBOX_SIZE,
};
