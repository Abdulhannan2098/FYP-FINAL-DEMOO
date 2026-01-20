import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../styles/theme';

const StickyBottomBar = ({
  children,
  paddingHorizontal = theme.spacing.lg,
  containerStyle,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + theme.spacing.md,
          paddingHorizontal,
        },
        containerStyle,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.secondary[900],
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary[700],
    paddingTop: theme.spacing.md,
  },
});

export default StickyBottomBar;
