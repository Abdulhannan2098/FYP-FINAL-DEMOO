/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'shadow-neon-red',
    'shadow-neon-red-strong',
    'shadow-inner-glow',
    'hover:shadow-neon-red',
    'hover:shadow-neon-red-strong',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Rajdhani', 'Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#FEE2E2',
          100: '#FECACA',
          200: '#FCA5A5',
          300: '#F87171',
          400: '#EF4444',
          500: '#B91C1C', // Deep Maroon Red - Primary CTA
          600: '#7F1D1D', // Darker Maroon - Hover
          700: '#6B0000', // Rich Deep Red
          800: '#4a0000', // Very Dark Red
          900: '#2B0000', // Almost Black Red
        },
        secondary: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5', // Light text
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717', // Main background
        },
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
        surface: {
          DEFAULT: '#1E1E1E', // Card background
          light: '#2A2A2A', // Elevated surfaces
          lighter: '#333333', // Hover states
        },
        text: {
          primary: '#E8E8E8', // Main text
          secondary: '#B3B3B3', // Secondary text
          tertiary: '#8A8A8A', // Muted text
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        'medium': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
        'strong': '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
        'neon-red': '0 0 20px rgba(185, 28, 28, 0.4), 0 0 40px rgba(185, 28, 28, 0.2)',
        'neon-red-strong': '0 0 30px rgba(185, 28, 28, 0.6), 0 0 60px rgba(185, 28, 28, 0.3)',
        'inner-glow': 'inset 0 0 50px rgba(185, 28, 28, 0.15)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(185, 28, 28, 0.3)',
      },
      letterSpacing: {
        tighter: '-0.05em',
        tight: '-0.025em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },
      lineHeight: {
        relaxed: '1.75',
        loose: '2',
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideIn: 'slideIn 0.3s ease-out',
        scaleIn: 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
