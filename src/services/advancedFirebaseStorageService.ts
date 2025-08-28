/**
 * 📸 Advanced Firebase Storage Service
 * Tüm fotoğrafları Firebase Storage'a kaydetmek için kapsamlı servis
 */

import { storage, firestore } from '../firebase/config';
import firebase from 'firebase/compat/app';
import { logError } from '../utils/errorHandling';
import { optimizeImageForUpload, createThumbnail } from '../utils/imageUtils';
import { imageReferenceManager } from './imageReferenceManager';

export interface ImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  generateThumbnail?: boolean;
  watermark?: boolean;
}

export interface ImageUploadResult {
  success: boolean;
  originalUrl?: string;
  thumbnailUrl?: string;
  metadata?: {
    size: number;
    width: number;
    height: number;
    format: string;
    uploadedAt: firebase.firestore.Timestamp;
    path: string;
  };
  error?: string;
}

export interface ImageMetadata {
  id: string;
  userId: string;
  type: ImageType;
  originalUrl: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  uploadedAt: firebase.firestore.Timestamp;
  storagePath: string;
  isActive: boolean;
  tags?: string[];
}

export type ImageType = 
  | 'profile_avatar' 
  | 'profile_cover' 
  | 'club_logo' 
  | 'club_cover' 
  | 'event_banner' 
  | 'event_gallery' 
  | 'post_image' 
  | 'document' 
  | 'certificate' 
  | 'other';

/**
 * 🚀 Advanced Firebase Storage Service
 * Professional-grade image management system
 */
class AdvancedFirebaseStorageService {
  private storage = storage;
  private db = firestore;

