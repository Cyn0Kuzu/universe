/**
 * 🏆 useRealtimeLeaderboard Hook
 * Real-time leaderboard data management
 */

import { useState, useEffect, useCallback } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import type { 
  LeaderboardType, 
  LeaderboardEntry, 
  LeaderboardHookReturn,
  UserLeaderboardEntry,
  ClubLeaderboardEntry,
  EventLeaderboardEntry
} from '../types/leaderboard';

interface UseRealtimeLeaderboardProps {
  type: LeaderboardType;
  limit?: number;
  userId?: string;
}

export const useRealtimeLeaderboard = ({ 
  type, 
  limit = 50, 
  userId 
}: UseRealtimeLeaderboardProps): LeaderboardHookReturn => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const db = firebase.firestore();
      let query: firebase.firestore.Query;

      switch (type) {
        case 'users':
          query = db.collection('users')
            .where('isActive', '==', true)
            .orderBy('totalScore', 'desc')
            .limit(limit);
          break;

        case 'clubs':
          query = db.collection('clubs')
            .where('isActive', '==', true)
            .orderBy('totalScore', 'desc')
            .limit(limit);
          break;

        case 'events':
          query = db.collection('events')
            .where('status', 'in', ['published', 'ongoing', 'completed'])
            .orderBy('totalScore', 'desc')
            .limit(limit);
          break;

        default:
          throw new Error(`Unsupported leaderboard type: ${type}`);
      }

      const snapshot = await query.get();
      const entries: LeaderboardEntry[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Base entry data
        const baseEntry = {
          id: doc.id,
          name: data.name || data.displayName || data.title || 'İsimsiz',
          displayName: data.displayName || data.name || data.title,
          avatar: data.profileImage || data.photoURL || data.imageUrl,
          profileImage: data.profileImage || data.photoURL || data.imageUrl,
          totalScore: data.totalScore || 0,
          likes: data.likesCount || 0,
          comments: data.commentsCount || 0,
          participations: data.participationsCount || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        };

        // Type-specific data
        if (type === 'users') {
          const userEntry: UserLeaderboardEntry = {
            ...baseEntry,
            username: data.username,
            university: data.university,
            department: data.department,
            email: data.email,
            followersCount: data.followersCount || 0,
            followingCount: data.followingCount || 0,
            eventsJoined: data.eventsJoined || 0,
            clubsFollowed: data.clubsFollowed || 0
          };
          entries.push(userEntry);
        } else if (type === 'clubs') {
          const clubEntry: ClubLeaderboardEntry = {
            ...baseEntry,
            description: data.description,
            university: data.university,
            category: data.category,
            memberCount: data.memberCount || 0,
            eventsCount: data.eventsCount || 0,
            followersCount: data.followersCount || 0,
            ownerId: data.ownerId || data.createdBy,
            ownerName: data.ownerName
          };
          entries.push(clubEntry);
        } else if (type === 'events') {
          const eventEntry: EventLeaderboardEntry = {
            ...baseEntry,
            title: data.title || data.name || 'İsimsiz Etkinlik',
            description: data.description,
            imageUrl: data.imageUrl || data.coverImage || data.photoURL,
            coverImage: data.coverImage || data.imageUrl,
            startDate: data.startDate,
            endDate: data.endDate,
            location: data.location,
            organizerId: data.organizerId || data.createdBy,
            organizerDisplayName: data.organizerDisplayName,
            organizerUsername: data.organizerUsername,
            organizerProfileImage: data.organizerProfileImage,
            clubId: data.clubId,
            clubName: data.clubName,
            attendeesCount: data.attendeesCount || 0,
            likesCount: data.likesCount || 0,
            commentsCount: data.commentsCount || 0,
            status: data.status || 'published'
          };
          entries.push(eventEntry);
        }
      });

      // Add rank to entries
      const entriesWithRank = entries.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      setData(entriesWithRank);
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      setError('Veriler yüklenirken hata oluştu');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [type, limit]);

  const refresh = useCallback(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Set up real-time listener
  useEffect(() => {
    const db = firebase.firestore();
    let query: firebase.firestore.Query;

    try {
      switch (type) {
        case 'users':
          query = db.collection('users')
            .where('isActive', '==', true)
            .orderBy('totalScore', 'desc')
            .limit(limit);
          break;

        case 'clubs':
          query = db.collection('clubs')
            .where('isActive', '==', true)
            .orderBy('totalScore', 'desc')
            .limit(limit);
          break;

        case 'events':
          query = db.collection('events')
            .where('status', 'in', ['published', 'ongoing', 'completed'])
            .orderBy('totalScore', 'desc')
            .limit(limit);
          break;

        default:
          console.warn(`Unsupported leaderboard type: ${type}`);
          return;
      }

      const unsubscribe = query.onSnapshot(
        (snapshot) => {
          if (!snapshot.metadata.hasPendingWrites) {
            // Only update if changes come from server
            fetchLeaderboardData();
          }
        },
        (err) => {
          console.error('Leaderboard listener error:', err);
          setError('Gerçek zamanlı güncellemeler alınamıyor');
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up leaderboard listener:', err);
      return undefined;
    }
  }, [type, limit, fetchLeaderboardData]);

  return {
    data,
    loading,
    error,
    refresh
  };
};
