/**
 * Advanced Car Part Detection System
 *
 * Features:
 * - Car-only detection (no trucks, buses, motorcycles)
 * - Intelligent car part segmentation
 * - Specific placement for: trunk, wheels, bonnet, side skirts
 * - Advanced algorithms for part localization
 * - High accuracy placement hints
 */

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';

class CarPartDetectionManager {
  constructor() {
    this.model = null;
    this.isModelLoading = false;
    this.isDetecting = false;
    this.detectionInterval = null;
    this.lastDetectionTime = 0;
    this.detectionThrottle = 800; // Faster: 0.8 seconds for car-specific
    this.confidenceThreshold = 0.65; // Higher threshold for cars only
    this.currentView = 'unknown'; // side, front, rear, angle
  }

  /**
   * Initialize TensorFlow.js and load COCO-SSD model
   */
  async initialize() {
    if (this.model || this.isModelLoading) {
      console.log('🧠 Car detection model already loaded');
      return this.model;
    }

    try {
      this.isModelLoading = true;
      console.log('🚗 Initializing Advanced Car Detection System...');

      // Set backend to WebGL for best performance
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('✅ TensorFlow.js ready:', tf.getBackend());

      // Load COCO-SSD model optimized for mobile
      console.log('📦 Loading car detection model...');
      this.model = await cocoSsd.load({
        base: 'mobilenet_v2', // Fastest for real-time
        modelUrl: undefined,
      });

      console.log('✅ Car detection model loaded successfully');
      this.isModelLoading = false;
      return this.model;

    } catch (error) {
      console.error('❌ Failed to load detection model:', error);
      this.isModelLoading = false;
      throw error;
    }
  }

  /**
   * Detect car and identify specific parts
   * @param {HTMLVideoElement} videoElement - Camera feed
   * @param {string} productType - Type of product (spoiler, rim, hood, sideskirt)
   * @returns {Promise<CarDetectionResult>} Detection results with part locations
   */
  async detectCarAndParts(videoElement, productType) {
    if (!this.model) {
      console.warn('⚠️ Model not loaded');
      return null;
    }

    if (!videoElement || videoElement.readyState !== 4) {
      return null;
    }

    // Throttle detection
    const now = Date.now();
    if (now - this.lastDetectionTime < this.detectionThrottle) {
      return null;
    }
    this.lastDetectionTime = now;

    try {
      // Run object detection
      const predictions = await this.model.detect(videoElement);

      // Filter for CARS ONLY (no trucks, buses, motorcycles)
      const carDetections = predictions.filter(pred =>
        pred.class === 'car' && pred.score >= this.confidenceThreshold
      );

      if (carDetections.length === 0) {
        return {
          detected: false,
          message: 'Point camera at a car',
          confidence: 0,
          productType,
        };
      }

      // Get the most confident car detection
      const bestCar = carDetections.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      console.log(`🚗 Car detected with ${Math.round(bestCar.score * 100)}% confidence`);

      // Analyze car orientation
      const carView = this.analyzeCarOrientation(bestCar, videoElement);

      // Segment car parts based on bounding box
      const carParts = this.segmentCarParts(bestCar, videoElement, carView);

      // Get specific placement for product type
      const placement = this.getProductPlacement(
        carParts,
        productType,
        carView,
        videoElement
      );

      return {
        detected: true,
        message: `Car detected - ${carView} view`,
        confidence: Math.round(bestCar.score * 100),
        boundingBox: bestCar.bbox,
        carView,
        carParts,
        placement,
        productType,
      };

    } catch (error) {
      console.error('❌ Detection error:', error);
      return null;
    }
  }

