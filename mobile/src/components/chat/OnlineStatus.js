import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../../styles/theme';

const OnlineStatus = ({ isOnline, size = 'md' }) => {
  const sizeStyles = {
    sm: { width: 8, height: 8 },
    md: { width: 10, height: 10 },
    lg: { width: 12, height: 12 },
  };

  return (
    <View
      style={[
        styles.indicator,
        sizeStyles[size],
        { backgroundColor: isOnline ? theme.colors.success : theme.colors.text.tertiary },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  indicator: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
  },
});

export default OnlineStatus;
