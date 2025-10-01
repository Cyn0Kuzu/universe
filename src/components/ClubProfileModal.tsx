import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { 
  Text, 
  Avatar, 
  Button, 
  Card, 
  Chip, 
  Divider, 
  useTheme 
} from 'react-native-paper';
import { UniversalAvatar } from './common';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firebase } from '../firebase';
import { getUniversityName } from '../constants/universities';
import { useAuth } from '../contexts/AuthContext';
import { ClubFollowSyncService } from '../services/clubFollowSyncService';
import { useUserAvatar } from '../hooks/useUserAvatar';

interface Club {
  id: string;
  name?: string;
  displayName?: string;
  description?: string;
  bio?: string;
  university?: string;
  profileImage?: string;
  email?: string;
  userType?: string;
  followerCount?: number;
  memberCount?: number;
  eventCount?: number;
  createdAt?: any;
  lastActive?: any;
  isFollowing?: boolean;
  isMember?: boolean;
}

interface ClubProfileModalProps {
  visible: boolean;
  onDismiss: () => void;
  clubId: string;
  onViewClub?: (clubId: string) => void;
  onFollow?: (clubId: string) => void;
  onUnfollow?: (clubId: string) => void;
}

const ClubProfileModal: React.FC<ClubProfileModalProps> = ({
  visible,
  onDismiss,
  clubId,
  onViewClub,
  onFollow,
  onUnfollow
}) => {
  const theme = useTheme();
  const { currentUser, isClubAccount } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const { avatarData: liveClub } = useUserAvatar(clubId);

  useEffect(() => {
    if (visible && clubId) {
      fetchClubData();
      
      // Gerçek zamanlı stats listener
      const db = firebase.firestore();
      const unsubscribe = db.collection('users').doc(clubId).onSnapshot(
        (doc) => {
          if (doc.exists && club) {
            const data = doc.data();
            const realFollowerCount = data?.followers ? data.followers.length : 0;
            
            setClub(prev => prev ? {
              ...prev,
              followerCount: realFollowerCount,
            } : prev);
          }
        },
        (err) => console.error('❌ ClubProfileModal real-time stats error:', err)
      );
      
      return () => unsubscribe();
    }
  }, [visible, clubId, club?.id]);

  const fetchClubData = async () => {
    if (!clubId) return;
    
    setLoading(true);
    try {
      const db = firebase.firestore();
      
      // Kulüp bilgilerini getir
      const clubDoc = await db.collection('users').doc(clubId).get();
      
      if (clubDoc.exists) {
        const clubData = clubDoc.data() as any;
        
        // Resolve a clean club display name for UI if data is generic/invalid
        const looksLikeEmail = (val?: string) => !!val && val.includes('@');
        const isBlank = (val?: any) => !val || (typeof val === 'string' && val.trim() === '');
        const isGeneric = (val?: string) => {
          const v = (val || '').toString().trim().toLowerCase();
          return v === 'kullanıcı' || v === 'kullanici' || v === 'user' || v === 'anonim kullanıcı' || v === 'anonim';
        };
        const candidates = [clubData.clubName, clubData.displayName, clubData.name, clubData.username, (clubData.email ? String(clubData.email).split('@')[0] : '')]
          .map((s: any) => (s ?? '').toString().trim())
          .filter((s: string) => s && !looksLikeEmail(s) && !isGeneric(s));
        const resolvedDisplayName = candidates[0] || 'Kulüp';
        
        // Check if current user is following this club
        let isFollowing = false;
        if (currentUser && clubData?.followers) {
          isFollowing = clubData.followers.includes(currentUser.uid);
        }
        
        // Check if current user is a member of this club
        let isMember = false;
        if (currentUser) {
          const membershipQuery = await db.collection('clubMembers')
            .where('userId', '==', currentUser.uid)
            .where('clubId', '==', clubId)
            .where('status', '==', 'approved')
            .get();
          
          isMember = !membershipQuery.empty;
        }
        
        // Gerçek zamanlı sayıları hesapla
        const [memberCountQuery, eventCountQuery] = await Promise.all([
          // Aktif üye sayısını al
          db.collection('clubMembers')
            .where('clubId', '==', clubId)
            .where('status', '==', 'approved')
            .get(),
          
          // Kulübün etkinlik sayısını al
          db.collection('events')
            .where('createdBy', '==', clubId)
            .get()
        ]);
        
        const realMemberCount = memberCountQuery.size;
        const realEventCount = eventCountQuery.size;
        const realFollowerCount = clubData.followers ? clubData.followers.length : 0;
        
        console.log('📊 Real-time club stats:', {
          followers: realFollowerCount,
          members: realMemberCount,
          events: realEventCount
        });
        
        setClub({
          id: clubId,
          ...clubData,
          displayName: resolvedDisplayName,
          name: resolvedDisplayName,
          clubName: clubData.clubName || resolvedDisplayName,
          followerCount: realFollowerCount,
          memberCount: realMemberCount,
          eventCount: realEventCount,
          isFollowing,
          isMember
        } as Club);
      }
    } catch (error) {
      console.error('Error fetching club data:', error);
      Alert.alert('Hata', 'Kulüp bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewClub = () => {
    onDismiss();
    if (onViewClub) {
      onViewClub(clubId);
    }
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !club || isClubAccount || followLoading) return;
    
    setFollowLoading(true);
    try {
      const clubName = club.displayName || club.name || 'Bilinmeyen Kulüp';
      
      if (club.isFollowing) {
        // Takipten çık - ClubFollowSyncService kullan
        console.log('🔄 Unfollowing club via ClubFollowSyncService...');
        const result = await ClubFollowSyncService.unfollowClub(
          currentUser.uid,
          clubId,
          clubName,
          'student'
        );
        
        if (result.success) {
          setClub(prev => prev ? {
            ...prev,
            isFollowing: false,
            followerCount: Math.max(0, (prev.followerCount || 0) - 1)
          } : null);
          onUnfollow?.(clubId);
          console.log('✅ Club unfollow successful');
        } else {
          throw new Error(result.error || 'Takipten çıkarken hata oluştu');
        }
      } else {
        // Takip et - ClubFollowSyncService kullan
        console.log('🔄 Following club via ClubFollowSyncService...');
        const result = await ClubFollowSyncService.followClub(
          currentUser.uid,
          clubId,
          clubName,
          'student'
        );
        
        if (result.success) {
          setClub(prev => prev ? {
            ...prev,
            isFollowing: true,
            followerCount: (prev.followerCount || 0) + 1
          } : null);
          onFollow?.(clubId);
          console.log('✅ Club follow successful');
        } else {
          throw new Error(result.error || 'Takip edilirken hata oluştu');
        }
      }
    } catch (error) {
      console.error('Error toggling club follow status:', error);
      Alert.alert('Hata', 'Takip durumu değiştirilirken bir hata oluştu.');
    } finally {
      setFollowLoading(false);
    }
  };

  const getDisplayName = () => {
    return liveClub?.displayName || club?.displayName || club?.name || 'İsimsiz Kulüp';
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('tr-TR');
    } catch (error) {
      return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onDismiss}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Kulüp Profili
            </Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>

          <Divider />

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={{ marginTop: 16, color: theme.colors.text }}>
                Kulüp bilgileri yükleniyor...
              </Text>
            </View>
          ) : club ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* Profile Picture and Basic Info */}
              <View style={styles.profileSection}>
                <UniversalAvatar 
                  user={{
                    id: club.id,
                    name: getDisplayName(),
                    displayName: getDisplayName(),
                    profileImage: liveClub?.profileImage || club.profileImage,
                    avatarIcon: (club as any).avatarIcon,
                    avatarColor: (club as any).avatarColor
                  }}
                  size={100}
                  style={styles.profileImage}
                  fallbackIcon="account-group"
                />
                
                <Text style={[styles.clubName, { color: theme.colors.text }]}>
                  {getDisplayName()}
                </Text>
                {!!(liveClub?.userName) && (
                  <Text style={{ color: '#8E8E93', marginBottom: 6 }}>@{liveClub.userName}</Text>
                )}
                
                {club.email && (
                  <Text style={[styles.clubEmail, { color: '#666' }]}>
                    {club.email}
                  </Text>
                )}

                <Chip 
                  icon="account-group" 
                  style={[styles.clubTypeChip, { backgroundColor: theme.colors.primary + '20' }]}
                  textStyle={{ color: theme.colors.primary }}
                >
                  Kulüp
                </Chip>
              </View>

              {/* University */}
              {(liveClub?.university || club.university) && (
                <Card style={[styles.infoCard, { backgroundColor: '#f5f5f5' }]}>
                  <Card.Content>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons 
                        name="school" 
                        size={20} 
                        color="#666"
                      />
                      <View style={styles.infoTextContainer}>
                        <Text style={{ color: '#666' }}>
                          {getUniversityName((liveClub?.university || club.university || '') as string)}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              )}

              {/* Description */}
              {(club.description || club.bio) && (
                <Card style={[styles.infoCard, { backgroundColor: '#f5f5f5' }]}>
                  <Card.Content>
                    <View style={styles.infoRow}>
                      <MaterialCommunityIcons 
                        name="text" 
                        size={20} 
                        color="#666"
                      />
                      <View style={styles.infoTextContainer}>
                        <Text style={{ color: '#666' }}>
                          {club.description || club.bio}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              )}

              {/* Stats */}
              <Card style={[styles.infoCard, { backgroundColor: '#f5f5f5' }]}>
                <Card.Content>
                  <Text style={[styles.sectionTitle, { color: '#333' }]}>
                    İstatistikler
                  </Text>
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.primary }}>
                        {club.followerCount || 0}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Takipçi
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.primary }}>
                        {club.memberCount || 0}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Üye
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.colors.primary }}>
                        {club.eventCount || 0}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Etkinlik
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              {/* Created Since */}
              {club.createdAt && (
                <View style={styles.memberSinceContainer}>
                  <MaterialCommunityIcons 
                    name="calendar-plus" 
                    size={16} 
                    color="#666"
                  />
                  <Text style={[styles.memberSinceText, { color: '#666' }]}>
                    {formatDate(club.createdAt)} tarihinden beri aktif
                  </Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={64} color={theme.colors.error || '#f44336'} />
              <Text style={[styles.errorTitle, { color: theme.colors.error || '#f44336' }]}>
                Kulüp Bulunamadı
              </Text>
              <Text style={[styles.errorText, { color: '#666' }]}>
                Bu kulübün bilgilerine erişilemiyor.
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {club && (
            <View style={styles.buttonContainer}>
              <Button 
                mode="contained" 
                onPress={handleViewClub}
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                labelStyle={{ color: 'white' }}
              >
                Kulübü Görüntüle
              </Button>
              {onFollow && onUnfollow && !isClubAccount && (
                <>
                  {/* Takip Et/Takipten Çık Butonu - sadece üye değilse göster */}
                  {!club.isMember && (
                    <Button 
                      mode={club.isFollowing ? "outlined" : "contained"} 
                      onPress={handleFollowToggle}
                      loading={followLoading}
                      disabled={followLoading}
                      style={[
                        styles.button, 
                        club.isFollowing 
                          ? { borderColor: '#666' } 
                          : { backgroundColor: theme.colors.accent || '#2196F3' }
                      ]}
                      labelStyle={{ 
                        color: club.isFollowing 
                          ? theme.colors.text 
                          : 'white'
                      }}
                    >
                      {followLoading 
                        ? 'İşleniyor...' 
                        : club.isFollowing ? 'Takipten Çık' : 'Takip Et'}
                    </Button>
                  )}
                  
                  {/* Üyelik Durumu Göstergesi */}
                  {club.isMember && (
                    <Button 
                      mode="contained" 
                      disabled
                      style={[
                        styles.button, 
                        { backgroundColor: '#4CAF50' }
                      ]}
                      labelStyle={{ color: 'white' }}
                      icon="check-circle"
                    >
                      Üyesin
                    </Button>
                  )}
                </>
              )}
              <Button 
                mode="outlined" 
                onPress={onDismiss}
                style={[styles.button, { borderColor: '#666' }]}
                labelStyle={{ color: theme.colors.text }}
              >
                Kapat
              </Button>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  avatarFallback: {
    marginBottom: 16,
  },
  clubName: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  clubEmail: {
    textAlign: 'center',
    marginBottom: 8,
  },
  clubTypeChip: {
    marginTop: 8,
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  memberSinceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  memberSinceText: {
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  button: {
    flex: 1,
    minWidth: 100,
  },
});

export default ClubProfileModal;
