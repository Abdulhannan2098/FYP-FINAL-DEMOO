/**
 * AR Viewer Screen for React Native
 *
 * Stable AR flow (no detection / no auto-placement):
 * - In-app 3D preview via model-viewer (WebView)
 * - Native AR launch via Scene Viewer (Android) / Quick Look (iOS)
 * - Optional color preview (PBR) in the 3D preview
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  Platform,
  Linking,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AUTOMOTIVE_COLORS, UI_MESSAGES, getProductType } from '../core/index.js';
import theme from '../../styles/theme.js';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Generate the WebView HTML with complete AR functionality
 * This creates an in-app AR experience without Safari redirect
 */
const generateARWebViewHTML = (product, selectedColor, isARMode = false) => {
  const modelUrl = product.model3D?.glbFile || '';
  const usdzUrl = product.model3D?.usdzFile || '';
  const productName = product.name || 'Product';
  const productType = getProductType(product);

  // Color values for material
  const colorHex = selectedColor.hex;
  const metallic = selectedColor.metallic || 0.8;
  const roughness = selectedColor.roughness || 0.3;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>AR Preview</title>
  <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      touch-action: manipulation;
      -webkit-user-select: none;
      user-select: none;
    }

    .container {
      width: 100%;
      height: 100%;
      position: relative;
    }

    model-viewer {
      width: 100%;
      height: 100%;
      --poster-color: #0f172a;
      --progress-bar-color: #6366f1;
      background: transparent;
    }

    model-viewer::part(default-ar-button) {
      display: none;
    }

    .loading-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      transition: opacity 0.3s ease;
    }

    .loading-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }

    .spinner {
      width: 56px;
      height: 56px;
      border: 3px solid #374151;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loading-text {
      color: white;
      font-size: 15px;
      margin-top: 20px;
      font-weight: 500;
    }

    .loading-sub {
      color: #9ca3af;
      font-size: 13px;
      margin-top: 8px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* Color indicator */
    .color-indicator {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      padding: 8px 16px;
      border-radius: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .color-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
    }

    .color-name {
      color: white;
      font-size: 13px;
      font-weight: 500;
    }

    /* Hidden elements */
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="container">
    <model-viewer
      id="model-viewer"
      src="${modelUrl}"
      ios-src="${usdzUrl || ''}"
      poster=""
      alt="${productName}"
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-scale="fixed"
      ar-placement="floor"
      camera-controls
      touch-action="pan-y"
      auto-rotate
      rotation-per-second="20deg"
      shadow-intensity="1.5"
      shadow-softness="0.8"
      environment-image="neutral"
      exposure="1.2"
      loading="eager"
      reveal="auto"
    >
      <div class="loading-overlay" id="loading-overlay">
        <div class="spinner"></div>
        <div class="loading-text">Loading 3D Model</div>
        <div class="loading-sub">Preparing AR experience...</div>
      </div>
    </model-viewer>

    <!-- Color Indicator -->
    <div class="color-indicator" id="color-indicator">
      <div class="color-dot" id="color-dot" style="background: ${colorHex};"></div>
      <span class="color-name" id="color-name">${selectedColor.name}</span>
    </div>
  </div>

  <script>
    // State
    let isModelLoaded = false;
    let currentColor = {
      hex: '${colorHex}',
      name: '${selectedColor.name}',
      metallic: ${metallic},
      roughness: ${roughness}
    };
    let isARActive = false;

    // Elements
    const modelViewer = document.getElementById('model-viewer');
    const loadingOverlay = document.getElementById('loading-overlay');
    const colorDot = document.getElementById('color-dot');
    const colorName = document.getElementById('color-name');

    // Send message to React Native
    function sendMessage(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    // Apply color to model
    function applyColor(hex, metallic, roughness, name) {
      currentColor = { hex, metallic, roughness, name };

      // Update indicator
      colorDot.style.background = hex;
      colorName.textContent = name;

      if (!modelViewer.model || !modelViewer.model.materials) return;

      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      modelViewer.model.materials.forEach(material => {
        if (material.pbrMetallicRoughness) {
          material.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
          material.pbrMetallicRoughness.setMetallicFactor(metallic);
          material.pbrMetallicRoughness.setRoughnessFactor(roughness);
        }
      });

      sendMessage({ type: 'color-applied', color: currentColor });
    }

    // Model loaded event
    modelViewer.addEventListener('load', () => {
      isModelLoaded = true;
      loadingOverlay.classList.add('hidden');

      // Apply initial color
      setTimeout(() => {
        applyColor(currentColor.hex, currentColor.metallic, currentColor.roughness, currentColor.name);
      }, 100);

      sendMessage({ type: 'model-loaded' });
    });

    modelViewer.addEventListener('error', (e) => {
      sendMessage({ type: 'error', message: 'Failed to load 3D model' });
    });

    // AR events
    modelViewer.addEventListener('ar-status', (e) => {
      const status = e.detail.status;
      isARActive = status === 'session-started';

      // If AR is activated by the user (e.g., Scene Viewer / Quick Look), reapply color when possible.
      if (isARActive) {
        setTimeout(() => {
          applyColor(currentColor.hex, currentColor.metallic, currentColor.roughness, currentColor.name);
        }, 500);
      }

      sendMessage({ type: 'ar-status', status, isActive: isARActive });
    });

    // Activate AR
    function activateAR() {
      if (!isModelLoaded) {
        sendMessage({ type: 'error', message: 'Model not loaded yet' });
        return;
      }

      // Check if AR is available
      if (modelViewer.canActivateAR) {
        modelViewer.activateAR();
      } else {
        sendMessage({ type: 'ar-unavailable' });
      }
    }

    // Handle messages from React Native
    window.handleMessage = function(msg) {
      try {
        const data = JSON.parse(msg);

        switch (data.action) {
          case 'apply-color':
            applyColor(data.hex, data.metallic || 0.8, data.roughness || 0.3, data.name || 'Custom');
            break;

          case 'activate-ar':
            activateAR();
            break;

          case 'check-ar':
            sendMessage({
              type: 'ar-support',
              supported: modelViewer.canActivateAR,
              isModelLoaded
            });
            break;
        }
      } catch(e) {
        console.error('Message error:', e);
      }
    };

    // Initial check
    setTimeout(() => {
      sendMessage({
        type: 'ready',
        canAR: modelViewer.canActivateAR
      });
    }, 500);
  </script>
</body>
</html>
  `;
};

/**
 * ARViewerScreen Component
 */
const ARViewerScreen = ({ route, navigation }) => {
  const { product } = route.params;
  const insets = useSafeAreaInsets();
  const webViewRef = useRef(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(AUTOMOTIVE_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isARSupported, setIsARSupported] = useState(false);
  const [isARActive, setIsARActive] = useState(false);

  const productType = getProductType(product);
  const has3DModel = product?.model3D?.glbFile;

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle WebView messages
  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'ready':
          setIsARSupported(data.canAR);
          break;

        case 'model-loaded':
          setIsModelReady(true);
          setIsLoading(false);
          break;

        case 'ar-support':
          setIsARSupported(data.supported);
          break;

        case 'ar-status':
          setIsARActive(data.isActive);
          break;

        case 'ar-unavailable':
          handleARUnavailable();
          break;

        case 'color-applied':
          console.log('[AR] Color applied:', data.color);
          break;

        case 'error':
          Alert.alert('Error', data.message || 'An error occurred');
          setIsLoading(false);
          break;
      }
    } catch (e) {
      console.log('[AR] Message parse error');
    }
  }, []);

  // Send message to WebView
  const sendToWebView = useCallback((message) => {
    if (webViewRef.current) {
      const script = `
        if (window.handleMessage) {
          window.handleMessage('${JSON.stringify(message).replace(/'/g, "\\'")}');
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, []);

  // Apply color
  const applyColor = useCallback((color) => {
    setSelectedColor(color);
    sendToWebView({
      action: 'apply-color',
      hex: color.hex,
      name: color.name,
      metallic: color.metallic,
      roughness: color.roughness,
    });
  }, [sendToWebView]);

  // Handle AR unavailable
  const handleARUnavailable = useCallback(() => {
    if (Platform.OS === 'ios') {
      const usdzUrl = product.model3D?.usdzFile;
      if (usdzUrl) {
        Alert.alert(
          'Open in AR Quick Look',
          'Your selected color will be preserved. Tap Continue to view in AR.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                // Note: USDZ doesn't support dynamic colors, but we inform the user
                import('react-native').then(({ Linking }) => {
                  Linking.openURL(usdzUrl);
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'AR Not Available',
          'WebXR is not supported in this WebView. For the full AR experience, a USDZ file is needed for iOS Quick Look.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [product]);

  // Trigger AR
  const handleActivateAR = useCallback(() => {
    if (!isModelReady) {
      Alert.alert('Please Wait', 'The 3D model is still loading.');
      return;
    }

    const glbUrl = product?.model3D?.glbFile;
    const usdzUrl = product?.model3D?.usdzFile;

    if (Platform.OS === 'ios') {
      if (!usdzUrl) {
        Alert.alert('AR Not Available', 'This product does not have a USDZ file for iOS Quick Look.');
        return;
      }

      Linking.openURL(usdzUrl).catch(() => {
        Alert.alert('Error', 'Unable to open AR Quick Look.');
      });
      return;
    }

    if (!glbUrl) {
      Alert.alert('AR Not Available', 'This product does not have a GLB file for Android AR.');
      return;
    }

    // Use the stable Android flow: open Google Scene Viewer via HTTPS.
    // This avoids WebXR-in-WebView instability and works with standard browsers.
    const sceneViewerUrl =
      `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glbUrl)}&mode=ar_only`;

    Linking.openURL(sceneViewerUrl).catch(() => {
      // Fallback: open the model URL directly.
      Linking.openURL(glbUrl).catch(() => {
        Alert.alert('Error', 'Unable to open AR viewer.');
      });
    });
  }, [isModelReady, product]);

  // No 3D model
  if (!has3DModel) {
    return (
      <Animated.View
        style={[
          styles.container,
          { paddingTop: insets.top, opacity: fadeAnim }
        ]}
      >
        <StatusBar barStyle="light-content" backgroundColor="#111827" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitleCenter}>AR Preview</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons name="cube-outline" size={48} color={theme.colors.text.tertiary} />
          </View>
          <Text style={styles.errorTitle}>3D Model Unavailable</Text>
          <Text style={styles.errorText}>
            This product doesn't have a 3D model for AR preview.
          </Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1f2937" />

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
            {isARActive
              ? 'AR Mode Active'
              : isModelReady
                ? `${selectedColor.name} • Tap AR to place`
                : 'Loading model...'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.colorButton, !isModelReady && styles.colorButtonDisabled]}
          onPress={() => setShowColorPicker(true)}
          disabled={!isModelReady}
        >
          <View style={[styles.colorPreview, { backgroundColor: selectedColor.hex }]} />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.viewerContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: generateARWebViewHTML(product, selectedColor) }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          mixedContentMode="always"
          allowsFullscreenVideo={true}
          startInLoadingState={false}
          scrollEnabled={false}
          bounces={false}
        />

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Loading 3D Model</Text>
            <Text style={styles.loadingSubtext}>Preparing AR experience...</Text>
          </View>
        )}

        {/* AR Button */}
        {isModelReady && !isARActive && (
          <View style={[styles.arButtonContainer, { bottom: 24 + insets.bottom }]}>
            <TouchableOpacity
              style={styles.arButton}
              onPress={handleActivateAR}
              activeOpacity={0.9}
            >
              <View style={styles.arButtonIcon}>
                <Ionicons name="cube-outline" size={26} color="white" />
              </View>
              <View style={styles.arButtonTextContainer}>
                <Text style={styles.arButtonTitle}>View in Your Space</Text>
                <Text style={styles.arButtonSubtitle}>Place rim on your car</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        )}

        {/* Info Bar */}
        {isModelReady && !isARActive && (
          <View style={[styles.infoBar, { bottom: 100 + insets.bottom }]}>
            <Ionicons name="finger-print-outline" size={20} color="#6366f1" />
            <Text style={styles.infoText}>
              Pinch to zoom • Drag to rotate • {selectedColor.name} selected
            </Text>
          </View>
        )}
      </View>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowColorPicker(false)}
          />
          <View style={[styles.colorPickerPanel, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.colorPickerHandle} />

            <View style={styles.colorPickerHeader}>
              <Text style={styles.colorPickerTitle}>Select Rim Finish</Text>
              <TouchableOpacity
                style={styles.colorPickerClose}
                onPress={() => setShowColorPicker(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.colorPickerSubtitle}>
              Color will be preserved when viewing in AR
            </Text>

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
                  activeOpacity={0.8}
                >
                  {selectedColor.hex === color.hex && (
                    <View style={styles.colorSwatchCheck}>
                      <Ionicons name="checkmark" size={18} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.selectedColorInfo}>
              <View style={[styles.selectedColorPreview, { backgroundColor: selectedColor.hex }]} />
              <View style={styles.selectedColorDetails}>
                <Text style={styles.selectedColorName}>{selectedColor.name}</Text>
                <Text style={styles.selectedColorType}>
                  {selectedColor.metallic >= 0.8 ? 'Metallic Finish' :
                   selectedColor.roughness >= 0.6 ? 'Matte Finish' : 'Glossy Finish'}
                </Text>
              </View>
              <View style={styles.selectedColorBadge}>
                <Text style={styles.selectedColorBadgeText}>Selected</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
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
    zIndex: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 14,
  },
  headerTitleCenter: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  headerSpacer: {
    width: 42,
  },
  colorButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  colorButtonDisabled: {
    opacity: 0.5,
  },
  colorPreview: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
  },
  loadingSubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
  },
  arButtonContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  arButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  arButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  arButtonTextContainer: {
    flex: 1,
  },
  arButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
  arButtonSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  infoBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    color: '#d1d5db',
    fontSize: 13,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  colorPickerPanel: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  colorPickerHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#4b5563',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  colorPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorPickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  colorPickerClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPickerSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 20,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 8,
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: 'white',
  },
  colorSwatchCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedColorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  selectedColorPreview: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  selectedColorDetails: {
    flex: 1,
    marginLeft: 14,
  },
  selectedColorName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  selectedColorType: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  selectedColorBadge: {
    backgroundColor: '#6366f1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  selectedColorBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  errorButton: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ARViewerScreen;
