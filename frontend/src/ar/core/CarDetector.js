/**
 * Car Detection Module
 *
 * Uses MediaPipe Object Detector for real-time car detection.
 * Falls back to TensorFlow.js COCO-SSD if MediaPipe unavailable.
 *
 * Features:
 * - Real-time car detection from video feed
 * - View angle estimation (side, front, rear, angle)
 * - Bounding box smoothing for stable tracking
 * - Memory-efficient resource management
 */

import {
  CAR_DETECTION_CONFIDENCE,
  DETECTION_INTERVAL_MS,
  VIEW_ANGLE_THRESHOLDS,
  BBOX_SMOOTHING,
  MIN_BBOX_SIZE,
  MAX_BBOX_SIZE,
} from './constants.js';

/**
 * CarDetector Class
 *
 * Manages car detection using MediaPipe or COCO-SSD fallback.
 */
class CarDetector {
  constructor() {
    this.detector = null;
    this.isInitializing = false;
    this.isInitialized = false;
    this.useMediaPipe = true; // Try MediaPipe first
    this.lastBBox = null; // For smoothing
    this.detectionCallbacks = new Set();
    this.animationFrameId = null;
    this.lastDetectionTime = 0;
  }

  /**
   * Initialize the detection model
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[CarDetector] Already initialized');
      return true;
    }

    if (this.isInitializing) {
      console.log('[CarDetector] Initialization in progress...');
      // Wait for existing initialization
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.isInitialized) {
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });
    }

    this.isInitializing = true;

    try {
      // Try MediaPipe first (preferred for performance)
      if (this.useMediaPipe) {
        const success = await this._initializeMediaPipe();
        if (success) {
          this.isInitialized = true;
          this.isInitializing = false;
          console.log('[CarDetector] Initialized with MediaPipe');
          return true;
        }
      }

      // Fallback to COCO-SSD
      console.log('[CarDetector] Falling back to COCO-SSD...');
      const success = await this._initializeCocoSsd();
      if (success) {
        this.isInitialized = true;
        this.isInitializing = false;
        this.useMediaPipe = false;
        console.log('[CarDetector] Initialized with COCO-SSD');
        return true;
      }

      throw new Error('Failed to initialize any detection model');
    } catch (error) {
      console.error('[CarDetector] Initialization failed:', error);
      this.isInitializing = false;
      throw error;
    }
  }

  /**
   * Initialize MediaPipe Object Detector
   * @private
   */
  async _initializeMediaPipe() {
    try {
      // Dynamic import to avoid bundle size issues
      const { ObjectDetector, FilesetResolver } = await import(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
      );

      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      this.detector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
          delegate: 'GPU',
        },
        scoreThreshold: CAR_DETECTION_CONFIDENCE,
        runningMode: 'VIDEO',
        categoryAllowlist: ['car'], // Only detect cars
      });

      this.detectorType = 'mediapipe';
      return true;
    } catch (error) {
      console.warn('[CarDetector] MediaPipe initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize TensorFlow.js COCO-SSD (fallback)
   * @private
   */
  async _initializeCocoSsd() {
    try {
      // Dynamic imports
      const tf = await import('@tensorflow/tfjs');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');

      // Set WebGL backend for performance
      await tf.setBackend('webgl');
      await tf.ready();

      this.detector = await cocoSsd.load({
        base: 'mobilenet_v2',
      });

      this.detectorType = 'cocossd';
      this.tf = tf;
      return true;
    } catch (error) {
      console.warn('[CarDetector] COCO-SSD initialization failed:', error);
      return false;
    }
  }

  /**
   * Detect car in a video frame
   * @param {HTMLVideoElement} videoElement - Video element with camera feed
   * @returns {Promise<DetectionResult|null>} Detection result or null
   */
  async detect(videoElement) {
    if (!this.isInitialized || !this.detector) {
      console.warn('[CarDetector] Not initialized');
      return null;
    }

    if (!videoElement || videoElement.readyState < 2) {
      return null;
    }

    // Throttle detection
    const now = performance.now();
    if (now - this.lastDetectionTime < DETECTION_INTERVAL_MS) {
      return null;
    }
    this.lastDetectionTime = now;

    try {
      let detections;

      if (this.detectorType === 'mediapipe') {
        detections = await this._detectMediaPipe(videoElement);
      } else {
        detections = await this._detectCocoSsd(videoElement);
      }

      // Filter for cars only
      const carDetections = detections.filter(
        (d) =>
          (d.class === 'car' || d.categoryName === 'car') &&
          (d.score || d.confidence) >= CAR_DETECTION_CONFIDENCE
      );

      if (carDetections.length === 0) {
        return {
          detected: false,
          confidence: 0,
          timestamp: now,
          message: 'No car detected',
        };
      }

      // Get best detection
      const best = carDetections.reduce((a, b) =>
        (a.score || a.confidence) > (b.score || b.confidence) ? a : b
      );

      // Normalize bounding box
      const bbox = this._normalizeBBox(best, videoElement);

      // Validate bbox size
      if (!this._isValidBBox(bbox)) {
        return {
          detected: false,
          confidence: 0,
          timestamp: now,
          message: 'Car too small or too large',
        };
      }

      // Smooth bounding box
      const smoothedBBox = this._smoothBBox(bbox);

      // Determine view angle
      const viewAngle = this._determineViewAngle(smoothedBBox);

      return {
        detected: true,
        confidence: best.score || best.confidence,
        boundingBox: smoothedBBox,
        viewAngle,
        timestamp: now,
      };
    } catch (error) {
      console.error('[CarDetector] Detection error:', error);
      return null;
    }
  }

  /**
   * Run MediaPipe detection
   * @private
   */
  async _detectMediaPipe(videoElement) {
    const result = this.detector.detectForVideo(videoElement, performance.now());
    return result.detections.map((d) => ({
      class: d.categories[0]?.categoryName,
      categoryName: d.categories[0]?.categoryName,
      score: d.categories[0]?.score,
      bbox: [
        d.boundingBox.originX,
        d.boundingBox.originY,
        d.boundingBox.width,
        d.boundingBox.height,
      ],
    }));
  }

  /**
   * Run COCO-SSD detection
   * @private
   */
  async _detectCocoSsd(videoElement) {
    const predictions = await this.detector.detect(videoElement);
    return predictions.map((p) => ({
      class: p.class,
      score: p.score,
      bbox: p.bbox,
    }));
  }

  /**
   * Normalize bounding box to 0-1 range
   * @private
   */
  _normalizeBBox(detection, video) {
    const [x, y, width, height] = detection.bbox;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    return {
      x: x / vw,
      y: y / vh,
      width: width / vw,
      height: height / vh,
    };
  }

  /**
   * Validate bounding box size
   * @private
   */
  _isValidBBox(bbox) {
    const area = bbox.width * bbox.height;
    return area >= MIN_BBOX_SIZE * MIN_BBOX_SIZE && area <= MAX_BBOX_SIZE * MAX_BBOX_SIZE;
  }

  /**
   * Smooth bounding box using exponential moving average
   * @private
   */
  _smoothBBox(bbox) {
    if (!this.lastBBox) {
      this.lastBBox = bbox;
      return bbox;
    }

    const smoothed = {
      x: this.lastBBox.x * BBOX_SMOOTHING + bbox.x * (1 - BBOX_SMOOTHING),
      y: this.lastBBox.y * BBOX_SMOOTHING + bbox.y * (1 - BBOX_SMOOTHING),
      width: this.lastBBox.width * BBOX_SMOOTHING + bbox.width * (1 - BBOX_SMOOTHING),
      height: this.lastBBox.height * BBOX_SMOOTHING + bbox.height * (1 - BBOX_SMOOTHING),
    };

    this.lastBBox = smoothed;
    return smoothed;
  }

  /**
   * Determine view angle based on aspect ratio
   * @private
   */
  _determineViewAngle(bbox) {
    const aspectRatio = bbox.width / bbox.height;

    if (aspectRatio >= VIEW_ANGLE_THRESHOLDS.side.minAspect) {
      return 'side';
    }

    if (aspectRatio <= VIEW_ANGLE_THRESHOLDS.frontRear.maxAspect) {
      // Distinguish front from rear based on vertical position
      const centerY = bbox.y + bbox.height / 2;
      return centerY < 0.5 ? 'front' : 'rear';
    }

    return 'angle';
  }

  /**
   * Start continuous detection
   * @param {HTMLVideoElement} videoElement - Video element
   * @param {Function} callback - Called with each detection result
   */
  startContinuousDetection(videoElement, callback) {
    if (!this.isInitialized) {
      console.error('[CarDetector] Must initialize before starting detection');
      return;
    }

    this.detectionCallbacks.add(callback);

    // Only start loop if not already running
    if (this.animationFrameId) {
      return;
    }

    const detectionLoop = async () => {
      if (this.detectionCallbacks.size === 0) {
        this.animationFrameId = null;
        return;
      }

      const result = await this.detect(videoElement);
      if (result) {
        this.detectionCallbacks.forEach((cb) => cb(result));
      }

      this.animationFrameId = requestAnimationFrame(detectionLoop);
    };

    this.animationFrameId = requestAnimationFrame(detectionLoop);
    console.log('[CarDetector] Started continuous detection');
  }

  /**
   * Stop continuous detection
   * @param {Function} [callback] - Specific callback to remove, or all if not provided
   */
  stopContinuousDetection(callback) {
    if (callback) {
      this.detectionCallbacks.delete(callback);
    } else {
      this.detectionCallbacks.clear();
    }

    if (this.detectionCallbacks.size === 0 && this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      console.log('[CarDetector] Stopped continuous detection');
    }
  }

  /**
   * Check if detector is ready
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && this.detector !== null;
  }

  /**
   * Get detector type
   * @returns {string}
   */
  getDetectorType() {
    return this.detectorType || 'none';
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.stopContinuousDetection();
    this.lastBBox = null;

    if (this.detector) {
      if (this.detectorType === 'mediapipe' && this.detector.close) {
        this.detector.close();
      }
      this.detector = null;
    }

    if (this.tf) {
      this.tf.disposeVariables();
    }

    this.isInitialized = false;
    console.log('[CarDetector] Disposed');
  }
}

// Singleton instance
let carDetectorInstance = null;

/**
 * Get or create CarDetector instance
 * @returns {CarDetector}
 */
export function getCarDetector() {
  if (!carDetectorInstance) {
    carDetectorInstance = new CarDetector();
  }
  return carDetectorInstance;
}

/**
 * Dispose of CarDetector instance
 */
export function disposeCarDetector() {
  if (carDetectorInstance) {
    carDetectorInstance.dispose();
    carDetectorInstance = null;
  }
}

export default CarDetector;
