import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Platform, Text, TouchableOpacity, UIManager, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CollapsibleSection = ({
  title,
  defaultExpanded = false,
  expanded: expandedProp,
  onToggle,
  rightSummary,
  children,
}) => {
  const [expandedState, setExpandedState] = useState(defaultExpanded);
  const expanded = typeof expandedProp === 'boolean' ? expandedProp : expandedState;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle?.(!expanded);
    if (typeof expandedProp !== 'boolean') {
      setExpandedState((v) => !v);
    }
  };

  const chevron = useMemo(() => (expanded ? 'chevron-up' : 'chevron-down'), [expanded]);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.right}>
          {rightSummary ? <Text style={styles.summary}>{rightSummary}</Text> : null}
          <Ionicons name={chevron} size={18} color={theme.colors.text.tertiary} />
        </View>
      </TouchableOpacity>

      {expanded ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.secondary[700],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  summary: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
});

export default CollapsibleSection;
