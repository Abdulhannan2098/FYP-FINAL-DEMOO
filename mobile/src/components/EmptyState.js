import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';
import Button from './Button';

const EmptyState = ({ title, message, actionLabel, onAction, icon }) => {
  return (
    <View style={styles.container}>
      {/* Icon Container */}
      {icon && (
        <View style={styles.iconContainer}>
          {typeof icon === 'string' ? (
            <Ionicons name={icon} size={64} color={theme.colors.text.secondary} />
          ) : (
            icon
          )}
        </View>
      )}

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.button}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing['3xl'],
    backgroundColor: theme.colors.secondary[900],
  },
  iconContainer: {
    marginBottom: theme.spacing['2xl'],
    opacity: 0.3,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['3xl'],
    maxWidth: 300,
    lineHeight: 24,
  },
  button: {
    marginTop: theme.spacing.lg,
    minWidth: 200,
  },
});

export default EmptyState;
