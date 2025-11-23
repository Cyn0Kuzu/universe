import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ImageBackground, TouchableOpacity, Alert, Platform, Share, useWindowDimensions } from 'react-native';
import { Text, useTheme, Button, Avatar, Divider, IconButton, Chip, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { UNIVERSITIES_DATA, DEPARTMENTS_DATA, CLASS_LEVELS_DATA } from '../../constants';
import { CustomTheme } from '../../types/theme';
import { useResponsiveDesign } from '../../utils/responsiveDesignUtils';
import { universalProfileSyncService } from '../../services/universalProfileSyncService';
import { globalRealtimeSyncService } from '../../services/globalRealtimeSyncService';
import { enhancedRealtimeSyncService } from '../../services/enhancedRealtimeSyncService';
import { comprehensiveDataSyncService } from '../../services/comprehensiveDataSyncService';
import { clubDataSyncService } from '../../services/clubDataSyncService';
import ImageZoomModal from '../../components/common/ImageZoomModal';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { userFollowSyncService } from '../../services/userFollowSyncService';

interface UserProfile {
  id: string;
  displayName?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  bio?: string;
  university?: string;
  department?: string;
  classLevel?: string;
  userType?: string;
  clubName?: string;
  clubTypes?: string[];
  followerCount?: number;
  followingCount?: number;
  eventCount?: number;
  memberCount?: number;
  createdAt?: any;
  [key: string]: any;
}

interface RouteParams {
  userId: string;
}

const AVATAR_SIZE = 96;
const firebase = getFirebaseCompatSync();

const ViewProfileScreen: React.FC = () => {
  const baseTheme = useTheme();
  const theme = baseTheme as unknown as CustomTheme;
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const route = useRoute();
  const { currentUser, isClubAccount } = useAuth();
  const { fontSizes, spacing, shadows } = useResponsiveDesign();
  const { userId } = route.params as RouteParams;
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [followActionLoading, setFollowActionLoading] = useState(false);
  
  const floatingButtonOffset = useMemo(() => ({
    top: Math.max(insets.top, 0) + 8,
  }), [insets.top]);

  const avatarPositionStyle = useMemo(() => ({
    left: Math.max((windowWidth - AVATAR_SIZE) / 2, 16),
  }), [windowWidth]);

  // Image zoom modal state
  const [imageZoomVisible, setImageZoomVisible] = useState<boolean>(false);
  const [imageZoomUri, setImageZoomUri] = useState<string>('');
  const [imageZoomTitle, setImageZoomTitle] = useState<string>('');

  // Image zoom handler
  const handleImageZoom = (imageUri: string, title: string) => {
    setImageZoomUri(imageUri);
    setImageZoomTitle(title);
      setImageZoomVisible(true);
  };

  // Fetch user profile data
  const fetchUserProfile = useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      console.log('🔄 Fetching user profile for:', userId);
      
      // Get fresh profile data - use clubDataSyncService for clubs, universalProfileSyncService for students
      let profileData;
      if (userProfile?.userType === 'club') {
        profileData = await clubDataSyncService.getClubData(userId, true);
      } else {
        profileData = await universalProfileSyncService.getProfileData(userId, true); // Force refresh
      }
      
      if (profileData) {
        setUserProfile(profileData);
        
        // Get real-time counts
        const [followerQuery, eventQuery, memberQuery] = await Promise.all([
          getFirebaseCompatSync().firestore().collection('users').doc(userId).get(),
          getFirebaseCompatSync().firestore().collection('events').where('createdBy', '==', userId).get(),
          getFirebaseCompatSync().firestore().collection('clubMembers')
            .where('userId', '==', userId)
            .where('status', '==', 'approved')
            .get()
        ]);
        
        const realFollowerCount = followerQuery.exists 
          ? (followerQuery.data()?.followers?.length || 0)
          : 0;
        const realEventCount = eventQuery.size;
        const realMemberCount = memberQuery.size;
        
        setFollowerCount(realFollowerCount);
        setFollowingCount(profileData.followingCount || profileData.following?.length || 0);
        setEventCount(realEventCount);
        setMemberCount(realMemberCount);

        if (currentUser?.uid && currentUser.uid !== userId && !isClubAccount) {
          const followStatus = await userFollowSyncService.checkFollowStatus(currentUser.uid, userId);
          setIsFollowing(followStatus.isFollowing);
        } else {
          setIsFollowing(false);
        }
        
        console.log('✅ User profile loaded successfully');
              } else {
        Alert.alert("Hata", "Kullanıcı bulunamadı");
        navigation.goBack();
      }
        } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      Alert.alert("Hata", "Kullanıcı bilgileri yüklenirken bir sorun oluştu");
    } finally {
        setLoading(false);
    }
  }, [userId, navigation, currentUser?.uid]);

  // Universal gerçek zamanlı profil senkronizasyonu
  useEffect(() => {
    if (!userId) return;
    
    console.log('🔄 Setting up universal real-time profile sync for ViewProfileScreen');

    const handleProfileUpdate = (data: any) => {
      if (data.userId === userId) {
        console.log('🔄 Universal profile update received, refreshing ViewProfileScreen data');
        // Force refresh with latest data from server
        fetchUserProfile();
      }
    };

    const handleClubDataUpdate = (clubData: any) => {
      if (userProfile?.userType === 'club') {
        console.log('🔄 ViewProfile: Club data updated via club sync service, refreshing...');
        setUserProfile({ ...clubData, id: userId });
      }
    };

    // Subscribe to comprehensive sync service
    comprehensiveDataSyncService.subscribe('ViewProfileScreen', handleProfileUpdate);
    
    // Subscribe to club data sync service for clubs
    if (userProfile?.userType === 'club') {
      clubDataSyncService.subscribe(userId, handleClubDataUpdate);
    }

    return () => {
      comprehensiveDataSyncService.unsubscribe('ViewProfileScreen', handleProfileUpdate);
      if (userProfile?.userType === 'club') {
        clubDataSyncService.unsubscribe(userId, handleClubDataUpdate);
      }
    };
  }, [userId, fetchUserProfile]);

  // Sayfa her açıldığında verileri güncelle
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchUserProfile();
      }
    }, [userId, fetchUserProfile])
  );

  // Enhanced real-time synchronization for profile updates
  useEffect(() => {
    if (!userId) return;
    
    const handleProfileUpdate = (data: any) => {
      if (data.userId === userId) {
        console.log('🔄 ViewProfile: Profile updated via comprehensive sync, refreshing...');
        fetchUserProfile();
      }
    };

    // Subscribe to comprehensive sync service
    comprehensiveDataSyncService.subscribe('ViewProfileScreen', handleProfileUpdate);

    return () => {
      comprehensiveDataSyncService.unsubscribe('ViewProfileScreen', handleProfileUpdate);
    };
  }, [userId, fetchUserProfile]);

  // İlk yüklemede kullanıcı verilerini getir
  useEffect(() => {
    if (userId) {
      fetchUserProfile();
    }
  }, [userId, fetchUserProfile]);

  // Sayı formatla fonksiyonu
  const formatNumber = (num: number): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
  };

  // Display value helper
  const getDisplayValue = (field: string, value: string | string[]): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    switch (field) {
      case 'university':
        const university = UNIVERSITIES_DATA.find(u => u.id === value);
        return university ? university.label : value || 'Belirtilmemiş';
      case 'department':
        const department = DEPARTMENTS_DATA.find(d => d.id === value);
        return department ? department.label : value || 'Belirtilmemiş';
      case 'classLevel':
        const classLevel = CLASS_LEVELS_DATA.find(c => c.id === value);
        return classLevel ? classLevel.label : value || 'Belirtilmemiş';
      default:
        return value || 'Belirtilmemiş';
    }
  };

  // Geri dön
  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('StudentTabs');
    }
  };

  // Paylaş
  const handleShare = async () => {
    try {
      const shareMessage = `${userProfile?.displayName || userProfile?.username || 'Kullanıcı'} profilini Universe uygulamasında görüntüle!`;
      await Share.share({
        message: shareMessage,
      });
    } catch (error) {
      console.error('Paylaşım sırasında hata oluştu:', error);
    }
  };

  const handleToggleFollow = useCallback(async () => {
    if (!currentUser?.uid || currentUser.uid === userId || isClubAccount) {
      return;
    }

    setFollowActionLoading(true);
    try {
      const followerName = currentUser.displayName || currentUser.email || 'Kullanıcı';
      if (isFollowing) {
        const success = await userFollowSyncService.unfollowUser(
          currentUser.uid,
          followerName,
          userId
        );
        if (success) {
          setIsFollowing(false);
          setFollowerCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        const success = await userFollowSyncService.followUser(
          currentUser.uid,
          followerName,
          userId
        );
        if (success) {
          setIsFollowing(true);
          setFollowerCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error('Takip işlemi sırasında hata oluştu:', error);
      Alert.alert('Hata', 'İşlem sırasında bir sorun oluştu. Lütfen tekrar deneyin.');
    } finally {
      setFollowActionLoading(false);
    }
  }, [currentUser?.uid, currentUser?.displayName, currentUser?.email, userId, isFollowing, isClubAccount]);

  // Yükleniyor...
  if (loading) {
  return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>

        {currentUser?.uid && currentUser.uid !== userId && !isClubAccount && (
          <View style={styles.followActions}>
            <Button
              mode={isFollowing ? 'outlined' : 'contained'}
              icon={isFollowing ? 'account-check' : 'account-plus'}
              onPress={handleToggleFollow}
              loading={followActionLoading}
              style={isFollowing ? styles.followOutlinedButton : styles.followButton}
              buttonColor={isFollowing ? 'transparent' : theme.colors.primary}
              textColor={isFollowing ? theme.colors.primary : '#fff'}
            >
              {isFollowing ? 'Takipten Çık' : 'Takip Et'}
            </Button>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // Kullanıcı bulunamadı
  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notFoundContainer}>
          <MaterialCommunityIcons name="account-question" size={60} color="#777" />
          <Text style={styles.notFoundText}>Kullanıcı bulunamadı</Text>
          <Button 
            mode="contained" 
            onPress={handleGoBack} 
            style={styles.backButton}
          >
            Geri Dön
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Cover Section */}
          <View style={styles.coverSection}>
        {/* Back Button */}
        <TouchableOpacity 
          style={[styles.backButton, floatingButtonOffset]}
          onPress={handleGoBack}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* More Options Button */}
        <TouchableOpacity 
          style={[styles.menuButton, floatingButtonOffset]}
          onPress={handleShare}
        >
          <MaterialCommunityIcons name="share-variant" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Cover Background */}
        <View style={[styles.coverBackground, { backgroundColor: theme.colors.primary }]}>
                  <MaterialCommunityIcons 
            name="account-circle" 
                    size={180} 
                    color="rgba(255,255,255,0.3)" 
                    style={styles.coverIconStyle} 
                  />
                </View>
        
        {/* Profil Resmi */}
        <View style={[styles.avatarContainer, avatarPositionStyle]}>
          {userProfile.profileImage ? (
              <TouchableOpacity 
                onPress={() => {
                if (userProfile.profileImage) {
                  handleImageZoom(userProfile.profileImage, 'Profil Fotoğrafı');
                  }
                }}
                activeOpacity={0.8}
              >
              <Avatar.Image 
                  size={96}
                source={{ uri: userProfile.profileImage }}
                  style={styles.avatar}
                />
              </TouchableOpacity>
          ) : (
            <Avatar.Icon 
              size={96} 
              icon="account"
              color="#FFFFFF"
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            />
          )}
            </View>
          </View>
          
      <ScrollView style={styles.mainScrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchUserProfile} tintColor={theme.colors.primary} />
      }>
        {/* Profil Başlığı */}
            <View style={styles.profileHeader}>
          <Text style={styles.name}>
            {userProfile.userType === 'club' 
              ? clubDataSyncService.getClubDisplayName(userProfile)
              : (userProfile.displayName || userProfile.username || 'İsimsiz Kullanıcı')
            }
          </Text>
          {userProfile.username && (
            <Text style={styles.username}>@{userProfile.username}</Text>
          )}
            </View>
            
        {/* Bio Section */}
        {userProfile.bio && (
          <View style={styles.bioSection}>
            <Text style={styles.bioText}>{userProfile.bio}</Text>
                </View>
        )}
                
        {/* Stats (Events, Followers, Following, Members) */}
        <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(eventCount)}</Text>
            <Text style={styles.statLabel}>Etkinlik</Text>
            <MaterialCommunityIcons name="calendar-star" size={14} color="#666" style={styles.statIcon} />
                  </View>

          <View style={styles.verticalDivider} />
          
                  <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(followerCount)}</Text>
            <Text style={styles.statLabel}>Takipçi</Text>
            <MaterialCommunityIcons name="account-heart" size={14} color="#666" style={styles.statIcon} />
                    </View>
          
          <View style={styles.verticalDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{formatNumber(followingCount)}</Text>
            <Text style={styles.statLabel}>Takip</Text>
            <MaterialCommunityIcons name="account-plus" size={14} color="#666" style={styles.statIcon} />
            </View>
            
          {userProfile.userType === 'student' && (
            <>
              <View style={styles.verticalDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{formatNumber(memberCount)}</Text>
                <Text style={styles.statLabel}>Kulüp</Text>
                <MaterialCommunityIcons name="account-group" size={14} color="#666" style={styles.statIcon} />
                </View>
            </>
          )}
        </View>

        {currentUser?.uid && currentUser.uid !== userId && !isClubAccount && (
          <View style={styles.followActions}>
            <Button
              mode={isFollowing ? 'outlined' : 'contained'}
              icon={isFollowing ? 'account-check' : 'account-plus'}
              onPress={handleToggleFollow}
              loading={followActionLoading}
              style={isFollowing ? styles.followOutlinedButton : styles.followButton}
              buttonColor={isFollowing ? 'transparent' : theme.colors.primary}
              textColor={isFollowing ? theme.colors.primary : '#fff'}
            >
              {isFollowing ? 'Takipten Çık' : 'Takip Et'}
            </Button>
          </View>
        )}
            
            {/* Personal Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
              {userProfile.userType === 'club' ? 'Kulüp Bilgileri' : 'Kişisel Bilgiler'}
            </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>E-posta</Text>
              <Text style={styles.infoValue}>{userProfile.email || 'Belirtilmemiş'}</Text>
            </View>
              </View>

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-outline" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Kullanıcı Tipi</Text>
              <Text style={styles.infoValue}>
                {userProfile.userType === 'student' ? 'Öğrenci' : 
                 userProfile.userType === 'club' ? 'Kulüp' : 'Belirtilmemiş'}
              </Text>
            </View>
              </View>
              
                <View style={styles.infoRow}>
            <MaterialCommunityIcons name="school" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Üniversite</Text>
              <Text style={styles.infoValue}>{getDisplayValue('university', userProfile.university || '')}</Text>
                </View>
          </View>
              
          {userProfile.userType === 'student' && (
            <>
                <View style={styles.infoRow}>
                <MaterialCommunityIcons name="book-open-outline" size={24} color={theme.colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Bölüm</Text>
                  <Text style={styles.infoValue}>{getDisplayValue('department', userProfile.department || '')}</Text>
                </View>
              </View>
              
                <View style={styles.infoRow}>
                <MaterialCommunityIcons name="school-outline" size={24} color={theme.colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Sınıf</Text>
                  <Text style={styles.infoValue}>{getDisplayValue('classLevel', userProfile.classLevel || '')}</Text>
                </View>
              </View>
            </>
              )}
              
          {userProfile.userType === 'club' && (
            <>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="domain" size={24} color={theme.colors.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Kulüp Adı</Text>
                  <Text style={styles.infoValue}>{userProfile.clubName || userProfile.displayName || 'Belirtilmemiş'}</Text>
              </View>
            </View>
            
              {userProfile.clubTypes && userProfile.clubTypes.length > 0 && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="tag-multiple" size={24} color={theme.colors.primary} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Kategoriler</Text>
                    <View style={styles.clubTagsContainer}>
                      {userProfile.clubTypes.map((type, index) => (
                        <Chip
                          key={index}
                          style={styles.clubTagChip}
                          textStyle={{ color: 'white', fontSize: 12 }}
                        >
                          {type}
                        </Chip>
                      ))}
                    </View>
                  </View>
              </View>
            )}
        </>
      )}
          
          {/* Katılım Tarihi */}
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Katılma Tarihi</Text>
              <Text style={styles.infoValue}>
                {(() => {
                  try {
                    if (userProfile.createdAt?.seconds) {
                      return new Date(userProfile.createdAt.seconds * 1000).toLocaleDateString('tr-TR');
                    } else if (userProfile.createdAt instanceof Date) {
                      return userProfile.createdAt.toLocaleDateString('tr-TR');
                    } else if (typeof userProfile.createdAt === 'string') {
                      return new Date(userProfile.createdAt).toLocaleDateString('tr-TR');
                    } else if (userProfile.createdAt && typeof userProfile.createdAt.toDate === 'function') {
                      return userProfile.createdAt.toDate().toLocaleDateString('tr-TR');
                    }
                    return '—';
                  } catch (e) {
                    console.error('Tarih formatı hatası:', e);
                    return '—';
                  }
                })()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Image Zoom Modal */}
      <ImageZoomModal
        visible={imageZoomVisible}
        imageUri={imageZoomUri}
        onClose={() => setImageZoomVisible(false)}
        title={imageZoomTitle}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    paddingBottom: 32,
  },
  coverSection: {
    height: 220,
    position: 'relative',
    marginTop: 0,
  },
  coverBackground: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverIconStyle: {
    position: 'absolute',
  },
  menuButton: {
    position: 'absolute',
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  avatarContainer: {
    position: 'absolute',
    bottom: -48,
    zIndex: 10,
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 4,
    borderColor: '#FFF',
  },
  profileHeader: {
    marginTop: 52,
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  bioSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  bioText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.01)',
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statIcon: {
    marginTop: 4,
  },
  followActions: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  followButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  followOutlinedButton: {
    borderRadius: 12,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#1D4ED8',
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  clubTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  clubTagChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#1E88E5',
    height: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 18,
    marginVertical: 10,
    color: '#555',
  },
});

export default ViewProfileScreen;