import { useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

const CarDetector = ({ videoRef, onDetection, enabled = true }) => {
  const [model, setModel] = useState(null);
  const [detecting, setDetecting] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);
  const detectionIntervalRef = useRef(null);

  // Load COCO-SSD model
  useEffect(() => {
    loadModel();

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const loadModel = async () => {
    try {
      console.log('🔄 Loading car detection model...');
      const loadedModel = await cocoSsd.load({
        base: 'mobilenet_v2' // Faster, good for mobile
      });
      setModel(loadedModel);
      console.log('✅ Car detection model loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load detection model:', error);
    }
  };

  // Start/stop detection based on enabled prop
  useEffect(() => {
    if (!model || !enabled) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      return;
    }

    // Run detection every 1 second (adjust for performance)
    detectionIntervalRef.current = setInterval(() => {
      detectCar();
    }, 1000);

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [model, enabled]);

  const detectCar = async () => {
    if (!model || !videoRef?.current || detecting) return;

    setDetecting(true);

    try {
      const video = videoRef.current;

      // Make sure video is ready
      if (video.readyState !== 4) {
        setDetecting(false);
        return;
      }

      // Run detection
      const predictions = await model.detect(video);

      // Find car in predictions
      const carDetection = predictions.find(
        (pred) => pred.class === 'car' || pred.class === 'truck' || pred.class === 'bus'
      );

      if (carDetection && carDetection.score > 0.6) {
        // Car detected with >60% confidence
        const [x, y, width, height] = carDetection.bbox;

        const detection = {
          detected: true,
          class: carDetection.class,
          confidence: carDetection.score,
          bbox: { x, y, width, height },
          centerX: x + width / 2,
          centerY: y + height / 2,
          // Estimate trunk position (bottom-back of car)
          trunkEstimate: {
            x: x + width * 0.5, // Center horizontally
            y: y + height * 0.8, // 80% down (near trunk)
          },
          timestamp: Date.now()
        };

        setLastDetection(detection);
        onDetection?.(detection);

        console.log('🚗 Car detected:', {
          type: carDetection.class,
          confidence: `${(carDetection.score * 100).toFixed(1)}%`
        });
      } else {
        // No car detected
        if (lastDetection && Date.now() - lastDetection.timestamp > 3000) {
          // Clear detection after 3 seconds
          setLastDetection(null);
          onDetection?.(null);
        }
      }
    } catch (error) {
      console.error('❌ Detection error:', error);
    }

    setDetecting(false);
  };

  // Render detection visualization
  if (!lastDetection || !videoRef?.current) return null;

  const video = videoRef.current;
  const { bbox } = lastDetection;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Detection Box Overlay */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${video.videoWidth} ${video.videoHeight}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Car bounding box */}
        <rect
          x={bbox.x}
          y={bbox.y}
          width={bbox.width}
          height={bbox.height}
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          strokeDasharray="10,5"
        />

        {/* Trunk target indicator */}
        <circle
          cx={lastDetection.trunkEstimate.x}
          cy={lastDetection.trunkEstimate.y}
          r="20"
          fill="rgba(16, 185, 129, 0.3)"
          stroke="#10b981"
          strokeWidth="3"
        />

        <circle
          cx={lastDetection.trunkEstimate.x}
          cy={lastDetection.trunkEstimate.y}
          r="5"
          fill="#10b981"
        />
      </svg>

      {/* Detection Label */}
      <div
        className="absolute bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-semibold"
        style={{
          left: `${(bbox.x / video.videoWidth) * 100}%`,
          top: `${(bbox.y / video.videoHeight) * 100}%`,
          transform: 'translate(-50%, -100%) translateY(-10px)'
        }}
      >
        🚗 {lastDetection.class.toUpperCase()} {(lastDetection.confidence * 100).toFixed(0)}%
      </div>

      {/* Trunk Placement Hint */}
      <div
        className="absolute bg-green-500/90 text-white px-3 py-1 rounded-lg text-xs font-semibold"
        style={{
          left: `${(lastDetection.trunkEstimate.x / video.videoWidth) * 100}%`,
          top: `${(lastDetection.trunkEstimate.y / video.videoHeight) * 100}%`,
          transform: 'translate(-50%, -100%) translateY(-30px)'
        }}
      >
        📍 Tap here to place
      </div>
    </div>
  );
};

export default CarDetector;
