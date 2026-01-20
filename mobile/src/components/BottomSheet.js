import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../styles/theme';

const SHEET_ANIM_MS = 220;

const BottomSheet = ({
  visible,
  onClose,
  children,
  height = 520,
  dismissThreshold = 120,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(height)).current;

  const panResponder = useMemo(() => {
    let startY = 0;

    return {
      onStartShouldSetResponder: () => true,
      onMoveShouldSetResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onResponderGrant: () => {
        translateY.stopAnimation((value) => {
          startY = value;
        });
      },
      onResponderMove: (_, gesture) => {
        const next = Math.max(0, startY + gesture.dy);
        translateY.setValue(next);
      },
      onResponderRelease: (_, gesture) => {
        const shouldClose = gesture.dy > dismissThreshold;
        if (shouldClose) {
          Animated.timing(translateY, {
            toValue: height,
            duration: SHEET_ANIM_MS,
            useNativeDriver: true,
          }).start(() => {
            onClose?.();
          });
          return;
        }

        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
        }).start();
      },
    };
  }, [dismissThreshold, height, onClose, translateY]);

  useEffect(() => {
    if (!visible) {
      translateY.setValue(height);
      return;
    }

    Animated.timing(translateY, {
      toValue: 0,
      duration: SHEET_ANIM_MS,
      useNativeDriver: true,
    }).start();
  }, [height, translateY, visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              height,
              paddingBottom: insets.bottom + theme.spacing.lg,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderColor: theme.colors.secondary[700],
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.secondary[600],
    marginBottom: theme.spacing.md,
  },
});

export default BottomSheet;
