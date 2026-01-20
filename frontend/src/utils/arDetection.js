/**
 * AR Detection Utility - Industry Standard Implementation
 *
 * Features:
 * - TensorFlow.js COCO-SSD for object detection
 * - Smart placement hints based on product type
 * - Performance optimization with throttling
 * - Confidence scoring and validation
 * - Multi-device support (Android/iOS)
 */

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';

class ARDetectionManager {
  constructor() {
    this.model = null;
    this.isModelLoading = false;
    this.isDetecting = false;
    this.detectionInterval = null;
    this.lastDetectionTime = 0;
    this.detectionThrottle = 1000; // Detect every 1 second for performance
    this.confidenceThreshold = 0.6; // 60% confidence minimum
  }

  /**
   * Initialize TensorFlow.js and load COCO-SSD model
   * Uses WebGL backend for best performance
   */
  async initialize() {
    if (this.model || this.isModelLoading) {
      console.log('🧠 Model already loaded or loading...');
      return this.model;
    }

    try {
      this.isModelLoading = true;
      console.log('🚀 Initializing TensorFlow.js AR Detection...');

      // Set backend to WebGL for best performance
      await tf.setBackend('webgl');
      await tf.ready();
      console.log('✅ TensorFlow.js ready with backend:', tf.getBackend());

      // Load COCO-SSD model (lite version for mobile)
      console.log('📦 Loading COCO-SSD model...');
      this.model = await cocoSsd.load({
        base: 'mobilenet_v2', // Faster, optimized for mobile
        modelUrl: undefined, // Use default CDN
      });

      console.log('✅ COCO-SSD model loaded successfully');
      this.isModelLoading = false;
      return this.model;

    } catch (error) {
      console.error('❌ Failed to load detection model:', error);
      this.isModelLoading = false;
      throw error;
    }
  }

  /**
   * Detect vehicles in video stream
   * @param {HTMLVideoElement} videoElement - Camera video element
   * @param {string} productType - Type of product (spoiler, rim, etc.)
   * @returns {Promise<DetectionResult>} Detection results
   */
  async detectVehicle(videoElement, productType = 'spoiler') {
    if (!this.model) {
      console.warn('⚠️ Model not loaded. Call initialize() first.');
      return null;
    }

    if (!videoElement || videoElement.readyState !== 4) {
      console.warn('⚠️ Video element not ready');
      return null;
    }

    // Throttle detection for performance
    const now = Date.now();
    if (now - this.lastDetectionTime < this.detectionThrottle) {
      return null;
    }
    this.lastDetectionTime = now;

    try {
      // Run detection
      const predictions = await this.model.detect(videoElement);

      // Filter for vehicles
      const vehicleClasses = ['car', 'truck', 'bus', 'motorcycle'];
      const vehicleDetections = predictions.filter(pred =>
        vehicleClasses.includes(pred.class) &&
        pred.score >= this.confidenceThreshold
      );

      if (vehicleDetections.length === 0) {
        return {
          detected: false,
          message: 'No vehicle detected. Point camera at a car.',
          confidence: 0,
        };
      }

      // Get the most confident vehicle detection
      const bestDetection = vehicleDetections.reduce((best, current) =>
        current.score > best.score ? current : best
      );

      // Calculate placement hint based on product type
      const placementHint = this.calculatePlacementHint(
        bestDetection,
        videoElement,
        productType
      );

      return {
        detected: true,
        message: `${bestDetection.class} detected!`,
        confidence: Math.round(bestDetection.score * 100),
        boundingBox: bestDetection.bbox,
        vehicleType: bestDetection.class,
        placementHint,
        productType,
      };

    } catch (error) {
      console.error('❌ Detection error:', error);
      return null;
    }
  }

