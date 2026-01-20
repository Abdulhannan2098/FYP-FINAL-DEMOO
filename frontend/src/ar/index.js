/**
 * AR Module - Main Entry Point
 *
 * Accurate AR Preview System for Car Accessories
 *
 * Features:
 * - Real-time car detection using MediaPipe/COCO-SSD
 * - Intelligent part estimation for spoilers, rims, hoods
 * - Color customization without model reload
 * - Manual adjustment fallback
 *
 * Usage:
 * ```jsx
 * import { AccurateARViewer } from '../ar';
 *
 * <AccurateARViewer product={product} onClose={handleClose} />
 * ```
 */

// Components
export { default as AccurateARViewer } from './components/AccurateARViewer.jsx';
export { default as PlacementGuide } from './components/PlacementGuide.jsx';
export { default as ColorPicker } from './components/ColorPicker.jsx';

// Core modules
export {
  CarDetector,
  getCarDetector,
  disposeCarDetector,
  PartEstimator,
  getPartEstimator,
  PlacementEngine,
  getPlacementEngine,
  createPlacementEngine,
  ColorManager,
  getColorManager,
  createColorManager,
  initializeARCore,
  disposeARCore,
  getProductType,
} from './core/index.js';

// Constants
export {
  AUTOMOTIVE_COLORS,
  UI_MESSAGES,
  CATEGORY_TO_PRODUCT_TYPE,
  PRODUCT_TYPE_TO_TARGET_PART,
} from './core/constants.js';
