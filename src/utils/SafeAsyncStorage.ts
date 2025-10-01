/**
 * 🛡️ Safe AsyncStorage Wrapper
 * 
 * AsyncStorage'ın %100 güvenli kullanımı için wrapper.
 * "Cannot read property 'setItem' of undefined" hatalarını tamamen önler.
 * Multiple initialization attempts ile maksimum güvenilirlik sağlar.
 */

let AsyncStorage: any = null;
let isAsyncStorageAvailable = false;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 5;

// AsyncStorage'ı initialize etmek için multiple attempt logic
const attemptAsyncStorageInit = async (): Promise<boolean> => {
  if (isAsyncStorageAvailable && AsyncStorage) {
    return true;
  }

  initializationAttempts++;
  console.log(`🔄 [SafeAsyncStorage] Initialization attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS}...`);

  try {
    // Method 1: Default import
    const AsyncStorageModule = require('@react-native-async-storage/async-storage');
    AsyncStorage = AsyncStorageModule.default || AsyncStorageModule;

    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      console.log('✅ [SafeAsyncStorage] Successfully imported via default');
      
      // Test AsyncStorage works
      const testKey = '__safeasyncstorage_test__';
      const testValue = 'test_' + Date.now();
      
      await AsyncStorage.setItem(testKey, testValue);
      const retrievedValue = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      
      if (retrievedValue === testValue) {
        isAsyncStorageAvailable = true;
        console.log('✅ [SafeAsyncStorage] AsyncStorage test successful');
        return true;
      } else {
        throw new Error('AsyncStorage test failed: value mismatch');
      }
    }
  } catch (error) {
    console.warn(`⚠️ [SafeAsyncStorage] Attempt ${initializationAttempts} failed:`, error);
  }

  try {
    // Method 2: Alternative import
    AsyncStorage = require('@react-native-async-storage/async-storage/lib/AsyncStorage').default;
    
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      console.log('✅ [SafeAsyncStorage] Successfully imported via lib path');
      
      // Test AsyncStorage works
      const testKey = '__safeasyncstorage_test2__';
      const testValue = 'test2_' + Date.now();
      
      await AsyncStorage.setItem(testKey, testValue);
      const retrievedValue = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      
      if (retrievedValue === testValue) {
        isAsyncStorageAvailable = true;
        console.log('✅ [SafeAsyncStorage] AsyncStorage alternative test successful');
        return true;
      }
    }
  } catch (error) {
    console.warn(`⚠️ [SafeAsyncStorage] Alternative attempt failed:`, error);
  }

  console.error(`❌ [SafeAsyncStorage] Initialization attempt ${initializationAttempts} failed`);
  return false;
};

// Initial attempt
attemptAsyncStorageInit().catch(error => {
  console.error('❌ [SafeAsyncStorage] Initial initialization failed:', error);
});

export class SafeAsyncStorage {
  
