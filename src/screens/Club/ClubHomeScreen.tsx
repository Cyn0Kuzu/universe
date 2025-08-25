import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, Card, Chip, Avatar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { firebase } from '../../firebase';
import { LinearGradient } from 'expo-linear-gradient';

// Components
import { ClubMemberStats } from '../../components';

// Enhanced Services
import { enhancedClubStatsService, ClubStats } from '../../services/enhancedClubStatsService';
import { ClubStatsService } from '../../services/clubStatsService';
import { markNotificationAsRead } from '../../utils/notificationHelper';
import { ClubStackParamList } from '../../navigation/ClubNavigator';
import { useClubNotificationCount } from '../../hooks/useClubNotificationCount';

type ClubHomeScreenNavigationProp = NativeStackNavigationProp<ClubStackParamList>;

const { width, height } = Dimensions.get('window');

interface ClubData {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  photoURL?: string;
  leaderId: string;
  createdBy?: string;
  university?: string;
  tags?: string[];
  isActive?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string; // Daha geniş tip listesi için
  isRead: boolean;
  createdAt: firebase.firestore.Timestamp;
  userId?: string;
  clubId?: string;
  actionData?: any; // Ek aksiyon verileri
  userProfileImage?: string;
  userName?: string;
}

const ClubHomeScreen: React.FC = () => {
  const { currentUser } = useAuth();
  const navigation = useNavigation<ClubHomeScreenNavigationProp>();

  // State Management
  const [clubData, setClubData] = useState<ClubData | null>(null);
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Club notification count hook - kulüp ID'si ile birlikte
  const { unreadCount: clubNotificationCount, refreshCount: refreshClubNotificationCount } = useClubNotificationCount(currentUser?.uid);

  // Services
  const statsService = enhancedClubStatsService;
  // Club activity service instance - removed
  // const activityService = EnhancedClubActivityService.getInstance();
  
  // Listeners refs
  const statsUnsubscribeRef = React.useRef<(() => void) | null>(null);
  const notificationsUnsubscribeRef = React.useRef<(() => void) | null>(null);

  // Debug clubData changes
  useEffect(() => {
    console.log('🏠 ClubHomeScreen: clubData changed:', clubData?.id, clubData?.name);
  }, [clubData]);

  useEffect(() => {
    if (currentUser) {
      initializeData();
    }

    // Cleanup function
    return () => {
      if (statsUnsubscribeRef.current) {
        statsUnsubscribeRef.current();
      }
      if (notificationsUnsubscribeRef.current) {
        notificationsUnsubscribeRef.current();
      }
    };
  }, [currentUser]);

  const initializeData = async () => {
    try {
      setLoading(true);
      setError(null);
      await loadClubData();
    } catch (error) {
      setError('Veri yüklenirken hata oluştu');
      console.error('Data initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClubData = async () => {
    if (!currentUser) return;

    try {
      const db = firebase.firestore();
      let clubInfo: ClubData | null = null;

      console.log('🏠 ClubHomeScreen - Loading club data for user:', currentUser.uid);

      // 🎯 ÖNEMLİ: Önce users koleksiyonunda ara (ana kulüp kaynağı)
      const userClubDoc = await db.collection('users').doc(currentUser.uid).get();
      
      if (userClubDoc.exists) {
        const userData = userClubDoc.data();
        if (userData?.userType === 'club') {
          clubInfo = {
            id: currentUser.uid, // 🎯 Bu önemli! users koleksiyonundaki ID kullan
            name: userData.name || userData.displayName || 'İsimsiz Kulüp',
            description: userData.description || userData.bio || '',
            category: userData.category || 'Genel',
            memberCount: userData.memberCount || 0,
            photoURL: userData.profileImage || userData.photoURL,
            leaderId: currentUser.uid,
            createdBy: currentUser.uid,
            university: userData.university,
            tags: userData.tags || [],
            isActive: userData.isActive !== false
          };
          console.log(`✅ Kulüp users koleksiyonunda bulundu: ${clubInfo.id}`);
        }
      }

      // Eğer users koleksiyonunda bulunamazsa clubs koleksiyonunda ara
      if (!clubInfo) {
        // Strategy 1: Find by leaderId
        const leaderQuery = await db.collection('clubs')
          .where('leaderId', '==', currentUser.uid)
          .limit(1)
          .get();

        if (!leaderQuery.empty) {
          clubInfo = { id: leaderQuery.docs[0].id, ...leaderQuery.docs[0].data() } as ClubData;
          console.log(`✅ Kulüp clubs koleksiyonunda leaderId ile bulundu: ${clubInfo.id}`);
        } else {
          // Strategy 2: Find by createdBy
          const createdByQuery = await db.collection('clubs')
            .where('createdBy', '==', currentUser.uid)
            .limit(1)
            .get();

          if (!createdByQuery.empty) {
            clubInfo = { id: createdByQuery.docs[0].id, ...createdByQuery.docs[0].data() } as ClubData;
            console.log(`✅ Kulüp clubs koleksiyonunda createdBy ile bulundu: ${clubInfo.id}`);
          } else {
            // Strategy 3: Find by membership
            const membershipQuery = await db.collection('clubMembers')
              .where('userId', '==', currentUser.uid)
              .where('status', '==', 'approved')
              .limit(1)
              .get();

            if (!membershipQuery.empty) {
              const membershipData = membershipQuery.docs[0].data();
              const clubDoc = await db.collection('clubs').doc(membershipData.clubId).get();
              
              if (clubDoc.exists) {
                clubInfo = { id: clubDoc.id, ...clubDoc.data() } as ClubData;
                console.log(`✅ Kulüp clubs koleksiyonunda membership ile bulundu: ${clubInfo.id}`);
              }
            }
          }
        }
      }

      if (clubInfo) {
        console.log('✅ ClubHomeScreen - Setting clubData:', clubInfo.id, clubInfo.name);
        setClubData(clubInfo);
        const [statsResult, notificationsUnsubscribe] = await Promise.all([
          loadClubStats(clubInfo.id),
          loadNotifications(clubInfo.id)
        ]);
        
        // Store notifications unsubscribe function
        if (notificationsUnsubscribe) {
          notificationsUnsubscribeRef.current = notificationsUnsubscribe;
        }
      } else {
        console.log('❌ ClubHomeScreen - clubInfo is null');
      }
    } catch (error) {
      console.error('Error loading club data:', error);
      throw error;
    }
  };

  const loadClubStats = async (clubId: string) => {
    try {
      console.log(`📊 Loading club stats for: ${clubId}`);
      
      // Force refresh stats to get real-time event count
      const refreshedStats = await ClubStatsService.forceRefreshStats(clubId);
      
      if (refreshedStats) {
        // Convert ClubStatsData to ClubStats format for compatibility
        const clubStats: ClubStats = {
          clubId: clubId,
          totalEvents: refreshedStats.totalEvents,
          totalMembers: refreshedStats.totalMembers,
          totalLikes: refreshedStats.totalLikes,
          totalComments: refreshedStats.totalComments,
          totalParticipants: refreshedStats.totalParticipants,
          totalInteractions: refreshedStats.totalInteractions || 0,
          monthlyEvents: refreshedStats.monthlyEvents,
          monthlyMembers: refreshedStats.monthlyMembers,
          monthlyLikes: refreshedStats.monthlyLikes,
          monthlyParticipants: refreshedStats.totalParticipants, // Using total as monthly fallback
          eventsThisMonth: refreshedStats.monthlyEvents,
          activitiesThisWeek: refreshedStats.monthlyEvents, // Fallback
          memberGrowthToday: 0, // Default value
          averageAttendance: refreshedStats.totalParticipants > 0 ? refreshedStats.totalParticipants / Math.max(refreshedStats.totalEvents, 1) : 0,
          averageEventRating: 4.2,
          engagementRate: refreshedStats.totalEvents > 0 ? (refreshedStats.totalLikes + refreshedStats.totalComments) / refreshedStats.totalEvents : 0,
          growthRate: 15.0,
          lastUpdated: refreshedStats.lastUpdated,
          isActive: true,
          weeklyStats: {} // Default empty object
        };
        
        setStats(clubStats);
        console.log(`✅ Club stats loaded successfully:`, {
          totalEvents: clubStats.totalEvents,
          totalMembers: clubStats.totalMembers,
          totalLikes: clubStats.totalLikes,
          totalComments: clubStats.totalComments,
          totalParticipants: clubStats.totalParticipants
        });

        // Setup real-time stats listener for participant count updates
        const statsUnsubscribe = ClubStatsService.onClubStatsChange(clubId, (updatedStats) => {
          if (updatedStats) {
            const newStats: ClubStats = {
              clubId: clubId,
              totalEvents: updatedStats.totalEvents || 0,
              totalMembers: updatedStats.totalMembers || 0,
              totalLikes: updatedStats.totalLikes || 0,
              totalComments: updatedStats.totalComments || 0,
              totalParticipants: updatedStats.totalParticipants || 0,
              totalInteractions: updatedStats.totalInteractions || 0,
              monthlyEvents: updatedStats.monthlyEvents || 0,
              monthlyMembers: updatedStats.monthlyMembers || 0,
              monthlyLikes: updatedStats.monthlyLikes || 0,
              monthlyParticipants: updatedStats.totalParticipants || 0,
              eventsThisMonth: updatedStats.monthlyEvents || 0,
              activitiesThisWeek: updatedStats.monthlyEvents || 0,
              memberGrowthToday: 0,
              averageAttendance: updatedStats.totalParticipants > 0 ? updatedStats.totalParticipants / Math.max(updatedStats.totalEvents, 1) : 0,
              averageEventRating: 4.2,
              engagementRate: updatedStats.totalEvents > 0 ? (updatedStats.totalLikes + updatedStats.totalComments) / updatedStats.totalEvents : 0,
              growthRate: 15.0,
              lastUpdated: updatedStats.lastUpdated || firebase.firestore.Timestamp.now(),
              isActive: true,
              weeklyStats: {}
            };
            
            console.log(`📊 Real-time stats updated:`, {
              totalEvents: newStats.totalEvents,
              totalMembers: newStats.totalMembers,
              totalParticipants: newStats.totalParticipants,
              totalInteractions: newStats.totalInteractions
            });
            
            setStats(newStats);
          }
        });
        
        statsUnsubscribeRef.current = statsUnsubscribe;
      } else {
        setError('İstatistikler yüklenemedi.');
        setStats(null);
      }
    } catch (error) {
      console.error('Error loading club stats:', error);
      setError('İstatistikler yüklenirken hata oluştu.');
      setStats(null);
    }
  };

  // Manual stats refresh instead of real-time listener
  const refreshStatsManually = async (clubId: string) => {
    try {
      const statsDoc = await firebase.firestore()
        .collection('clubStats')
        .doc(clubId)
        .get();
        
      if (statsDoc.exists) {
        const statsData = statsDoc.data();
        if (statsData) {
          const newStats: ClubStats = {
            clubId: clubId,
            totalEvents: statsData.totalEvents || 0,
            totalMembers: statsData.totalMembers || 0,
            totalLikes: statsData.totalLikes || 0,
            totalComments: statsData.totalComments || 0,
            totalParticipants: statsData.totalParticipants || 0,
            totalInteractions: statsData.totalInteractions || 0,
            monthlyEvents: statsData.monthlyEvents || 0,
            monthlyMembers: statsData.monthlyMembers || 0,
            monthlyLikes: statsData.monthlyLikes || 0,
            monthlyParticipants: statsData.totalParticipants || 0,
            eventsThisMonth: statsData.monthlyEvents || 0,
            activitiesThisWeek: statsData.monthlyEvents || 0, // Fallback
            memberGrowthToday: 0, // Default value
            averageAttendance: statsData.totalParticipants > 0 ? statsData.totalParticipants / Math.max(statsData.totalEvents, 1) : 0,
            averageEventRating: 4.2,
            engagementRate: statsData.totalEvents > 0 ? (statsData.totalLikes + statsData.totalComments) / statsData.totalEvents : 0,
            growthRate: 15.0,
            lastUpdated: statsData.lastUpdated || firebase.firestore.Timestamp.now(),
            isActive: true,
            weeklyStats: {} // Default empty object
          };
          
          console.log(`📊 Manual stats refreshed:`, {
            totalEvents: newStats.totalEvents,
            totalMembers: newStats.totalMembers,
            totalInteractions: newStats.totalInteractions
          });
          
          setStats(newStats);
        }
      }
    } catch (error) {
      console.error('Manual stats refresh error:', error);
    }
  };

  const loadNotifications = async (clubId: string) => {
    try {
      console.log('🔔 Loading club interaction notifications for clubId:', clubId);
      
      const db = firebase.firestore();
      
      // KULÜP BİLDİRİMLERİ: Kulübe gelen etkileşim bildirimleri
      // Index hatası önlemek için sadece recipientId kullan, recipientType filtrelemesini client-side yap
      const notificationsSnapshot = await db
        .collection('notifications')
        .where('recipientId', '==', clubId)
        .limit(50) // Daha fazla al, client-side filtrele
        .get();

      const clubNotificationsData: Notification[] = [];
      
      notificationsSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Client-side recipientType kontrolü
        const recipientType = data.recipientType || 'club'; // Default club for backward compatibility
        if (recipientType !== 'club') {
          return; // Kulüp bildirimi değilse atla
        }
        
        // Kulübe gelen etkileşim bildirim türleri - YENİ KAPSAMLI BİRLEŞİK FORMAT
        const clubInteractionTypes = [
          // 🆕 Yeni birleşik bildirim tipleri - İşlem + Puan birlikte
          'event_like_points',           // X kullanıcısı etkinliğini beğendi + puan kazandınız
          'event_unlike_points',         // X kullanıcısı etkinlik beğenisini geri aldı + puan kaybettiniz
          'event_commented_points',      // X kullanıcısı etkinliğe yorum yaptı + puan kazandınız
          'event_shared_points',         // X kullanıcısı etkinliği paylaştı + puan kazandınız
          'member_approved_points',      // X kullanıcısını onayladınız + puan kazandınız  
          'member_left_points',          // X kullanıcısı ayrıldı + puan kaybettiniz
          'member_kicked_points',        // X kullanıcısını attınız + puan değişimi
          'club_join_points',            // X kullanıcısı katıldı + puan kazandınız
          'club_followed_points',        // X kullanıcısı kulübü takip etti + puan kazandınız
          'club_unfollowed_points',      // X kullanıcısı takibi bıraktı + puan kaybettiniz
          
          // 📊 Diğer sosyal etkileşim bildirimleri
          'event_comment',               // X kullanıcısı etkinliğe yorum yaptı
          'event_join',                  // X kullanıcısı etkinliğe katıldı
          'club_follow',                 // X kullanıcısı kulübü takip etti
          'member_request',              // X kullanıcısı üyelik isteği gönderdi
          'club_like',                   // X kullanıcısı kulübü beğendi
          'club_share',                  // X kullanıcısı kulübü paylaştı
          
          // ⚠️ ESKİ TİPLER - Geriye dönük uyumluluk için (kaldırılacak)
          'event_like',                  // DEPRECATED - event_like_points kullanın
          'event_unlike',                // DEPRECATED - event_unlike_points kullanın  
          'score_loss',                  // DEPRECATED - *_points tipleri kullanın
          'score_gain',                  // DEPRECATED - *_points tipleri kullanın
        ];
        
        // Sadece kulüp etkileşim bildirimlerini al
        if (clubInteractionTypes.includes(data.type)) {
          clubNotificationsData.push({
            id: doc.id,
            type: data.type,
            title: data.title || data.message || 'Yeni Etkileşim',
            message: data.message || data.title || '',
            isRead: data.read || false,
            createdAt: data.createdAt || data.timestamp,
            actionData: data.actionData || {},
            userProfileImage: data.userProfileImage,
            userName: data.userName || data.senderId || 'Anonim'
          });
        }
      });

      // Client-side sorting by createdAt (newest first)
      clubNotificationsData.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime; // Newest first
      });

      // Apply limit (take first 10 after sorting)
      const limitedNotifications = clubNotificationsData.slice(0, 10);

      console.log(`🔔 Loaded ${limitedNotifications.length} club interaction notifications (client-side filtered)`);
      setNotifications(limitedNotifications);
      
      // Gerçek zamanlı listener kurulum
      const setupRealTimeListener = () => {
        try {
          console.log('🔔 Setting up real-time club notifications listener...');
          
          // Kulübe gelen etkileşim bildirim türleri - YENİ KAPSAMLI BİRLEŞİK FORMAT (real-time listener)
          const clubInteractionTypes = [
            // 🆕 Yeni birleşik bildirim tipleri - İşlem + Puan birlikte
            'event_like_points',           // X kullanıcısı etkinliğini beğendi + puan kazandınız
            'event_unlike_points',         // X kullanıcısı etkinlik beğenisini geri aldı + puan kaybettiniz
            'event_commented_points',      // X kullanıcısı etkinliğe yorum yaptı + puan kazandınız
            'event_shared_points',         // X kullanıcısı etkinliği paylaştı + puan kazandınız
            'member_approved_points',      // X kullanıcısını onayladınız + puan kazandınız  
            'member_left_points',          // X kullanıcısı ayrıldı + puan kaybettiniz
            'member_kicked_points',        // X kullanıcısını attınız + puan değişimi
            'club_join_points',            // X kullanıcısı katıldı + puan kazandınız
            'club_followed_points',        // X kullanıcısı kulübü takip etti + puan kazandınız
            'club_unfollowed_points',      // X kullanıcısı takibi bıraktı + puan kaybettiniz
            
            // 📊 Diğer sosyal etkileşim bildirimleri
            'event_comment',               // X kullanıcısı etkinliğe yorum yaptı
            'event_join',                  // X kullanıcısı etkinliğe katıldı
            'club_follow',                 // X kullanıcısı kulübü takip etti
            'member_request',              // X kullanıcısı üyelik isteği gönderdi
            'club_like',                   // X kullanıcısı kulübü beğendi
            'club_share',                  // X kullanıcısı kulübü paylaştı
            
            // ⚠️ ESKİ TİPLER - Geriye dönük uyumluluk için (kaldırılacak)
            'event_like',                  // DEPRECATED - event_like_points kullanın
            'event_unlike',                // DEPRECATED - event_unlike_points kullanın  
            'score_loss',                  // DEPRECATED - *_points tipleri kullanın
            'score_gain',                  // DEPRECATED - *_points tipleri kullanın
          ];
          
          const unsubscribe = db
            .collection('notifications')
            .where('recipientId', '==', clubId)
            .onSnapshot(async (snapshot) => {
              try {
                console.log(`🔔 Real-time club notifications snapshot: ${snapshot.size} docs`);
                
                const realTimeNotifications: Notification[] = [];
                
                snapshot.forEach(doc => {
                  const data = doc.data();
                  
                  // Client-side recipientType kontrolü
                  const recipientType = data.recipientType || 'club';
                  if (recipientType !== 'club') {
                    return; // Kulüp bildirimi değilse atla
                  }
                  
                  // Kulüp etkileşim türleri kontrolü
                  if (clubInteractionTypes.includes(data.type)) {
                    realTimeNotifications.push({
                      id: doc.id,
                      type: data.type,
                      title: data.title || data.message || 'Yeni Etkileşim',
                      message: data.message || data.title || '',
                      isRead: data.read || false,
                      createdAt: data.createdAt || data.timestamp,
                      actionData: data.actionData || {},
                      userProfileImage: data.userProfileImage,
                      userName: data.userName || data.senderId || 'Anonim'
                    });
                  }
                });

                // Client-side sorting ve limiting
                realTimeNotifications.sort((a, b) => {
                  const aTime = a.createdAt?.seconds || 0;
                  const bTime = b.createdAt?.seconds || 0;
                  return bTime - aTime;
                });

                const limitedRealTime = realTimeNotifications.slice(0, 10);
                console.log(`🔔 Real-time updated: ${limitedRealTime.length} club notifications`);
                setNotifications(limitedRealTime);
                
              } catch (error) {
                console.error('Real-time snapshot processing error:', error);
              }
            }, (error) => {
              console.error('Real-time listener error:', error);
            });
            
          return unsubscribe;
        } catch (error) {
          console.error('Error setting up real-time listener:', error);
          return () => {};
        }
      };
      
      // Real-time listener'ı kur ve cleanup fonksiyonunu döndür
      return setupRealTimeListener();
      
    } catch (error: any) {
      console.error('❌ Error loading club notifications:', error);
      setNotifications([]);
      return () => {};
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadClubData();
      // Manual stats refresh
      if (clubData?.id) {
        await refreshStatsManually(clubData.id);
      }
      // Notification count will auto-refresh via real-time listener
    } catch (error) {
      setError('Yenileme sırasında hata oluştu');
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      if (!notification.isRead && currentUser?.uid) {
        // Helper fonksiyonunu kullan
        const success = await markNotificationAsRead(notification.id, currentUser.uid, 'club');
        
        if (success) {
          // Update local state
          setNotifications(prev => 
            prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
          );
          
          // Ana sayfa bildirim sayısını güncelle
          refreshClubNotificationCount?.();
          
          console.log(`📖 Kulüp bildirimi okundu olarak işaretlendi: ${notification.id}`);
        }
      }
    } catch (error) {
      console.error('Error marking club notification as read:', error);
    }
  };

  const formatDate = (timestamp: firebase.firestore.Timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Tarih yok';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="loading" size={48} color="#1565C0" />
          <Text style={styles.loadingText}>Kulüp verileri yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>Hata Oluştu</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeData}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!clubData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="account-group-outline" size={80} color="#BDBDBD" />
          <Text style={styles.emptyTitle}>Kulüp Bulunamadı</Text>
          <Text style={styles.emptyMessage}>
            Henüz bir kulübe üye değilsiniz veya kulübünüz bulunmuyor.
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => (navigation as any).navigate('Clubs')}
          >
            <MaterialCommunityIcons name="compass" size={20} color="white" />
            <Text style={styles.exploreButtonText}>Kulüpleri Keşfet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#1565C0']}
            tintColor="#1565C0"
          />
        }
      >
        {/* Header Section */}
        <LinearGradient
          colors={['#1565C0', '#1976D2']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Top Navigation */}
          <View style={styles.topNav}>
            <Text style={styles.universeTitle}>Universe</Text>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('NotificationScreen')}
            >
              <MaterialCommunityIcons name="bell" size={24} color="white" />
              {clubNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {clubNotificationCount > 99 ? '99+' : clubNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Statistics Section */}
        {stats ? (
          <View style={styles.statsSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.sectionTitle}>İstatistikler</Text>
              <TouchableOpacity 
                onPress={async () => {
                  if (clubData) {
                    console.log('🔧 Manual stats refresh triggered');
                    await loadClubStats(clubData.id);
                  }
                }}
                style={{ padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}
              >
                <MaterialCommunityIcons name="refresh" size={20} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="calendar" size={24} color="#4CAF50" />
                    <Text style={styles.statNumber}>{stats.totalEvents}</Text>
                    <Text style={styles.statLabel}>Etkinlik</Text>
                  </Card.Content>
                </Card>
                
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="account-group" size={24} color="#2196F3" />
                    <Text style={styles.statNumber}>{stats.totalMembers}</Text>
                    <Text style={styles.statLabel}>Üye</Text>
                  </Card.Content>
                </Card>
                
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="account-multiple" size={24} color="#FF9800" />
                    <Text style={styles.statNumber}>{stats.totalParticipants}</Text>
                    <Text style={styles.statLabel}>Katılımcı</Text>
                  </Card.Content>
                </Card>
              </View>
              
              <View style={styles.statsRow}>
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="heart" size={24} color="#E91E63" />
                    <Text style={styles.statNumber}>{stats.totalLikes}</Text>
                    <Text style={styles.statLabel}>Beğeni</Text>
                  </Card.Content>
                </Card>
                
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="comment" size={24} color="#9C27B0" />
                    <Text style={styles.statNumber}>{stats.totalComments}</Text>
                    <Text style={styles.statLabel}>Yorum</Text>
                  </Card.Content>
                </Card>
                
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="chart-line" size={24} color="#607D8B" />
                    <Text style={styles.statNumber}>
                      {stats.totalEvents + stats.totalLikes + stats.totalComments + stats.totalParticipants}
                    </Text>
                    <Text style={styles.statLabel}>Toplam Etkileşim</Text>
                  </Card.Content>
                </Card>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>İstatistikler</Text>
            <View style={styles.noDataContainer}>
              <MaterialCommunityIcons name="chart-bar" size={48} color="#ccc" />
              <Text style={styles.noDataText}>Henüz istatistik verisi yok</Text>
              <Text style={styles.noDataSubtext}>
                Firebase bağlantısını kontrol edin veya ilk etkinliğinizi oluşturun
              </Text>
            </View>
          </View>
        )}

        {/* Leaderboard Button */}
        <View style={styles.leaderboardSection}>
          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => navigation.navigate('LeaderboardScreen')}
          >
            <LinearGradient
              colors={['#1565C0', '#1976D2']}
              style={styles.leaderboardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons name="trophy" size={24} color="white" />
              <Text style={styles.leaderboardButtonText}>Lider Tablosu</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Üye İstatistikleri */}
        {clubData && (
          <ClubMemberStats 
            clubId={clubData.id} 
            currentUserId={currentUser?.uid}
            navigation={navigation}
          />
        )}
        
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  exploreButton: {
    backgroundColor: '#667eea',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  universeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 1,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerContent: {
    marginTop: 20,
  },
  clubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubAvatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  clubInfo: {
    flex: 1,
    marginLeft: 16,
  },
  clubName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  clubCategory: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  clubMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubMemberCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  clubUniversity: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    color: 'white',
    fontSize: 12,
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  statsGrid: {
    // gap: 12, // Remove gap - not supported in React Native
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    width: (width - 60) / 3,
    elevation: 2,
    backgroundColor: 'white',
    marginHorizontal: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  notificationsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  notificationItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea',
    marginTop: 4,
  },
  activitiesSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activityItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityUser: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyActivities: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyActivitiesText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  leaderboardSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  leaderboardButton: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  leaderboardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  leaderboardButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    marginRight: 8,
    flex: 1,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ClubHomeScreen;
