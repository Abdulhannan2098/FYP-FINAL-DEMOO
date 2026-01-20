/**
 * AR System Type Definitions
 *
 * Shared types used across the AR detection and placement system.
 * These types define the contract between detection, estimation, and rendering layers.
 */

/**
 * @typedef {Object} BoundingBox
 * @property {number} x - Normalized x coordinate (0-1)
 * @property {number} y - Normalized y coordinate (0-1)
 * @property {number} width - Normalized width (0-1)
 * @property {number} height - Normalized height (0-1)
 */

/**
 * @typedef {'side' | 'rear' | 'front' | 'angle'} ViewAngle
 */

/**
 * @typedef {Object} DetectionResult
 * @property {boolean} detected - Whether a car was detected
 * @property {number} confidence - Detection confidence (0-1)
 * @property {BoundingBox} [boundingBox] - Car bounding box if detected
 * @property {ViewAngle} [viewAngle] - Estimated view angle
 * @property {number} timestamp - Detection timestamp
 */

/**
 * @typedef {'trunk' | 'frontWheel' | 'rearWheel' | 'bonnet' | 'sideSkirt' | 'frontLeftWheel' | 'frontRightWheel' | 'rearLeftWheel' | 'rearRightWheel'} PartName
 */

/**
 * @typedef {Object} Point2D
 * @property {number} x - X coordinate (normalized 0-1)
 * @property {number} y - Y coordinate (normalized 0-1)
 */

/**
 * @typedef {Object} PartRegion
 * @property {PartName} name - Name of the car part
 * @property {Point2D} center - Center point of the part region
 * @property {BoundingBox} bounds - Bounding box of the part region
 * @property {'high' | 'medium' | 'low'} confidence - Estimation confidence
 */

/**
 * @typedef {'spoiler' | 'rim' | 'hood' | 'sideskirt' | 'bumper'} ProductType
 */

/**
 * @typedef {Object} Point3D
 * @property {number} x - X coordinate in 3D space
 * @property {number} y - Y coordinate in 3D space
 * @property {number} z - Z coordinate in 3D space
 */

/**
 * @typedef {Object} Rotation3D
 * @property {number} x - Rotation around X axis (radians)
 * @property {number} y - Rotation around Y axis (radians)
 * @property {number} z - Rotation around Z axis (radians)
 */

/**
 * @typedef {Object} Placement3D
 * @property {Point3D} position - 3D position
 * @property {Rotation3D} rotation - 3D rotation
 * @property {number} scale - Uniform scale factor
 */

/**
 * @typedef {Object} Dimensions3D
 * @property {number} length - Length in cm
 * @property {number} width - Width in cm
 * @property {number} height - Height in cm
 */

/**
 * @typedef {Object} ColorConfig
 * @property {string} name - Display name of the color
 * @property {string} hex - Hex color code
 * @property {number} [metallic] - Metallic factor (0-1)
 * @property {number} [roughness] - Roughness factor (0-1)
 * @property {string} [emissive] - Emissive color hex
 */

/**
 * @typedef {Object} PlacementGuide
 * @property {PartRegion} targetPart - Target part for placement
 * @property {string} label - Display label
 * @property {string} instructions - User instructions
 * @property {'high' | 'medium' | 'low'} confidence - Overall confidence
 */

/**
 * @typedef {Object} ARSessionState
 * @property {'initializing' | 'detecting' | 'placing' | 'adjusting' | 'error'} status
 * @property {string} [message] - Status message
 * @property {DetectionResult} [detection] - Latest detection result
 * @property {PlacementGuide} [guide] - Current placement guide
 * @property {Placement3D} [placement] - Current 3D placement
 */

// Export empty object for module resolution
export default {};
