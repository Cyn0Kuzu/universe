/**
 * 📸 Image Reference Manager
 * Tüm uygulama genelinde image URL'lerini yönetir ve günceller
 */

import { firestore } from '../firebase/config';
import firebase from 'firebase/compat/app';
import { logError } from '../utils/errorHandling';

export interface ImageReference {
  imageId: string;
  userId: string;
  imageType: 'profile_avatar' | 'profile_cover' | 'club_logo' | 'club_cover' | 'event_banner';
  originalUrl: string;
  thumbnailUrl?: string;
  documentPath: string; // Firestore document path (e.g., 'users/uid', 'events/eventId')
  fieldName: string; // Field name in document (e.g., 'photoURL', 'coverURL')
  lastUpdated: firebase.firestore.Timestamp;
}

/**
 * 🔄 Image Reference Manager
 * Manages all image references across the application
 */
class ImageReferenceManager {
  private db = firestore;

  /**
   * 📝 Update user profile image references
   */
  async updateUserImageReferences(
    userId: string,
    imageType: 'profile_avatar' | 'profile_cover',
    originalUrl: string,
    thumbnailUrl?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        lastImageUpdate: firebase.firestore.Timestamp.now()
      };

      if (imageType === 'profile_avatar') {
        updateData.photoURL = originalUrl;
        updateData.profileImage = originalUrl; // Legacy field support
        if (thumbnailUrl) {
          updateData.photoThumbnailURL = thumbnailUrl;
          updateData.profileImageThumbnail = thumbnailUrl;
        }
      } else if (imageType === 'profile_cover') {
        updateData.coverPhotoURL = originalUrl;
        updateData.coverImage = originalUrl; // Legacy field support
        if (thumbnailUrl) {
          updateData.coverThumbnailURL = thumbnailUrl;
          updateData.coverImageThumbnail = thumbnailUrl;
        }
      }

      // Update user document
      await this.db.collection('users').doc(userId).update(updateData);

      // Save image reference for tracking
      await this.saveImageReference({
        imageId: `${userId}_${imageType}_${Date.now()}`,
        userId,
        imageType,
        originalUrl,
        thumbnailUrl,
        documentPath: `users/${userId}`,
        fieldName: imageType === 'profile_avatar' ? 'photoURL' : 'coverPhotoURL',
        lastUpdated: firebase.firestore.Timestamp.now()
      });