  /**
   * Calculate smart placement hints based on vehicle detection
   * @param {Object} detection - Vehicle detection result
   * @param {HTMLVideoElement} video - Video element
   * @param {string} productType - Product type
   * @returns {Object} Placement hint coordinates
   */
  calculatePlacementHint(detection, video, productType) {
    const [x, y, width, height] = detection.bbox;
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    let hintX, hintY, hintLabel;

    switch (productType.toLowerCase()) {
      case 'spoiler':
        // Place at top-back of vehicle (upper-right of bounding box)
        hintX = x + width * 0.75;
        hintY = y + height * 0.25;
        hintLabel = 'Place on trunk/rear';
        break;

      case 'rim':
      case 'wheel':
        // Place at bottom corners (wheel locations)
        hintX = x + width * 0.25; // Front wheel
        hintY = y + height * 0.85;
        hintLabel = 'Place on wheel';
        break;

      case 'bumper':
        // Place at front or rear
        hintX = x + width / 2;
        hintY = y + height * 0.95;
        hintLabel = 'Place at bumper level';
        break;

      case 'hood':
        // Place on hood/bonnet
        hintX = x + width / 2;
        hintY = y + height * 0.3;
        hintLabel = 'Place on hood';
        break;

      default:
        // Default: center of vehicle
        hintX = x + width / 2;
        hintY = y + height / 2;
        hintLabel = 'Place on vehicle';
    }

    // Convert to normalized coordinates (0-1)
    return {
      x: hintX / videoWidth,
      y: hintY / videoHeight,
      normalizedBox: {
        x: x / videoWidth,
        y: y / videoHeight,
        width: width / videoWidth,
        height: height / videoHeight,
      },
      label: hintLabel,
    };
  }

  /**
   * Start continuous detection
   * @param {HTMLVideoElement} videoElement - Video element
   * @param {string} productType - Product type
   * @param {Function} callback - Callback with detection results
   */
  startContinuousDetection(videoElement, productType, callback) {
    if (this.detectionInterval) {
      console.log('⚠️ Detection already running');
      return;
    }

    console.log('🎬 Starting continuous detection...');
    this.isDetecting = true;

    this.detectionInterval = setInterval(async () => {
      if (!this.isDetecting) {
        this.stopContinuousDetection();
        return;
      }

      const result = await this.detectVehicle(videoElement, productType);
      if (result && callback) {
        callback(result);
      }
    }, this.detectionThrottle);
  }

  /**
   * Stop continuous detection
   */
  stopContinuousDetection() {
    console.log('🛑 Stopping continuous detection...');
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
      console.log('🧹 Disposing TensorFlow.js model...');
      // Model disposal is handled by TensorFlow.js automatically
      this.model = null;
    }

    // Clean up TensorFlow.js resources
    if (tf.engine().registryFactory) {
      const tensors = tf.memory().numTensors;
      console.log(`🧹 Cleaning up ${tensors} tensors...`);
      tf.disposeVariables();
    }
  }

  /**
   * Get current memory usage (for debugging)
   */
  getMemoryInfo() {
    return tf.memory();
  }

  /**
   * Adjust detection sensitivity
   * @param {number} threshold - Confidence threshold (0-1)
   */
  setConfidenceThreshold(threshold) {
    this.confidenceThreshold = Math.max(0.1, Math.min(1.0, threshold));
    console.log(`🎯 Confidence threshold set to ${this.confidenceThreshold}`);
  }

  /**
   * Adjust detection frequency
   * @param {number} ms - Throttle time in milliseconds
   */
  setDetectionThrottle(ms) {
    this.detectionThrottle = Math.max(100, ms);
    console.log(`⏱️ Detection throttle set to ${this.detectionThrottle}ms`);
  }

  /**
   * Check if model is ready
   */
  isReady() {
    return this.model !== null && !this.isModelLoading;
  }
}

// Singleton instance
let detectionManager = null;

/**
 * Get or create detection manager instance
 */
export const getARDetectionManager = () => {
  if (!detectionManager) {
    detectionManager = new ARDetectionManager();
  }
  return detectionManager;
};

/**
 * Product type to detection mapping
 */
export const PRODUCT_TYPES = {
  SPOILER: 'spoiler',
  RIM: 'rim',
  WHEEL: 'wheel',
  BUMPER: 'bumper',
  HOOD: 'hood',
  LIGHT: 'light',
  MIRROR: 'mirror',
  GRILL: 'grill',
};

/**
 * Get product category from product data
 */
export const getProductType = (product) => {
  const name = product?.name?.toLowerCase() || '';
  const category = product?.category?.toLowerCase() || '';

  if (name.includes('spoiler') || category.includes('spoiler')) {
    return PRODUCT_TYPES.SPOILER;
  }
  if (name.includes('rim') || name.includes('wheel') || category.includes('rim')) {
    return PRODUCT_TYPES.RIM;
  }
  if (name.includes('bumper') || category.includes('bumper')) {
    return PRODUCT_TYPES.BUMPER;
  }
  if (name.includes('hood') || name.includes('bonnet')) {
    return PRODUCT_TYPES.HOOD;
  }

  // Default to spoiler
  return PRODUCT_TYPES.SPOILER;
};

export default getARDetectionManager;
