/**
 * AR Module - Simple AR Preview for Mobile
 *
 * Features:
 * - 3D model viewing via model-viewer in WebView
 * - Color customization with PBR materials
 * - Native AR via Scene Viewer (Android) / Quick Look (iOS)
 */

// Main AR Viewer Screen
export { default as ARViewerScreen } from './components/ARViewerScreen.js';

// Color options for customization
export { AUTOMOTIVE_COLORS } from './core/constants.js';

// Product type helper
export { getProductType } from './core/index.js';
