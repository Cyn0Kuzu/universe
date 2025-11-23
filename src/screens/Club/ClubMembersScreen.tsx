import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import {
  Text,
  useTheme,
  Button,
  Avatar,
  ActivityIndicator,
  Surface,
  Chip,
  Searchbar,
  Menu,
  IconButton,
  Badge,
  Portal,
  Dialog,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import { UNIVERSITIES_DATA } from '../../constants';
import { ClubStatsService } from '../../services/clubStatsService';
import moment from 'moment';
import 'moment/locale/tr';
import { UniversalAvatar } from '../../components/common';
import { cleanupMembershipRequests } from '../../firebase/membership';
import { clubActivityService } from '../../services/enhancedClubActivityService';
import { CustomTheme } from '../../types/theme';
import { useUserAvatar } from '../../hooks/useUserAvatar';
import { userActivityService } from '../../services/enhancedUserActivityService';
// Legacy notification service removed

const firebase = getFirebaseCompatSync();
moment.locale('tr');

interface Member {
  id: string;
  userId: string;
  clubId: string;
  status: 'approved' | 'pending' | 'rejected';
  joinedDate: any;
  userInfo?: {
    displayName: string;
    email: string;
    profileImage?: string;
    university?: string;
    department?: string;
    classLevel?: string;
  };
}

interface MembershipRequest {
  id: string;
  userId: string;
  clubId: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: any;
  message?: string;
  userInfo?: {
    displayName: string;
    email: string;
    profileImage?: string;
    university?: string;
    department?: string;
    classLevel?: string;
  };
}

const ClubMembersScreen: React.FC = () => {
  const baseTheme = useTheme();
  const theme = baseTheme as unknown as CustomTheme;
  const navigation = useNavigation();
  const route = useRoute();
  const { currentUser, userProfile, isClubAccount } = useAuth();
  
  // Route'dan clubId parametresini al (öğrenci hesapları için)
  const routeParams = route.params as { clubId?: string } | undefined;
  const targetClubId = routeParams?.clubId || currentUser?.uid;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'requests'>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [clubData, setClubData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<Member | null>(null);
  const [removalDialogVisible, setRemovalDialogVisible] = useState(false);
  const [removalInProgress, setRemovalInProgress] = useState(false);
  const { width } = useWindowDimensions();
  const isTabletLayout = width >= 768;
  const isCompactLayout = width < 360;

  // Kulüp bilgilerini ve üyeleri getir
  const fetchData = useCallback(async () => {
    console.log('currentUser:', currentUser?.uid);
    console.log('targetClubId:', targetClubId);
    console.log('userProfile:', userProfile);
    console.log('isClubAccount:', isClubAccount);
    
    if (!currentUser || !targetClubId) {
      console.log('No current user or target club ID found');
      return;
    }
    
    console.log('Fetching club data for club ID:', targetClubId);
    
    try {
      const db = getFirebaseCompatSync().firestore();
      
      let clubInfo: any = null;
      
      // Önce users koleksiyonunda doğrudan targetClubId ile arama
      console.log('Method 1: Checking users collection directly...');
      const directUserDoc = await db.collection('users').doc(targetClubId).get();
      if (directUserDoc.exists) {
        const userData = directUserDoc.data();
        if (userData && userData.userType === 'club') {
          clubInfo = { id: directUserDoc.id, ...userData };
          console.log('Found club in users collection:', userData.displayName || userData.clubName || userData.name);
        }
      }
      
      // Eğer bulunamadıysa clubs koleksiyonunda ara
      if (!clubInfo) {
        console.log('Method 2: Checking clubs collection by direct ID...');
        const directClubDoc = await db.collection('clubs').doc(targetClubId).get();
        if (directClubDoc.exists) {
          clubInfo = { id: directClubDoc.id, ...directClubDoc.data() };
          console.log('Found club by direct ID:', (clubInfo as any).name);
        }
      }
      
      if (clubInfo) {
        setClubData(clubInfo);
        console.log('Club data set successfully:', (clubInfo as any).displayName || (clubInfo as any).clubName || (clubInfo as any).name);
        console.log('IMPORTANT - Club ID for comparison:', clubInfo.id);
        console.log('Club data details:', {
          displayName: (clubInfo as any).displayName || (clubInfo as any).clubName || (clubInfo as any).name,
          id: clubInfo.id,
          userType: (clubInfo as any).userType,
          leaderId: (clubInfo as any).leaderId,
        });
        
        try {
          // Aktif üyeleri getir
          console.log('Fetching members for clubId:', clubInfo.id);
          const membersSnapshot = await db
            .collection('clubMembers')
            .where('clubId', '==', clubInfo.id)
            .where('status', '==', 'approved')
            .get();
          
          console.log('Members query successful, found:', membersSnapshot.size, 'members');
        
        const membersData: Member[] = [];
        for (const memberDoc of membersSnapshot.docs) {
          const memberData = memberDoc.data();
          
          // Kullanıcı bilgilerini getir
          const userDoc = await db.collection('users').doc(memberData.userId).get();
          const userData = userDoc.data();
          
          membersData.push({
            id: memberDoc.id,
            ...memberData,
            userInfo: userData ? {
              displayName: userData.displayName || userData.email || 'İsimsiz Kullanıcı',
              email: userData.email || '',
              profileImage: userData.profileImage,
              university: userData.university,
              department: userData.department,
              classLevel: userData.classLevel,
            } : undefined
          } as Member);
        }
        
        setMembers(membersData);
        console.log('Members data set successfully:', membersData.length, 'members');
          
        } catch (membersError) {
          console.error('Error fetching members:', membersError);
          setMembers([]); // Set empty array on error
        }
        
        try {
          // Bekleyen başvuruları getir
          console.log('=== ClubMembersScreen - Fetching Requests Debug ===');
          console.log('Fetching membership requests for clubId:', clubInfo.id);
          
          // Skip cleanup to avoid permissions issues
          // await cleanupMembershipRequests(clubInfo.id);
          
          // Önce sadece clubId ve status filtreleriyle sorgu yap (index gerektirmez)
          console.log('Running query with clubId:', clubInfo.id, 'status: pending');
          const requestsSnapshot = await db
            .collection('membershipRequests')
            .where('clubId', '==', clubInfo.id)
            .where('status', '==', 'pending')
            .get();
          
          console.log('Requests query successful, found:', requestsSnapshot.size, 'requests');
          if (requestsSnapshot.size > 0) {
            console.log('First request data:', requestsSnapshot.docs[0].data());
          }
        
        // Helper function to safely extract user info
        const extractUserInfo = (userData: any) => {
          if (!userData) return undefined;
          
          const userInfo: any = {
            displayName: userData.displayName || userData.email || 'İsimsiz Kullanıcı',
            email: userData.email || '',
          };
          
          // Only add fields if they exist and are not null/undefined/empty
          if (userData.profileImage && userData.profileImage.trim && userData.profileImage.trim() !== '') {
            userInfo.profileImage = userData.profileImage.trim();
          }
          if (userData.university && userData.university.trim && userData.university.trim() !== '') {
            userInfo.university = userData.university.trim();
          }
          if (userData.department && userData.department.trim && userData.department.trim() !== '') {
            userInfo.department = userData.department.trim();
          }
          if (userData.classLevel && userData.classLevel.trim && userData.classLevel.trim() !== '') {
            userInfo.classLevel = userData.classLevel.trim();
          }
          
          // Explicitly ensure phoneNumber is not included to avoid validation issues
          delete userInfo.phoneNumber;
          
          return userInfo;
        };

        console.log('Processing membership requests...');
        const requestsData: MembershipRequest[] = [];
        for (const requestDoc of requestsSnapshot.docs) {
          const requestData = requestDoc.data();
          console.log('Processing request document:', requestDoc.id);
          console.log('Request data:', JSON.stringify(requestData, null, 2));
          
          let userInfo = requestData.userInfo;
          
          // Only fetch fresh user data if userInfo is missing or incomplete
          if (!userInfo || !userInfo.displayName || !userInfo.email) {
            console.log('UserInfo missing or incomplete, fetching fresh user data for userId:', requestData.userId);
            const userDoc = await db.collection('users').doc(requestData.userId).get();
            const userData = userDoc.data();
            console.log('User exists:', userDoc.exists, userData ? 'with data' : 'no data');
            userInfo = extractUserInfo(userData);
          } else {
            console.log('Using stored userInfo from request:', userInfo);
          }
          
          requestsData.push({
            id: requestDoc.id,
            ...requestData,
            userInfo
          } as MembershipRequest);
        }
        
        // Client-side sorting by requestDate (newest first)
        requestsData.sort((a, b) => {
          const dateA = a.requestDate?.toDate?.() || new Date(a.requestDate);
          const dateB = b.requestDate?.toDate?.() || new Date(b.requestDate);
          return dateB.getTime() - dateA.getTime();  // Descending order (newest first)
        });
        
        setRequests(requestsData);
        console.log('Requests data set successfully:', requestsData.length, 'requests');
          
        } catch (requestsError) {
          console.error('Error fetching membership requests:', requestsError);
          setRequests([]); // Set empty array on error
        }
      } else {
        console.log('No club found with any method - showing empty lists');
        setMembers([]);
        setRequests([]);
      }
    } catch (error) {
      console.error('Veriler getirilemedi:', error);
      console.error('Current user:', currentUser?.uid);
      console.error('Club data:', clubData);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, targetClubId, navigation, isClubAccount]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Kullanıcı profiline git
  const handleViewProfile = (userId: string) => {
    (navigation as any).navigate('ViewProfile', { userId });
  };

  // Başvuruyu onaylama
  const approveRequest = async (requestId: string, userId: string) => {
    if (!clubData) return;
    
    setProcessingRequests(prev => new Set(prev).add(requestId));
    
    try {
      const db = getFirebaseCompatSync().firestore();
      const batch = db.batch();
      
      // Başvuru durumunu güncelle
      const requestRef = db.collection('membershipRequests').doc(requestId);
      batch.update(requestRef, {
        status: 'approved',
        approvedDate: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
      });
      
      // Get the original request to preserve user info
      const requestDoc = await requestRef.get();
      const requestData = requestDoc.data();
      
      // Kulüp üyesi olarak ekle
      const memberRef = db.collection('clubMembers').doc();
      batch.set(memberRef, {
        clubId: clubData.id,
        userId: userId,
        status: 'approved',
        joinedDate: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
        // Keep user info from the request if available
        userInfo: requestData?.userInfo || undefined,
      });
      
      // Kulüp üye sayısını artır (kulüp hesabı users koleksiyonunda)
      const clubRef = db.collection('users').doc(clubData.id);
      batch.update(clubRef, {
        memberCount: getFirebaseCompatSync().firestore.FieldValue.increment(1),
      });
      
      // Onay bildirimi gönder (öğrenciye)
      const notificationRef = db.collection('notifications').doc();
      batch.set(notificationRef, {
        type: 'membership_approved',
        recipientId: userId, // Bildirim alan kişi (öğrenci)
        recipientType: 'student', // Alıcı türü
        senderId: currentUser?.uid,
        clubId: clubData.id,
        title: '✅ Üyelik Onaylandı',
        message: `${clubData.name || clubData.displayName} kulübüne katılma isteğiniz onaylandı! Hoş geldiniz.`,
        data: {
          clubName: clubData.name || clubData.displayName,
          clubImage: clubData.profileImage,
          actionType: 'view_club',
        },
        createdAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
        read: false,
      });
      
      await batch.commit();
      
      // Club membership approval statistics are tracked directly in Firebase collections
      console.log('✅ Club member approval statistics recorded');
      
      // Log club activity: member approved
      try {
        await clubActivityService.createMembershipModerationActivity(
          'member_approved',
          clubData.id,
          currentUser?.uid || '',
          currentUser?.displayName || 'Kulüp Yöneticisi',
          userId,
          requestData?.userInfo?.displayName || 'Üye'
        );
      } catch (activityErr) {
        console.warn('Member approved activity logging failed:', activityErr);
      }
      
      // Log user activity for the student (club_join - kendi eylemi)
      try {
        await userActivityService.logClubJoin(
          userId,
          requestData?.userInfo?.displayName || 'Kullanıcı',
          clubData.id,
          clubData.name || clubData.displayName || 'Kulüp'
        );
      } catch (activityErr) {
        console.warn('User activity logging (club_join) failed:', activityErr);
      }
      
      console.log('✅ Membership request approved successfully!');
      console.log('✅ User should now be in active members list');
      
      // Local state'i güncelle
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Üyeleri yeniden yükle
      await fetchData();
      
      Alert.alert('Başarılı', 'Üyelik başvurusu onaylandı. Kullanıcı artık aktif üyeler listesinde görünecek.');
    } catch (error) {
      console.error('Başvuru onaylanırken hata:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      const errorCode = error instanceof Error && 'code' in error ? (error as any).code : 'unknown';
      console.error('Error details:', {
        message: errorMessage,
        code: errorCode,
        currentUserId: currentUser?.uid,
        clubId: clubData?.id,
        requestId,
        userId
      });
      Alert.alert('Hata', `Başvuru onaylanırken bir sorun oluştu: ${errorMessage}`);
    } finally {
      setProcessingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Başvuruyu reddetme
  const rejectRequest = async (requestId: string, userId: string) => {
    if (!clubData) return;
    
    Alert.alert(
      'Başvuruyu Reddet',
      'Bu başvuruyu reddetmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Reddet',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequests(prev => new Set(prev).add(requestId));
            
            try {
              const db = getFirebaseCompatSync().firestore();
              const batch = db.batch();
              
              // Başvuru durumunu güncelle
              const requestRef = db.collection('membershipRequests').doc(requestId);
              // Fetch request before commit to use in activity logs
              const requestDoc = await requestRef.get();
              const requestData = requestDoc.data();
              batch.update(requestRef, {
                status: 'rejected',
                rejectedDate: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
              });
              
              // Red bildirimi gönder (öğrenciye)
              const notificationRef = db.collection('notifications').doc();
              batch.set(notificationRef, {
                type: 'membership_rejected',
                recipientId: userId, // Bildirim alan kişi (öğrenci)
                recipientType: 'student', // Alıcı türü
                senderId: currentUser?.uid,
                clubId: clubData.id,
                title: '❌ Üyelik İsteği Reddedildi',
                message: `${clubData.name || clubData.displayName} kulübüne katılma isteğiniz reddedildi. Başka kulüpleri deneyebilirsiniz.`,
                data: {
                  clubName: clubData.name || clubData.displayName,
                  clubImage: clubData.profileImage,
                  actionType: 'view_clubs',
                },
                createdAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp(),
                read: false,
              });
              
              await batch.commit();
              
              // Club membership rejection statistics are tracked directly in Firebase collections
              console.log('✅ Club member rejection statistics recorded');
              
              // Log club activity: member rejected
              try {
                await clubActivityService.createMembershipModerationActivity(
                  'member_rejected',
                  clubData.id,
                  currentUser?.uid || '',
                  currentUser?.displayName || 'Kulüp Yöneticisi',
                  userId,
                  requestData?.userInfo?.displayName || 'Üye'
                );
              } catch (activityErr) {
                console.warn('Member rejected activity logging failed:', activityErr);
              }
              
              // Log user activity for the student (club_rejected)
              try {
                await userActivityService.logClubRejected(
                  userId,
                  requestData?.userInfo?.displayName || 'Kullanıcı',
                  clubData.id,
                  clubData.name || clubData.displayName || 'Kulüp'
                );
              } catch (activityErr) {
                console.warn('User activity logging (club_rejected) failed:', activityErr);
              }
              
              // Local state'i güncelle
              setRequests(prev => prev.filter(req => req.id !== requestId));
              
              Alert.alert('Başarılı', 'Üyelik başvurusu reddedildi.');
            } catch (error) {
              console.error('Başvuru reddedilirken hata:', error);
              Alert.alert('Hata', 'Başvuru reddedilirken bir sorun oluştu.');
            } finally {
              setProcessingRequests(prev => {
                const newSet = new Set(prev);
                newSet.delete(requestId);
                return newSet;
              });
            }
          }
        }
      ]
    );
  };

  const requestMemberRemoval = useCallback((member: Member) => {
    setMemberPendingRemoval(member);
    setRemovalDialogVisible(true);
  }, []);

  const performMemberRemoval = useCallback(async (member: Member) => {
    if (!clubData) {
      Alert.alert('Hata', 'Kulüp bilgisi bulunamadı.');
      return false;
    }

    const memberName = member.userInfo?.displayName || 'Üye';
    try {
      const db = getFirebaseCompatSync().firestore();
      const batch = db.batch();

      const memberRef = db.collection('clubMembers').doc(member.id);
      batch.delete(memberRef);

      const clubRef =
        clubData?.userType === 'club'
          ? db.collection('users').doc(clubData.id)
          : db.collection('clubs').doc(clubData.id);

      const clubDoc = await clubRef.get();
      if (clubDoc.exists) {
        batch.update(clubRef, {
          memberCount: getFirebaseCompatSync().firestore.FieldValue.increment(-1),
        });
      }

      await batch.commit();

      try {
        await ClubStatsService.decrementMemberCount(clubData?.id || '');
        console.log('✅ Club stats member count decremented');
      } catch (statsError) {
        console.error('❌ Error updating club stats:', statsError);
      }

      try {
        await clubActivityService.createActivity({
          type: 'member_left',
          title: 'Üye Kaldırıldı',
          description: `${memberName} kulüpten kaldırıldı`,
          clubId: clubData?.id || '',
          userId: currentUser?.uid || '',
          userName: currentUser?.displayName || 'Kulüp Yöneticisi',
          userPhotoURL: currentUser?.photoURL || undefined,
          targetId: member.userId,
          targetName: memberName,
          category: 'membership',
          visibility: 'members_only',
          priority: 'medium',
          metadata: {
            memberId: member.userId,
            memberName: memberName,
          },
          createdAt: firebase.firestore.Timestamp.now(),
          isHighlighted: false,
          isPinned: false,
        });
      } catch (activityError) {
        console.warn('Activity logging failed:', activityError);
      }

      try {
        await userActivityService.createActivity({
          userId: clubData?.id || '',
          userName: clubData?.displayName || clubData?.clubName || clubData?.name || 'Kulüp',
          type: 'club_rejected',
          title: 'Üye Çıkarıldı',
          description: `${memberName} adlı üyeyi kulüpten çıkardınız`,
          targetId: member.userId,
          targetName: memberName,
          clubId: clubData?.id || '',
          category: 'social',
          visibility: 'public',
          priority: 'medium',
          metadata: {
            changeDetails: {
              memberName: memberName,
              memberId: member.userId,
              actionType: 'member_removed_by_admin',
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (userActivityError) {
        console.warn('User activity logging for club failed:', userActivityError);
      }

      try {
        await userActivityService.logClubKicked(
          member.userId,
          memberName,
          clubData?.id || '',
          clubData?.displayName || clubData?.clubName || clubData?.name || 'Kulüp'
        );
      } catch (uaErr) {
        console.warn('User activity logging (club_kicked) failed:', uaErr);
      }

      setMembers((prev) => prev.filter((existing) => existing.id !== member.id));
      Alert.alert('Başarılı', 'Üye başarıyla kaldırıldı.');
      return true;
    } catch (error) {
      console.error('Üye kaldırılırken hata:', error);
      Alert.alert('Hata', 'Üye kaldırılırken bir sorun oluştu.');
      return false;
    }
  }, [clubData, currentUser]);

  const handleConfirmRemoval = useCallback(async () => {
    if (!memberPendingRemoval) {
      return;
    }
    setRemovalInProgress(true);
    const succeeded = await performMemberRemoval(memberPendingRemoval);
    setRemovalInProgress(false);
    if (succeeded) {
      setMemberPendingRemoval(null);
      setRemovalDialogVisible(false);
    }
  }, [memberPendingRemoval, performMemberRemoval]);

  const handleDismissRemovalDialog = useCallback(() => {
    if (removalInProgress) {
      return;
    }
    setRemovalDialogVisible(false);
    setMemberPendingRemoval(null);
  }, [removalInProgress]);

  const getUniversityName = (universityCode?: string) => {
    if (!universityCode) return 'Üniversite belirtilmemiş';
    const university = UNIVERSITIES_DATA.find(u => u.value === universityCode);
    return university ? university.label : universityCode;
  };

  // Filtrelenmiş üyeler
  const filteredMembers = members.filter(member => 
    member.userInfo?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userInfo?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.userInfo?.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtrelenmiş başvurular
  const filteredRequests = requests.filter(request => 
    request.userInfo?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.userInfo?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.userInfo?.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!clubData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>Kulüp bilgisi yüklenemedi</Text>
          <Text style={styles.emptyText}>Lütfen daha sonra tekrar deneyin</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {clubData.displayName || clubData.clubName || clubData.name || 'Kulüp Üyeleri'}
          </Text>
          <Text style={styles.headerSubtitle}>Üyeler ve Başvurular</Text>
        </View>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <MaterialCommunityIcons 
            name="account-group" 
            size={20} 
            color={activeTab === 'members' ? theme.colors.primary : '#666'} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'members' && styles.activeTabText
          ]}>
            Aktif Üyeler ({members.length})
          </Text>
        </TouchableOpacity>
        
        {/* Sadece kulüp hesapları başvuruları görebilir */}
        {(isClubAccount || currentUser?.uid === targetClubId) && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
            onPress={() => setActiveTab('requests')}
          >
            <MaterialCommunityIcons 
              name="account-clock" 
              size={20} 
              color={activeTab === 'requests' ? theme.colors.primary : '#666'} 
            />
            <Text style={[
              styles.tabText, 
              activeTab === 'requests' && styles.activeTabText
            ]}>
              Başvurular
            </Text>
            {requests.length > 0 && (
              <Badge 
                size={20} 
                style={{ 
                  backgroundColor: '#FF5722',
                  marginLeft: 8
                }}
              >
                {requests.length}
              </Badge>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={activeTab === 'members' ? 'Üye ara...' : 'Başvuru ara...'}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {activeTab === 'members' ? (
          // Aktif Üyeler
          filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onRemove={() => requestMemberRemoval(member)}
                onViewProfile={handleViewProfile}
                getUniversityName={getUniversityName}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-group-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Arama kriterlerine uygun üye bulunamadı' : 'Henüz üye bulunmuyor'}
              </Text>
            </View>
          )
        ) : (
          // Başvurular
          filteredRequests.length > 0 ? (
            filteredRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={() => approveRequest(request.id, request.userId)}
                onReject={() => rejectRequest(request.id, request.userId)}
                onViewProfile={handleViewProfile}
                isProcessing={processingRequests.has(request.id)}
                getUniversityName={getUniversityName}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-clock-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'Arama kriterlerine uygun başvuru bulunamadı' : 'Bekleyen başvuru bulunmuyor'}
              </Text>
            </View>
          )
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={removalDialogVisible}
          onDismiss={handleDismissRemovalDialog}
        >
          <Dialog.Title>Üyeyi Kaldır</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              {`${memberPendingRemoval?.userInfo?.displayName || 'Bu üye'} kulüpten kaldırılacak. Devam etmek istediğinizden emin misiniz?`}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleDismissRemovalDialog} disabled={removalInProgress}>
              Vazgeç
            </Button>
            <Button
              onPress={handleConfirmRemoval}
              loading={removalInProgress}
              mode="contained"
              buttonColor="#d32f2f"
              textColor="#fff"
            >
              Eminim
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

// Üye Kartı Komponenti
interface MemberCardProps {
  member: Member;
  onRemove: () => void;
  onViewProfile: (userId: string) => void;
  getUniversityName: (code?: string) => string;
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  onRemove,
  onViewProfile,
  getUniversityName,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { avatarData } = useUserAvatar(member.userId);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isCompact = width < 360;
  const avatarSize = isTablet ? 68 : isCompact ? 44 : 52;
  const nameFontSize = isTablet ? 18 : isCompact ? 14 : 16;
  const usernameFontSize = isTablet ? 15 : isCompact ? 12 : 13;
  const metaFontSize = isTablet ? 14 : isCompact ? 12 : 13;

  const sanitizeUsername = (val?: string) => {
    if (!val) return '';
    return val
      .replace(/^@+/, '')
      .trim()
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u');
  };

  const displayName = avatarData?.displayName || member.userInfo?.displayName || 'İsimsiz Kullanıcı';
  const computedUsername = (() => {
    const u = avatarData?.userName || (member as any)?.userInfo?.username;
    if (u && u.trim() !== '') return sanitizeUsername(u);
    const emailLocal = member.userInfo?.email?.split('@')[0];
    if (emailLocal) return sanitizeUsername(emailLocal);
    return sanitizeUsername(displayName) || 'kullanici';
  })();
  const university = avatarData?.university || member.userInfo?.university;
  
  return (
    <Surface style={[styles.memberCard, isTablet && styles.memberCardTablet]}>
      <View style={styles.memberContainer}>
        <TouchableOpacity 
          style={styles.memberHeader}
          onPress={() => onViewProfile(member.userId)}
          activeOpacity={0.7}
        >
          <UniversalAvatar
            userId={member.userId}
            userName={displayName}
            profileImage={avatarData?.profileImage || member.userInfo?.profileImage}
            size={avatarSize}
            fallbackIcon="account"
          />
          
          <View style={styles.memberInfo}>
            <Text style={[styles.memberName, { fontSize: nameFontSize }]}>
              {displayName}
            </Text>
            {/* Kullanıcı adı */}
            <Text style={[styles.memberUsername, { fontSize: usernameFontSize }]}>
              {computedUsername ? `@${computedUsername}` : ''}
            </Text>
            <Text style={[styles.memberUniversity, { fontSize: metaFontSize }]}>
              {getUniversityName(university)}
            </Text>
            {member.userInfo?.department && (
              <Text style={[styles.memberDepartment, { fontSize: metaFontSize }]}>
                {member.userInfo.department}
              </Text>
            )}
          </View>
        </TouchableOpacity>
          
        <View style={styles.memberActions}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={isTablet ? 24 : 20}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                onRemove();
              }}
              title="Üyeyi Kaldır"
              icon="account-remove"
            />
          </Menu>
        </View>
      </View>
      
      <View style={styles.memberDetails}>
        <Text style={[styles.joinDate, { fontSize: isCompact ? 11 : 12 }]}>
          Katılım: {moment(member.joinedDate?.toDate()).format('DD MMMM YYYY')}
        </Text>
      </View>
    </Surface>
  );
};

// Başvuru Kartı Komponenti
interface RequestCardProps {
  request: MembershipRequest;
  onApprove: () => void;
  onReject: () => void;
  onViewProfile: (userId: string) => void;
  isProcessing: boolean;
  getUniversityName: (code?: string) => string;
}

const RequestCard: React.FC<RequestCardProps> = ({ 
  request, 
  onApprove, 
  onReject, 
  onViewProfile,
  isProcessing,
  getUniversityName 
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { avatarData } = useUserAvatar(request.userId);
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isCompact = width < 360;
  const avatarSize = isTablet ? 72 : isCompact ? 48 : 60;
  const nameFontSize = isTablet ? 18 : isCompact ? 14 : 16;
  const usernameFontSize = isTablet ? 15 : isCompact ? 12 : 13;
  const metaFontSize = isTablet ? 14 : isCompact ? 12 : 13;

  const sanitizeUsername = (val?: string) => {
    if (!val) return '';
    return val
      .replace(/^@+/, '')
      .trim()
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u');
  };

  const displayName = avatarData?.displayName || request.userInfo?.displayName || request.userInfo?.email?.split('@')[0] || 'İsimsiz Kullanıcı';
  const computedUsername = (() => {
    const u = avatarData?.userName || (request as any)?.userInfo?.username;
    if (u && u.trim() !== '') return sanitizeUsername(u);
    const emailLocal = request.userInfo?.email?.split('@')[0];
    if (emailLocal) return sanitizeUsername(emailLocal);
    return sanitizeUsername(displayName) || 'kullanici';
  })();
  const university = avatarData?.university || request.userInfo?.university;
  
  return (
    <Surface style={[styles.requestCard, isTablet && styles.requestCardTablet]}>
      <View style={styles.requestContainer}>
        <TouchableOpacity 
          style={styles.requestHeader}
          onPress={() => onViewProfile(request.userId)}
          activeOpacity={0.7}
        >
          <UniversalAvatar
            userId={request.userId}
            userName={displayName}
            profileImage={avatarData?.profileImage || request.userInfo?.profileImage}
            size={avatarSize}
            fallbackIcon="account"
          />
          
          <View style={styles.requestInfo}>
            <Text style={[styles.requestName, { fontSize: nameFontSize }]}>
              {displayName}
            </Text>
            {/* Kullanıcı adı */}
            <Text style={[styles.requestUsername, { fontSize: usernameFontSize }]}>
              {computedUsername ? `@${computedUsername}` : ''}
            </Text>
            <Text style={[styles.requestUniversity, { fontSize: metaFontSize }]}>
              {getUniversityName(university) || 'Üniversite belirtilmemiş'}
            </Text>
            <Text style={[styles.requestDate, { fontSize: isCompact ? 11 : 12 }]}>
              Başvuru: {request.requestDate?.toDate?.() 
                ? moment(request.requestDate.toDate()).format('DD.MM.YYYY HH:mm')
                : moment(request.requestDate).format('DD.MM.YYYY HH:mm')
              }
            </Text>
          </View>
        </TouchableOpacity>
          
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => setShowDetails(!showDetails)}
        >
          <MaterialCommunityIcons 
            name={showDetails ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#4CAF50" 
          />
          <Text style={styles.detailsButtonText}>
            {showDetails ? 'Gizle' : 'Detay'}
          </Text>
        </TouchableOpacity>
      </View>

      {showDetails && (
        <View style={styles.detailsContainer}>
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Ek Bilgiler</Text>
          </View>
          
          {request.userInfo?.department && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="book-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Bölüm</Text>
                <Text style={styles.detailValue}>{request.userInfo.department}</Text>
              </View>
            </View>
          )}
          
          {request.userInfo?.classLevel && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="bookmark-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Sınıf Düzeyi</Text>
                <Text style={styles.detailValue}>{request.userInfo.classLevel}</Text>
              </View>
            </View>
          )}
          
          {request.message && (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="message-text-outline" size={20} color="#666" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Başvuru Mesajı</Text>
                <Text style={styles.detailValue}>{request.message}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.requestActions}>
        <Button
          mode="outlined"
          icon="close"
          onPress={onReject}
          disabled={isProcessing}
          style={[styles.actionButton, styles.rejectButton]}
          labelStyle={{ color: '#F44336' }}
        >
          Reddet
        </Button>
        
        <Button
          mode="contained"
          icon="check"
          onPress={onApprove}
          loading={isProcessing}
          disabled={isProcessing}
          style={[styles.actionButton, styles.approveButton]}
        >
          Onayla
        </Button>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#6200ea',
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 72,
  },
  memberCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    width: '100%',
    alignSelf: 'center',
  },
  memberCardTablet: {
    borderRadius: 16,
  },
  memberContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  memberUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  memberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  memberUniversity: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  memberDepartment: {
    fontSize: 13,
    color: '#888',
  },
  memberActions: {
    alignItems: 'flex-end',
  },
  memberDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  requestCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  requestCardTablet: {
    borderRadius: 16,
  },
  requestContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  requestUsername: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  requestEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  requestUniversity: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  requestDepartment: {
    fontSize: 13,
    color: '#888',
  },
  requestDetails: {
    marginBottom: 16,
  },
  requestDate: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  messageContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    marginHorizontal: 6,
  },
  rejectButton: {
    borderColor: '#F44336',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  detailsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E8F5E8',
  },
  detailsButtonText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  detailsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailsHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  dialogText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
});

export default ClubMembersScreen;
