import React from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

const WINDOW_WIDTH = Dimensions.get('window').width;

const SkeletonContext = React.createContext({
  backgroundColor: '#E1E9EE',
  borderRadius: undefined,
  mode: 'content', // 'content' | 'mask'
});

const toTransparent = (color) => {
  if (typeof color !== 'string') return 'transparent';
  const c = color.trim();

  if (c.startsWith('#')) {
    const hex = c.slice(1);
    const normalized = hex.length === 3
      ? hex.split('').map((ch) => ch + ch).join('')
      : hex;

    if (normalized.length === 6) {
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
        return `rgba(${r}, ${g}, ${b}, 0)`;
      }
    }

    return 'transparent';
  }

  if (c.startsWith('rgba(')) {
    const parts = c.slice(5, -1).split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 0)`;
    }
  }

  if (c.startsWith('rgb(')) {
    const parts = c.slice(4, -1).split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, 0)`;
    }
  }

  return 'transparent';
};

const SkeletonPlaceholderItem = ({ children, style, ...styleFromProps }) => {
  const { backgroundColor, borderRadius, mode } = React.useContext(SkeletonContext);

  const hasChildren = React.Children.count(children) > 0;
  const isLeaf = !hasChildren;

  const resolvedStyle = style ? [style, styleFromProps] : styleFromProps;

  if (!isLeaf) {
    return <View style={resolvedStyle}>{children}</View>;
  }

  const leafBackgroundColor = mode === 'mask' ? '#000000' : backgroundColor;

  const radiusFromStyle =
    (Array.isArray(resolvedStyle)
      ? resolvedStyle.find((s) => s && typeof s === 'object' && 'borderRadius' in s)?.borderRadius
      : resolvedStyle?.borderRadius);

  const resolvedBorderRadius =
    typeof styleFromProps.borderRadius === 'number'
      ? styleFromProps.borderRadius
      : typeof radiusFromStyle === 'number'
        ? radiusFromStyle
        : typeof borderRadius === 'number'
          ? borderRadius
          : 0;

  return (
    <View
      style={[
        resolvedStyle,
        {
          backgroundColor: leafBackgroundColor,
          borderRadius: resolvedBorderRadius,
        },
      ]}
    />
  );
};

const SkeletonPlaceholder = ({
  children,
  enabled = true,
  backgroundColor = '#E1E9EE',
  highlightColor = '#F2F8FC',
  speed = 800,
  direction = 'right',
  borderRadius,
  shimmerWidth,
}) => {
  const [layout, setLayout] = React.useState(null);
  const animatedValueRef = React.useRef(new Animated.Value(0));

  const isAnimationReady = Boolean(
    enabled &&
      speed &&
      layout?.width &&
      layout?.height
  );

  React.useEffect(() => {
    if (!isAnimationReady) return;

    const loop = Animated.loop(
      Animated.timing(animatedValueRef.current, {
        toValue: 1,
        duration: speed,
        easing: Easing.ease,
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [isAnimationReady, speed]);

  const animationWidth = WINDOW_WIDTH + (shimmerWidth ?? 0);

  const animatedGradientStyle = React.useMemo(() => {
    return {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      transform: [
        {
          translateX: animatedValueRef.current.interpolate({
            inputRange: [0, 1],
            outputRange:
              direction === 'right'
                ? [-animationWidth, animationWidth]
                : [animationWidth, -animationWidth],
          }),
        },
      ],
    };
  }, [animationWidth, direction]);

  if (!enabled) return children;

  const transparentColor = toTransparent(highlightColor);
  const gradientWidth = shimmerWidth ?? WINDOW_WIDTH;

  const content = (
    <SkeletonContext.Provider value={{ backgroundColor, borderRadius, mode: 'content' }}>
      <View style={styles.placeholderContainer}>{children}</View>
    </SkeletonContext.Provider>
  );

  const mask = (
    <SkeletonContext.Provider value={{ backgroundColor, borderRadius, mode: 'mask' }}>
      <View style={styles.placeholderContainer}>{children}</View>
    </SkeletonContext.Provider>
  );

  if (!layout?.width || !layout?.height) {
    return (
      <View onLayout={(event) => setLayout(event.nativeEvent.layout)}>
        {content}
      </View>
    );
  }

  return (
    <MaskedView style={{ width: layout.width, height: layout.height }} maskElement={mask}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor }]} />

      {isAnimationReady && (
        <Animated.View style={animatedGradientStyle}>
          <LinearGradient
            colors={[transparentColor, highlightColor, transparentColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFillObject, { width: gradientWidth }]}
          />
        </Animated.View>
      )}
    </MaskedView>
  );
};

SkeletonPlaceholder.Item = SkeletonPlaceholderItem;

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: 'transparent',
  },
});

export default SkeletonPlaceholder;
