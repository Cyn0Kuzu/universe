/**
 * 🎨 Enhanced Club Card Component
 * Modern, responsive, and data-synchronized club card
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UniversalAvatar } from './common';
import { useResponsiveDesign } from '../utils/responsiveDesignUtils';
import { getUniversityName } from '../constants/universities';
import unifiedDataSyncService, { UnifiedClubData } from '../services/unifiedDataSyncService';
import { useAuth } from '../contexts/AuthContext';

const { width: screenWidth } = Dimensions.get('window');

interface EnhancedClubCardProps {
  clubId: string;
  onPress: () => void;
  onFollow?: (clubId: string) => Promise<void>;
  onUnfollow?: (clubId: string) => Promise<void>;
  onJoin?: (clubId: string) => Promise<void>;
  onLeave?: (clubId: string) => Promise<void>;
  showFollowButton?: boolean;
  showJoinButton?: boolean;
  style?: any;
}

export const EnhancedClubCard: React.FC<EnhancedClubCardProps> = ({
  clubId,
  onPress,
  onFollow,
  onUnfollow,
  onJoin,
  onLeave,
  showFollowButton = true,
  showJoinButton = true,
  style,
}) => {
  const { wp, hp, isTablet } = useResponsiveDesign();
  const { currentUser } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const [clubData, setClubData] = useState<UnifiedClubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load club data with real-time service
  useEffect(() => {
    loadClubData();
  }, [clubId]);

  const loadClubData = async () => {
    try {
      setLoading(true);
      // Import realTimeDataSyncService at the top and use it here
      const realTimeDataSyncService = (await import('../services/realTimeDataSyncService')).default;
      const data = await realTimeDataSyncService.getRealTimeClubData(clubId, currentUser?.uid);
      
      // Convert to UnifiedClubData format for compatibility
      setClubData(data as any);
      console.log('✅ EnhancedClubCard: Loaded real-time club data:', {
        clubId,
        memberCount: data.memberCount,
        followerCount: data.followerCount,
        eventCount: data.eventCount
      });
    } catch (error) {
      console.error('Error loading club data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const handleFollow = async () => {
    if (!clubData || actionLoading) return;
    
    try {
      setActionLoading(true);
      if (clubData.isFollowing) {
        await onUnfollow?.(clubId);
        // Update local state
        setClubData(prev => prev ? {
          ...prev,
          isFollowing: false,
          followerCount: Math.max(0, prev.followerCount - 1)
        } : null);
      } else {
        await onFollow?.(clubId);
        // Update local state
        setClubData(prev => prev ? {
          ...prev,
          isFollowing: true,
          followerCount: prev.followerCount + 1
        } : null);
      }
      
      // Refresh data from server
      await unifiedDataSyncService.refreshClubData(clubId, currentUser?.uid);
      await loadClubData();
    } catch (error) {
      console.error('Error handling follow action:', error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!clubData || actionLoading) return;
    
    try {
      setActionLoading(true);
      if (clubData.isMember) {
        await onLeave?.(clubId);
        // Update local state
        setClubData(prev => prev ? {
          ...prev,
          isMember: false,
          membershipStatus: 'none' as const,
          memberCount: Math.max(0, prev.memberCount - 1)
        } : null);
      } else {
        await onJoin?.(clubId);
        // Update local state
        setClubData(prev => prev ? {
          ...prev,
          membershipStatus: 'pending' as const
        } : null);
      }
      
      // Refresh data from server
      await unifiedDataSyncService.refreshClubData(clubId, currentUser?.uid);
      await loadClubData();
    } catch (error) {
      console.error('Error handling join action:', error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const getMembershipButtonText = () => {
    if (!clubData) return 'Yükleniyor...';
    
    switch (clubData.membershipStatus) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Ayrıl';
      case 'rejected':
        return 'Tekrar Başvur';
      default:
        return 'Katıl';
    }
  };

  const getMembershipButtonColor = () => {
    if (!clubData) return '#2196F3';
    
    switch (clubData.membershipStatus) {
      case 'pending':
        return '#FF9800';
      case 'approved':
        return '#F44336';
      case 'rejected':
        return '#4CAF50';
      default:
        return '#2196F3';
    }
  };

  if (loading || !clubData) {
    return (
      <View style={[styles.card, styles.loadingCard, style]}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingAvatar} />
          <View style={styles.loadingTextContainer}>
            <View style={styles.loadingTitle} />
            <View style={styles.loadingSubtitle} />
            <View style={styles.loadingStats} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.card, style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          {/* Minimal Club Info - Sadece temel bilgiler */}
          <View style={styles.clubInfo}>
            <UniversalAvatar
              userName={clubData.displayName}
              profileImage={clubData.profileImage}
              avatarIcon={clubData.avatarIcon}
              avatarColor={clubData.avatarColor}
              size={isTablet ? 55 : 48}
            />
            
            <View style={styles.clubDetails}>
              {/* İsim */}
              <Text style={styles.clubName} numberOfLines={1}>
                {clubData.displayName}
              </Text>
              
              {/* Kullanıcı adı */}
              <Text style={styles.username} numberOfLines={1}>
                @{clubData.clubName.toLowerCase().replace(/\s+/g, '_')}
              </Text>
              
              {/* Üniversite */}
              {clubData.university && (
                <Text style={styles.university} numberOfLines={1}>
                  {getUniversityName(clubData.university)}
                </Text>
              )}
              
              {/* Biyografi */}
              {(clubData.bio || clubData.description) && (
                <Text style={styles.bio} numberOfLines={2}>
                  {clubData.bio || clubData.description}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  loadingCard: {
    backgroundColor: '#f0f0f0',
    height: 200,
  },
  cardContent: {
    padding: 14,
    backgroundColor: '#fff',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
  },
  loadingTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  loadingTitle: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
  },
  loadingSubtitle: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '50%',
  },
  loadingStats: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: '80%',
  },
  clubInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clubDetails: {
    flex: 1,
    marginLeft: 12,
  },
  clubName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 3,
  },
  username: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  university: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  bio: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    marginTop: 4,
  },
});

export default EnhancedClubCard;
