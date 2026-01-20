/**
 * AR Viewer Screen for React Native
 *
 * Full-screen AR experience for viewing car accessories.
 * Uses expo-camera for camera access and WebView for 3D model rendering.
 *
 * Features:
 * - Camera-based AR preview
 * - Model viewing via WebView (model-viewer)
 * - Color customization
 * - Manual placement mode
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Modal,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTOMOTIVE_COLORS, UI_MESSAGES, getProductType } from '../core/index.js';
import theme from '../../styles/theme.js';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * ARViewerScreen Component
 */
const ARViewerScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(UI_MESSAGES.loadingModel);
  const [selectedColor, setSelectedColor] = useState(AUTOMOTIVE_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);

  const productType = getProductType(product);
  const has3DModel = product?.model3D?.glbFile;

  // Handle WebView messages
  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'model-loaded') {
        setIsModelReady(true);
        setIsLoading(false);
      } else if (data.type === 'ar-status') {
        console.log('AR Status:', data.status);
      } else if (data.type === 'error') {
        Alert.alert('Error', data.message || 'Failed to load model');
        setIsLoading(false);
      }
    } catch (e) {
      console.log('WebView message:', event.nativeEvent.data);
    }
  }, []);

  // Apply color to model via WebView
  const applyColor = useCallback((color) => {
    setSelectedColor(color);
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        (function() {
          const mv = document.querySelector('model-viewer');
          if (mv && mv.model && mv.model.materials) {
            const r = parseInt('${color.hex}'.slice(1, 3), 16) / 255;
            const g = parseInt('${color.hex}'.slice(3, 5), 16) / 255;
            const b = parseInt('${color.hex}'.slice(5, 7), 16) / 255;
            mv.model.materials.forEach(m => {
              if (m.pbrMetallicRoughness) {
                m.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
                if (${color.metallic || 0} > 0) {
                  m.pbrMetallicRoughness.setMetallicFactor(${color.metallic || 0.5});
                }
                if (${color.roughness || 0} > 0) {
                  m.pbrMetallicRoughness.setRoughnessFactor(${color.roughness || 0.5});
                }
              }
            });
          }
        })();
        true;
      `);
    }
  }, []);

  // Trigger native AR (Scene Viewer / Quick Look)
  const openNativeAR = useCallback(() => {
    const modelUrl = product.model3D?.glbFile;
    const usdzUrl = product.model3D?.usdzFile;

    if (Platform.OS === 'ios' && usdzUrl) {
      // iOS: Open Quick Look
      Linking.openURL(usdzUrl).catch(() => {
        Alert.alert('AR Not Available', 'Unable to open AR viewer on this device.');
      });
    } else if (Platform.OS === 'android' && modelUrl) {
      // Android: Open Scene Viewer
      const sceneViewerUrl = `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_preferred#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(modelUrl)};end;`;

      Linking.openURL(sceneViewerUrl).catch(() => {
        // Fallback to direct URL
        Linking.openURL(
          `https://arvr.google.com/scene-viewer?file=${encodeURIComponent(modelUrl)}`
        ).catch(() => {
          Alert.alert('AR Not Available', 'Please install Google app for AR support.');
        });
      });
    } else {
      Alert.alert('AR Not Available', 'No AR-compatible model available for this product.');
    }
  }, [product]);

  // Generate WebView HTML for model-viewer
  const getModelViewerHtml = () => {
    const modelUrl = product.model3D?.glbFile || '';
    const posterUrl = product.model3D?.thumbnailAR || product.images?.[0] || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; background: #111827; }
          model-viewer {
            width: 100%;
            height: 100%;
            --poster-color: #111827;
            --progress-bar-color: #6366f1;
          }
          .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-family: system-ui;
            text-align: center;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #374151;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <model-viewer
          id="viewer"
          src="${modelUrl}"
          poster="${posterUrl}"
          alt="${product.name || 'Product'}"
          camera-controls
          auto-rotate
          shadow-intensity="2"
          environment-image="neutral"
          exposure="1.3"
          loading="eager"
        >
          <div class="loading" slot="poster">
            <div class="spinner"></div>
            <div>Loading 3D Model...</div>
          </div>
        </model-viewer>
        <script>
          const mv = document.getElementById('viewer');
          mv.addEventListener('load', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'model-loaded' }));
          });
          mv.addEventListener('error', (e) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Failed to load model' }));
          });
          mv.addEventListener('ar-status', (e) => {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ar-status', status: e.detail.status }));
          });
        </script>
      </body>
      </html>
    `;
  };

  // No 3D model available
  if (!has3DModel) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AR Preview</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="cube-outline" size={48} color={theme.colors.text.tertiary} />
          </View>
          <Text style={styles.errorTitle}>3D Model Unavailable</Text>
          <Text style={styles.errorText}>
            This product doesn't have a 3D model for AR preview yet.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {product.name}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isModelReady ? `${selectedColor.name} • ${productType}` : loadingMessage}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.colorButton}
          onPress={() => setShowColorPicker(true)}
          disabled={!isModelReady}
        >
          <View style={[styles.colorPreview, { backgroundColor: selectedColor.hex }]} />
        </TouchableOpacity>
      </View>

      {/* Model Viewer WebView */}
      <View style={styles.viewerContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: getModelViewerHtml() }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.colors.primary[500]} />
              <Text style={styles.loadingText}>{loadingMessage}</Text>
            </View>
          )}
        />
      </View>

      {/* AR Button */}
      {isModelReady && (
        <View style={[styles.arButtonContainer, { bottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={styles.arButton} onPress={openNativeAR} activeOpacity={0.9}>
            <Ionicons name="cube-outline" size={24} color="white" />
            <View style={styles.arButtonTextContainer}>
              <Text style={styles.arButtonTitle}>View in Your Space</Text>
              <Text style={styles.arButtonSubtitle}>
                Opens {Platform.OS === 'ios' ? 'Quick Look' : 'Scene Viewer'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.colorPickerPanel, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.colorPickerHeader}>
              <Text style={styles.colorPickerTitle}>Select Finish</Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorGrid}
            >
              {AUTOMOTIVE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color.hex}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: color.hex },
                    selectedColor.hex === color.hex && styles.colorSwatchSelected,
                  ]}
                  onPress={() => {
                    applyColor(color);
                    setShowColorPicker(false);
                  }}
                >
                  {selectedColor.hex === color.hex && (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.selectedColorInfo}>
              <View style={[styles.selectedColorPreview, { backgroundColor: selectedColor.hex }]} />
              <View>
                <Text style={styles.selectedColorName}>{selectedColor.name}</Text>
                <Text style={styles.selectedColorType}>
                  {selectedColor.metallic >= 0.8
                    ? 'Metallic'
                    : selectedColor.roughness >= 0.6
                    ? 'Matte'
                    : 'Glossy'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'white',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
    marginTop: 16,
  },
  arButtonContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  arButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: theme.colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  arButtonTextContainer: {
    alignItems: 'flex-start',
  },
  arButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  arButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  colorPickerPanel: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  colorPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  colorSwatch: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: 'white',
    transform: [{ scale: 1.1 }],
  },
  selectedColorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
  },
  selectedColorPreview: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedColorName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  selectedColorType: {
    fontSize: 12,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
});

export default ARViewerScreen;
