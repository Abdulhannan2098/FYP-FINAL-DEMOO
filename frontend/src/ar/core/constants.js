/**
 * AR System Constants
 *
 * Centralized configuration for the AR detection and placement system.
 * Modify these values to tune detection sensitivity and visual appearance.
 */

// ============================================================================
// DETECTION SETTINGS
// ============================================================================

/**
 * Minimum confidence threshold for car detection (0-1)
 * Higher = fewer false positives, but may miss valid detections
 */
export const CAR_DETECTION_CONFIDENCE = 0.6;

/**
 * Detection interval in milliseconds
 * Lower = more responsive, but higher CPU usage
 */
export const DETECTION_INTERVAL_MS = 200;

/**
 * Maximum detection attempts before showing manual fallback
 */
export const MAX_DETECTION_ATTEMPTS = 15;

/**
 * Detection timeout in milliseconds (show fallback after this time)
 */
export const DETECTION_TIMEOUT_MS = 6000;

// ============================================================================
// PRODUCT TYPE MAPPINGS
// ============================================================================

/**
 * Map category names to product types for part targeting
 */
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

/**
 * Product type to target part mapping
 */
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

/**
 * Part estimation ratios based on automotive design standards
 * All values are relative to the car bounding box (0-1)
 *
 * Format: { xOffset, yOffset, width, height }
 * - xOffset: distance from left edge of bbox
 * - yOffset: distance from top edge of bbox
 * - width/height: size relative to bbox
 */
export const PART_RATIOS = {
  side: {
    trunk: { xOffset: 0.70, yOffset: 0.0, width: 0.30, height: 0.35 },
    bonnet: { xOffset: 0.0, yOffset: 0.0, width: 0.35, height: 0.40 },
    frontWheel: { xOffset: 0.15, yOffset: 0.65, width: 0.15, height: 0.30 },
    rearWheel: { xOffset: 0.65, yOffset: 0.65, width: 0.15, height: 0.30 },
    sideSkirt: { xOffset: 0.25, yOffset: 0.60, width: 0.50, height: 0.35 },
    roof: { xOffset: 0.30, yOffset: 0.0, width: 0.40, height: 0.15 },
  },
  rear: {
    trunk: { xOffset: 0.20, yOffset: 0.0, width: 0.60, height: 0.30 },
    rearLeftWheel: { xOffset: 0.10, yOffset: 0.65, width: 0.25, height: 0.30 },
    rearRightWheel: { xOffset: 0.65, yOffset: 0.65, width: 0.25, height: 0.30 },
    rearBumper: { xOffset: 0.15, yOffset: 0.70, width: 0.70, height: 0.25 },
  },
  front: {
    bonnet: { xOffset: 0.20, yOffset: 0.0, width: 0.60, height: 0.35 },
    frontLeftWheel: { xOffset: 0.10, yOffset: 0.65, width: 0.25, height: 0.30 },
    frontRightWheel: { xOffset: 0.65, yOffset: 0.65, width: 0.25, height: 0.30 },
    frontGrill: { xOffset: 0.30, yOffset: 0.40, width: 0.40, height: 0.25 },
    frontBumper: { xOffset: 0.15, yOffset: 0.65, width: 0.70, height: 0.30 },
  },
  angle: {
    trunk: { xOffset: 0.60, yOffset: 0.05, width: 0.35, height: 0.30 },
    bonnet: { xOffset: 0.10, yOffset: 0.10, width: 0.40, height: 0.35 },
    frontWheel: { xOffset: 0.15, yOffset: 0.60, width: 0.20, height: 0.30 },
    rearWheel: { xOffset: 0.60, yOffset: 0.60, width: 0.20, height: 0.30 },
    sideSkirt: { xOffset: 0.30, yOffset: 0.65, width: 0.40, height: 0.30 },
  },
};

/**
 * View angle aspect ratio thresholds
 */
