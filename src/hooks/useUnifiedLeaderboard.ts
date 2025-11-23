/**
 * 🏆 Use Unified Leaderboard Hook
 * Custom hook for unified leaderboard data management
 */

import { useState, useEffect, useCallback } from 'react';
import {
  UserLeaderboardEntry,
  ClubLeaderboardEntry,
  EventLeaderboardEntry,
  LeaderboardType
} from '../types/leaderboard';
import { getFirebaseCompatSync } from '../firebase/compat';

export interface UnifiedLeaderboardData {
  users: UserLeaderboardEntry[];
  clubs: ClubLeaderboardEntry[];
  events: EventLeaderboardEntry[];
  loading: boolean;
  error: string | null;
}

const firebase = getFirebaseCompatSync();

export const useUnifiedLeaderboard = () => {
  const [data, setData] = useState<UnifiedLeaderboardData>({
    users: [],
    clubs: [],
    events: [],
    loading: true,
    error: null
  });

  const db = getFirebaseCompatSync().firestore();

  /**
   * Fetch user leaderboard data
   */
  const fetchUserLeaderboard = useCallback(async (): Promise<UserLeaderboardEntry[]> => {
    try {
      const snapshot = await db
        .collection('userStats')
        .orderBy('totalScore', 'desc')
        .limit(100)
        .get();

      const users: UserLeaderboardEntry[] = [];
      let rank = 1;

      for (const doc of snapshot.docs) {
        const statsData = doc.data();
        
        // Get user profile data
        const userDoc = await db.collection('users').doc(doc.id).get();
        const userData = userDoc.data();

        if (userData) {
          users.push({
            id: doc.id,
            displayName: userData.displayName || 'İsimsiz Kullanıcı',
            avatar: userData.photoURL || '',
            totalScore: statsData.totalScore || 0,
            weeklyScore: statsData.weeklyScore || 0,
            monthlyScore: statsData.monthlyScore || 0,
            rank,
            badges: statsData.badges || [],
            university: userData.university || '',
            department: userData.department || '',
            classLevel: userData.classLevel || ''
          });
          rank++;
        }
      }

      return users;
    } catch (error) {
      console.error('Error fetching user leaderboard:', error);
      return [];
    }
  }, []);

  /**
   * Fetch club leaderboard data
   */
  const fetchClubLeaderboard = useCallback(async (): Promise<ClubLeaderboardEntry[]> => {
    try {
      const snapshot = await db
        .collection('clubs')
        .where('isActive', '==', true)
        .orderBy('totalScore', 'desc')
        .limit(50)
        .get();

      const clubs: ClubLeaderboardEntry[] = [];
      let rank = 1;

      snapshot.forEach(doc => {
        const data = doc.data();
        clubs.push({
          id: doc.id,
          name: data.name || data.displayName || 'İsimsiz Kulüp',
          avatar: data.logoUrl || data.photoURL || '',
          totalScore: data.totalScore || 0,
          weeklyScore: data.weeklyScore || 0,
          monthlyScore: data.monthlyScore || 0,
          rank,
          memberCount: data.memberCount || 0,
          eventsCount: data.eventsCount || 0,
          followersCount: data.followersCount || 0,
          university: data.university || '',
          category: data.category || 'diğer'
        });
        rank++;
      });

      return clubs;
    } catch (error) {
      console.error('Error fetching club leaderboard:', error);
      return [];
    }
  }, []);

  /**
   * Fetch event leaderboard data
   */
  const fetchEventLeaderboard = useCallback(async (): Promise<EventLeaderboardEntry[]> => {
    try {
      const snapshot = await db
        .collection('events')
        .where('status', '==', 'active')
        .orderBy('totalScore', 'desc')
        .limit(30)
        .get();

      const events: EventLeaderboardEntry[] = [];
      let rank = 1;

      snapshot.forEach(doc => {
        const data = doc.data();
        events.push({
          id: doc.id,
          title: data.title || 'İsimsiz Etkinlik',
          image: data.imageUrl || data.bannerUrl || '',
          totalScore: data.totalScore || 0,
          weeklyScore: data.weeklyScore || 0,
          monthlyScore: data.monthlyScore || 0,
          rank,
          attendeeCount: data.attendees ? data.attendees.length : 0,
          likesCount: data.likesCount || 0,
          commentsCount: data.commentsCount || 0,
          category: data.category || 'diğer',
          clubId: data.clubId || '',
          startDate: data.startDate
        });
        rank++;
      });

      return events;
    } catch (error) {
      console.error('Error fetching event leaderboard:', error);
      return [];
    }
  }, []);

  /**
   * Load all leaderboard data
   */
  const loadAllData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [users, clubs, events] = await Promise.all([
        fetchUserLeaderboard(),
        fetchClubLeaderboard(),
        fetchEventLeaderboard()
      ]);

      setData({
        users,
        clubs,
        events,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Veri yüklenirken hata oluştu'
      }));
    }
  }, [fetchUserLeaderboard, fetchClubLeaderboard, fetchEventLeaderboard]);

  /**
   * Refresh specific leaderboard type
   */
  const refreshLeaderboard = useCallback(async (type: LeaderboardType) => {
    setData(prev => ({ ...prev, loading: true }));

    try {
      switch (type) {
        case 'users':
          const users = await fetchUserLeaderboard();
          setData(prev => ({ ...prev, users, loading: false }));
          break;
        case 'clubs':
          const clubs = await fetchClubLeaderboard();
          setData(prev => ({ ...prev, clubs, loading: false }));
          break;
        case 'events':
          const events = await fetchEventLeaderboard();
          setData(prev => ({ ...prev, events, loading: false }));
          break;
      }
    } catch (error) {
      console.error(`Error refreshing ${type} leaderboard:`, error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: `${type} sıralaması yüklenirken hata oluştu`
      }));
    }
  }, [fetchUserLeaderboard, fetchClubLeaderboard, fetchEventLeaderboard]);

  /**
   * Get user rank by ID
   */
  const getUserRank = useCallback((userId: string): number => {
    const userIndex = data.users.findIndex(user => user.id === userId);
    return userIndex !== -1 ? userIndex + 1 : -1;
  }, [data.users]);

  /**
   * Get club rank by ID
   */
  const getClubRank = useCallback((clubId: string): number => {
    const clubIndex = data.clubs.findIndex(club => club.id === clubId);
    return clubIndex !== -1 ? clubIndex + 1 : -1;
  }, [data.clubs]);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    ...data,
    refreshLeaderboard,
    loadAllData,
    getUserRank,
    getClubRank
  };
};
