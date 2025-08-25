// useGlobalFollowState Hook - Global takip durumlarını React bileşenlerinde kullanmak için
import { useState, useEffect, useCallback } from 'react';
import { globalFollowStateManager } from '../services/globalFollowStateManager';

export interface UseGlobalFollowStateResult {
  isFollowing: boolean | undefined;
  followerCount: number;
  followingCount: number;
  followUser: () => Promise<boolean>;
  unfollowUser: () => Promise<boolean>;
  removeFollower: () => Promise<boolean>;
  loading: boolean;
}

export function useGlobalFollowState(
  currentUserId: string | undefined,
  targetUserId: string,
  currentUserName?: string
): UseGlobalFollowStateResult {
  const [isFollowing, setIsFollowing] = useState<boolean | undefined>(undefined);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Follow işlemi
  const followUser = useCallback(async (): Promise<boolean> => {
    if (!currentUserId || !currentUserName) return false;
    
    setLoading(true);
    try {
      const success = await globalFollowStateManager.performFollow(
        currentUserId,
        currentUserName,
        targetUserId
      );
      return success;
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUserName, targetUserId]);

  // Unfollow işlemi
  const unfollowUser = useCallback(async (): Promise<boolean> => {
    if (!currentUserId || !currentUserName) return false;
    
    setLoading(true);
    try {
      const success = await globalFollowStateManager.performUnfollow(
        currentUserId,
        currentUserName,
        targetUserId
      );
      return success;
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUserName, targetUserId]);

  // Remove follower işlemi (X butonundan)
  const removeFollower = useCallback(async (): Promise<boolean> => {
    if (!currentUserId || !currentUserName) return false;
    
    setLoading(true);
    try {
      const success = await globalFollowStateManager.performRemoveFollower(
        currentUserId,
        currentUserName,
        targetUserId
      );
      return success;
    } finally {
      setLoading(false);
    }
  }, [currentUserId, currentUserName, targetUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    // İlk durumu ayarla
    const initialFollowState = globalFollowStateManager.getFollowState(currentUserId, targetUserId);
    setIsFollowing(initialFollowState);

    const targetStats = globalFollowStateManager.getUserStats(targetUserId);
    const currentUserStats = globalFollowStateManager.getUserStats(currentUserId);
    
    if (targetStats) {
      setFollowerCount(targetStats.followerCount);
    }
    if (currentUserStats) {
      setFollowingCount(currentUserStats.followingCount);
    }

    // Target user'ın değişikliklerini dinle
    const unsubscribeTarget = globalFollowStateManager.subscribeToUser(targetUserId, (data) => {
      console.log(`🔄 useGlobalFollowState: Target user ${targetUserId} update received:`, data);
      
      if (data.followerId === currentUserId) {
        setIsFollowing(data.isFollowing);
      }
      
      if (data.followerCount !== undefined) {
        setFollowerCount(data.followerCount);
      }
    });

    // Current user'ın değişikliklerini dinle
    const unsubscribeCurrent = globalFollowStateManager.subscribeToUser(currentUserId, (data) => {
      console.log(`🔄 useGlobalFollowState: Current user ${currentUserId} update received:`, data);
      
      if (data.followingCount !== undefined) {
        setFollowingCount(data.followingCount);
      }
    });

    // Global değişiklikleri dinle
    const unsubscribeGlobal = globalFollowStateManager.subscribeToFollowChanges((data) => {
      console.log('🔄 useGlobalFollowState: Global follow change received:', data);
      
      // Bu değişiklik bizim follow ilişkimizi etkiliyor mu?
      if (data.followerId === currentUserId && data.targetUserId === targetUserId) {
        setIsFollowing(data.isFollowing);
      }
      
      if (data.targetUserId === targetUserId && data.followerCount !== undefined) {
        setFollowerCount(data.followerCount);
      }
      
      if (data.followerId === currentUserId && data.followingCount !== undefined) {
        setFollowingCount(data.followingCount);
      }
    });

    // Cleanup
    return () => {
      unsubscribeTarget();
      unsubscribeCurrent();
      unsubscribeGlobal();
    };
  }, [currentUserId, targetUserId]);

  // Component mount'ta user follow state'lerini yükle
  useEffect(() => {
    if (currentUserId) {
      globalFollowStateManager.loadUserFollowStates(currentUserId);
    }
  }, [currentUserId]);

  return {
    isFollowing,
    followerCount,
    followingCount,
    followUser,
    unfollowUser,
    removeFollower,
    loading
  };
}

export default useGlobalFollowState;
