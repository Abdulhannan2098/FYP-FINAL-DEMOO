/**
 * AR Module - Main Entry Point for Mobile
 *
 * Accurate AR Preview System for Car Accessories (React Native)
 *
 * Features:
 * - WebView-based 3D model viewing
 * - Native AR via Scene Viewer (Android) / Quick Look (iOS)
 * - Color customization
 * - Part estimation for future camera-based detection
 */

// Components
export { default as ARViewerScreen } from './components/ARViewerScreen.js';

// Core modules
export { PartEstimator, getPartEstimator, getProductType } from './core/index.js';

// Constants
export { AUTOMOTIVE_COLORS, UI_MESSAGES, CATEGORY_TO_PRODUCT_TYPE } from './core/constants.js';
