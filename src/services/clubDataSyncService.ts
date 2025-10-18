import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { comprehensiveDataSyncService } from './comprehensiveDataSyncService';

export interface ClubData {
  id: string;
  clubName: string;
  displayName?: string;
  name?: string;
  fullName?: string;
  description?: string;
  bio?: string;
  university?: string;
  clubTypes?: string[];
  clubType?: string;
  profileImage?: string;
  avatarIcon?: string;
  avatarColor?: string;
  coverImage?: string;
  coverIcon?: string;
  coverColor?: string;
  createdAt?: any;
  public?: boolean;
  memberCount?: number;
  followers?: string[];
  following?: string[];
  followerCount?: number;
  followingCount?: number;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  events?: any[];
  eventCount?: number;
  userType?: string;
  foundationYear?: string;
  establishedDate?: any;
  username?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

class ClubDataSyncService {
  private clubCache: Map<string, ClubData> = new Map();
  private listeners: Map<string, Set<(data: ClubData) => void>> = new Map();
  private isInitialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Subscribe to comprehensive sync service for club updates
      comprehensiveDataSyncService.subscribe('ClubDataSyncService', (data) => {
        if (data.type === 'profile' && data.userId) {
          this.handleClubUpdate(data.userId, data.data);
        }
      });
      
      this.isInitialized = true;
      console.log('✅ ClubDataSyncService initialized');
    } catch (error) {
      console.error('❌ Failed to initialize ClubDataSyncService:', error);
    }
  }

  private handleClubUpdate(clubId: string, clubData: any) {
    if (clubData && (clubData.userType === 'club' || clubData.clubName)) {
      console.log(`🔄 Club data updated for ${clubId}, refreshing cache...`);
      this.clubCache.delete(clubId);
      this.broadcastUpdate(clubId, clubData);
    }
  }

  private broadcastUpdate(clubId: string, clubData: ClubData) {
    const listenerSet = this.listeners.get(clubId);
    if (listenerSet) {
      listenerSet.forEach((listener) => {
        try {
          listener(clubData);
        } catch (error) {
          console.error('Error in club data listener:', error);
        }
      });
    }
  }

  // Get club data with caching and real-time updates
  async getClubData(clubId: string, forceRefresh = false): Promise<ClubData | null> {
    try {
      // Check cache first
      if (!forceRefresh && this.clubCache.has(clubId)) {
        return this.clubCache.get(clubId)!;
      }

      console.log(`🔄 Fetching club data for: ${clubId}`);
      
      const db = firebase.firestore();
      const clubDoc = await db.collection('users').doc(clubId).get();
      
      if (!clubDoc.exists) {
        console.warn(`⚠️ Club document not found: ${clubId}`);
        return null;
      }

      const clubData = clubDoc.data() as ClubData;
      clubData.id = clubId;

      // Normalize club name
      clubData.clubName = this.normalizeClubName(clubData);
      
      // Cache the data
      this.clubCache.set(clubId, clubData);
      
      console.log(`✅ Club data fetched and cached for: ${clubId}`);
      return clubData;
    } catch (error) {
      console.error(`❌ Failed to fetch club data for ${clubId}:`, error);
      return null;
    }
  }

  // Invalidate club cache
  invalidateCache(clubId: string): void {
    this.clubCache.delete(clubId);
    console.log(`🗑️ Club cache invalidated for: ${clubId}`);
  }

  // Normalize club name from various fields
  private normalizeClubName(clubData: ClubData): string {
    // Priority order: clubName > displayName > name > fullName
    let clubName = clubData.clubName || 
                   clubData.displayName || 
                   clubData.name || 
                   clubData.fullName;

    // If no name found or it's an email, use default
    if (!clubName || clubName.includes('@')) {
      clubName = 'Kulüp';
    }

    return clubName;
  }

  // Subscribe to club data updates
  subscribe(clubId: string, callback: (data: ClubData) => void) {
    if (!this.listeners.has(clubId)) {
      this.listeners.set(clubId, new Set());
    }
    this.listeners.get(clubId)!.add(callback);
  }

  // Unsubscribe from club data updates
  unsubscribe(clubId: string, callback?: (data: ClubData) => void) {
    const listenerSet = this.listeners.get(clubId);
    if (listenerSet) {
      if (callback) {
        listenerSet.delete(callback);
      } else {
        listenerSet.clear();
      }
      
      if (listenerSet.size === 0) {
        this.listeners.delete(clubId);
      }
    }
  }

  // Update club data and sync across all collections
  async updateClubData(clubId: string, updateData: Partial<ClubData>) {
    try {
      console.log(`🔄 Updating club data for: ${clubId}`);
      
      const db = firebase.firestore();
      const batch = db.batch();

      // Update main user document
      const userRef = db.collection('users').doc(clubId);
      batch.update(userRef, {
        ...updateData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Update events where club is organizer
      const eventsQuery = await db.collection('events')
        .where('createdBy', '==', clubId)
        .get();
      
      eventsQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          organizer: {
            ...updateData,
            id: clubId
          },
          clubName: updateData.clubName || updateData.displayName,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      // Update club memberships
      const membershipsQuery = await db.collection('clubMembers')
        .where('clubId', '==', clubId)
        .get();
      
      membershipsQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          club: {
            ...updateData,
            id: clubId
          },
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      
      // Clear cache and trigger sync
      this.clubCache.delete(clubId);
      await comprehensiveDataSyncService.forceSyncUser(clubId);
      
      console.log(`✅ Club data updated and synced for: ${clubId}`);
    } catch (error) {
      console.error(`❌ Failed to update club data for ${clubId}:`, error);
      throw error;
    }
  }

  // Get club display name with fallbacks
  getClubDisplayName(clubData: ClubData | null | any): string {
    if (!clubData) return 'Kulüp';
    
    // Handle different data structures
    const clubName = clubData.clubName || 
                    clubData.displayName || 
                    clubData.name || 
                    clubData.fullName ||
                    clubData.firstName + ' ' + clubData.lastName ||
                    'Kulüp';
    
    // If no name found or it's an email, use default
    if (!clubName || clubName.includes('@') || clubName.trim() === '') {
      return 'Kulüp';
    }
    
    return clubName.trim();
  }

  // Get club username
  getClubUsername(clubData: ClubData | null): string {
    if (!clubData) return 'kulup';
    
    const displayName = this.getClubDisplayName(clubData);
    return displayName.toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20) || 'kulup';
  }

  // Clear cache for a specific club
  clearClubCache(clubId: string) {
    this.clubCache.delete(clubId);
  }

  // Clear all cache
  clearAllCache() {
    this.clubCache.clear();
  }

  // Cleanup
  destroy() {
    this.clubCache.clear();
    this.listeners.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const clubDataSyncService = new ClubDataSyncService();
export default clubDataSyncService;