      console.log(`✅ User ${imageType} references updated successfully`);

    } catch (error) {
      logError(error, 'ImageReferenceManager.updateUserImageReferences');
      throw error;
    }
  }

  /**
   * 🏢 Update club image references
   */
  async updateClubImageReferences(
    clubId: string,
    imageType: 'club_logo' | 'club_cover',
    originalUrl: string,
    thumbnailUrl?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        lastImageUpdate: firebase.firestore.Timestamp.now()
      };

      if (imageType === 'club_logo') {
        updateData.logoURL = originalUrl;
        updateData.profileImage = originalUrl; // Legacy field support
        updateData.photoURL = originalUrl; // Legacy field support
        if (thumbnailUrl) {
          updateData.logoThumbnailURL = thumbnailUrl;
          updateData.profileImageThumbnail = thumbnailUrl;
        }
      } else if (imageType === 'club_cover') {
        updateData.coverURL = originalUrl;
        updateData.coverImage = originalUrl; // Legacy field support
        updateData.coverPhotoURL = originalUrl; // Legacy field support
        if (thumbnailUrl) {
          updateData.coverThumbnailURL = thumbnailUrl;
          updateData.coverImageThumbnail = thumbnailUrl;
        }
      }

      // Update club document
      await this.db.collection('users').doc(clubId).update(updateData);

      // Save image reference for tracking
      await this.saveImageReference({
        imageId: `${clubId}_${imageType}_${Date.now()}`,
        userId: clubId,
        imageType,
        originalUrl,
        thumbnailUrl,
        documentPath: `users/${clubId}`,
        fieldName: imageType === 'club_logo' ? 'logoURL' : 'coverURL',
        lastUpdated: firebase.firestore.Timestamp.now()
      });

      console.log(`✅ Club ${imageType} references updated successfully`);

    } catch (error) {
      logError(error, 'ImageReferenceManager.updateClubImageReferences');
      throw error;
    }
  }

  /**
   * 🎉 Update event image references
   */
  async updateEventImageReferences(
    eventId: string,
    userId: string,
    imageUrl: string,
    thumbnailUrl?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        imageUrl,
        bannerUrl: imageUrl, // Additional field
        lastImageUpdate: firebase.firestore.Timestamp.now()
      };

      if (thumbnailUrl) {
        updateData.imageThumbnailUrl = thumbnailUrl;
        updateData.bannerThumbnailUrl = thumbnailUrl;
      }

      // Update event document
      await this.db.collection('events').doc(eventId).update(updateData);

      // Save image reference for tracking
      await this.saveImageReference({
        imageId: `${eventId}_event_banner_${Date.now()}`,
        userId,
        imageType: 'event_banner',
        originalUrl: imageUrl,
        thumbnailUrl,
        documentPath: `events/${eventId}`,
        fieldName: 'imageUrl',
        lastUpdated: firebase.firestore.Timestamp.now()
      });

      console.log(`✅ Event image references updated successfully`);

    } catch (error) {
      logError(error, 'ImageReferenceManager.updateEventImageReferences');
      throw error;
    }
  }

  /**
   * 🔗 Save image reference for tracking
   */
  private async saveImageReference(reference: ImageReference): Promise<void> {
    try {
      await this.db.collection('imageReferences').doc(reference.imageId).set(reference);
    } catch (error) {
      logError(error, 'ImageReferenceManager.saveImageReference');
      // Don't throw - this is for tracking only
    }
  }

  /**
   * 📋 Get all image references for a user
   */
  async getUserImageReferences(userId: string): Promise<ImageReference[]> {
    try {
      const snapshot = await this.db
        .collection('imageReferences')
        .where('userId', '==', userId)
        .orderBy('lastUpdated', 'desc')
        .get();

      return snapshot.docs.map(doc => doc.data() as ImageReference);

    } catch (error) {
      logError(error, 'ImageReferenceManager.getUserImageReferences');
      return [];
    }
  }

  /**
   * 🗑️ Clean up old image references
   */
  async cleanupOldReferences(userId: string, keepCount: number = 10): Promise<void> {
    try {
      // Get all references for the user
      const allSnapshot = await this.db
        .collection('imageReferences')
        .where('userId', '==', userId)
        .orderBy('lastUpdated', 'desc')
        .get();

      // If we have more than keepCount, delete the oldest ones
      if (allSnapshot.size > keepCount) {
        const docsToDelete = allSnapshot.docs.slice(keepCount);
        const batch = this.db.batch();
        
        docsToDelete.forEach((doc: firebase.firestore.DocumentSnapshot) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`🧹 Cleaned up ${docsToDelete.length} old image references for user ${userId}`);
      }

    } catch (error) {
      logError(error, 'ImageReferenceManager.cleanupOldReferences');
    }
  }

  /**
   * 🔄 Migrate legacy image fields
   */
  async migrateLegacyImageFields(): Promise<void> {
    try {
      console.log('🔄 Starting legacy image field migration...');

      // Get all users with old image fields
      const usersSnapshot = await this.db.collection('users').get();
      
      const batch = this.db.batch();
      let updateCount = 0;

      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        const updates: any = {};

        // Migrate profile images
        if (userData.profileImage && !userData.photoURL) {
          updates.photoURL = userData.profileImage;
          updateCount++;
        }

        // Migrate cover images
        if (userData.coverImage && !userData.coverPhotoURL) {
          updates.coverPhotoURL = userData.coverImage;
          updateCount++;
        }

        // Add migration timestamp
        if (Object.keys(updates).length > 0) {
          updates.imageMigrationCompleted = firebase.firestore.Timestamp.now();
          batch.update(doc.ref, updates);
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Migrated ${updateCount} legacy image fields`);
      } else {
        console.log('✅ No legacy image fields found to migrate');
      }

    } catch (error) {
      logError(error, 'ImageReferenceManager.migrateLegacyImageFields');
      throw error;
    }
  }
}

export const imageReferenceManager = new ImageReferenceManager();
export default ImageReferenceManager;
