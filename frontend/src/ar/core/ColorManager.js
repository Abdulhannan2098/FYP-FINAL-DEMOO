/**
 * Color Manager Module
 *
 * Handles real-time color customization of 3D models.
 * Supports both Three.js scene manipulation and model-viewer integration.
 *
 * Features:
 * - PBR material color modification
 * - Metallic and roughness control
 * - Original material preservation
 * - Works with GLB/glTF models
 */

import { AUTOMOTIVE_COLORS } from './constants.js';

/**
 * ColorManager Class
 *
 * Manages material color modifications for 3D models.
 */
class ColorManager {
  constructor() {
    this.originalMaterials = new Map();
    this.currentColor = null;
    this.scene = null;
    this.modelViewer = null;
  }

  /**
   * Initialize with a Three.js scene
   * @param {THREE.Scene} scene - Three.js scene containing the model
   */
  initWithScene(scene) {
    this.scene = scene;
    this.modelViewer = null;
    this._captureOriginalMaterials();
  }

  /**
   * Initialize with a model-viewer element
   * @param {HTMLElement} modelViewer - Google model-viewer element
   */
  initWithModelViewer(modelViewer) {
    this.modelViewer = modelViewer;
    this.scene = null;
    // Model-viewer handles its own material state
  }

  /**
   * Capture original materials for reset functionality
   * @private
   */
  _captureOriginalMaterials() {
    if (!this.scene) return;

    this.originalMaterials.clear();

    this.scene.traverse((object) => {
      if (object.isMesh && object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        materials.forEach((mat, index) => {
          const key = `${object.uuid}_${index}`;
          // Clone material to preserve original state
          this.originalMaterials.set(key, {
            color: mat.color?.clone(),
            metalness: mat.metalness,
            roughness: mat.roughness,
            emissive: mat.emissive?.clone(),
          });
        });
      }
    });

    console.log(`[ColorManager] Captured ${this.originalMaterials.size} original materials`);
  }

  /**
   * Apply color to the model
   * @param {ColorConfig} colorConfig - Color configuration
   * @returns {boolean} Success status
   */
  applyColor(colorConfig) {
    if (!colorConfig || !colorConfig.hex) {
      console.warn('[ColorManager] Invalid color config');
      return false;
    }

    this.currentColor = colorConfig;

    if (this.scene) {
      return this._applyColorToScene(colorConfig);
    } else if (this.modelViewer) {
      return this._applyColorToModelViewer(colorConfig);
    }

    console.warn('[ColorManager] No scene or model-viewer initialized');
    return false;
  }

