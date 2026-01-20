// Product Categories for Automotive Aftermarket Modifications
export const PRODUCT_CATEGORIES = [
  'Rims & Wheels',
  'Spoilers',
  'Body Kits',
  'Hoods',
  'LED Lights',
  'Body Wraps / Skins',
  'Exhaust Systems',
  'Interior Accessories',
];

// Category Placeholder Images
export const CATEGORY_PLACEHOLDERS = {
  'Rims & Wheels': 'https://images.unsplash.com/photo-1513267048331-5611cad62e41?w=400&h=300&fit=crop',
  'Spoilers': 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=400&h=300&fit=crop',
  'Body Kits': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
  'Hoods': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
  'LED Lights': 'https://images.unsplash.com/photo-1469285994282-454ceb49e63c?w=400&h=300&fit=crop',
  'Body Wraps / Skins': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
  'Exhaust Systems': 'https://images.unsplash.com/photo-1486006920555-c77dcf18193b?w=400&h=300&fit=crop',
  'Interior Accessories': 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?w=400&h=300&fit=crop',
};

// Get placeholder image for a category
export const getPlaceholderImage = (category) => {
  return CATEGORY_PLACEHOLDERS[category] || 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop';
};

// Hero Slider Images
export const HERO_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&h=800&fit=crop',
    title: 'Upgrade Your Ride',
    subtitle: 'Premium aftermarket parts for the ultimate performance',
    cta: 'Explore Rims',
    link: '/products?category=Rims & Wheels',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1469285994282-454ceb49e63c?w=1920&h=800&fit=crop',
    title: 'Unleash the Power',
    subtitle: 'Transform your vehicle with custom body kits & modifications',
    cta: 'Shop Body Kits',
    link: '/products?category=Body Kits',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&h=800&fit=crop',
    title: 'Stand Out in Style',
    subtitle: 'LED lighting solutions that turn heads',
    cta: 'Discover LEDs',
    link: '/products?category=LED Lights',
  },
];
