import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Card, Avatar, Button, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import { UniversalAvatar } from '../../components/common/UniversalAvatar';
// Removed event tab/cards: focus only on club memberships list

const firebase = getFirebaseCompatSync();

interface Club {
  id: string;
  name: string;
  displayName?: string;
  username?: string;
  description?: string;
  university?: string;
  profileImage?: string;
  avatarIcon?: string;
  avatarColor?: string;
  memberCount?: number;
  followerCount?: number;
  eventCount?: number;
  joinDate?: any;
}

const MyMembershipsScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const { currentUser } = useAuth();

  const [memberClubs, setMemberClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  // Using UniversalAvatar for robust image resolution; no local failedImages tracking needed

  // Üye olunan kulüpleri getir - TÜM KOLEKSIYONLARI KONTROL ET
  const fetchMemberClubs = useCallback(async () => {
    if (!currentUser?.uid) {
      console.log('❌ No current user');
      return;
    }

    try {
      const db = getFirebaseCompatSync().firestore();
      console.log('🔍 Fetching member clubs for user:', currentUser.uid);

      // METHOD 1: clubMembers koleksiyonu - realtime
      const clubMembersQuery = await db.collection('clubMembers')
        .where('userId', '==', currentUser.uid)
        .get();
      
      console.log('📊 clubMembers collection - Total records:', clubMembersQuery.size);

      // METHOD 2: membershipRequests koleksiyonu kontrol et (approved olanlar) - Fallback
      const requestsQuery = await db.collection('membershipRequests')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'approved')
        .get();
      
      console.log('📊 membershipRequests (approved) - Total records:', requestsQuery.size);

      // Profil resmi URL'sini bulan yardımcı fonksiyon
      const getProfileImageUrl = async (userData: any): Promise<string | null> => {
        if (!userData) return null;
        
        const possibleImageFields = [
          userData.profileImage,
          userData.photoURL,
          userData.avatar,
          userData.logo,
          userData.image
        ];
        
        // İlk geçerli URL'yi bul
        for (const imgField of possibleImageFields) {
          if (imgField && typeof imgField === 'string' && imgField.trim() !== '') {
            // HTTP/HTTPS kontrolü
            if (imgField.startsWith('http') || imgField.startsWith('https')) {
              return imgField;
            } 
            // Firebase Storage URL
            else if (imgField.startsWith('gs://')) {
              try {
                const storageRef = getFirebaseCompatSync().storage().refFromURL(imgField);
                const downloadUrl = await storageRef.getDownloadURL();
                return downloadUrl;
              } catch (storageError) {
                console.error('Storage URL conversion error:', storageError);
              }
            }
          }
        }
        
        return null;
      };

  // Şimdi gerçek veri işleme - clubMembers'dan approved olanları kullan
  const approvedMemberships = clubMembersQuery.docs.filter(doc => {
        const data = doc.data();
        return data.status === 'approved';
      });

      console.log('✅ Approved memberships found:', approvedMemberships.length);

      if (approvedMemberships.length === 0) {
        // Fallback: membershipRequests'teki approved olanları kullan
        if (requestsQuery.size > 0) {
          console.log('🔄 Using approved membership requests as fallback');
          const clubsFromRequests: Club[] = [];
          
          for (const requestDoc of requestsQuery.docs) {
            const requestData = requestDoc.data();
            const clubId = requestData.clubId;
            
            try {
              const clubDoc = await db.collection('users').doc(clubId).get();
              if (clubDoc.exists) {
                const clubData = clubDoc.data();
                
                // Kulüp tipi/ismine göre uygun avatarIcon belirle
                const determineAvatarIcon = (clubName: string) => {
                  const name = clubName.toLowerCase();
                  if (name.includes('fizik')) return 'atom';
                  if (name.includes('kimya')) return 'flask';
                  if (name.includes('matematik')) return 'calculator';
                  if (name.includes('bilgisayar') || name.includes('yazılım')) return 'laptop';
                  if (name.includes('spor') || name.includes('futbol') || name.includes('basketbol')) return 'basketball';
                  if (name.includes('müzik')) return 'music';
                  if (name.includes('sanat')) return 'palette';
                  if (name.includes('edebiyat') || name.includes('kitap')) return 'book-open';
                  if (name.includes('drama') || name.includes('tiyatro')) return 'drama-masks';
                  if (name.includes('fotoğraf')) return 'camera';
                  if (name.includes('dans')) return 'human-handsup';
                  return 'school';
                };

                const profileImageUrl = await getProfileImageUrl(clubData);
                
                clubsFromRequests.push({
                  id: clubId,
                  name: clubData?.name || clubData?.displayName || 'İsimsiz Kulüp',
                  displayName: clubData?.displayName || clubData?.name,
                  username: clubData?.username,
                  description: clubData?.description || clubData?.bio,
                  university: clubData?.university,
                  profileImage: profileImageUrl || '',
                  avatarIcon: clubData?.avatarIcon || determineAvatarIcon(clubData?.name || clubData?.displayName || ''),
                  avatarColor: clubData?.avatarColor || '#FF9800',
                  memberCount: clubData?.memberCount || 0,
                  followerCount: clubData?.followerCount || 0,
                  eventCount: 0,
                  joinDate: requestData.requestDate
                });
              }
            } catch (error) {
              console.error(`Error fetching club ${clubId}:`, error);
            }
          }
          
          setMemberClubs(clubsFromRequests);
          return;
        }
        
        setMemberClubs([]);
        return;
      }

      const clubsData: Club[] = [];

  await Promise.all(approvedMemberships.map(async (memberDoc: any) => {
        const memberData = memberDoc.data();
        const clubId = memberData.clubId;
        // DÜZELTME: joinedDate alanı doğru kullanılıyor
        const joinDate = memberData.joinedDate || memberData.joinDate;

        try {
          // Kulüp bilgilerini getir
          const clubDoc = await db.collection('users').doc(clubId).get();
          
          if (clubDoc.exists) {
            const clubData = clubDoc.data();

            // Kulüp istatistiklerini getir
            let realEventCount = 0;
            let realMemberCount = 0;
            let realFollowerCount = 0;

            try {
              const statsDoc = await db.collection('clubStats').doc(clubId).get();
              if (statsDoc.exists) {
                const statsData = statsDoc.data();
                realEventCount = statsData?.totalEvents || 0;
                realMemberCount = statsData?.totalMembers || 0;
                realFollowerCount = statsData?.totalFollowers || 0;
              } else {
                // Fallback: Manuel sayım
                const eventsQuery = await db.collection('events').where('clubId', '==', clubId).get();
                realEventCount = eventsQuery.size;
                
                // DÜZELTME: clubMembers koleksiyonunda 'approved' status kullanılıyor  
                const membersQuery = await db.collection('clubMembers')
                  .where('clubId', '==', clubId)
                  .where('status', '==', 'approved')
                  .get();
                realMemberCount = membersQuery.size;

                const followersQuery = await db.collection('userFollowings')
                  .where('followedId', '==', clubId)
                  .get();
                realFollowerCount = followersQuery.size;
              }
            } catch (error) {
              console.error('İstatistik alınırken hata:', error);
            }

            // Kulüp tipi/ismine göre uygun avatarIcon belirle
            const determineAvatarIcon = (clubName: string, clubType?: string) => {
              const name = clubName.toLowerCase();
              if (name.includes('fizik')) return 'atom';
              if (name.includes('kimya')) return 'flask';
              if (name.includes('matematik')) return 'calculator';
              if (name.includes('bilgisayar') || name.includes('yazılım')) return 'laptop';
              if (name.includes('spor') || name.includes('futbol') || name.includes('basketbol')) return 'basketball';
              if (name.includes('müzik')) return 'music';
              if (name.includes('sanat')) return 'palette';
              if (name.includes('edebiyat') || name.includes('kitap')) return 'book-open';
              if (name.includes('drama') || name.includes('tiyatro')) return 'drama-masks';
              if (name.includes('fotoğraf')) return 'camera';
              if (name.includes('dans')) return 'human-handsup';
              return 'school';
            };

            // Kulüp rengini belirle
            const determineAvatarColor = (clubName: string) => {
              const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA726', '#AB47BC', '#26A69A', '#42A5F5', '#66BB6A'];
              let hash = 0;
              for (let i = 0; i < clubName.length; i++) {
                hash = clubName.charCodeAt(i) + ((hash << 5) - hash);
              }
              return colors[Math.abs(hash) % colors.length];
            };

            // Profil resmi URL'ini güvenli şekilde al
            const profileImageUrl = await getProfileImageUrl(clubData);
            
            // Profil resmi geçerli mi kontrol et
            let finalProfileImage = '';
            if (profileImageUrl && 
                profileImageUrl.trim() !== '' && 
                profileImageUrl !== 'null' && 
                profileImageUrl !== 'undefined') {
              finalProfileImage = profileImageUrl;
            }

            const clubObject = {
              id: clubId,
              name: clubData?.name || clubData?.displayName || 'İsimsiz Kulüp',
              displayName: clubData?.displayName || clubData?.name,
              username: clubData?.username,
              description: clubData?.description || clubData?.bio,
              university: clubData?.university,
              profileImage: finalProfileImage,
              avatarIcon: clubData?.avatarIcon || determineAvatarIcon(clubData?.name || clubData?.displayName || ''),
              avatarColor: clubData?.avatarColor || determineAvatarColor(clubData?.name || clubData?.displayName || ''),
              memberCount: realMemberCount,
              followerCount: realFollowerCount,
              eventCount: realEventCount,
              joinDate: joinDate
            };

            console.log(`📝 Club object created for ${clubId}:`, {
              name: clubObject.name,
              avatarIcon: clubObject.avatarIcon,
              avatarColor: clubObject.avatarColor
            });

            clubsData.push(clubObject);

            console.log(`✅ Club added to list: ${clubData?.displayName || clubData?.name}`);
          } else {
            console.log(`❌ Club document not found for ID: ${clubId}`);
          }
        } catch (error) {
          console.error(`❌ Error processing club ${clubId}:`, error);
        }
      }));

      console.log(`📊 Final clubs data: ${clubsData.length} clubs found`);
      clubsData.forEach(club => {
        console.log(`  - ${club.displayName || club.name} (${club.memberCount} members)`);
      });

      // Katılma tarihine göre sırala (en yeni önce) - SAFE DATE PARSING
      clubsData.sort((a, b) => {
        try {
          const dateA = a.joinDate ? 
            (a.joinDate.toDate ? a.joinDate.toDate() : new Date(a.joinDate)) : 
            new Date(0);
          const dateB = b.joinDate ? 
            (b.joinDate.toDate ? b.joinDate.toDate() : new Date(b.joinDate)) : 
            new Date(0);
          return dateB.getTime() - dateA.getTime();
        } catch (error) {
          console.error('Error sorting by date:', error);
          return 0;
        }
      });

      setMemberClubs(clubsData);
      console.log('✅ Member clubs state updated with', clubsData.length, 'clubs');
    } catch (error) {
      console.error('❌ CRITICAL ERROR in fetchMemberClubs:', error);
      setMemberClubs([]);
    }
  }, [currentUser]);

  // Realtime updates: listen for changes in the user's memberships, then refetch
  useEffect(() => {
    if (!currentUser?.uid) return;
    const db = getFirebaseCompatSync().firestore();
    const unsub = db
      .collection('clubMembers')
      .where('userId', '==', currentUser.uid)
      .where('status', '==', 'approved')
      .onSnapshot(
        () => {
          // lightweight debounce using microtask
          fetchMemberClubs();
        },
        (err) => console.error('❌ clubMembers realtime error:', err)
      );
    return unsub;
  }, [currentUser?.uid, fetchMemberClubs]);

  // Veri yükleme
  const loadData = useCallback(async () => {
    setLoading(true);
    await fetchMemberClubs();
    setLoading(false);
  }, [fetchMemberClubs]);

  // Yenileme
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Sayfa odaklandığında veri yükle
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Avatar render fonksiyonu
  const renderClubAvatar = (club: Club) => (
    <UniversalAvatar
      size={50}
      style={styles.clubAvatar}
      user={{
        id: club.id,
        displayName: club.displayName || club.name,
        profileImage: club.profileImage || null,
        avatarIcon: (club.avatarIcon as any) || 'school',
        avatarColor: club.avatarColor || undefined,
      }}
      fallbackIcon="school"
    />
  );

  // Kulüp kartı render fonksiyonu
  const renderClubCard = ({ item }: { item: Club }) => (
    <Card style={styles.clubCard}>
      <TouchableOpacity
        onPress={() => navigation.navigate('ViewClub', { clubId: item.id })}
        style={styles.clubCardContent}
      >
        <View style={styles.clubHeader}>
          {renderClubAvatar(item)}
          
          <View style={styles.clubInfo}>
            <Text style={styles.clubName} numberOfLines={1}>
              {item.displayName || item.name}
            </Text>
            {item.username ? (
              <Text style={styles.clubUsername} numberOfLines={1}>@{item.username}</Text>
            ) : null}
            <Text style={styles.clubUniversity} numberOfLines={1}>
              {item.university || 'Üniversite belirtilmemiş'}
            </Text>
          </View>

        </View>

        <View style={styles.clubStats}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-group" size={16} color="#666" />
            <Text style={styles.statText}>{item.followerCount || 0} takipçi</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="account-multiple" size={16} color="#666" />
            <Text style={styles.statText}>{item.memberCount || 0} üye</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="calendar" size={16} color="#666" />
            <Text style={styles.statText}>{item.eventCount || 0} etkinlik</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 8 }}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <MaterialCommunityIcons name="account-group" size={18} color={theme.colors.primary} />
          <Text style={styles.headerTitle}>
            Üye Olduklarım ({memberClubs.length})
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <Divider />

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Veriler yükleniyor...</Text>
        </View>
      ) : (
        <FlatList<Club>
          data={memberClubs}
          renderItem={renderClubCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="account-group-outline" 
                size={64} 
                color="#ccc" 
              />
              <Text style={styles.emptyTitle}>
                Henüz hiçbir kulübe üye değilsiniz
              </Text>
              <Text style={styles.emptySubtitle}>
                Kulüpler sayfasından ilginizi çeken kulüplere üyelik başvurusu yapabilirsiniz.
              </Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Clubs')}
                style={styles.exploreButton}
              >
                Kulüpleri Keşfet
              </Button>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 8,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  topInfoPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  topInfoText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#1976D2',
  },
  tabButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  clubCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  clubCardContent: {
    padding: 16,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clubAvatar: {
    marginRight: 0,
  },
  customAvatarWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubInfo: {
    flex: 1,
    marginLeft: 12,
  },
  clubName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  clubUniversity: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  clubUsername: {
    fontSize: 12,
    color: '#777',
    marginBottom: 2,
  },
  joinDate: {
    fontSize: 12,
    color: '#999',
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  memberBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  clubStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  clubDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  eventCardContainer: {
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreButton: {
    borderRadius: 8,
  },
});

export default MyMembershipsScreen;