  /**
   * Analyze car orientation (side, front, rear, 3/4 angle)
   * Uses aspect ratio and position to determine view
   */
  analyzeCarOrientation(carDetection, video) {
    const [x, y, width, height] = carDetection.bbox;
    const aspectRatio = width / height;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // Calculate position in frame
    const centerX = (x + width / 2) / videoWidth;
    const centerY = (y + height / 2) / videoHeight;

    console.log(`📐 Car aspect ratio: ${aspectRatio.toFixed(2)}`);

    // Side view: Wide aspect ratio (car is horizontal)
    if (aspectRatio > 1.8) {
      this.currentView = 'side';
      console.log('🚗 Detected: SIDE VIEW');
      return 'side';
    }

    // Front/Rear view: Narrow aspect ratio (car is vertical)
    if (aspectRatio < 1.2) {
      // Determine front vs rear based on position
      if (centerY < 0.5) {
        this.currentView = 'front';
        console.log('🚗 Detected: FRONT VIEW');
        return 'front';
      } else {
        this.currentView = 'rear';
        console.log('🚗 Detected: REAR VIEW');
        return 'rear';
      }
    }

    // 3/4 angle view (most common for AR)
    this.currentView = 'angle';
    console.log('🚗 Detected: 3/4 ANGLE VIEW');
    return 'angle';
  }

  /**
   * Segment car into specific parts using geometric analysis
   * Based on typical car proportions and view angle
   */
  segmentCarParts(carDetection, video, carView) {
    const [x, y, width, height] = carDetection.bbox;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    let parts = {};

    switch (carView) {
      case 'side':
        // Side view: Can see trunk, wheels, bonnet clearly
        parts = {
          // Front area (bonnet/hood) - front 35% of car
          bonnet: {
            x: x,
            y: y,
            width: width * 0.35,
            height: height * 0.4,
            center: {
              x: x + (width * 0.175),
              y: y + (height * 0.2),
            },
            confidence: 'high',
          },

          // Rear area (trunk) - back 30% of car
          trunk: {
            x: x + width * 0.7,
            y: y,
            width: width * 0.3,
            height: height * 0.35,
            center: {
              x: x + width * 0.85,
              y: y + (height * 0.175),
            },
            confidence: 'high',
          },

          // Front wheel - front 25% area, bottom 30%
          frontWheel: {
            x: x + width * 0.15,
            y: y + height * 0.65,
            width: width * 0.15,
            height: height * 0.3,
            center: {
              x: x + width * 0.225,
              y: y + height * 0.8,
            },
            confidence: 'high',
          },

          // Rear wheel - back 25% area, bottom 30%
          rearWheel: {
            x: x + width * 0.65,
            y: y + height * 0.65,
            width: width * 0.15,
            height: height * 0.3,
            center: {
              x: x + width * 0.725,
              y: y + height * 0.8,
            },
            confidence: 'high',
          },

          // Side skirt - middle section, bottom
          sideSkirt: {
            x: x + width * 0.25,
            y: y + height * 0.6,
            width: width * 0.5,
            height: height * 0.35,
            center: {
              x: x + width * 0.5,
              y: y + height * 0.775,
            },
            confidence: 'high',
          },

          // Roof (for roof racks, spoilers)
          roof: {
            x: x + width * 0.3,
            y: y,
            width: width * 0.4,
            height: height * 0.15,
            center: {
              x: x + width * 0.5,
              y: y + height * 0.075,
            },
            confidence: 'medium',
          },
        };
        break;

      case 'rear':
        // Rear view: Can see trunk and rear wheels clearly
        parts = {
          trunk: {
            x: x + width * 0.2,
            y: y,
            width: width * 0.6,
            height: height * 0.3,
            center: {
              x: x + width * 0.5,
              y: y + height * 0.15,
            },
            confidence: 'very-high',
          },

          rearLeftWheel: {
            x: x + width * 0.1,
            y: y + height * 0.65,
            width: width * 0.25,
            height: height * 0.3,
            center: {
              x: x + width * 0.225,
              y: y + height * 0.8,
            },
            confidence: 'high',
          },

          rearRightWheel: {
            x: x + width * 0.65,
            y: y + height * 0.65,
            width: width * 0.25,
            height: height * 0.3,
            center: {
              x: x + width * 0.775,
              y: y + height * 0.8,
            },
            confidence: 'high',
          },

          rearBumper: {
            x: x + width * 0.15,
            y: y + height * 0.7,
            width: width * 0.7,
            height: height * 0.25,
            center: {
              x: x + width * 0.5,
              y: y + height * 0.825,
            },
            confidence: 'high',
          },
        };
        break;

      case 'front':
        // Front view: Can see bonnet and front wheels
        parts = {
          bonnet: {
            x: x + width * 0.2,
            y: y,
            width: width * 0.6,
            height: height * 0.35,
            center: {
              x: x + width * 0.5,
              y: y + height * 0.175,
            },
            confidence: 'very-high',
          },

          frontLeftWheel: {
            x: x + width * 0.1,
            y: y + height * 0.65,
            width: width * 0.25,
            height: height * 0.3,
            center: {
              x: x + width * 0.225,
              y: y + height * 0.8,
            },
            confidence: 'high',
          },

          frontRightWheel: {
            x: x + width * 0.65,
            y: y + height * 0.65,
            width: width * 0.25,
            height: height * 0.3,
            center: {
              x: x + width * 0.775,
              y: y + height * 0.8,
            },
            confidence: 'high',
          },

          frontGrill: {
            x: x + width * 0.3,
            y: y + height * 0.4,
            width: width * 0.4,
            height: height * 0.25,
            center: {
              x: x + width * 0.5,
              y: y + height * 0.525,
            },
            confidence: 'medium',
          },
        };
        break;

      case 'angle':
        // 3/4 angle view: Good visibility of most parts
        parts = {
          bonnet: {
            x: x + width * 0.1,
            y: y + height * 0.1,
            width: width * 0.4,
            height: height * 0.35,
            center: {
              x: x + width * 0.3,
              y: y + height * 0.275,
            },
            confidence: 'medium',
          },

          trunk: {
            x: x + width * 0.6,
            y: y + height * 0.05,
            width: width * 0.35,
            height: height * 0.3,
            center: {
              x: x + width * 0.775,
              y: y + height * 0.2,
            },
            confidence: 'medium',
          },

          frontWheel: {
            x: x + width * 0.15,
            y: y + height * 0.6,
            width: width * 0.2,
            height: height * 0.3,
            center: {
              x: x + width * 0.25,
              y: y + height * 0.75,
            },
            confidence: 'high',
          },

          rearWheel: {
            x: x + width * 0.6,
            y: y + height * 0.6,
            width: width * 0.2,
            height: height * 0.3,
            center: {
              x: x + width * 0.7,
              y: y + height * 0.75,
            },
            confidence: 'high',
          },

          sideSkirt: {
            x: x + width * 0.3,
            y: y + height * 0.65,
            width: width * 0.4,
            height: height * 0.3,
            center: {
              x: x + width * 0.5,
              y: y + height * 0.8,
            },
            confidence: 'medium',
          },
        };
        break;
    }

    // Normalize coordinates to 0-1 range
    Object.keys(parts).forEach(partName => {
      const part = parts[partName];
      part.normalized = {
        x: part.center.x / videoWidth,
        y: part.center.y / videoHeight,
      };
    });

    console.log(`🔍 Segmented ${Object.keys(parts).length} car parts`);
    return parts;
  }

