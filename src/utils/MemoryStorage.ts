/**
 * React Native için basit bir in-memory storage
 * AsyncStorage'ın yerine kullanılabilir
 */

// In-memory storage
const memoryStorage: { [key: string]: string } = {};

export class MemoryStorage {
  static async getItem(key: string): Promise<string | null> {
    try {
      return memoryStorage[key] || null;
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return null;
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      memoryStorage[key] = value;
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      // Memory full olabilir, gereksiz öğeleri temizle
      this.cleanStorage();
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      delete memoryStorage[key];
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
    }
  }

  static async multiRemove(keys: string[]): Promise<void> {
    try {
      keys.forEach(key => delete memoryStorage[key]);
    } catch (error) {
      console.error('Error removing multiple items:', error);
    }
  }

  static async getAllKeys(): Promise<string[]> {
    try {
      return Object.keys(memoryStorage);
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  /**
   * Storage'ı temizler (eski cache'leri siler)
   */
  private static cleanStorage(): void {
    try {
      // Cache'ı temizle
      const keys = Object.keys(memoryStorage);
      keys.forEach(key => {
        if (key.includes('leaderboard') || key.includes('cache')) {
          delete memoryStorage[key];
        }
      });
    } catch (error) {
      console.error('Error cleaning storage:', error);
    }
  }

  /**
   * Tüm storage'ı temizler
   */
  static async clear(): Promise<void> {
    try {
      Object.keys(memoryStorage).forEach(key => {
        delete memoryStorage[key];
      });
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  /**
   * Storage boyutunu döndürür
   */
  static getSize(): number {
    return Object.keys(memoryStorage).length;
  }

  /**
   * Key'in var olup olmadığını kontrol eder
   */
  static async hasKey(key: string): Promise<boolean> {
    return key in memoryStorage;
  }

  /**
   * JSON objesi olarak set eder
   */
  static async setObject(key: string, object: any): Promise<void> {
    try {
      const jsonString = JSON.stringify(object);
      await this.setItem(key, jsonString);
    } catch (error) {
      console.error(`Error setting object ${key}:`, error);
    }
  }

  /**
   * JSON objesi olarak get eder
   */
  static async getObject(key: string): Promise<any | null> {
    try {
      const jsonString = await this.getItem(key);
      if (jsonString) {
        return JSON.parse(jsonString);
      }
      return null;
    } catch (error) {
      console.error(`Error getting object ${key}:`, error);
      return null;
    }
  }
}

// Export for compatibility with both named and default import
export default MemoryStorage;
export { MemoryStorage as Storage };
