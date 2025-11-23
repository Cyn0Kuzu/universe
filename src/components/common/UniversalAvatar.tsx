import React, { useState, useEffect } from 'react';
import { Avatar } from 'react-native-paper';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useUserAvatar } from '../../hooks/useUserAvatar';

const firebase = getFirebaseCompatSync();

// Kullanıcı ID'sine göre tutarlı avatar rengi oluştur
const getAvatarColor = (userId: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', 
    '#AB47BC', '#26A69A', '#42A5F5', '#66BB6A',
    '#EF5350', '#5C6BC0', '#FF7043', '#9CCC65',
    '#8E24AA', '#D4AC0D', '#E67E22', '#E74C3C',
    '#3498DB', '#2ECC71', '#F39C12', '#9B59B6'
  ];
  
  if (!userId) return colors[0];
  
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit integer'a çevir
  }
  
  return colors[Math.abs(hash) % colors.length];
};

export interface UniversalAvatarProps {
  // Required props
  size?: number;
  style?: any;
  
  // User/Club data
  user?: {
    id?: string;
    name?: string;
    displayName?: string;
    profileImage?: string | null;
    profilePicture?: string | null; // alternative field name
    photoURL?: string | null; // Firebase Auth field
    logo?: string | null;
    avatarIcon?: string | null;
    avatarColor?: string | null;
  } | null;
  
  // Alternative individual props
  userId?: string;
  userName?: string;
  profileImage?: string | null;
  avatarIcon?: string | null;
  avatarColor?: string | null;
  
  // Fallback options
  fallbackIcon?: string;
  fallbackColor?: string;
}

/**
 * Evrensel Avatar Component
 * 
 * - Kullanıcı profil resimlerini otomatik olarak cache'ler ve real-time günceller
 * - Fallback olarak ikon veya ismin ilk harfini gösterir
 * - Firebase Storage, HTTP URL ve Base64 formatlarını destekler
 * 
 * Kullanım örnekleri:
 * 1. User objesi ile: <UniversalAvatar user={userData} size={40} />
 * 2. Individual props ile: <UniversalAvatar userId="123" userName="John" profileImage="url" size={40} />
 * 3. Fallback ile: <UniversalAvatar userName="Test" fallbackIcon="account" fallbackColor="#FF5722" size={40} />
 */
export const UniversalAvatar: React.FC<UniversalAvatarProps> = ({
  size = 40,
  style,
  user,
  userId,
  userName,
  profileImage,
  avatarIcon,
  avatarColor,
  fallbackIcon = 'account',
  fallbackColor
}) => {
  const [imageError, setImageError] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  // Merge user object with individual props
  const mergedData = {
    id: user?.id || userId,
    name: user?.displayName || user?.name || userName,
    profileImage: user?.profileImage || user?.profilePicture || user?.photoURL || profileImage,
    logo: user?.logo,
    avatarIcon: user?.avatarIcon || avatarIcon,
    avatarColor: user?.avatarColor || avatarColor
  };

  // Real-time avatar verilerini al
  const { avatarData, loading } = useUserAvatar(mergedData.id);

  // Final image URL'ini belirle (cache'den gelen veri öncelikli)
  const finalImageUrl = React.useMemo(() => {
    if (!imageError) {
      if (resolvedUrl) return resolvedUrl;
      if (avatarData?.profileImage) return avatarData.profileImage;
    }

    return null;
  }, [avatarData?.profileImage, resolvedUrl, imageError]);

  // Resolve potential Storage URLs or non-HTTP paths to HTTPS download URLs
  useEffect(() => {
    const candidates = [
      avatarData?.profileImage,
      mergedData.profileImage,
      mergedData.logo
    ].filter(Boolean) as string[];

    let active = true;

    const resolve = async () => {
      for (const raw of candidates) {
        try {
          if (!raw || typeof raw !== 'string') continue;
          const url = raw.trim();
          if (!url || url === 'null' || url === 'undefined') continue;

          // Already a usable URL (http/https/data)
          if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
            if (active) setResolvedUrl(url);
            return;
          }

          // gs:// Firebase Storage URL
          if (url.startsWith('gs://')) {
            try {
              const storageRef = (firebase as any).storage().refFromURL(url);
              const downloadUrl = await storageRef.getDownloadURL();
              if (active) setResolvedUrl(downloadUrl);
              return;
            } catch (e) {
              // continue to next candidate
            }
          }

      // Storage path like '/users/uid/avatar.jpg' OR 'users/uid/avatar.jpg'
      if (url.startsWith('/') || !url.includes('://')) {
            try {
        const storageRef = (firebase as any).storage().ref(url.startsWith('/') ? url : `/${url}`);
              const downloadUrl = await storageRef.getDownloadURL();
              if (active) setResolvedUrl(downloadUrl);
              return;
            } catch (e) {
              // continue to next candidate
            }
          }
        } catch (err) {
          // ignore and try next
        }
      }
      if (active) setResolvedUrl(null);
    };

    resolve();
    return () => { active = false; };
  }, [avatarData?.profileImage, mergedData.profileImage, mergedData.logo]);

  // Final display name'i belirle
  const finalDisplayName = avatarData?.displayName || mergedData.name;

  useEffect(() => {
    // Reset error state when data changes
    setImageError(false);
  }, [finalImageUrl, mergedData.id]);

  // Use react-native-paper Avatar component hierarchy:
  // 1. Profile Image - if exists and valid
  // 2. Avatar Icon - if specified
  // 3. Text Avatar - initial letter as fallback
  
  if (!imageError && finalImageUrl && finalImageUrl.trim() !== '') {
    // Image available - use Avatar.Image
    return (
      <Avatar.Image
        size={size}
        source={{ uri: finalImageUrl }}
        style={style}
        onError={() => {
          console.log('Universal avatar image failed to load:', finalImageUrl);
          setImageError(true);
        }}
      />
    );
  } else if (mergedData.avatarIcon) {
    // Custom icon specified - use Avatar.Icon
    const iconColor = mergedData.avatarColor || fallbackColor || getAvatarColor(mergedData.id || '');
    return (
      <Avatar.Icon
        size={size}
        icon={mergedData.avatarIcon}
        style={[{ backgroundColor: iconColor }, style]}
        color="white"
      />
    );
  } else if (finalDisplayName && finalDisplayName.trim() !== '') {
    // Name available - use Avatar.Text with first letter
    const backgroundColor = mergedData.avatarColor || fallbackColor || getAvatarColor(mergedData.id || '');
    const label = finalDisplayName.trim().charAt(0).toUpperCase();
    
    return (
      <Avatar.Text
        size={size}
        label={label}
        style={[{ backgroundColor }, style]}
        color="white"
      />
    );
  } else {
    // Fallback - use default icon
    const backgroundColor = mergedData.avatarColor || fallbackColor || getAvatarColor(mergedData.id || '');
    return (
      <Avatar.Icon
        size={size}
        icon={fallbackIcon}
        style={[{ backgroundColor }, style]}
        color="white"
      />
    );
  }
};

export default UniversalAvatar;