export const VIEW_ANGLE_THRESHOLDS = {
  side: { minAspect: 1.8, maxAspect: Infinity },
  frontRear: { minAspect: 0, maxAspect: 1.2 },
  // Anything in between is 'angle'
};

// ============================================================================
// AUTOMOTIVE COLOR PALETTE
// ============================================================================

/**
 * Premium automotive color options
 */
export const AUTOMOTIVE_COLORS = [
  // Blacks
  { name: 'Carbon Black', hex: '#1a1a1a', metallic: 0.8, roughness: 0.3 },
  { name: 'Glossy Black', hex: '#0a0a0a', metallic: 0.9, roughness: 0.1 },
  { name: 'Matte Black', hex: '#2b2b2b', metallic: 0.2, roughness: 0.8 },

  // Metallics
  { name: 'Silver', hex: '#c0c0c0', metallic: 0.95, roughness: 0.2 },
  { name: 'Gunmetal', hex: '#5a5a5a', metallic: 0.85, roughness: 0.3 },
  { name: 'Chrome', hex: '#e8e8e8', metallic: 1.0, roughness: 0.05 },

  // Colors
  { name: 'Racing Red', hex: '#dc2626', metallic: 0.7, roughness: 0.3 },
  { name: 'Sapphire Blue', hex: '#2563eb', metallic: 0.7, roughness: 0.3 },
  { name: 'Pearl White', hex: '#f5f5f5', metallic: 0.6, roughness: 0.4 },
  { name: 'British Racing Green', hex: '#004225', metallic: 0.7, roughness: 0.3 },

  // Special
  { name: 'Gold', hex: '#ffd700', metallic: 0.95, roughness: 0.2 },
  { name: 'Bronze', hex: '#cd7f32', metallic: 0.9, roughness: 0.25 },
];

// ============================================================================
// 3D PLACEMENT SETTINGS
// ============================================================================

/**
 * Default scale factors for different product types
 * These are multiplied by the estimated car size
 */
export const PRODUCT_SCALE_FACTORS = {
  spoiler: 0.25,  // ~25% of car width
  rim: 0.08,      // ~8% of car height (wheel diameter)
  hood: 0.30,     // ~30% of car width
  sideskirt: 0.45, // ~45% of car length
  bumper: 0.35,   // ~35% of car width
};

/**
 * Z-offset for placing models "on" the surface (in meters)
 */
export const SURFACE_OFFSET = {
  spoiler: 0.05,  // Slightly above trunk
  rim: 0.0,       // Flush with wheel
  hood: 0.03,     // Slightly above bonnet
  sideskirt: 0.0, // Flush with side
  bumper: 0.02,   // Slightly forward of existing bumper
};

/**
 * Default rotation offsets (radians)
 */
export const ROTATION_OFFSETS = {
  spoiler: { x: 0, y: 0, z: 0 },
  rim: { x: Math.PI / 2, y: 0, z: 0 }, // Face camera
  hood: { x: 0, y: 0, z: 0 },
  sideskirt: { x: 0, y: 0, z: 0 },
  bumper: { x: 0, y: 0, z: 0 },
};

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
};

// ============================================================================
// PERFORMANCE SETTINGS
// ============================================================================

/**
 * Maximum FPS for detection loop (to save battery)
 */
export const MAX_DETECTION_FPS = 5;

/**
 * Smoothing factor for bounding box stabilization (0-1)
 * Higher = smoother but more lag
 */
export const BBOX_SMOOTHING = 0.3;

/**
 * Minimum bounding box size (relative to frame) to consider valid
 */
export const MIN_BBOX_SIZE = 0.1;

/**
 * Maximum bounding box size (relative to frame) to consider valid
 */
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
  PRODUCT_SCALE_FACTORS,
  SURFACE_OFFSET,
  ROTATION_OFFSETS,
  UI_MESSAGES,
  MAX_DETECTION_FPS,
  BBOX_SMOOTHING,
  MIN_BBOX_SIZE,
  MAX_BBOX_SIZE,
};
