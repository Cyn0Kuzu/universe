/**
 * Image Utilities
 * Image processing and validation functions
 */

import * as ImageManipulator from 'expo-image-manipulator';

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

/**
 * Optimize image for upload
 */
export const optimizeImageForUpload = async (
  uri: string, 
  options: ImageOptimizationOptions = {}
): Promise<{ uri: string; width: number; height: number }> => {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight
          }
        }
      ],
      {
        compress: quality,
        format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG
      }
    );

    return result;
  } catch (error) {
    console.error('Image optimization error:', error);
    throw new Error('Resim işlenirken hata oluştu');
  }
};

/**
 * Validate image file
 */
export const validateImageFile = (uri: string, maxSizeBytes: number = 5 * 1024 * 1024): { isValid: boolean; error?: string } => {
  if (!uri) {
    return { isValid: false, error: 'Resim seçilmedi' };
  }

  // Check file extension
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const hasValidExtension = validExtensions.some(ext => 
    uri.toLowerCase().includes(ext)
  );

  if (!hasValidExtension) {
    return { isValid: false, error: 'Desteklenen format: JPG, PNG, GIF, WebP' };
  }

  return { isValid: true };
};

/**
 * Get image dimensions
 */
export const getImageDimensions = (uri: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (!uri) {
      reject(new Error('URI gereklidir'));
      return;
    }

    // For React Native, we can't easily get dimensions without loading the image
    // This would typically be handled by the Image component's onLoad event
    // For now, return default dimensions
    resolve({ width: 0, height: 0 });
  });
};

/**
 * Create image thumbnail
 */
export const createThumbnail = async (
  uri: string, 
  size: number = 150
): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: size,
            height: size
          }
        }
      ],
      {
        compress: 0.7,
        format: ImageManipulator.SaveFormat.JPEG
      }
    );

    return result.uri;
  } catch (error) {
    console.error('Thumbnail creation error:', error);
    throw new Error('Küçük resim oluşturulamadı');
  }
};
