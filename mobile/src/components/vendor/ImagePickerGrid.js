import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import theme from '../../styles/theme';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

const ImagePickerGrid = ({ images, onImagesChange, maxImages = MAX_IMAGES }) => {
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and photo library permissions to upload images.'
      );
      return false;
    }
    return true;
  };

  const compressImage = async (uri) => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }], // Resize to max width of 1024px
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return manipResult;
    } catch (error) {
      console.error('Error compressing image:', error);
      return { uri };
    }
  };

  const pickFromGallery = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxImages} images`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setUploading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const remainingSlots = maxImages - images.length;
        const selectedImages = result.assets.slice(0, remainingSlots);

        // Compress images
        const compressedImages = await Promise.all(
          selectedImages.map(async (asset) => {
            const compressed = await compressImage(asset.uri);
            return {
              uri: compressed.uri,
              type: 'image/jpeg',
              name: `product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`,
            };
          })
        );

        onImagesChange([...images, ...compressedImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const pickFromCamera = async () => {
    if (images.length >= maxImages) {
      Alert.alert('Limit Reached', `You can only upload up to ${maxImages} images`);
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setUploading(true);

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets?.[0]) {
        const compressed = await compressImage(result.assets[0].uri);

        const newImage = {
          uri: compressed.uri,
          type: 'image/jpeg',
          name: `product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`,
        };

        onImagesChange([...images, newImage]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const showImageOptions = () => {
    Alert.alert('Add Image', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: pickFromCamera,
      },
      {
        text: 'Choose from Gallery',
        onPress: pickFromGallery,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Product Images</Text>
        <Text style={styles.count}>
          {images.length}/{maxImages}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {/* Existing Images */}
        {images.map((image, index) => (
          <View key={index} style={styles.imageContainer}>
            <Image source={{ uri: image.uri }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeImage(index)}
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.error} />
            </TouchableOpacity>
            {index === 0 && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Primary</Text>
              </View>
            )}
          </View>
        ))}

        {/* Add Image Button */}
        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={showImageOptions}
            disabled={uploading}
          >
            <Ionicons
              name={uploading ? 'hourglass-outline' : 'camera-outline'}
              size={32}
              color={theme.colors.text.secondary}
            />
            <Text style={styles.addButtonText}>
              {uploading ? 'Processing...' : 'Add Image'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Text style={styles.hint}>
        • First image will be the primary image{'\n'}
        • Tap and hold to reorder (coming soon){'\n'}
        • Max {maxImages} images, JPEG format recommended
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  count: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  grid: {
    flexDirection: 'row',
    paddingBottom: theme.spacing.sm,
  },
  imageContainer: {
    width: 120,
    height: 120,
    marginRight: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.secondary[800],
  },
  removeButton: {
    position: 'absolute',
    top: theme.spacing.xs,
    right: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.brand.main,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
  },
  primaryText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  addButton: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.secondary[800],
    borderWidth: 2,
    borderColor: theme.colors.secondary[700],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  addButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  hint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
});

export default ImagePickerGrid;
