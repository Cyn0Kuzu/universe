import { storage } from '../firebase/config';

// Remove expo-file-system dependency - use React Native Image API instead
// let FileSystem: any = null;
// FileSystem usage removed to avoid build conflicts

interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Robust image upload service with enhanced error handling
 */
export class ImageUploadService {
  /**
   * Upload an image to Firebase Storage with comprehensive error handling
   */
  static async uploadImage(
    imageUri: string,
    userId: string,
    type: 'profile' | 'cover'
  ): Promise<ImageUploadResult> {
    try {
      console.log(`📤 Starting ${type} image upload...`);
      console.log('🔧 Image details:', { uri: imageUri, userId, type });

      // Validate inputs
      if (!imageUri || !userId) {
        throw new Error('Missing required parameters: imageUri or userId');
      }

      // Wait a bit to ensure Firebase is ready
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create unique filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const filename = `${type}_${userId}_${timestamp}_${randomSuffix}.jpg`;
      const storagePath = `${type}s/${filename}`;
      
      console.log('📁 Upload path:', storagePath);

      // Get storage reference
      const storageRef = storage.ref().child(storagePath);

      // Fetch image data with standard fetch (more reliable)
      console.log('🔄 Fetching image data...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(imageUri, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('✅ Standard fetch successful');
      console.log('📊 Blob created:', { 
        size: blob.size, 
        type: blob.type,
        sizeInMB: (blob.size / (1024 * 1024)).toFixed(2)
      });

      // Validate blob size (max 10MB)
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error('Image too large. Maximum size is 10MB.');
      }

      // Validate blob type
      if (!blob.type || !blob.type.startsWith('image/')) {
        throw new Error('Invalid file type. Only images are allowed.');
      }

      // Upload to Firebase Storage with simplified but robust strategies
      console.log('⬆️ Starting upload to Firebase Storage...');

      // Strategy 1: Direct blob upload without metadata
      let uploadTask;
      try {
        console.log('📤 Strategy 1: Direct blob upload without metadata...');
        uploadTask = await storageRef.put(blob);
        console.log('✅ Direct blob upload completed');
      } catch (putError: any) {
        console.log('⚠️ Strategy 1 failed:', putError.message);
        
        // Strategy 2: Try with just content type
        try {
          console.log('📤 Strategy 2: Upload with content type only...');
          uploadTask = await storageRef.put(blob, { 
            contentType: blob.type || 'image/jpeg' 
          });
          console.log('✅ Content type upload completed');
        } catch (contentTypeError: any) {
          console.log('⚠️ Strategy 2 failed:', contentTypeError.message);
          
          // Strategy 3: Try base64 string upload
          try {
            console.log('📤 Strategy 3: Base64 string upload...');
            
            const base64Result = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const result = reader.result as string;
                const base64String = result.split(',')[1];
                resolve(base64String);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            
            uploadTask = await storageRef.putString(base64Result, 'base64', { 
              contentType: blob.type || 'image/jpeg' 
            });
            console.log('✅ Base64 upload completed');
          } catch (base64Error: any) {
            console.log('⚠️ Strategy 3 failed:', base64Error.message);
            throw new Error(`All upload strategies failed. Last error: ${base64Error.message}`);
          }
        }
      }

      const downloadURL = await uploadTask.ref.getDownloadURL();

      console.log(`✅ ${type} image uploaded successfully:`, downloadURL);
      
      return {
        success: true,
        url: downloadURL
      };

    } catch (error: any) {
      console.error(`⚠️ ${type} image upload failed:`, error);
      console.error('📋 Detailed error info:', {
        name: error.name,
        message: error.message,
        code: error.code,
        serverResponse: error.serverResponse,
        customData: error.customData,
        stack: error.stack?.substring(0, 500) // Limit stack trace
      });

      // Log storage configuration for debugging
      try {
        const storageInfo = {
          bucket: (storage.app.options as any).storageBucket,
          projectId: (storage.app.options as any).projectId,
          appName: storage.app.name
        };
        console.error('🔧 Storage config during error:', storageInfo);
      } catch (configError) {
        console.error('❌ Could not read storage config:', configError);
      }

      // Provide specific error messages based on error type
      let errorMessage = 'Image upload failed';
      
      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Storage permission denied. Please check Firebase rules.';
      } else if (error.code === 'storage/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.code === 'storage/quota-exceeded') {
        errorMessage = 'Storage quota exceeded. Please try again later.';
      } else if (error.code === 'storage/unknown') {
        errorMessage = 'Storage service temporarily unavailable. This may be a Firebase configuration issue.';
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Failed to process image. Please try a different image.';
      } else if (error.message?.includes('timeout') || error.name === 'AbortError') {
        errorMessage = 'Upload timeout. Please check your connection and try again.';
      } else if (error.message?.includes('strategies failed')) {
        errorMessage = 'All upload methods failed. Firebase Storage may have configuration issues.';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(imageUri: string, userId: string): Promise<ImageUploadResult> {
    return this.uploadImage(imageUri, userId, 'profile');
  }

  /**
   * Upload cover image
   */
  static async uploadCoverImage(imageUri: string, userId: string): Promise<ImageUploadResult> {
    return this.uploadImage(imageUri, userId, 'cover');
  }

  /**
   * Test Firebase Storage connectivity with more detailed debugging
   */
  static async testStorageConnection(): Promise<ImageUploadResult> {
    try {
      console.log('🧪 Testing Firebase Storage connection...');
      
      // Check if storage is initialized
      if (!storage) {
        throw new Error('Firebase Storage not initialized');
      }
      
      // Check storage app and bucket
      const app = storage.app;
      const bucket = (app.options as any).storageBucket;
      console.log('🪣 Storage bucket:', bucket);
      console.log('📱 App name:', app.name);
      
      if (!bucket) {
        throw new Error('Storage bucket not configured in Firebase config');
      }
      
      // Try to create a storage reference - most basic operation
      console.log('📁 Creating storage reference...');
      const testRef = storage.ref('test/basic-connection-test.txt');
      console.log('✅ Storage reference created successfully');
      
      // Try a very basic upload test
      console.log('📤 Testing basic upload...');
      const testData = 'test-connection';
      
      try {
        await testRef.putString(testData, 'raw');
        console.log('✅ Basic upload test successful');
        
        // Try to get download URL
        const url = await testRef.getDownloadURL();
        console.log('✅ Download URL retrieved:', url);
        
        return {
          success: true,
          url: url
        };
      } catch (uploadError: any) {
        console.error('❌ Basic upload test failed:', uploadError);
        console.error('📋 Upload error details:', {
          code: uploadError.code,
          message: uploadError.message,
          serverResponse: uploadError.serverResponse
        });
        
        return {
          success: false,
          error: `Basic upload test failed: ${uploadError.message}`
        };
      }
      
    } catch (error: any) {
      console.error('❌ Storage connection test failed:', error);
      console.error('📋 Storage connection error details:', {
        code: error.code || 'unknown',
        message: error.message || 'No error message',
        name: error.name || 'Unknown error',
        serverResponse: error.serverResponse || 'No server response'
      });
      
      let errorMessage = 'Storage connection failed';
      if (error.code === 'storage/unknown') {
        errorMessage = 'Firebase Storage service unavailable - possible network or configuration issue';
      } else if (error.message) {
        errorMessage = `Storage connection failed: ${error.message}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Delete an image from storage (for cleanup)
   */
  static async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      if (!imageUrl || !imageUrl.includes('firebase')) {
        return false;
      }

      const imageRef = storage.refFromURL(imageUrl);
      await imageRef.delete();
      console.log('🗑️ Image deleted successfully:', imageUrl);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete image:', error);
      return false;
    }
  }
}

export default ImageUploadService;
