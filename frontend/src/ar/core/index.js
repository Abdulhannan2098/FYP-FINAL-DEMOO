/**
 * AR Core Module Index
 *
 * Exports all core AR functionality for use in web and mobile platforms.
 */

// Core Classes
export { default as CarDetector, getCarDetector, disposeCarDetector } from './CarDetector.js';
export { default as PartEstimator, getPartEstimator } from './PartEstimator.js';
export { default as PlacementEngine, getPlacementEngine, createPlacementEngine } from './PlacementEngine.js';
export { default as ColorManager, getColorManager, createColorManager } from './ColorManager.js';

// Constants
export {
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
} from './constants.js';

// Types (for documentation/JSDoc)
export * from './types.js';

/**
 * Initialize all AR core modules
 * @returns {Promise<Object>} Initialized module instances
 */
export async function initializeARCore() {
  const detector = getCarDetector();
  const estimator = getPartEstimator();
  const placement = getPlacementEngine();
  const color = getColorManager();

  // Initialize detector (async)
  await detector.initialize();

  return {
    detector,
    estimator,
    placement,
    color,
    isReady: detector.isReady(),
  };
}

/**
 * Dispose all AR core modules
 */
export function disposeARCore() {
  disposeCarDetector();
  // Other modules don't need explicit disposal
}

/**
 * Get product type from product object
 * @param {Object} product - Product data
 * @returns {string} Product type
 */
export function getProductType(product) {
  if (!product) return 'spoiler';

  const name = product.name?.toLowerCase() || '';
  const category = product.category?.toLowerCase() || '';
  const combined = `${name} ${category}`;

  if (combined.includes('spoiler')) return 'spoiler';
  if (combined.includes('rim') || combined.includes('wheel')) return 'rim';
  if (combined.includes('hood') || combined.includes('bonnet')) return 'hood';
  if (combined.includes('skirt') || combined.includes('kit')) return 'sideskirt';
  if (combined.includes('bumper')) return 'bumper';

  return 'spoiler'; // Default
}
