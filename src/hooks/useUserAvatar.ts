import { useState, useEffect } from 'react';
import { globalAvatarCache, UserAvatarData } from '../services/globalAvatarCacheService';

/**
 * Kullanıcı avatar verilerini yönetmek için hook
 */
export const useUserAvatar = (userId: string | undefined) => {
  const [avatarData, setAvatarData] = useState<UserAvatarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setAvatarData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Initial fetch
    const fetchAvatar = async () => {
      try {
        const data = await globalAvatarCache.getUserAvatarData(userId);
        if (isMounted) {
          setAvatarData(data);
          setLoading(false);
        }
      } catch (error) {
        console.error('useUserAvatar fetch error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAvatar();

    // Real-time güncellemeleri dinle
    const unsubscribe = globalAvatarCache.subscribeToAvatarUpdates(userId, (newData) => {
      if (isMounted) {
        setAvatarData(newData);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [userId]);

  return { avatarData, loading };
};

/**
 * Birden çok kullanıcının avatar verilerini yönetmek için hook
 */
export const useMultipleUserAvatars = (userIds: string[]) => {
  const [avatarMap, setAvatarMap] = useState<Map<string, UserAvatarData>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userIds.length === 0) {
      setAvatarMap(new Map());
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Initial batch fetch
    const fetchAvatars = async () => {
      try {
        const results = await globalAvatarCache.batchCacheUsers(userIds);
        if (isMounted) {
          setAvatarMap(results);
          setLoading(false);
        }
      } catch (error) {
        console.error('useMultipleUserAvatars fetch error:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAvatars();

    // Her kullanıcı için real-time listener kur
    const unsubscribers: (() => void)[] = [];

    userIds.forEach(userId => {
      const unsubscribe = globalAvatarCache.subscribeToAvatarUpdates(userId, (newData) => {
        if (isMounted) {
          setAvatarMap(prev => {
            const newMap = new Map(prev);
            newMap.set(userId, newData);
            return newMap;
          });
        }
      });
      unsubscribers.push(unsubscribe);
    });

    return () => {
      isMounted = false;
      unsubscribers.forEach(unsub => unsub());
    };
  }, [JSON.stringify(userIds)]); // userIds array'i değiştiğinde yeniden çalıştır

  return { avatarMap, loading };
};

export default useUserAvatar;
