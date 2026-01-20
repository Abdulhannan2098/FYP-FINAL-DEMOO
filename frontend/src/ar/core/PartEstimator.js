/**
 * Part Estimation Module
 *
 * Estimates car part regions based on bounding box geometry.
 * Uses automotive design proportions to calculate part locations.
 *
 * Features:
 * - Geometric part estimation for all view angles
 * - Product type to target part mapping
 * - Confidence scoring based on view quality
 * - Fallback estimation when primary parts not visible
 */

import {
  PART_RATIOS,
  CATEGORY_TO_PRODUCT_TYPE,
  PRODUCT_TYPE_TO_TARGET_PART,
} from './constants.js';

/**
 * PartEstimator Class
 *
 * Calculates car part regions from detection bounding box.
 */
class PartEstimator {
  /**
   * Estimate all visible parts for a given detection
   * @param {BoundingBox} bbox - Car bounding box (normalized 0-1)
   * @param {ViewAngle} viewAngle - Detected view angle
   * @returns {PartRegion[]} Array of estimated part regions
   */
  estimateParts(bbox, viewAngle) {
    const ratios = PART_RATIOS[viewAngle];
    if (!ratios) {
      console.warn(`[PartEstimator] Unknown view angle: ${viewAngle}`);
      return [];
    }

    const parts = [];

    for (const [partName, ratio] of Object.entries(ratios)) {
      const partBounds = this._calculatePartBounds(bbox, ratio);
      const center = this._calculateCenter(partBounds);
      const confidence = this._estimateConfidence(viewAngle, partName);

      parts.push({
        name: partName,
        center,
        bounds: partBounds,
        confidence,
      });
    }

    return parts;
  }

  /**
   * Get the target part for a specific product type
   * @param {string} productType - Product type (spoiler, rim, etc.)
   * @param {PartRegion[]} parts - Available part regions
   * @returns {PartRegion|null} Best matching part or null
   */
  getTargetPart(productType, parts) {
    const normalizedType = this._normalizeProductType(productType);
    const targetPartNames = PRODUCT_TYPE_TO_TARGET_PART[normalizedType];

    if (!targetPartNames) {
      console.warn(`[PartEstimator] Unknown product type: ${productType}`);
      return parts[0] || null; // Fallback to first part
    }

    // Find best matching part
    for (const targetName of targetPartNames) {
      const match = parts.find((p) => p.name === targetName);
      if (match) {
        return match;
      }
    }

    // Try partial name match
    for (const targetName of targetPartNames) {
      const match = parts.find((p) =>
        p.name.toLowerCase().includes(targetName.toLowerCase()) ||
        targetName.toLowerCase().includes(p.name.toLowerCase())
      );
      if (match) {
        return match;
      }
    }

    // Return fallback based on product type
    return this._getFallbackPart(normalizedType, parts);
  }

  /**
   * Get placement guide for a product
   * @param {BoundingBox} bbox - Car bounding box
   * @param {ViewAngle} viewAngle - View angle
   * @param {string} productType - Product type
   * @param {Object} product - Product data (for name/category)
   * @returns {PlacementGuide} Placement guide with target and instructions
   */
  getPlacementGuide(bbox, viewAngle, productType, product) {
    const parts = this.estimateParts(bbox, viewAngle);
    const targetPart = this.getTargetPart(productType, parts);

    if (!targetPart) {
      return {
        targetPart: null,
        label: 'No suitable placement found',
        instructions: 'Try adjusting camera angle',
        confidence: 'low',
      };
    }

    const guide = this._generateGuide(targetPart, productType, viewAngle);
    return guide;
  }

  /**
   * Normalize product type from category or name
   * @param {string} input - Category name or product type
   * @returns {string} Normalized product type
   * @private
   */
  _normalizeProductType(input) {
    if (!input) return 'spoiler'; // Default

    const lower = input.toLowerCase().trim();

    // Check direct mapping
    if (CATEGORY_TO_PRODUCT_TYPE[lower]) {
      return CATEGORY_TO_PRODUCT_TYPE[lower];
    }

    // Check if it's already a valid type
    if (PRODUCT_TYPE_TO_TARGET_PART[lower]) {
      return lower;
    }

    // Keyword matching
    if (lower.includes('spoiler')) return 'spoiler';
    if (lower.includes('rim') || lower.includes('wheel')) return 'rim';
    if (lower.includes('hood') || lower.includes('bonnet')) return 'hood';
    if (lower.includes('skirt') || lower.includes('kit')) return 'sideskirt';
    if (lower.includes('bumper')) return 'bumper';

    return 'spoiler'; // Default fallback
  }

  /**
   * Calculate part bounds from bbox and ratio
   * @private
   */
  _calculatePartBounds(bbox, ratio) {
    return {
      x: bbox.x + bbox.width * ratio.xOffset,
      y: bbox.y + bbox.height * ratio.yOffset,
      width: bbox.width * ratio.width,
      height: bbox.height * ratio.height,
    };
  }

