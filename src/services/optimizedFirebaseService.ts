/**
 * Optimized Firebase Service
 * Ana thread blokajını önleyen Firebase operasyonları
 */

import { firebase } from '../firebase';
import { performanceOptimizer } from './performanceOptimizer';

export class OptimizedFirebaseService {
  private static instance: OptimizedFirebaseService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 saniye
  private readonly MAX_CACHE_SIZE = 100;

  static getInstance(): OptimizedFirebaseService {
    if (!OptimizedFirebaseService.instance) {
      OptimizedFirebaseService.instance = new OptimizedFirebaseService();
    }
    return OptimizedFirebaseService.instance;
  }

  /**
   * Optimized batch read operations
   */
  async batchRead(
    collection: string,
    queries: Array<{ field: string; operator: any; value: any }>,
    limit: number = 50
  ): Promise<any[]> {
    return performanceOptimizer.executeAsync(async () => {
      const cacheKey = `${collection}_${JSON.stringify(queries)}_${limit}`;
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)?.data || [];
      }

      // Execute queries in parallel with batching
      const queryPromises = queries.map(query => 
        firebase.firestore()
          .collection(collection)
          .where(query.field, query.operator, query.value)
          .limit(limit)
          .get()
      );

      const snapshots = await Promise.all(queryPromises);
      const results: any[] = [];

      snapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          results.push({ id: doc.id, ...doc.data() });
        });
      });

      // Cache results
      this.setCache(cacheKey, results);
      
      return results;
    }, 'low');
  }

  /**
   * Optimized single document read
   */
  async readDocument(collection: string, docId: string): Promise<any | null> {
    return performanceOptimizer.executeAsync(async () => {
      const cacheKey = `${collection}_${docId}`;
      
      if (this.isCacheValid(cacheKey)) {
        return this.cache.get(cacheKey)?.data || null;
      }

      const doc = await firebase.firestore()
        .collection(collection)
        .doc(docId)
        .get();

      const data = doc.exists ? { id: doc.id, ...doc.data() } : null;
      
      if (data) {
        this.setCache(cacheKey, data);
      }
      
      return data;
    }, 'normal');
  }

  /**
   * Optimized collection read with pagination
   */
  async readCollection(
    collection: string,
    options: {
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      limit?: number;
      startAfter?: any;
      where?: Array<{ field: string; operator: any; value: any }>;
    } = {}
  ): Promise<{ data: any[]; lastDoc?: any }> {
    return performanceOptimizer.executeAsync(async () => {
      const cacheKey = `${collection}_${JSON.stringify(options)}`;
      
      if (this.isCacheValid(cacheKey)) {
        const cached = this.cache.get(cacheKey)?.data;
        return cached || { data: [] };
      }

      let query = firebase.firestore().collection(collection);

      // Apply where conditions
      if (options.where) {
        options.where.forEach(condition => {
          query = query.where(condition.field, condition.operator, condition.value);
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.orderBy(options.orderBy, options.orderDirection || 'desc');
      }

      // Apply pagination
      if (options.startAfter) {
        query = query.startAfter(options.startAfter);
      }

      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }

      const snapshot = await query.get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];

      this.setCache(cacheKey, { data, lastDoc });
      
      return { data, lastDoc };
    }, 'normal');
  }

  /**
   * Optimized batch write operations
   */
  async batchWrite(operations: Array<{
    type: 'set' | 'update' | 'delete';
    collection: string;
    docId: string;
    data?: any;
  }>): Promise<void> {
    return performanceOptimizer.executeAsync(async () => {
      const batch = firebase.firestore().batch();
      
      operations.forEach(operation => {
        const docRef = firebase.firestore()
          .collection(operation.collection)
          .doc(operation.docId);

        switch (operation.type) {
          case 'set':
            batch.set(docRef, operation.data);
            break;
          case 'update':
            batch.update(docRef, operation.data);
            break;
          case 'delete':
            batch.delete(docRef);
            break;
        }
      });

      await batch.commit();
      
      // Clear related cache entries
      this.clearRelatedCache(operations);
    }, 'high');
  }

  /**
   * Optimized real-time listener with performance controls
   */
  createOptimizedListener(
    collection: string,
    options: {
      where?: Array<{ field: string; operator: any; value: any }>;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      limit?: number;
    },
    onUpdate: (data: any[]) => void,
    onError?: (error: any) => void
  ): () => void {
    let query = firebase.firestore().collection(collection);

    // Apply conditions
    if (options.where) {
      options.where.forEach(condition => {
        query = query.where(condition.field, condition.operator, condition.value);
      });
    }

    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'desc');
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Throttle updates to prevent excessive re-renders
    const throttledUpdate = performanceOptimizer.throttle((snapshot: any) => {
      const data = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      onUpdate(data);
    }, 100);

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        throttledUpdate(snapshot);
      },
      (error) => {
        console.error('Firebase listener error:', error);
        onError?.(error);
      }
    );

    return unsubscribe;
  }

  /**
   * Cache management
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) {
      return false;
    }
    
    return Date.now() - cached.timestamp < this.CACHE_DURATION;
  }

  private setCache(key: string, data: any): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private clearRelatedCache(operations: Array<{ collection: string; docId: string }>): void {
    operations.forEach(operation => {
      const keysToDelete: string[] = [];
      
      this.cache.forEach((_, key) => {
        if (key.includes(operation.collection) || key.includes(operation.docId)) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => this.cache.delete(key));
    });
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const optimizedFirebase = OptimizedFirebaseService.getInstance();
