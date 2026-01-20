# Accurate AR Preview System

## Overview

This AR module provides intelligent car accessory placement for the car accessories marketplace. It replaces the previous basic AR implementation with smart car detection and accurate part estimation.

## Features

- **Car Detection**: Real-time car detection using MediaPipe Object Detector (with COCO-SSD fallback)
- **Part Estimation**: Geometric algorithms to identify trunk, wheels, hood, and side panels
- **Color Customization**: Real-time material color changes without model reload
- **Manual Fallback**: Drag-to-position when auto-detection fails
- **Cross-Platform**: Works on Web, Android, and iOS

## Architecture

```
ar/
├── core/                    # Shared logic (platform-agnostic)
│   ├── CarDetector.js      # MediaPipe/COCO-SSD car detection
│   ├── PartEstimator.js    # Geometric part region calculation
│   ├── PlacementEngine.js  # 2D to 3D coordinate transformation
│   ├── ColorManager.js     # Material color manipulation
│   ├── constants.js        # Configuration and color palette
│   ├── types.js            # Type definitions (JSDoc)
│   └── index.js            # Core module exports
│
├── components/              # React components
│   ├── AccurateARViewer.jsx    # Main AR viewer (replaces AdvancedARViewer)
│   ├── PlacementGuide.jsx      # Visual overlay for detection results
│   └── ColorPicker.jsx         # Color selection panel
│
└── index.js                 # Public API exports
```

## Usage

### Web (React)

```jsx
import { AccurateARViewer } from '../ar';

// In your component
{showARViewer && (
  <AccurateARViewer
    product={product}
    onClose={() => setShowARViewer(false)}
  />
)}
```

### Mobile (React Native)

```jsx
import { ARViewerScreen } from '../ar';

// In navigation
<Stack.Screen name="ARViewer" component={ARViewerScreen} />

// Navigate to AR
navigation.navigate('ARViewer', { product });
```

## Detection Flow

1. **Initialization**: Load MediaPipe Object Detector model
2. **Detection Loop**: Analyze camera frames at 5 FPS
3. **View Analysis**: Determine if car is viewed from side, front, rear, or angle
4. **Part Estimation**: Calculate bounding boxes for trunk, wheels, hood based on car proportions
5. **Placement Guide**: Show overlay indicating where accessory will be placed
6. **3D Placement**: Convert 2D coordinates to 3D model position

## Supported Product Types

| Product Type | Target Part | Best View |
|-------------|-------------|-----------|
| Spoiler | Trunk | Rear/Side |
| Rim/Wheel | Wheel | Side |
| Hood | Bonnet | Front/Angle |
| Side Skirt | Lower Side | Side |
| Bumper | Front/Rear Bumper | Front/Rear |

## Color System

Colors are defined in `constants.js` with automotive-grade finishes:

- **Metallic**: High metalness (0.8+), low roughness
- **Glossy**: Low metalness, low roughness
- **Matte**: Low metalness, high roughness (0.6+)

## Performance

- Detection runs at 5 FPS max to save battery
- Bounding box smoothing (EMA) reduces jitter
- Model loading uses lazy initialization
- Memory cleanup on component unmount

## Reverting Changes

If issues arise, revert to the baseline commit:

```bash
git checkout feature/accurate-ar-system~1 -- frontend/src/pages/ProductDetail.jsx
git checkout feature/accurate-ar-system~1 -- mobile/src/screens/customer/ProductDetailScreen.js
```

Or switch to the previous import:

```jsx
// Revert to old AR viewer
import AdvancedARViewer from '../components/ar/AdvancedARViewer';
```

## Known Limitations

1. **No depth sensing**: Placement assumes flat car surfaces
2. **Single car**: Only the largest detected car is used
3. **Lighting sensitive**: Dark conditions may cause detection failures
4. **Generic part estimation**: Parts are calculated, not ML-detected

## Future Improvements

1. Custom ML model for car part segmentation
2. Multi-car detection and selection
3. AR anchor persistence
4. Real-time shadow rendering
