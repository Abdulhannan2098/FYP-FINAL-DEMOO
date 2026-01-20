import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import theme from '../styles/theme';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  };

  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    textStyle,
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={buttonStyles}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' ? '#FFFFFF' : theme.colors.primary[500]}
          />
        ) : (
          <>
            {icon && icon}
            <Text style={textStyles}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing['2xl'],
  },
  // Variants
  primary: {
    backgroundColor: theme.colors.primary[500],
    ...theme.shadows.medium,
    elevation: 4,
    shadowColor: theme.colors.primary[500],
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary[500],
    ...theme.shadows.soft,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.text.tertiary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: theme.colors.error,
    ...theme.shadows.medium,
    elevation: 3,
  },
  // Sizes
  small: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  medium: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing['2xl'],
  },
  large: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing['3xl'],
  },
  // Disabled
  disabled: {
    opacity: 0.5,
  },
  // Text
  text: {
    fontWeight: theme.typography.fontWeight.bold,
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
  },
  secondaryText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.base,
  },
  outlineText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.base,
  },
  ghostText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.base,
  },
  dangerText: {
    color: '#FFFFFF',
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
  },
  smallText: {
    fontSize: theme.typography.fontSize.sm,
  },
  mediumText: {
    fontSize: theme.typography.fontSize.base,
  },
  largeText: {
    fontSize: theme.typography.fontSize.lg,
  },
});

export default Button;
