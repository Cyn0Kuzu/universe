/**
 * 🎨 Enhanced Event Card Component
 * Modern, responsive, and data-synchronized event card
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
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { UniversalAvatar } from './common';
import { useResponsiveDesign } from '../utils/responsiveDesignUtils';
import unifiedDataSyncService, { UnifiedEventData } from '../services/unifiedDataSyncService';
import { useAuth } from '../contexts/AuthContext';
import moment from 'moment';
import 'moment/locale/tr';

const { width: screenWidth } = Dimensions.get('window');
moment.locale('tr');

interface EnhancedEventCardProps {
  eventId: string;
  onPress: () => void;
  onJoin?: (eventId: string) => Promise<void>;
  onUnjoin?: (eventId: string) => Promise<void>;
  onLike?: (eventId: string) => Promise<void>;
  onUnlike?: (eventId: string) => Promise<void>;
  onShare?: (eventId: string) => Promise<void>;
  showJoinButton?: boolean;
  showLikeButton?: boolean;
  showShareButton?: boolean;
  style?: any;
}

export const EnhancedEventCard: React.FC<EnhancedEventCardProps> = ({
  eventId,
  onPress,
  onJoin,
  onUnjoin,
  onLike,
  onUnlike,
  onShare,
  showJoinButton = true,
  showLikeButton = true,
  showShareButton = true,
  style,
}) => {
  const { wp, hp, isTablet } = useResponsiveDesign();
  const { currentUser } = useAuth();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const [eventData, setEventData] = useState<UnifiedEventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Load event data with real-time service
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      // Import realTimeDataSyncService at the top and use it here
      const realTimeDataSyncService = (await import('../services/realTimeDataSyncService')).default;
      const data = await realTimeDataSyncService.getRealTimeEventData(eventId, currentUser?.uid);
      
      // Convert to UnifiedEventData format for compatibility
      setEventData(data as any);
      console.log('✅ EnhancedEventCard: Loaded real-time event data:', {
        eventId,
        participants: data.participants,
        likes: data.likes,
        comments: data.comments
      });
    } catch (error) {
      console.error('Error loading event data:', error);
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

  const handleJoin = async () => {
    if (!eventData || actionLoading) return;
    
    try {
      setActionLoading(true);
      if (eventData.isJoined) {
        await onUnjoin?.(eventId);
        // Update local state
        setEventData(prev => prev ? {
          ...prev,
          isJoined: false,
          participants: Math.max(0, prev.participants - 1)
        } : null);
      } else {
        await onJoin?.(eventId);
        // Update local state
        setEventData(prev => prev ? {
          ...prev,
          isJoined: true,
          participants: prev.participants + 1
        } : null);
      }
      
      // Refresh data from server
      await unifiedDataSyncService.refreshEventData(eventId, currentUser?.uid);
      await loadEventData();
    } catch (error) {
      console.error('Error handling join action:', error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLike = async () => {
    if (!eventData || actionLoading) return;
    
    try {
      setActionLoading(true);
      if (eventData.isLiked) {
        await onUnlike?.(eventId);
        // Update local state
        setEventData(prev => prev ? {
          ...prev,
          isLiked: false,
          likes: Math.max(0, prev.likes - 1)
        } : null);
      } else {
        await onLike?.(eventId);
        // Update local state
        setEventData(prev => prev ? {
          ...prev,
          isLiked: true,
          likes: prev.likes + 1
        } : null);
      }
      
      // Refresh data from server
      await unifiedDataSyncService.refreshEventData(eventId, currentUser?.uid);
      await loadEventData();
    } catch (error) {
      console.error('Error handling like action:', error);
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!eventData || actionLoading) return;
    
    try {
      setActionLoading(true);
      await onShare?.(eventId);
    } catch (error) {
      console.error('Error handling share action:', error);
      Alert.alert('Hata', 'Paylaşım gerçekleştirilemedi');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    
    const momentDate = moment(date.toDate ? date.toDate() : date);
    return momentDate.format('DD MMMM YYYY, HH:mm');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'rejected':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
      default:
        return '#2196F3';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Onaylandı';
      case 'pending':
        return 'Beklemede';
      case 'rejected':
        return 'Reddedildi';
      case 'cancelled':
        return 'İptal Edildi';
      default:
        return 'Bilinmiyor';
    }
  };

  if (loading || !eventData) {
    return (
      <View style={[styles.card, styles.loadingCard, style]}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingImage} />
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
        <LinearGradient
          colors={['#F093FB', '#F5576C']}
          style={styles.cardGradient}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.eventInfo}>
              <View style={styles.eventImageContainer}>
                {eventData.imageUrl ? (
                  <Image source={{ uri: eventData.imageUrl }} style={styles.eventImage} />
                ) : (
                  <View style={styles.eventImagePlaceholder}>
                    <MaterialCommunityIcons name="calendar-star" size={40} color="#fff" />
                  </View>
                )}
              </View>
              
              <View style={styles.eventDetails}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {eventData.title}
                </Text>
                
                <View style={styles.organizerInfo}>
                  <UniversalAvatar
                    userName={eventData.organizer.name}
                    profileImage={eventData.organizer.avatar}
                    size={24}
                  />
                  <Text style={styles.organizerName} numberOfLines={1}>
                    {eventData.organizer.name}
                  </Text>
                </View>
                
                {eventData.location && (
                  <Text style={styles.location} numberOfLines={1}>
                    📍 {eventData.location}
                  </Text>
                )}
                
                {eventData.category && (
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{eventData.category}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(eventData.status) }]}>
              <Text style={styles.statusText}>{getStatusText(eventData.status)}</Text>
            </View>
          </View>

          {/* Date and Time */}
          <View style={styles.dateContainer}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color="#fff" />
            <Text style={styles.dateText}>
              {formatDate(eventData.startDate)}
            </Text>
          </View>

          {/* Description */}
          {eventData.description && (
            <Text style={styles.description} numberOfLines={2}>
              {eventData.description}
            </Text>
          )}

          {/* Statistics */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="heart" size={16} color="#fff" />
              <Text style={styles.statValue}>{eventData.likes}</Text>
              <Text style={styles.statLabel}>Beğeni</Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="comment" size={16} color="#fff" />
              <Text style={styles.statValue}>{eventData.comments}</Text>
              <Text style={styles.statLabel}>Yorum</Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-group" size={16} color="#fff" />
              <Text style={styles.statValue}>{eventData.participants}</Text>
              <Text style={styles.statLabel}>Katılımcı</Text>
            </View>
            
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={16} color="#fff" />
              <Text style={styles.statValue}>{eventData.totalScore}</Text>
              <Text style={styles.statLabel}>Puan</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {showJoinButton && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.joinButton,
                  eventData.isJoined && styles.joinedButton
                ]}
                onPress={handleJoin}
                disabled={actionLoading || eventData.status !== 'approved'}
              >
                <MaterialCommunityIcons
                  name={eventData.isJoined ? "account-minus" : "account-plus"}
                  size={16}
                  color="#fff"
                />
                <Text style={styles.actionButtonText}>
                  {eventData.isJoined ? 'Ayrıl' : 'Katıl'}
                </Text>
              </TouchableOpacity>
            )}

            {showLikeButton && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.likeButton,
                  eventData.isLiked && styles.likedButton
                ]}
                onPress={handleLike}
                disabled={actionLoading}
              >
                <MaterialCommunityIcons
                  name={eventData.isLiked ? "heart" : "heart-outline"}
                  size={16}
                  color={eventData.isLiked ? "#fff" : "#F093FB"}
                />
                <Text style={[
                  styles.actionButtonText,
                  eventData.isLiked && styles.likedButtonText
                ]}>
                  {eventData.isLiked ? 'Beğenildi' : 'Beğen'}
                </Text>
              </TouchableOpacity>
            )}

            {showShareButton && (
              <TouchableOpacity
                style={[styles.actionButton, styles.shareButton]}
                onPress={handleShare}
                disabled={actionLoading}
              >
                <MaterialCommunityIcons
                  name="share"
                  size={16}
                  color="#F093FB"
                />
                <Text style={styles.actionButtonText}>Paylaş</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  loadingCard: {
    backgroundColor: '#f0f0f0',
    height: 250,
  },
  cardGradient: {
    padding: 16,
    minHeight: 250,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  loadingImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
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
    width: '80%',
  },
  loadingSubtitle: {
    height: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  loadingStats: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    width: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  eventImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  eventImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetails: {
    flex: 1,
    marginLeft: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    lineHeight: 20,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  organizerName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
    flex: 1,
  },
  location: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  categoryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 18,
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  joinButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  joinedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  likeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  likedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  shareButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  likedButtonText: {
    color: '#fff',
  },
});

export default EnhancedEventCard;
