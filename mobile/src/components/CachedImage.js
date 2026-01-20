import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../styles/theme';

const CachedImage = ({ uri, style, resizeMode = 'cover', placeholderSize = 32 }) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const source = useMemo(() => (uri ? { uri } : null), [uri]);

  useEffect(() => {
    let mounted = true;
    setError(false);
    setLoaded(false);
    fade.setValue(0);

    if (!uri) return;

    Image.prefetch(uri).catch(() => {
      // Prefetch is best-effort; actual render handles errors.
    });

    return () => {
      mounted = false;
      void mounted;
    };
  }, [fade, uri]);

  const onLoadEnd = () => {
    setLoaded(true);
    Animated.timing(fade, {
      toValue: 1,
      duration: 160,
      useNativeDriver: true,
    }).start();
  };

  if (!uri || error) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name="image-outline" size={placeholderSize} color={theme.colors.text.tertiary} />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      {!loaded ? (
        <View style={[StyleSheet.absoluteFillObject, styles.placeholder]}>
          <Ionicons name="image-outline" size={placeholderSize} color={theme.colors.text.tertiary} />
        </View>
      ) : null}

      <Animated.Image
        source={source}
        style={[StyleSheet.absoluteFillObject, { opacity: fade }]}
        resizeMode={resizeMode}
        onLoadEnd={onLoadEnd}
        onError={() => setError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: theme.colors.secondary[800],
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary[800],
  },
});

export default CachedImage;
