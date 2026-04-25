import { PRODUCT_CATEGORIES, CATEGORY_PLACEHOLDERS, getPlaceholderImage, HERO_SLIDES } from '../utils/constants.js';

describe('Constants', () => {
  describe('PRODUCT_CATEGORIES', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(PRODUCT_CATEGORIES)).toBe(true);
      expect(PRODUCT_CATEGORIES.length).toBeGreaterThan(0);
      PRODUCT_CATEGORIES.forEach(category => {
        expect(typeof category).toBe('string');
        expect(category.length).toBeGreaterThan(0);
      });
    });
  });

  describe('CATEGORY_PLACEHOLDERS', () => {
    it('should have placeholders for all categories', () => {
      expect(typeof CATEGORY_PLACEHOLDERS).toBe('object');
      PRODUCT_CATEGORIES.forEach(category => {
        expect(CATEGORY_PLACEHOLDERS).toHaveProperty(category);
        expect(typeof CATEGORY_PLACEHOLDERS[category]).toBe('string');
        expect(CATEGORY_PLACEHOLDERS[category]).toMatch(/^https?:\/\//);
      });
    });
  });

  describe('getPlaceholderImage', () => {
    it('returns correct placeholder for valid category', () => {
      const category = 'LED Lights';
      const result = getPlaceholderImage(category);
      expect(result).toBe(CATEGORY_PLACEHOLDERS[category]);
    });

    it('returns default placeholder for invalid category', () => {
      const result = getPlaceholderImage('Invalid Category');
      expect(result).toBe('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop');
    });

    it('returns default placeholder for empty category', () => {
      const result = getPlaceholderImage('');
      expect(result).toBe('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop');
    });
  });

  describe('HERO_SLIDES', () => {
    it('should be an array of slide objects', () => {
      expect(Array.isArray(HERO_SLIDES)).toBe(true);
      expect(HERO_SLIDES.length).toBeGreaterThan(0);
    });

    it('each slide should have required properties', () => {
      HERO_SLIDES.forEach(slide => {
        expect(slide).toHaveProperty('id');
        expect(slide).toHaveProperty('image');
        expect(slide).toHaveProperty('title');
        expect(slide).toHaveProperty('subtitle');
        expect(slide).toHaveProperty('cta');
        expect(slide).toHaveProperty('link');

        expect(typeof slide.id).toBe('number');
        expect(typeof slide.image).toBe('string');
        expect(typeof slide.title).toBe('string');
        expect(typeof slide.subtitle).toBe('string');
        expect(typeof slide.cta).toBe('string');
        expect(typeof slide.link).toBe('string');
      });
    });

    it('slide images should be valid URLs', () => {
      HERO_SLIDES.forEach(slide => {
        expect(slide.image).toMatch(/^https?:\/\//);
      });
    });

    it('slide links should be valid paths', () => {
      HERO_SLIDES.forEach(slide => {
        expect(slide.link).toMatch(/^\/products\?category=/);
      });
    });
  });
});