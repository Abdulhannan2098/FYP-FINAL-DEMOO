/**
 * AR Constants for Mobile
 *
 * Color palette and UI messages for AR viewer.
 */

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
  loadingModel: 'Loading 3D model...',
  error: 'Something went wrong. Please try again.',
  arNotSupported: 'AR not supported on this device',
};

export default {
  AUTOMOTIVE_COLORS,
  UI_MESSAGES,
};
