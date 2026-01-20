/**
 * AutoSphere Mobile App Theme
 * Matches the web app design system from tailwind.config.js
 */

export const colors = {
  // Primary - Deep Maroon Red
  primary: {
    50: '#FEE2E2',
    100: '#FECACA',
    200: '#FCA5A5',
    300: '#F87171',
    400: '#EF4444',
    500: '#B91C1C', // Main CTA color
    600: '#7F1D1D', // Hover state
    700: '#6B0000',
    800: '#4a0000',
    900: '#2B0000',
  },

  // Secondary - Blacks and Grays
  secondary: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717', // Main background
  },

  // Dark theme
  dark: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Background colors
  background: {
    primary: '#171717', // Main background (secondary.900)
    secondary: '#1E1E1E', // Secondary background
  },

  // Surface colors
  surface: '#1E1E1E', // Card background

  // Text colors
  text: {
    primary: '#E8E8E8', // Main text
    secondary: '#B3B3B3', // Secondary text
    tertiary: '#8A8A8A', // Muted text
  },

  // Brand color shorthand (do NOT overwrite primary palette)
  brand: {
    main: '#B91C1C', // Main CTA color
    hover: '#7F1D1D', // Hover state
  },

  // Semantic colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
};

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
    display: 'System', // In web it's Rajdhani, using system for mobile
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16, // Added md as alias for base
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  neonRed: {
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
};

// Export as default for easier importing
export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