  /**
   * Calculate center point of bounds
   * @private
   */
  _calculateCenter(bounds) {
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };
  }

  /**
   * Estimate confidence for a part based on view angle
   * @private
   */
  _estimateConfidence(viewAngle, partName) {
    // High confidence combinations
    const highConfidence = {
      side: ['trunk', 'frontWheel', 'rearWheel', 'sideSkirt'],
      rear: ['trunk', 'rearLeftWheel', 'rearRightWheel', 'rearBumper'],
      front: ['bonnet', 'frontLeftWheel', 'frontRightWheel', 'frontBumper'],
      angle: ['frontWheel', 'rearWheel'],
    };

    if (highConfidence[viewAngle]?.includes(partName)) {
      return 'high';
    }

    // Medium confidence
    const mediumConfidence = {
      side: ['bonnet', 'roof'],
      rear: [],
      front: ['frontGrill'],
      angle: ['trunk', 'bonnet', 'sideSkirt'],
    };

    if (mediumConfidence[viewAngle]?.includes(partName)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get fallback part when primary target not found
   * @private
   */
  _getFallbackPart(productType, parts) {
    if (parts.length === 0) return null;

    // Product-specific fallbacks
    const fallbackPreferences = {
      spoiler: ['roof', 'trunk'],
      rim: ['frontWheel', 'rearWheel', 'frontLeftWheel', 'rearLeftWheel'],
      hood: ['bonnet', 'roof'],
      sideskirt: ['sideSkirt', 'frontWheel'],
      bumper: ['frontBumper', 'rearBumper', 'frontGrill'],
    };

    const preferences = fallbackPreferences[productType] || [];
    for (const pref of preferences) {
      const match = parts.find((p) => p.name.toLowerCase().includes(pref.toLowerCase()));
      if (match) return match;
    }

    // Last resort: return largest part
    return parts.reduce((a, b) =>
      (a.bounds.width * a.bounds.height) > (b.bounds.width * b.bounds.height) ? a : b
    );
  }

  /**
   * Generate placement guide text
   * @private
   */
  _generateGuide(targetPart, productType, viewAngle) {
    const labels = {
      trunk: 'Trunk / Rear Deck',
      bonnet: 'Hood / Bonnet',
      frontWheel: 'Front Wheel',
      rearWheel: 'Rear Wheel',
      frontLeftWheel: 'Front Left Wheel',
      frontRightWheel: 'Front Right Wheel',
      rearLeftWheel: 'Rear Left Wheel',
      rearRightWheel: 'Rear Right Wheel',
      sideSkirt: 'Side Skirt Area',
      frontBumper: 'Front Bumper',
      rearBumper: 'Rear Bumper',
      roof: 'Roof',
      frontGrill: 'Front Grill',
    };

    const instructions = {
      spoiler: 'Position spoiler on the trunk lid',
      rim: 'Align rim with wheel center',
      hood: 'Place hood accessory on bonnet',
      sideskirt: 'Align with lower door panel',
      bumper: 'Position on bumper area',
    };

    const viewQuality = {
      side: { spoiler: 'high', rim: 'high', hood: 'medium', sideskirt: 'high', bumper: 'medium' },
      rear: { spoiler: 'high', rim: 'high', hood: 'low', sideskirt: 'low', bumper: 'high' },
      front: { spoiler: 'low', rim: 'high', hood: 'high', sideskirt: 'low', bumper: 'high' },
      angle: { spoiler: 'medium', rim: 'high', hood: 'medium', sideskirt: 'medium', bumper: 'medium' },
    };

    return {
      targetPart,
      label: labels[targetPart.name] || targetPart.name,
      instructions: instructions[productType] || 'Tap to place accessory',
      confidence: viewQuality[viewAngle]?.[productType] || targetPart.confidence,
    };
  }

  /**
   * Get optimal view recommendation for a product type
   * @param {string} productType - Product type
   * @returns {Object} Recommended view and tips
   */
  getViewRecommendation(productType) {
    const recommendations = {
      spoiler: {
        optimal: 'rear',
        acceptable: ['side', 'angle'],
        tip: 'For best results, view car from behind or side',
      },
      rim: {
        optimal: 'side',
        acceptable: ['angle', 'front', 'rear'],
        tip: 'Side view shows wheels clearly',
      },
      hood: {
        optimal: 'front',
        acceptable: ['angle'],
        tip: 'View car from front for hood placement',
      },
      sideskirt: {
        optimal: 'side',
        acceptable: ['angle'],
        tip: 'Side view required for side skirts',
      },
      bumper: {
        optimal: 'front',
        acceptable: ['rear'],
        tip: 'View car from front or back for bumpers',
      },
    };

    return recommendations[productType] || recommendations.spoiler;
  }
}

// Singleton instance
let partEstimatorInstance = null;

/**
 * Get or create PartEstimator instance
 * @returns {PartEstimator}
 */
export function getPartEstimator() {
  if (!partEstimatorInstance) {
    partEstimatorInstance = new PartEstimator();
  }
  return partEstimatorInstance;
}

export default PartEstimator;
