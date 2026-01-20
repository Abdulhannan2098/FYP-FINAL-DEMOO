/**
 * AR Core Module Index for Mobile
 *
 * Exports core AR functionality for React Native.
 */

export { default as PartEstimator, getPartEstimator } from './PartEstimator.js';

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
  UI_MESSAGES,
  MAX_DETECTION_FPS,
  BBOX_SMOOTHING,
  MIN_BBOX_SIZE,
  MAX_BBOX_SIZE,
} from './constants.js';

/**
 * Get product type from product object
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

  return 'spoiler';
}
