import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import theme from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HERO_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&h=800&fit=crop',
    title: 'Upgrade Your Ride',
    subtitle: 'Premium aftermarket parts for the ultimate performance',
    cta: 'Explore Rims',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1469285994282-454ceb49e63c?w=1920&h=800&fit=crop',
    title: 'Unleash the Power',
    subtitle: 'Transform your vehicle with custom body kits & modifications',
    cta: 'Shop Body Kits',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920&h=800&fit=crop',
    title: 'Stand Out in Style',
    subtitle: 'LED lighting solutions that turn heads',
    cta: 'Discover LEDs',
  },
];

const HeroSlider = ({ onSlidePress }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);

  // Auto-scroll effect
  useEffect(() => {
    const timer = setInterval(() => {
      const nextSlide = (currentSlide + 1) % HERO_SLIDES.length;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        animated: true,
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [currentSlide]);

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentSlide(slideIndex);
  };

  const handleCTAPress = (slide) => {
    if (onSlidePress) {
      onSlidePress(slide);
    }
  };

  return (
    <View style={styles.container}>
      {/* Horizontal ScrollView for slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {HERO_SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>
            {/* Background Image */}
            <Image
              source={{ uri: slide.image }}
              style={styles.backgroundImage}
              resizeMode="cover"
            />

            {/* Dark Overlay */}
            <View style={styles.overlay} />

            {/* Red Gradient Overlay Effect */}
            <View style={styles.redGradient} />

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.subtitle}>{slide.subtitle}</Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => handleCTAPress(slide)}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaText}>{slide.cta}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Slide Indicators */}
      <View style={styles.indicatorContainer}>
        {HERO_SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentSlide ? styles.indicatorActive : styles.indicatorInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 400,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: 400,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  redGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(139, 0, 0, 0.15)',
  },
  content: {
    paddingHorizontal: theme.spacing['3xl'],
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.secondary[200],
    textAlign: 'center',
    marginBottom: theme.spacing['2xl'],
    maxWidth: 350,
    lineHeight: 26,
  },
  ctaButton: {
    backgroundColor: theme.colors.primary[500],
    paddingHorizontal: theme.spacing['3xl'],
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.neonRed,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    letterSpacing: 0.5,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: theme.spacing['2xl'],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  indicator: {
    height: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorInactive: {
    width: 12,
  },
  indicatorActive: {
    width: 32,
    backgroundColor: theme.colors.primary[500],
    ...theme.shadows.neonRed,
  },
});

export default HeroSlider;
