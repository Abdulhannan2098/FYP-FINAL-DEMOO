import { useEffect, useRef, useState } from 'react';
import '@google/model-viewer';

const ARViewer = ({ product, onClose }) => {
  const modelViewerRef = useRef(null);
  const [isARSupported, setIsARSupported] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [modelReady, setModelReady] = useState(false);

  // Popular spoiler colors
  const colors = [
    { name: 'Carbon Black', hex: '#1a1a1a', rgb: '26,26,26' },
    { name: 'Glossy Black', hex: '#000000', rgb: '0,0,0' },
    { name: 'Matte Black', hex: '#2b2b2b', rgb: '43,43,43' },
    { name: 'Silver', hex: '#c0c0c0', rgb: '192,192,192' },
    { name: 'Gunmetal', hex: '#5a5a5a', rgb: '90,90,90' },
    { name: 'Red', hex: '#dc2626', rgb: '220,38,38' },
    { name: 'Blue', hex: '#2563eb', rgb: '37,99,235' },
    { name: 'White', hex: '#ffffff', rgb: '255,255,255' },
  ];

  // Check AR support
  useEffect(() => {
    const checkARSupport = async () => {
      if (modelViewerRef.current) {
        try {
          const canAR = await modelViewerRef.current.canActivateAR;
          setIsARSupported(canAR);
          console.log('📱 AR Support:', canAR);
        } catch (err) {
          console.log('AR not supported on this device');
          setIsARSupported(false);
        }
      }
    };

    // Wait a bit for model-viewer to initialize
    const timer = setTimeout(checkARSupport, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleModelLoad = async () => {
    setLoading(false);
    setModelReady(true);
    console.log('✅ 3D Model loaded successfully');

    // Wait for model materials to be ready
    setTimeout(() => {
      if (modelViewerRef.current) {
        const modelViewer = modelViewerRef.current;
        console.log('🎨 Model-Viewer ready for color changes');
        console.log('Available materials:', modelViewer.model?.materials.length || 0);
      }
    }, 500);
  };

  const handleModelError = (error) => {
    setLoading(false);
    setError('Failed to load 3D model. Please check the model file.');
    console.error('❌ Model load error:', error);
  };

  const handleARStatus = (event) => {
    console.log('📱 AR Status:', event.detail.status);
  };

  // ENHANCED COLOR CHANGE - Changes ALL materials in the model
  const handleColorChange = (color) => {
    setSelectedColor(color);
    console.log(`🎨 Attempting to change color to: ${color.name} (${color.hex})`);

    if (!modelViewerRef.current) {
      console.error('❌ Model viewer ref not available');
      return;
    }

    const modelViewer = modelViewerRef.current;

    try {
      // Method 1: Using CSS custom property (works immediately)
      modelViewer.style.setProperty('--model-color', color.hex);

      // Method 2: Direct material manipulation for ALL materials
      if (modelViewer.model && modelViewer.model.materials) {
        const materials = modelViewer.model.materials;
        console.log(`Found ${materials.length} materials in model`);

        // Convert hex to normalized RGB [0-1]
        const r = parseInt(color.hex.slice(1, 3), 16) / 255;
        const g = parseInt(color.hex.slice(3, 5), 16) / 255;
        const b = parseInt(color.hex.slice(5, 7), 16) / 255;
        const colorArray = [r, g, b, 1];

        materials.forEach((material, index) => {
          try {
            console.log(`Material ${index} name: ${material.name || 'unnamed'}`);

            // Change PBR Metallic Roughness materials (most common)
            if (material.pbrMetallicRoughness) {
              material.pbrMetallicRoughness.setBaseColorFactor(colorArray);
              console.log(`✅ Material ${index} (PBR) color changed to ${color.name}`);
            }

            // Also try to set base color directly if available
            if (material.setBaseColorFactor) {
              material.setBaseColorFactor(colorArray);
              console.log(`✅ Material ${index} (Direct) color changed to ${color.name}`);
            }

            // For materials with albedoFactor (alternative property)
            if (material.albedoFactor) {
              material.albedoFactor = colorArray;
              console.log(`✅ Material ${index} (Albedo) color changed to ${color.name}`);
            }

            // Try accessing emissiveFactor for glowing parts
            if (material.emissiveFactor) {
              // Keep emissive for chrome/metallic parts
              console.log(`Material ${index} has emissive factor (metallic/chrome part)`);
            }

            // Force update the material
            if (material.update) {
              material.update();
            }

          } catch (err) {
            console.warn(`⚠️ Could not change material ${index}:`, err);
          }
        });

        // METHOD 3: Traverse scene graph and change ALL mesh materials
        try {
          const scene = modelViewer.model;
          if (scene) {
            console.log('🔍 Traversing scene graph to find all meshes...');
            let meshCount = 0;

            // Recursive function to traverse all nodes
            const traverseNode = (node) => {
              if (node.mesh) {
                meshCount++;
                const primitives = node.mesh.primitives;
                primitives.forEach((primitive, primIndex) => {
                  if (primitive.material && primitive.material.pbrMetallicRoughness) {
                    primitive.material.pbrMetallicRoughness.setBaseColorFactor(colorArray);
                    console.log(`✅ Mesh ${meshCount}, Primitive ${primIndex} color changed`);
                  }
                });
              }

              // Traverse children
              if (node.children) {
                node.children.forEach(child => traverseNode(child));
              }
            };

            // Start traversal from root
            traverseNode(scene);
            console.log(`✅ Traversed ${meshCount} meshes in scene graph`);
          }
        } catch (err) {
          console.warn('⚠️ Scene graph traversal failed:', err);
        }

        console.log(`✅ All materials updated to ${color.name}`);

        // Force model to re-render
        modelViewer.updateFraming();

      } else {
        console.warn('⚠️ Model materials not ready yet, using CSS fallback');
      }
    } catch (error) {
      console.error('❌ Failed to change color:', error);
    }
  };

  if (!product.model3D?.glbFile) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-surface rounded-2xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-text-primary mb-2">3D Model Not Available</h3>
          <p className="text-text-secondary mb-6">This product doesn't have a 3D model yet.</p>
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-surface/80 backdrop-blur-md border-b border-surface-light">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-700 to-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">{product.name}</h2>
            <p className="text-sm text-text-secondary">
              {isARSupported ? '📱 AR Ready - Tap button below' : '🖥️ 3D Preview Mode'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-surface-light rounded-lg transition-colors">
          <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Model Viewer */}
      <div className="flex-1 relative bg-gradient-to-b from-surface to-black">
        <model-viewer
          ref={modelViewerRef}
          src={product.model3D.glbFile}
          ios-src={product.model3D.usdzFile || product.model3D.glbFile}
          alt={product.name}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          auto-rotate
          shadow-intensity="1"
          environment-image="neutral"
          exposure="1"
          poster={product.model3D.thumbnailAR || product.images?.[0]}
          loading="eager"
          reveal="auto"
          ar-scale="auto"
          style={{
            width: '100%',
            height: '100%',
            '--poster-color': '#1a1a1a',
            '--model-color': selectedColor?.hex || '#1a1a1a'
          }}
        >
          {/* AR Button Slot */}
          {isARSupported && !loading && (
            <button
              slot="ar-button"
              className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary-700 to-primary-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-2xl shadow-primary-700/50 hover:shadow-primary-700/70 transition-all hover:scale-105 flex items-center gap-3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              View in Your Space
            </button>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div slot="poster" className="absolute inset-0 flex items-center justify-center bg-surface">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-text-secondary">Loading 3D Model...</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/90">
              <div className="text-center p-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-500 font-semibold mb-2">Model Load Error</p>
                <p className="text-text-secondary text-sm">{error}</p>
              </div>
            </div>
          )}
        </model-viewer>

        {/* Color Picker Button - HIGHLY VISIBLE */}
        {!loading && !error && (
          <button
            onClick={() => {
              console.log('🎨 Color picker button clicked!');
              setShowColorPicker(!showColorPicker);
            }}
            className="absolute top-4 right-4 bg-purple-600 hover:bg-purple-700 p-4 rounded-full border-2 border-white transition-all shadow-2xl z-50 animate-pulse"
            style={{ pointerEvents: 'auto' }}
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </button>
        )}

        {/* Color Picker Panel - WORKING VERSION */}
        {showColorPicker && !loading && !error && (
          <div className="absolute top-20 right-4 bg-white dark:bg-gray-900 rounded-2xl p-6 border-4 border-purple-500 shadow-2xl max-w-xs z-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Change Color
              </h4>
              <button
                onClick={() => setShowColorPicker(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {colors.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => handleColorChange(color)}
                  className={`group relative w-14 h-14 rounded-xl transition-all hover:scale-110 border-2 ${
                    selectedColor?.hex === color.hex
                      ? 'ring-4 ring-purple-500 ring-offset-2 border-white shadow-lg scale-105'
                      : 'border-gray-300 hover:border-purple-400 hover:shadow-md'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {selectedColor?.hex === color.hex && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-8 h-8 text-white drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-200 text-center">
                {selectedColor ? `✓ ${selectedColor.name}` : 'Tap a color to apply'}
              </p>
            </div>
          </div>
        )}

        {/* Instructions Panel */}
        {!loading && !error && (
          <div className="absolute bottom-4 left-4 right-4 bg-surface/90 backdrop-blur-md rounded-xl p-4 border border-surface-light">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-text-primary mb-2">Controls:</h4>
                <ul className="text-xs text-text-secondary space-y-1">
                  <li>• <strong>🎨 Color:</strong> Tap paint icon (top right)</li>
                  <li>• <strong>Rotate:</strong> Click and drag</li>
                  <li>• <strong>Zoom:</strong> Pinch or scroll</li>
                  <li>• <strong>Pan:</strong> Two-finger drag</li>
                  {isARSupported && (
                    <li className="text-primary-500 font-semibold mt-2">
                      • <strong>AR Mode:</strong> Tap "View in Your Space" button
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Event Listeners */}
      <div style={{ display: 'none' }}>
        <div
          ref={(el) => {
            if (el && modelViewerRef.current) {
              modelViewerRef.current.addEventListener('load', handleModelLoad);
              modelViewerRef.current.addEventListener('error', handleModelError);
              modelViewerRef.current.addEventListener('ar-status', handleARStatus);
            }
          }}
        />
      </div>
    </div>
  );
};

export default ARViewer;
