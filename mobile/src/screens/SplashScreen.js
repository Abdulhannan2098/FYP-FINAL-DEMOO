import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import theme from '../styles/theme';

const SplashScreen = ({ onFinish, navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { isLoading } = useAuth();
  const [didFinishAnimation, setDidFinishAnimation] = useState(false);

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Pulse animation for the logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Auto navigate after 2 seconds
    const timer = setTimeout(() => {
      setDidFinishAnimation(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!didFinishAnimation) return;
    if (isLoading) return;

    if (navigation?.replace) {
      navigation.replace('Main');
      return;
    }

    if (onFinish) {
      onFinish();
    }
  }, [didFinishAnimation, isLoading, navigation, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Logo Icon with Red Gradient Background */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="car-sport" size={80} color="#FFFFFF" />
          </View>
        </View>

        {/* App Name */}
        <Text style={styles.appName}>AutoSphere</Text>
        <Text style={styles.tagline}>Premium Auto Parts & Modifications</Text>
      </Animated.View>

      {/* Red gradient glow effect at bottom */}
      <View style={styles.gradientGlow} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.secondary[900], // #171717
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: theme.spacing['3xl'],
  },
  logoIcon: {
    width: 140,
    height: 140,
    backgroundColor: theme.colors.primary[500], // #B91C1C
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.neonRed,
    // Add gradient-like effect with multiple shadows
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  appName: {
    fontSize: theme.typography.fontSize['4xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary, // #E8E8E8
    marginBottom: theme.spacing.sm,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary, // #B3B3B3
    fontWeight: theme.typography.fontWeight.medium,
    letterSpacing: 0.5,
  },
  gradientGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: theme.colors.primary[500],
    opacity: 0.1,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
});

export default SplashScreen;
