/**
 * Part Estimation Module for Mobile
 *
 * Estimates car part regions based on bounding box geometry.
 * Mobile-optimized with simplified calculations.
 */

import {
  PART_RATIOS,
  CATEGORY_TO_PRODUCT_TYPE,
  PRODUCT_TYPE_TO_TARGET_PART,
} from './constants.js';

/**
 * PartEstimator Class
 */
class PartEstimator {
  /**
   * Estimate all visible parts for a given detection
   */
  estimateParts(bbox, viewAngle) {
    const ratios = PART_RATIOS[viewAngle];
    if (!ratios) return [];

    const parts = [];

    for (const [partName, ratio] of Object.entries(ratios)) {
      const partBounds = {
        x: bbox.x + bbox.width * ratio.xOffset,
        y: bbox.y + bbox.height * ratio.yOffset,
        width: bbox.width * ratio.width,
        height: bbox.height * ratio.height,
      };

      const center = {
        x: partBounds.x + partBounds.width / 2,
        y: partBounds.y + partBounds.height / 2,
      };

      parts.push({
        name: partName,
        center,
        bounds: partBounds,
        confidence: this._estimateConfidence(viewAngle, partName),
      });
    }

    return parts;
  }

  /**
   * Get the target part for a specific product type
   */
  getTargetPart(productType, parts) {
    const normalizedType = this._normalizeProductType(productType);
    const targetPartNames = PRODUCT_TYPE_TO_TARGET_PART[normalizedType];

    if (!targetPartNames || parts.length === 0) {
      return parts[0] || null;
    }

    for (const targetName of targetPartNames) {
      const match = parts.find((p) => p.name === targetName);
      if (match) return match;
    }

    return parts[0];
  }

  /**
   * Get placement guide for a product
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
    };

    const instructions = {
      spoiler: 'Position spoiler on the trunk lid',
      rim: 'Align rim with wheel center',
      hood: 'Place hood accessory on bonnet',
      sideskirt: 'Align with lower door panel',
      bumper: 'Position on bumper area',
    };

    return {
      targetPart,
      label: labels[targetPart.name] || targetPart.name,
      instructions: instructions[productType] || 'Tap to place accessory',
      confidence: targetPart.confidence,
    };
  }

  _normalizeProductType(input) {
    if (!input) return 'spoiler';

    const lower = input.toLowerCase().trim();

    if (CATEGORY_TO_PRODUCT_TYPE[lower]) {
      return CATEGORY_TO_PRODUCT_TYPE[lower];
    }

    if (PRODUCT_TYPE_TO_TARGET_PART[lower]) {
      return lower;
    }

    if (lower.includes('spoiler')) return 'spoiler';
    if (lower.includes('rim') || lower.includes('wheel')) return 'rim';
    if (lower.includes('hood') || lower.includes('bonnet')) return 'hood';
    if (lower.includes('skirt') || lower.includes('kit')) return 'sideskirt';
    if (lower.includes('bumper')) return 'bumper';

    return 'spoiler';
  }

  _estimateConfidence(viewAngle, partName) {
    const highConfidence = {
      side: ['trunk', 'frontWheel', 'rearWheel', 'sideSkirt'],
      rear: ['trunk', 'rearLeftWheel', 'rearRightWheel'],
      front: ['bonnet', 'frontLeftWheel', 'frontRightWheel'],
      angle: ['frontWheel', 'rearWheel'],
    };

    if (highConfidence[viewAngle]?.includes(partName)) {
      return 'high';
    }
    return 'medium';
  }
}

let partEstimatorInstance = null;

export function getPartEstimator() {
  if (!partEstimatorInstance) {
    partEstimatorInstance = new PartEstimator();
  }
  return partEstimatorInstance;
}

export default PartEstimator;