  /**
   * Get optimal placement for specific product type
   */
  getProductPlacement(carParts, productType, carView, video) {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    let targetPart = null;
    let placementLabel = '';
    let instructions = '';
    let confidence = 'medium';

    switch (productType.toLowerCase()) {
      case 'spoiler':
        // Spoilers go on trunk
        if (carParts.trunk) {
          targetPart = carParts.trunk;
          placementLabel = 'Trunk / Rear Deck';
          instructions = 'Place spoiler on trunk lid';
          confidence = carParts.trunk.confidence;
          console.log('🎯 Target: TRUNK for spoiler');
        } else {
          // Fallback: top-rear of car
          const fallback = this.estimateTrunkLocation(carParts, carView);
          targetPart = fallback;
          placementLabel = 'Estimated Trunk Area';
          instructions = 'Place spoiler on rear area';
          confidence = 'low';
        }
        break;

      case 'rim':
      case 'wheel':
        // Rims go on wheels - prefer visible wheel
        if (carParts.frontWheel) {
          targetPart = carParts.frontWheel;
          placementLabel = 'Front Wheel';
          instructions = 'Place rim on front wheel';
          confidence = carParts.frontWheel.confidence;
          console.log('🎯 Target: FRONT WHEEL for rim');
        } else if (carParts.rearWheel) {
          targetPart = carParts.rearWheel;
          placementLabel = 'Rear Wheel';
          instructions = 'Place rim on rear wheel';
          confidence = carParts.rearWheel.confidence;
          console.log('🎯 Target: REAR WHEEL for rim');
        } else if (carParts.frontLeftWheel) {
          targetPart = carParts.frontLeftWheel;
          placementLabel = 'Front Left Wheel';
          instructions = 'Place rim on wheel';
          confidence = carParts.frontLeftWheel.confidence;
        } else {
          const fallback = this.estimateWheelLocation(carParts, carView);
          targetPart = fallback;
          placementLabel = 'Estimated Wheel Area';
          instructions = 'Place rim on wheel area';
          confidence = 'low';
        }
        break;

      case 'hood':
      case 'bonnet':
        // Hoods go on bonnet
        if (carParts.bonnet) {
          targetPart = carParts.bonnet;
          placementLabel = 'Hood / Bonnet';
          instructions = 'Place hood on bonnet';
          confidence = carParts.bonnet.confidence;
          console.log('🎯 Target: BONNET for hood');
        } else {
          const fallback = this.estimateBonnetLocation(carParts, carView);
          targetPart = fallback;
          placementLabel = 'Estimated Hood Area';
          instructions = 'Place hood on front area';
          confidence = 'low';
        }
        break;

      case 'sideskirt':
      case 'side-skirt':
      case 'side_skirt':
        // Side skirts go on lower side
        if (carParts.sideSkirt) {
          targetPart = carParts.sideSkirt;
          placementLabel = 'Side Skirt Area';
          instructions = 'Place skirt on lower side';
          confidence = carParts.sideSkirt.confidence;
          console.log('🎯 Target: SIDE SKIRT');
        } else {
          const fallback = this.estimateSideSkirtLocation(carParts, carView);
          targetPart = fallback;
          placementLabel = 'Estimated Side Area';
          instructions = 'Place skirt on side';
          confidence = 'low';
        }
        break;

      case 'bumper':
        // Bumpers - front or rear based on view
        if (carView === 'rear' && carParts.rearBumper) {
          targetPart = carParts.rearBumper;
          placementLabel = 'Rear Bumper';
          instructions = 'Place bumper on rear';
          confidence = 'high';
        } else if (carParts.frontGrill) {
          targetPart = carParts.frontGrill;
          placementLabel = 'Front Bumper Area';
          instructions = 'Place bumper on front';
          confidence = 'medium';
        } else {
          const fallback = this.estimateBumperLocation(carParts, carView);
          targetPart = fallback;
          placementLabel = 'Estimated Bumper Area';
          instructions = 'Place bumper';
          confidence = 'low';
        }
        break;

      default:
        // Generic placement - center of car
        const centerX = Object.values(carParts)[0]?.center.x || videoWidth / 2;
        const centerY = Object.values(carParts)[0]?.center.y || videoHeight / 2;
        targetPart = {
          center: { x: centerX, y: centerY },
          normalized: { x: centerX / videoWidth, y: centerY / videoHeight },
        };
        placementLabel = 'Car Center';
        instructions = 'Place on vehicle';
        confidence = 'low';
    }

    return {
      targetPart: targetPart.normalized || {
        x: targetPart.center.x / videoWidth,
        y: targetPart.center.y / videoHeight,
      },
      label: placementLabel,
      instructions,
      confidence,
      rawPosition: targetPart.center,
      boundingBox: targetPart.x !== undefined ? {
        x: targetPart.x,
        y: targetPart.y,
        width: targetPart.width,
        height: targetPart.height,
      } : null,
    };
  }