  /**
   * 📤 Upload image to Firebase Storage with full metadata tracking
   */
  async uploadImage(
    imageUri: string,
    userId: string,
    type: ImageType,
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    try {
      console.log(`📸 Uploading ${type} image for user ${userId}`);

      // Validate inputs
      if (!imageUri || !userId || !type) {
        throw new Error('Missing required parameters: imageUri, userId, or type');
      }

      // Default options
      const uploadOptions: Required<ImageUploadOptions> = {
        quality: options.quality || 0.8,
        maxWidth: options.maxWidth || 1920,
        maxHeight: options.maxHeight || 1920,
        generateThumbnail: options.generateThumbnail ?? true,
        watermark: options.watermark ?? false
      };

      // Compress image if needed
      let processedImageUri = imageUri;
      if (uploadOptions.quality < 1 || uploadOptions.maxWidth < 3000) {
        const optimized = await optimizeImageForUpload(imageUri, {
          quality: uploadOptions.quality,
          maxWidth: uploadOptions.maxWidth,
          maxHeight: uploadOptions.maxHeight
        });
        processedImageUri = optimized.uri;
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 12);
      const fileExtension = this.getFileExtension(imageUri);
      const filename = `${type}_${userId}_${timestamp}_${randomId}.${fileExtension}`;
      
      // Determine storage path based on type
      const storagePath = this.getStoragePath(type, userId, filename);
      
      console.log(`📁 Storage path: ${storagePath}`);

      // Upload original image
      const originalResult = await this.uploadToStorage(processedImageUri, storagePath);
      
      // Generate thumbnail if requested
      let thumbnailUrl: string | undefined;
      if (uploadOptions.generateThumbnail) {
        try {
          const thumbnailUri = await createThumbnail(processedImageUri, 300);
          
          const thumbnailPath = storagePath.replace(`.${fileExtension}`, `_thumb.${fileExtension}`);
          const thumbnailResult = await this.uploadToStorage(thumbnailUri, thumbnailPath);
          thumbnailUrl = await thumbnailResult.ref.getDownloadURL();
        } catch (thumbError) {
          console.warn('⚠️ Thumbnail generation failed:', thumbError);
          // Continue without thumbnail
        }
      }

      // Get download URL
      const originalUrl = await originalResult.ref.getDownloadURL();

      // Get image metadata
      const metadata = await originalResult.ref.getMetadata();
      
      // Save image metadata to Firestore
      const imageMetadata: ImageMetadata = {
        id: `${userId}_${type}_${timestamp}`,
        userId,
        type,
        originalUrl,
        thumbnailUrl,
        filename,
        size: metadata.size || 0,
        dimensions: {
          width: uploadOptions.maxWidth,
          height: uploadOptions.maxHeight
        },
        format: fileExtension,
        uploadedAt: firebase.firestore.Timestamp.now(),
        storagePath,
        isActive: true,
        tags: this.generateTags(type, userId)
      };

      // Save to Firestore
      await this.saveImageMetadata(imageMetadata);

      // Update user's image references
      await this.updateUserImageReferences(userId, type, originalUrl, thumbnailUrl);

      console.log(`✅ Image uploaded successfully: ${originalUrl}`);

      return {
        success: true,
        originalUrl,
        thumbnailUrl,
        metadata: {
          size: metadata.size || 0,
          width: uploadOptions.maxWidth,
          height: uploadOptions.maxHeight,
          format: fileExtension,
          uploadedAt: firebase.firestore.Timestamp.now(),
          path: storagePath
        }
      };

    } catch (error) {
      logError(error, 'AdvancedFirebaseStorageService.uploadImage');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * 🗑️ Delete image from Storage and update metadata
   */
  async deleteImage(imageId: string, userId: string): Promise<boolean> {
    try {
      // Get image metadata
      const imageDoc = await this.db.collection('imageMetadata').doc(imageId).get();
      
      if (!imageDoc.exists) {
        throw new Error('Image metadata not found');
      }

      const imageData = imageDoc.data() as ImageMetadata;

      // Verify ownership
      if (imageData.userId !== userId) {
        throw new Error('Unauthorized: Cannot delete image');
      }

      // Delete from Storage
      await this.storage.ref(imageData.storagePath).delete();
      
      // Delete thumbnail if exists
      if (imageData.thumbnailUrl) {
        const thumbnailPath = imageData.storagePath.replace('.', '_thumb.');
        try {
          await this.storage.ref(thumbnailPath).delete();
        } catch (thumbError) {
          console.warn('⚠️ Thumbnail deletion failed:', thumbError);
        }
      }

      // Mark as inactive in Firestore
      await this.db.collection('imageMetadata').doc(imageId).update({
        isActive: false,
        deletedAt: firebase.firestore.Timestamp.now()
      });

      console.log(`🗑️ Image deleted successfully: ${imageId}`);
      return true;

    } catch (error) {
      logError(error, 'AdvancedFirebaseStorageService.deleteImage');
      return false;
    }
  }

  /**
   * 📋 Get user's images
   */
  async getUserImages(
    userId: string, 
    type?: ImageType, 
    limit: number = 50
  ): Promise<ImageMetadata[]> {
    try {
      let query = this.db
        .collection('imageMetadata')
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('uploadedAt', 'desc')
        .limit(limit);

      if (type) {
        query = query.where('type', '==', type);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as ImageMetadata);

    } catch (error) {
      logError(error, 'AdvancedFirebaseStorageService.getUserImages');
      return [];
    }
  }

  /**
   * 🔄 Update image metadata
   */
  async updateImageMetadata(imageId: string, updates: Partial<ImageMetadata>): Promise<boolean> {
    try {
      await this.db.collection('imageMetadata').doc(imageId).update({
        ...updates,
        updatedAt: firebase.firestore.Timestamp.now()
      });
      return true;
    } catch (error) {
      logError(error, 'AdvancedFirebaseStorageService.updateImageMetadata');
      return false;
    }
  }

  // Private helper methods
  private async uploadToStorage(
    imageUri: string, 
    storagePath: string
  ): Promise<firebase.storage.UploadTaskSnapshot> {
    try {
      // Fetch image data
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Upload to Firebase Storage
      const storageRef = this.storage.ref().child(storagePath);
      return await storageRef.put(blob);

    } catch (error) {
      console.error('❌ Storage upload failed:', error);
      throw error;
    }
  }

  private getStoragePath(type: ImageType, userId: string, filename: string): string {
    const basePath = this.getBasePathForType(type);
    return `${basePath}/${userId}/${filename}`;
  }

  private getBasePathForType(type: ImageType): string {
    const pathMap: Record<ImageType, string> = {
      'profile_avatar': 'users/avatars',
      'profile_cover': 'users/covers',
      'club_logo': 'clubs/logos',
      'club_cover': 'clubs/covers',
      'event_banner': 'events/banners',
      'event_gallery': 'events/gallery',
      'post_image': 'posts/images',
      'document': 'documents',
      'certificate': 'certificates',
      'other': 'misc'
    };
    return pathMap[type] || 'misc';
  }

  private getFileExtension(uri: string): string {
    const extension = uri.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].includes(extension || '') ? extension! : 'jpg';
  }

  private generateTags(type: ImageType, userId: string): string[] {
    const tags = [type, `user_${userId}`];
    
    // Add contextual tags
    if (type.includes('profile')) tags.push('profile');
    if (type.includes('club')) tags.push('club');
    if (type.includes('event')) tags.push('event');
    
    return tags;
  }

  private async saveImageMetadata(metadata: ImageMetadata): Promise<void> {
    await this.db.collection('imageMetadata').doc(metadata.id).set(metadata);
  }

  private async updateUserImageReferences(
    userId: string, 
    type: ImageType, 
    originalUrl: string, 
    thumbnailUrl?: string
  ): Promise<void> {
    try {
      // Use ImageReferenceManager for comprehensive updates
      switch (type) {
        case 'profile_avatar':
          await imageReferenceManager.updateUserImageReferences(
            userId, 
            'profile_avatar', 
            originalUrl, 
            thumbnailUrl
          );
          break;
        case 'profile_cover':
          await imageReferenceManager.updateUserImageReferences(
            userId, 
            'profile_cover', 
            originalUrl, 
            thumbnailUrl
          );
          break;
        case 'club_logo':
          await imageReferenceManager.updateClubImageReferences(
            userId, 
            'club_logo', 
            originalUrl, 
            thumbnailUrl
          );
          break;
        case 'club_cover':
          await imageReferenceManager.updateClubImageReferences(
            userId, 
            'club_cover', 
            originalUrl, 
            thumbnailUrl
          );
          break;
        default:
          // For other types, use legacy method
          const updateData: any = {};
          updateData.lastImageUpdate = firebase.firestore.Timestamp.now();
          await this.db.collection('users').doc(userId).update(updateData);
          break;
      }

    } catch (error) {
      console.warn('⚠️ Failed to update image references:', error);
      // Don't throw - image upload was successful
    }
  }
}

export const advancedStorageService = new AdvancedFirebaseStorageService();
export default AdvancedFirebaseStorageService;