  /**
   * Apply color to Three.js scene
   * @private
   */
  _applyColorToScene(colorConfig) {
    try {
      // Dynamically import THREE to avoid issues
      const THREE = window.THREE || require('three');

      const color = new THREE.Color(colorConfig.hex);

      this.scene.traverse((object) => {
        if (object.isMesh && object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((mat) => {
            // Standard Material (most common for GLB)
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.color = color;

              if (colorConfig.metallic !== undefined) {
                mat.metalness = colorConfig.metallic;
              }
              if (colorConfig.roughness !== undefined) {
                mat.roughness = colorConfig.roughness;
              }
              if (colorConfig.emissive) {
                mat.emissive = new THREE.Color(colorConfig.emissive);
              }

              mat.needsUpdate = true;
            }
            // Basic Material fallback
            else if (mat.isMeshBasicMaterial) {
              mat.color = color;
              mat.needsUpdate = true;
            }
            // Phong Material
            else if (mat.isMeshPhongMaterial) {
              mat.color = color;
              if (colorConfig.emissive) {
                mat.emissive = new THREE.Color(colorConfig.emissive);
              }
              mat.needsUpdate = true;
            }
          });
        }
      });

      console.log(`[ColorManager] Applied color: ${colorConfig.name}`);
      return true;
    } catch (error) {
      console.error('[ColorManager] Error applying color to scene:', error);
      return false;
    }
  }

  /**
   * Apply color to model-viewer element
   * @private
   */
  _applyColorToModelViewer(colorConfig) {
    try {
      const modelViewer = this.modelViewer;

      if (!modelViewer.model?.materials) {
        console.warn('[ColorManager] Model materials not accessible');
        return false;
      }

      const { r, g, b } = this._hexToRgb(colorConfig.hex);
      const colorArray = [r / 255, g / 255, b / 255, 1];

      modelViewer.model.materials.forEach((material) => {
        if (material.pbrMetallicRoughness) {
          // Set base color
          material.pbrMetallicRoughness.setBaseColorFactor(colorArray);

          // Set metallic factor
          if (colorConfig.metallic !== undefined) {
            material.pbrMetallicRoughness.setMetallicFactor(colorConfig.metallic);
          }

          // Set roughness factor
          if (colorConfig.roughness !== undefined) {
            material.pbrMetallicRoughness.setRoughnessFactor(colorConfig.roughness);
          }
        }
      });

      // Force model update
      if (modelViewer.updateFraming) {
        modelViewer.updateFraming();
      }

      // Store as custom attribute for AR persistence
      modelViewer.setAttribute('ar-base-color', colorConfig.hex);

      console.log(`[ColorManager] Applied color to model-viewer: ${colorConfig.name}`);
      return true;
    } catch (error) {
      console.error('[ColorManager] Error applying color to model-viewer:', error);
      return false;
    }
  }

  /**
   * Reset to original colors
   * @returns {boolean} Success status
   */
  resetColors() {
    if (this.scene) {
      return this._resetSceneColors();
    } else if (this.modelViewer) {
      // Model-viewer doesn't have a reset, need to reload model
      console.warn('[ColorManager] Model-viewer reset requires model reload');
      return false;
    }
    return false;
  }

  /**
   * Reset Three.js scene colors
   * @private
   */
  _resetSceneColors() {
    try {
      this.scene.traverse((object) => {
        if (object.isMesh && object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((mat, index) => {
            const key = `${object.uuid}_${index}`;
            const original = this.originalMaterials.get(key);

            if (original) {
              if (original.color && mat.color) {
                mat.color.copy(original.color);
              }
              if (original.metalness !== undefined) {
                mat.metalness = original.metalness;
              }
              if (original.roughness !== undefined) {
                mat.roughness = original.roughness;
              }
              if (original.emissive && mat.emissive) {
                mat.emissive.copy(original.emissive);
              }
              mat.needsUpdate = true;
            }
          });
        }
      });

      this.currentColor = null;
      console.log('[ColorManager] Reset to original colors');
      return true;
    } catch (error) {
      console.error('[ColorManager] Error resetting colors:', error);
      return false;
    }
  }

  /**
   * Get available color options
   * @returns {ColorConfig[]} Array of color configurations
   */
  getAvailableColors() {
    return AUTOMOTIVE_COLORS;
  }

  /**
   * Get currently applied color
   * @returns {ColorConfig|null}
   */
  getCurrentColor() {
    return this.currentColor;
  }

  /**
   * Get color by name
   * @param {string} name - Color name
   * @returns {ColorConfig|null}
   */
  getColorByName(name) {
    return AUTOMOTIVE_COLORS.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  /**
   * Get color by hex value
   * @param {string} hex - Hex color code
   * @returns {ColorConfig|null}
   */
  getColorByHex(hex) {
    const normalizedHex = hex.toLowerCase();
    return AUTOMOTIVE_COLORS.find(
      (c) => c.hex.toLowerCase() === normalizedHex
    ) || null;
  }

  /**
   * Convert hex to RGB object
   * @private
   */
  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Check if geometry is preserved (always true)
   * @returns {boolean}
   */
  preserveGeometry() {
    return true;
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.originalMaterials.clear();
    this.currentColor = null;
    this.scene = null;
    this.modelViewer = null;
  }
}

// Singleton instance
let colorManagerInstance = null;

/**
 * Get or create ColorManager instance
 * @returns {ColorManager}
 */
export function getColorManager() {
  if (!colorManagerInstance) {
    colorManagerInstance = new ColorManager();
  }
  return colorManagerInstance;
}

/**
 * Create new ColorManager instance (for isolated use)
 * @returns {ColorManager}
 */
export function createColorManager() {
  return new ColorManager();
}

export default ColorManager;
