/**
 * AR Core Module - Utilities for Mobile AR
 */

export { AUTOMOTIVE_COLORS, UI_MESSAGES } from './constants.js';

/**
 * Get product type from product object
 */
export function getProductType(product) {
  if (!product) return 'accessory';

  const name = product.name?.toLowerCase() || '';
  const category = product.category?.toLowerCase() || '';
  const combined = `${name} ${category}`;

  if (combined.includes('spoiler')) return 'spoiler';
  if (combined.includes('rim') || combined.includes('wheel')) return 'rim';
  if (combined.includes('hood') || combined.includes('bonnet')) return 'hood';
  if (combined.includes('skirt') || combined.includes('kit')) return 'sideskirt';
  if (combined.includes('bumper')) return 'bumper';

  return 'accessory';
}