  /**
   * Fallback estimation methods when parts aren't detected
   */
  estimateTrunkLocation(carParts, carView) {
    // Estimate trunk at top-rear based on car view
    const firstPart = Object.values(carParts)[0];
    if (!firstPart) return { center: { x: 0, y: 0 } };

    return {
      center: {
        x: firstPart.center.x + firstPart.width * 0.4,
        y: firstPart.center.y - firstPart.height * 0.3,
      },
    };
  }

  estimateWheelLocation(carParts, carView) {
    const firstPart = Object.values(carParts)[0];
    if (!firstPart) return { center: { x: 0, y: 0 } };

    return {
      center: {
        x: firstPart.center.x - firstPart.width * 0.2,
        y: firstPart.center.y + firstPart.height * 0.3,
      },
    };
  }

  estimateBonnetLocation(carParts, carView) {
    const firstPart = Object.values(carParts)[0];
    if (!firstPart) return { center: { x: 0, y: 0 } };

    return {
      center: {
        x: firstPart.center.x - firstPart.width * 0.3,
        y: firstPart.center.y - firstPart.height * 0.2,
      },
    };
  }

  estimateSideSkirtLocation(carParts, carView) {
    const firstPart = Object.values(carParts)[0];
    if (!firstPart) return { center: { x: 0, y: 0 } };

    return {
      center: {
        x: firstPart.center.x,
        y: firstPart.center.y + firstPart.height * 0.3,
      },
    };
  }