  // Force reinitialize with retry logic
  static async forceReinitialize(): Promise<void> {
    console.log('🔄 [SafeAsyncStorage] Force reinitializing...');
    
    // Reset state
    AsyncStorage = null;
    isAsyncStorageAvailable = false;
    initializationAttempts = 0;
    
    // Try multiple times with delays
    for (let attempt = 0; attempt < MAX_INIT_ATTEMPTS; attempt++) {
      const success = await attemptAsyncStorageInit();
      if (success) {
        console.log('✅ [SafeAsyncStorage] Force reinitialization successful');
        return;
      }
      
      if (attempt < MAX_INIT_ATTEMPTS - 1) {
        console.log(`⏳ [SafeAsyncStorage] Waiting before attempt ${attempt + 2}...`);
        await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1))); // Progressive delay
      }
    }
    
    console.error('❌ [SafeAsyncStorage] Force reinitialization failed after all attempts');
  }

  // Ensure AsyncStorage is ready before any operation
  private static async ensureReady(): Promise<boolean> {
    if (isAsyncStorageAvailable && AsyncStorage) {
      return true;
    }
    
    console.log('🔄 [SafeAsyncStorage] AsyncStorage not ready, attempting initialization...');
    const success = await attemptAsyncStorageInit();
    
    if (!success && initializationAttempts < MAX_INIT_ATTEMPTS) {
      console.log('🔄 [SafeAsyncStorage] Retrying initialization...');
      await new Promise(resolve => setTimeout(resolve, 100));
      return await attemptAsyncStorageInit();
    }
    
    return success;
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      const isReady = await this.ensureReady();
      if (!isReady) {
        console.warn(`⚠️ [SafeAsyncStorage] getItem failed - AsyncStorage not available for key: ${key}`);
        return null;
      }

      const result = await AsyncStorage.getItem(key);
      if (result !== null) {
        console.log(`✅ [SafeAsyncStorage] Retrieved item: ${key}`);
      }
      return result;
    } catch (error) {
      console.error(`❌ [SafeAsyncStorage] Error getting item ${key}:`, error);
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<boolean> {
    try {
      const isReady = await this.ensureReady();
      if (!isReady) {
        console.warn(`⚠️ [SafeAsyncStorage] setItem failed - AsyncStorage not available for key: ${key}`);
        return false;
      }

      await AsyncStorage.setItem(key, value);
      console.log(`✅ [SafeAsyncStorage] Item saved successfully: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ [SafeAsyncStorage] Error setting item ${key}:`, error);
      return false;
    }
  }

  static async removeItem(key: string): Promise<boolean> {
    try {
      const isReady = await this.ensureReady();
      if (!isReady) {
        console.warn(`⚠️ [SafeAsyncStorage] removeItem failed - AsyncStorage not available for key: ${key}`);
        return false;
      }

      await AsyncStorage.removeItem(key);
      console.log(`✅ [SafeAsyncStorage] Item removed successfully: ${key}`);
      return true;
    } catch (error) {
      console.error(`❌ [SafeAsyncStorage] Error removing item ${key}:`, error);
      return false;
    }
  }

  static async multiGet(keys: string[]): Promise<readonly [string, string | null][]> {
    try {
      const isReady = await this.ensureReady();
      if (!isReady) {
        console.warn('⚠️ [SafeAsyncStorage] multiGet failed - AsyncStorage not available');
        return keys.map(key => [key, null] as const);
      }

      return await AsyncStorage.multiGet(keys);
    } catch (error) {
      console.error('❌ [SafeAsyncStorage] Error in multiGet:', error);
      return keys.map(key => [key, null] as const);
    }
  }

  static async multiSet(keyValuePairs: [string, string][]): Promise<boolean> {
    try {
      const isReady = await this.ensureReady();
      if (!isReady) {
        console.warn('⚠️ [SafeAsyncStorage] multiSet failed - AsyncStorage not available');
        return false;
      }

      await AsyncStorage.multiSet(keyValuePairs);
      console.log('✅ [SafeAsyncStorage] MultiSet completed successfully');
      return true;
    } catch (error) {
      console.error('❌ [SafeAsyncStorage] Error in multiSet:', error);
      return false;
    }
  }

  static async multiRemove(keys: string[]): Promise<boolean> {
    try {
      const isReady = await this.ensureReady();
      if (!isReady) {
        console.warn('⚠️ [SafeAsyncStorage] multiRemove failed - AsyncStorage not available');
        return false;
      }

      await AsyncStorage.multiRemove(keys);
      console.log('✅ [SafeAsyncStorage] MultiRemove completed successfully');
      return true;
    } catch (error) {
      console.error('❌ [SafeAsyncStorage] Error in multiRemove:', error);
      return false;
    }
  }

  static async clear(): Promise<boolean> {
    try {
      const isReady = await this.ensureReady();
      if (!isReady) {
        console.warn('⚠️ [SafeAsyncStorage] clear failed - AsyncStorage not available');
        return false;
      }

      await AsyncStorage.clear();
      console.log('✅ [SafeAsyncStorage] AsyncStorage cleared successfully');
      return true;
    } catch (error) {
      console.error('❌ [SafeAsyncStorage] Error clearing AsyncStorage:', error);
      return false;
    }
  }

  static async getAllKeys(): Promise<readonly string[]> {
    try {
      const isReady = await this.ensureReady();
      if (!isReady) {
        console.warn('⚠️ [SafeAsyncStorage] getAllKeys failed - AsyncStorage not available');
        return [];
      }

      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('❌ [SafeAsyncStorage] Error getting all keys:', error);
      return [];
    }
  }

  // Utility methods
  static async getObject(key: string): Promise<any | null> {
    try {
      const value = await this.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`❌ [SafeAsyncStorage] Error parsing JSON for key ${key}:`, error);
      return null;
    }
  }

  static async setObject(key: string, value: any): Promise<boolean> {
    try {
      return await this.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ [SafeAsyncStorage] Error stringifying object for key ${key}:`, error);
      return false;
    }
  }

  // Check if AsyncStorage is available
  static isAvailable(): boolean {
    return isAsyncStorageAvailable && AsyncStorage !== null && typeof AsyncStorage.setItem === 'function';
  }

  // Get current status
  static getStatus(): {available: boolean, attempts: number, initialized: boolean} {
    return {
      available: isAsyncStorageAvailable,
      attempts: initializationAttempts,
      initialized: AsyncStorage !== null
    };
  }
}

export default SafeAsyncStorage;
