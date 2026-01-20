/**
 * Placement Engine Module
 *
 * Converts 2D detection results to 3D model placement.
 * Calculates position, rotation, and scale for AR overlay.
 *
 * Features:
 * - 2D to 3D coordinate transformation
 * - Product-specific placement offsets
 * - Scale calculation based on car size
 * - Manual adjustment support
 */

import {
  PRODUCT_SCALE_FACTORS,
  SURFACE_OFFSET,
  ROTATION_OFFSETS,
} from './constants.js';

/**
 * PlacementEngine Class
 *
 * Handles 3D placement calculations for AR accessories.
 */
class PlacementEngine {
  constructor() {
    this.lastPlacement = null;
    this.manualOffset = { x: 0, y: 0, z: 0 };
    this.manualScale = 1.0;
    this.manualRotation = { x: 0, y: 0, z: 0 };
  }

  /**
   * Calculate 3D placement from 2D part region
   * @param {PartRegion} partRegion - Target part region
   * @param {string} productType - Type of product
   * @param {BoundingBox} carBBox - Car bounding box
   * @param {Object} options - Additional options
   * @returns {Placement3D} 3D placement data
   */
  calculatePlacement(partRegion, productType, carBBox, options = {}) {
    const {
      cameraDistance = 2.0, // Estimated distance to car in meters
      productDimensions = null,
      viewAngle = 'side',
    } = options;

    // Calculate base position from 2D coordinates
    const position = this._calculate3DPosition(
      partRegion.center,
      carBBox,
      cameraDistance,
      productType
    );

    // Calculate rotation based on view angle and product type
    const rotation = this._calculateRotation(viewAngle, productType);

    // Calculate scale based on car size and product type
    const scale = this._calculateScale(carBBox, productType, productDimensions);

    // Apply manual adjustments
    const adjusted = this._applyManualAdjustments(position, rotation, scale);

    this.lastPlacement = adjusted;
    return adjusted;
  }

  /**
   * Calculate 3D position from 2D coordinates
   * @private
   */
  _calculate3DPosition(center2D, carBBox, cameraDistance, productType) {
    // Convert normalized 2D coordinates to 3D space
    // Assuming camera at origin, looking at -Z

    // X: horizontal position (-1 to 1 range, centered)
    const x = (center2D.x - 0.5) * 2 * cameraDistance;

    // Y: vertical position (inverted, as screen Y goes down)
    const y = (0.5 - center2D.y) * 2 * cameraDistance;

    // Z: depth (based on car size and surface offset)
    const carDepth = carBBox.width * cameraDistance;
    const surfaceOffset = SURFACE_OFFSET[productType] || 0;
    const z = -cameraDistance + surfaceOffset;

    return { x, y, z };
  }

  /**
   * Calculate rotation based on view and product
   * @private
   */
  _calculateRotation(viewAngle, productType) {
    const baseRotation = ROTATION_OFFSETS[productType] || { x: 0, y: 0, z: 0 };

    // Adjust rotation based on view angle
    const viewRotations = {
      side: { y: 0 },
      rear: { y: Math.PI },
      front: { y: 0 },
      angle: { y: Math.PI / 4 },
    };

    const viewAdjust = viewRotations[viewAngle] || { y: 0 };

    return {
      x: baseRotation.x,
      y: baseRotation.y + viewAdjust.y,
      z: baseRotation.z,
    };
  }

  /**
   * Calculate scale based on car size and product type
   * @private
   */
  _calculateScale(carBBox, productType, productDimensions) {
    const scaleFactor = PRODUCT_SCALE_FACTORS[productType] || 0.2;

    // Base scale on car bounding box size
    // Larger bbox = larger car = larger accessories
    const carSize = Math.max(carBBox.width, carBBox.height);
    const baseScale = carSize * scaleFactor;

    // If product dimensions provided, adjust scale
    if (productDimensions) {
      const productSize = Math.max(
        productDimensions.length,
        productDimensions.width,
        productDimensions.height
      ) / 100; // Convert cm to meters

      // Normalize to reasonable AR size
      return baseScale * (0.5 / productSize);
    }

    return baseScale;
  }

  /**
   * Apply manual adjustments to placement
   * @private
   */
  _applyManualAdjustments(position, rotation, scale) {
    return {
      position: {
        x: position.x + this.manualOffset.x,
        y: position.y + this.manualOffset.y,
        z: position.z + this.manualOffset.z,
      },
      rotation: {
        x: rotation.x + this.manualRotation.x,
        y: rotation.y + this.manualRotation.y,
        z: rotation.z + this.manualRotation.z,
      },
      scale: scale * this.manualScale,
    };
  }