  estimateBumperLocation(carParts, carView) {
    const firstPart = Object.values(carParts)[0];
    if (!firstPart) return { center: { x: 0, y: 0 } };

    return {
      center: {
        x: firstPart.center.x,
        y: firstPart.center.y + firstPart.height * 0.4,
      },
    };
  }

  /**
   * Start continuous car detection
   */
  startContinuousDetection(videoElement, productType, callback) {
    if (this.detectionInterval) {
      console.log('⚠️ Detection already running');
      return;
    }

    console.log('🎬 Starting continuous car-part detection...');
    this.isDetecting = true;

    this.detectionInterval = setInterval(async () => {
      if (!this.isDetecting) {
        this.stopContinuousDetection();
        return;
      }

      const result = await this.detectCarAndParts(videoElement, productType);
      if (result && callback) {
        callback(result);
      }
    }, this.detectionThrottle);
  }

  /**
   * Stop continuous detection
   */
  stopContinuousDetection() {
    console.log('🛑 Stopping car-part detection...');
    this.isDetecting = false;

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    this.stopContinuousDetection();

    if (this.model) {
      console.log('🧹 Disposing car detection model...');
      this.model = null;
    }

    if (tf.engine().registryFactory) {
      const tensors = tf.memory().numTensors;
      console.log(`🧹 Cleaning up ${tensors} tensors...`);
      tf.disposeVariables();
    }
  }

  /**
   * Adjust detection settings
   */
  setConfidenceThreshold(threshold) {
    this.confidenceThreshold = Math.max(0.5, Math.min(1.0, threshold));
    console.log(`🎯 Car confidence threshold: ${this.confidenceThreshold}`);
  }

  setDetectionThrottle(ms) {
    this.detectionThrottle = Math.max(500, ms);
    console.log(`⏱️ Detection throttle: ${this.detectionThrottle}ms`);
  }

  isReady() {
    return this.model !== null && !this.isModelLoading;
  }

  getMemoryInfo() {
    return tf.memory();
  }
}

// Singleton instance
let carPartDetectionManager = null;

/**
 * Get or create car-part detection manager instance
 */
export const getCarPartDetectionManager = () => {
  if (!carPartDetectionManager) {
    carPartDetectionManager = new CarPartDetectionManager();
  }
  return carPartDetectionManager;
};

/**
 * Product type mapping
 */
export const CAR_PART_TYPES = {
  SPOILER: 'spoiler',
  RIM: 'rim',
  WHEEL: 'wheel',
  HOOD: 'hood',
  BONNET: 'bonnet',
  SIDE_SKIRT: 'sideskirt',
  BUMPER: 'bumper',
};

/**
 * Get product type from product data
 */
export const getCarPartType = (product) => {
  const name = product?.name?.toLowerCase() || '';
  const category = product?.category?.toLowerCase() || '';
  const combined = `${name} ${category}`;

  if (combined.includes('spoiler')) return CAR_PART_TYPES.SPOILER;
  if (combined.includes('rim') || combined.includes('wheel')) return CAR_PART_TYPES.RIM;
  if (combined.includes('hood') || combined.includes('bonnet')) return CAR_PART_TYPES.HOOD;
  if (combined.includes('side') && (combined.includes('skirt') || combined.includes('sill'))) {
    return CAR_PART_TYPES.SIDE_SKIRT;
  }
  if (combined.includes('bumper')) return CAR_PART_TYPES.BUMPER;

  // Default to spoiler
  return CAR_PART_TYPES.SPOILER;
};

export default getCarPartDetectionManager;
