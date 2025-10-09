/**
 * Background Loading Service
 * Preloads critical screens and data during splash screen
 */

import { firebase } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PreloadData {
  users: any[];
  clubs: any[];
  events: any[];
  userProfile: any;
  notifications: any[];
}

class BackgroundLoadingService {
  private static instance: BackgroundLoadingService;
  private preloadData: PreloadData = {
    users: [],
    clubs: [],
    events: [],
    userProfile: null,
    notifications: []
  };
  private isPreloading = false;
  private preloadPromise: Promise<void> | null = null;

  static getInstance(): BackgroundLoadingService {
    if (!BackgroundLoadingService.instance) {
      BackgroundLoadingService.instance = new BackgroundLoadingService();
    }
    return BackgroundLoadingService.instance;
  }

  /**
   * Start background preloading during splash screen
   */
  async startPreloading(userId?: string): Promise<void> {
    if (this.isPreloading || this.preloadPromise) {
      return this.preloadPromise;
    }

    this.isPreloading = true;
    console.log('🚀 Starting background preloading...');

    this.preloadPromise = this.performPreloading(userId);
    
    try {
      await this.preloadPromise;
      console.log('✅ Background preloading completed');
    } catch (error) {
      console.error('❌ Background preloading failed:', error);
    } finally {
      this.isPreloading = false;
    }

    return this.preloadPromise;
  }

  private async performPreloading(userId?: string): Promise<void> {
    const promises: Promise<any>[] = [];

    // Preload users (essential for search)
    promises.push(this.preloadUsers());

    // Preload clubs (essential for home screen)
    promises.push(this.preloadClubs());

    // Preload events (essential for home screen)
    promises.push(this.preloadEvents());

    // Preload user profile if userId provided
    if (userId) {
      promises.push(this.preloadUserProfile(userId));
      promises.push(this.preloadNotifications(userId));
    }

    // Execute all preloading in parallel
    await Promise.allSettled(promises);
  }

  private async preloadUsers(): Promise<void> {
    try {
      console.log('📱 Preloading users...');
      
      // Check if user is authenticated before preloading
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        console.log('⚠️ User not authenticated, skipping users preload');
        return;
      }

      const snapshot = await firebase.firestore()
        .collection('users')
        .where('userType', '==', 'student')
        .limit(100)
        .get();

      this.preloadData.users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cache users data
      await AsyncStorage.setItem('preloaded_users', JSON.stringify(this.preloadData.users));
      console.log(`✅ Preloaded ${this.preloadData.users.length} users`);
    } catch (error) {
      console.error('❌ Failed to preload users:', error);
    }
  }

  private async preloadClubs(): Promise<void> {
    try {
      console.log('🏢 Preloading clubs...');
      
      // Check if user is authenticated before preloading
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        console.log('⚠️ User not authenticated, skipping clubs preload');
        return;
      }

      const snapshot = await firebase.firestore()
        .collection('users')
        .where('userType', '==', 'club')
        .limit(50)
        .get();

      this.preloadData.clubs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cache clubs data
      await AsyncStorage.setItem('preloaded_clubs', JSON.stringify(this.preloadData.clubs));
      console.log(`✅ Preloaded ${this.preloadData.clubs.length} clubs`);
    } catch (error) {
      console.error('❌ Failed to preload clubs:', error);
    }
  }

  private async preloadEvents(): Promise<void> {
    try {
      console.log('📅 Preloading events...');
      
      // Check if user is authenticated before preloading
      const currentUser = firebase.auth().currentUser;
      if (!currentUser) {
        console.log('⚠️ User not authenticated, skipping events preload');
        return;
      }

      const snapshot = await firebase.firestore()
        .collection('events')
        .orderBy('startDate', 'desc')
        .limit(50)
        .get();

      this.preloadData.events = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
        };
      });

      // Cache events data
      await AsyncStorage.setItem('preloaded_events', JSON.stringify(this.preloadData.events));
      console.log(`✅ Preloaded ${this.preloadData.events.length} events`);
    } catch (error) {
      console.error('❌ Failed to preload events:', error);
    }
  }

  private async preloadUserProfile(userId: string): Promise<void> {
    try {
      console.log('👤 Preloading user profile...');
      const doc = await firebase.firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (doc.exists) {
        this.preloadData.userProfile = {
          id: doc.id,
          ...doc.data()
        };

        // Cache user profile
        await AsyncStorage.setItem('preloaded_user_profile', JSON.stringify(this.preloadData.userProfile));
        console.log('✅ Preloaded user profile');
      }
    } catch (error) {
      console.error('❌ Failed to preload user profile:', error);
    }
  }

  private async preloadNotifications(userId: string): Promise<void> {
    try {
      console.log('🔔 Preloading notifications...');
      const snapshot = await firebase.firestore()
        .collection('notifications')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      this.preloadData.notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Cache notifications
      await AsyncStorage.setItem('preloaded_notifications', JSON.stringify(this.preloadData.notifications));
      console.log(`✅ Preloaded ${this.preloadData.notifications.length} notifications`);
    } catch (error) {
      console.error('❌ Failed to preload notifications:', error);
    }
  }

  /**
   * Get preloaded data
   */
  getPreloadedData(): PreloadData {
    return this.preloadData;
  }

  /**
   * Get cached data from AsyncStorage
   */
  async getCachedData(): Promise<Partial<PreloadData>> {
    try {
      const [users, clubs, events, userProfile, notifications] = await Promise.all([
        AsyncStorage.getItem('preloaded_users'),
        AsyncStorage.getItem('preloaded_clubs'),
        AsyncStorage.getItem('preloaded_events'),
        AsyncStorage.getItem('preloaded_user_profile'),
        AsyncStorage.getItem('preloaded_notifications'),
      ]);

      return {
        users: users ? JSON.parse(users) : [],
        clubs: clubs ? JSON.parse(clubs) : [],
        events: events ? JSON.parse(events) : [],
        userProfile: userProfile ? JSON.parse(userProfile) : null,
        notifications: notifications ? JSON.parse(notifications) : [],
      };
    } catch (error) {
      console.error('❌ Failed to get cached data:', error);
      return {};
    }
  }

  /**
   * Clear cached data
   */
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem('preloaded_users'),
        AsyncStorage.removeItem('preloaded_clubs'),
        AsyncStorage.removeItem('preloaded_events'),
        AsyncStorage.removeItem('preloaded_user_profile'),
        AsyncStorage.removeItem('preloaded_notifications'),
      ]);
      console.log('✅ Cleared preload cache');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Check if preloading is complete
   */
  isPreloadComplete(): boolean {
    return !this.isPreloading && this.preloadPromise !== null;
  }
}

export default BackgroundLoadingService;
