/**
 * Car Part Detection Overlay Component
 *
 * Displays visual feedback for car-specific part detection:
 * - Car bounding box
 * - Specific part highlighting (trunk, wheels, bonnet, side skirts)
 * - Placement crosshair with part label
 * - Detection confidence
 * - Car view orientation
 */

import { useEffect, useRef } from 'react';

const CarPartOverlay = ({ detectionResult, videoSize }) => {
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
    const { carParts, placement, carView } = detectionResult;

    // 1. Draw main car bounding box (green)
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Draw car label
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(x, y - 35, 250, 35);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(
      `🚗 Car (${detectionResult.confidence}%) - ${carView.toUpperCase()}`,
      x + 10,
      y - 10
    );

    // 2. Draw detected car parts (semi-transparent boxes)
    if (carParts) {
      Object.entries(carParts).forEach(([partName, part]) => {
        if (!part.x) return;

        // Different colors for different parts
        let partColor = '#3b82f6'; // default blue
        if (partName.includes('trunk')) partColor = '#f59e0b'; // orange
        if (partName.includes('wheel')) partColor = '#8b5cf6'; // purple
        if (partName.includes('bonnet')) partColor = '#10b981'; // green
        if (partName.includes('skirt')) partColor = '#ec4899'; // pink

        // Draw semi-transparent box
        ctx.strokeStyle = partColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line
        ctx.strokeRect(part.x, part.y, part.width, part.height);

        // Draw part label
        ctx.setLineDash([]); // Reset
        ctx.fillStyle = partColor;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(part.center.x - 40, part.center.y - 15, 80, 25);
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(partName.toUpperCase(), part.center.x, part.center.y + 2);
        ctx.textAlign = 'left';
      });
    }

    // 3. Draw target placement (large crosshair + circle)
    if (placement && placement.rawPosition) {
      const targetX = placement.rawPosition.x;
      const targetY = placement.rawPosition.y;

      // Pulsing effect color based on confidence
      let targetColor = '#f59e0b'; // orange
      if (placement.confidence === 'very-high') targetColor = '#22c55e'; // green
      if (placement.confidence === 'high') targetColor = '#10b981'; // lighter green
      if (placement.confidence === 'low') targetColor = '#ef4444'; // red

      ctx.strokeStyle = targetColor;
      ctx.lineWidth = 4;
      ctx.setLineDash([]);

      // Draw large crosshair
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(targetX - 50, targetY);
      ctx.lineTo(targetX + 50, targetY);
      ctx.stroke();

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(targetX, targetY - 50);
      ctx.lineTo(targetX, targetY + 50);
      ctx.stroke();

      // Draw outer circle
      ctx.beginPath();
      ctx.arc(targetX, targetY, 35, 0, 2 * Math.PI);
      ctx.stroke();

      // Draw inner circle (filled)
      ctx.fillStyle = targetColor;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(targetX, targetY, 10, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Draw placement label (below crosshair)
      const labelWidth = ctx.measureText(placement.label).width + 30;
      ctx.fillStyle = targetColor;
      ctx.fillRect(targetX - labelWidth / 2, targetY + 50, labelWidth, 35);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(placement.label, targetX, targetY + 72);

      // Draw instructions (below label)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      const instructWidth = ctx.measureText(placement.instructions).width + 30;
      ctx.fillRect(targetX - instructWidth / 2, targetY + 90, instructWidth, 30);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.fillText(placement.instructions, targetX, targetY + 108);
      ctx.textAlign = 'left';

      // Draw bounding box around target part if available
      if (placement.boundingBox) {
        const bbox = placement.boundingBox;
        ctx.strokeStyle = targetColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
      }
    }

  }, [detectionResult, videoSize]);

  if (!detectionResult) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Canvas for drawing detection boxes */}
      <canvas
        ref={canvasRef}
        width={videoSize.width}
        height={videoSize.height}
        className="absolute inset-0 w-full h-full"
      />

      {/* Top Status Badge */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-40">
        {detectionResult.detected ? (
          <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-6 py-3 rounded-full font-bold text-base shadow-2xl flex items-center gap-3 animate-pulse">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Car Detected - {detectionResult.carView.toUpperCase()} VIEW</span>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white px-6 py-3 rounded-full font-bold text-base shadow-2xl flex items-center gap-3">
            <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>{detectionResult.message}</span>
          </div>
        )}
      </div>

      {/* Confidence Indicator */}
      {detectionResult.detected && detectionResult.placement && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40">
          <div className={`px-5 py-2 rounded-full font-semibold text-sm shadow-xl ${
            detectionResult.placement.confidence === 'very-high' ? 'bg-green-600' :
            detectionResult.placement.confidence === 'high' ? 'bg-emerald-600' :
            detectionResult.placement.confidence === 'medium' ? 'bg-orange-500' :
            'bg-red-500'
          } text-white`}>
            Placement Confidence: {detectionResult.placement.confidence.toUpperCase()}
          </div>
        </div>
      )}

      {/* Bottom Instructions Panel */}
      {detectionResult.detected && detectionResult.placement && (
        <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-xl rounded-2xl p-5 text-white shadow-2xl border-2 border-green-500/50 z-40">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-lg mb-2 text-green-400">
                🎯 {detectionResult.placement.label} Detected!
              </h4>
              <p className="text-base text-gray-200 mb-3">
                {detectionResult.placement.instructions}
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                Tap screen at the crosshair to place your {detectionResult.productType}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Part Legend (optional - shown in corner) */}
      {detectionResult.detected && detectionResult.carParts && Object.keys(detectionResult.carParts).length > 0 && (
        <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md rounded-xl p-3 text-white text-xs z-40 max-w-[200px]">
          <div className="font-bold mb-2 text-sm">Detected Parts:</div>
          <div className="space-y-1">
            {Object.keys(detectionResult.carParts).slice(0, 5).map((partName, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  partName.includes('trunk') ? 'bg-orange-500' :
                  partName.includes('wheel') ? 'bg-purple-500' :
                  partName.includes('bonnet') ? 'bg-green-500' :
                  partName.includes('skirt') ? 'bg-pink-500' :
                  'bg-blue-500'
                }`}></div>
                <span className="capitalize">{partName.replace(/([A-Z])/g, ' $1').trim()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarPartOverlay;
