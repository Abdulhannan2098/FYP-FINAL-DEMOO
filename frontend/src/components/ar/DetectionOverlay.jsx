/**
 * Detection Overlay Component
 *
 * Displays visual feedback for vehicle detection:
 * - Bounding box around detected vehicle
 * - Placement hints based on product type
 * - Confidence score
 * - Instructions
 */

import { useEffect, useRef } from 'react';

const DetectionOverlay = ({ detectionResult, videoSize, productType }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !detectionResult || !detectionResult.detected) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detectionResult.boundingBox) return;

    const [x, y, width, height] = detectionResult.boundingBox;
    const { placementHint } = detectionResult;

    // Draw vehicle bounding box (green)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);

    // Draw vehicle label
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x, y - 30, 200, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(
      `${detectionResult.vehicleType} (${detectionResult.confidence}%)`,
      x + 10,
      y - 8
    );

    // Draw placement hint if available
    if (placementHint) {
      const hintX = placementHint.x * videoSize.width;
      const hintY = placementHint.y * videoSize.height;

      // Draw crosshair at placement location
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(hintX - 30, hintY);
      ctx.lineTo(hintX + 30, hintY);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hintX, hintY - 30);
      ctx.lineTo(hintX, hintY + 30);
      ctx.stroke();

      // Draw circle
      ctx.beginPath();
      ctx.arc(hintX, hintY, 20, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw placement label
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(hintX - 80, hintY + 35, 160, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(placementHint.label, hintX - 70, hintY + 55);
    }

  }, [detectionResult, videoSize]);

  if (!detectionResult) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Canvas for drawing detection boxes */}
      <canvas
        ref={canvasRef}
        width={videoSize.width}
        height={videoSize.height}
        className="absolute inset-0 w-full h-full"
      />

      {/* Detection Status Badge */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        {detectionResult.detected ? (
          <div className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-2xl flex items-center gap-2 animate-pulse">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Vehicle Detected ({detectionResult.confidence}%)
          </div>
        ) : (
          <div className="bg-yellow-600 text-white px-6 py-3 rounded-full font-semibold text-sm shadow-2xl flex items-center gap-2">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {detectionResult.message}
          </div>
        )}
      </div>

      {/* Instructions */}
      {detectionResult.detected && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-md rounded-xl p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Vehicle Detected! 🎯</h4>
              <p className="text-sm text-gray-300">
                Orange crosshair shows suggested {productType} placement.
                Tap screen to place the 3D model.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectionOverlay;