  /**
   * Apply drag offset for manual repositioning
   * @param {Object} dragDelta - Screen space drag delta
   * @param {number} sensitivity - Movement sensitivity
   */
  applyDragOffset(dragDelta, sensitivity = 0.01) {
    this.manualOffset.x += dragDelta.x * sensitivity;
    this.manualOffset.y -= dragDelta.y * sensitivity; // Invert Y

    // Return updated placement if available
    if (this.lastPlacement) {
      return {
        ...this.lastPlacement,
        position: {
          x: this.lastPlacement.position.x + this.manualOffset.x,
          y: this.lastPlacement.position.y + this.manualOffset.y,
          z: this.lastPlacement.position.z + this.manualOffset.z,
        },
      };
    }
    return null;
  }

  /**
   * Apply pinch scale for manual resizing
   * @param {number} scaleFactor - Pinch scale factor (1.0 = no change)
   */
  applyPinchScale(scaleFactor) {
    this.manualScale *= scaleFactor;
    // Clamp scale to reasonable range
    this.manualScale = Math.max(0.1, Math.min(3.0, this.manualScale));

    if (this.lastPlacement) {
      return {
        ...this.lastPlacement,
        scale: this.lastPlacement.scale * this.manualScale,
      };
    }
    return null;
  }

  /**
   * Apply rotation gesture
   * @param {number} angleDelta - Rotation angle delta in radians
   * @param {string} axis - Rotation axis ('x', 'y', or 'z')
   */
  applyRotation(angleDelta, axis = 'y') {
    this.manualRotation[axis] += angleDelta;

    if (this.lastPlacement) {
      return {
        ...this.lastPlacement,
        rotation: {
          ...this.lastPlacement.rotation,
          [axis]: this.lastPlacement.rotation[axis] + this.manualRotation[axis],
        },
      };
    }
    return null;
  }

  /**
   * Reset all manual adjustments
   */
  resetManualAdjustments() {
    this.manualOffset = { x: 0, y: 0, z: 0 };
    this.manualScale = 1.0;
    this.manualRotation = { x: 0, y: 0, z: 0 };
  }

  /**
   * Get current manual adjustments
   * @returns {Object} Current adjustments
   */
  getManualAdjustments() {
    return {
      offset: { ...this.manualOffset },
      scale: this.manualScale,
      rotation: { ...this.manualRotation },
    };
  }

  /**
   * Set manual adjustments from saved state
   * @param {Object} adjustments - Saved adjustments
   */
  setManualAdjustments(adjustments) {
    if (adjustments.offset) {
      this.manualOffset = { ...adjustments.offset };
    }
    if (adjustments.scale !== undefined) {
      this.manualScale = adjustments.scale;
    }
    if (adjustments.rotation) {
      this.manualRotation = { ...adjustments.rotation };
    }
  }

  /**
   * Calculate placement for "on-screen" preview mode
   * Centers the model with good default positioning
   * @param {string} productType - Product type
   * @returns {Placement3D} Preview placement
   */
  getPreviewPlacement(productType) {
    return {
      position: { x: 0, y: 0, z: -1.5 },
      rotation: ROTATION_OFFSETS[productType] || { x: 0, y: 0, z: 0 },
      scale: 0.5,
    };
  }

  /**
   * Convert screen touch to 3D ray for hit testing
   * @param {number} screenX - Normalized screen X (0-1)
   * @param {number} screenY - Normalized screen Y (0-1)
   * @param {Object} camera - Camera parameters
   * @returns {Object} Ray origin and direction
   */
  screenToRay(screenX, screenY, camera = {}) {
    const { fov = 60, aspect = 1.0, near = 0.1 } = camera;

    // Convert to NDC (-1 to 1)
    const ndcX = screenX * 2 - 1;
    const ndcY = 1 - screenY * 2; // Flip Y

    // Calculate ray direction
    const fovRad = (fov * Math.PI) / 180;
    const tanFov = Math.tan(fovRad / 2);

    return {
      origin: { x: 0, y: 0, z: 0 },
      direction: {
        x: ndcX * tanFov * aspect,
        y: ndcY * tanFov,
        z: -1,
      },
    };
  }

  /**
   * Get last calculated placement
   * @returns {Placement3D|null}
   */
  getLastPlacement() {
    return this.lastPlacement;
  }
}

// Singleton instance
let placementEngineInstance = null;

/**
 * Get or create PlacementEngine instance
 * @returns {PlacementEngine}
 */
export function getPlacementEngine() {
  if (!placementEngineInstance) {
    placementEngineInstance = new PlacementEngine();
  }
  return placementEngineInstance;
}

/**
 * Create new PlacementEngine instance (for isolated use)
 * @returns {PlacementEngine}
 */
export function createPlacementEngine() {
  return new PlacementEngine();
}

export default PlacementEngine;
