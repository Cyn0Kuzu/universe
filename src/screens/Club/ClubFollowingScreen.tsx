import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Avatar, Divider, Button, useTheme, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ClubStackParamList } from '../../navigation/ClubNavigator';
import { UniversalAvatar } from '../../components/common';

const firebase = getFirebaseCompatSync();

type ClubFollowingScreenRouteProp = RouteProp<
  {
    ClubFollowing: { clubId: string };
  },
  'ClubFollowing'
>;

interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  email?: string;
  university?: string;
  department?: string;
  classLevel?: string;
  isFollowing?: boolean;
}

interface Club {
  id: string;
  name: string;
  description?: string;
  profilePicture?: string;
  university?: string;
  category?: string;
  isFollowing?: boolean;
}

const ClubFollowingScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ClubStackParamList>>();
  const route = useRoute<ClubFollowingScreenRouteProp>();
  const { clubId } = route.params;
  
  console.log('🔍 ClubFollowingScreen - clubId:', clubId);
  console.log('🔍 ClubFollowingScreen - route.params:', route.params);
  
  const [club, setClub] = useState<{
    id: string;
    name: string;
    following?: string[];
    followingCount?: number;
  } | null>(null);
  
  const [following, setFollowing] = useState<(User | Club)[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Kulüp detaylarını getir - Real-time listener ile
  const fetchClubDetails = useCallback(async () => {
    try {
      console.log(`🔔 Setting up real-time club details listener for club: ${clubId}`);
      
      const unsubscribe = getFirebaseCompatSync().firestore()
        .collection('users')
        .doc(clubId)
        .onSnapshot((clubDoc) => {
          if (clubDoc.exists) {
            const clubData = clubDoc.data();
            const newClubData = {
              id: clubDoc.id,
              name: clubData?.name || clubData?.firstName || 'Bilinmeyen Kulüp',
              following: clubData?.following || [],
              followingCount: clubData?.followingCount || 0
            };
            
            setClub(newClubData);
            console.log(`🔄 Club details updated: ${newClubData.name}, following: ${newClubData.following.length}`);
          }
        }, (error) => {
          console.error('❌ Club details real-time listener error:', error);
        });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up club details listener:', error);
    }
  }, [clubId]);
  
  // Takip edilen kişi/kulüpleri getir
  const fetchFollowing = useCallback(async () => {
    console.log(`🔍 fetchFollowing called for club:`, club);
    
    if (!club?.following || club.following.length === 0) {
      console.log(`ℹ️ No following data for club ${club?.id}, setting empty array`);
      setFollowing([]);
      setLoading(false);
      return;
    }
    
    try {
      const promises = club.following.map(async (followingId) => {
        try {
          const userDoc = await getFirebaseCompatSync().firestore().collection('users').doc(followingId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData) {
              // Kulüp mü yoksa kullanıcı mı kontrol et
              if (userData.userType === 'club') {
                return {
                  id: userDoc.id,
                  name: userData.name || userData.firstName || 'Bilinmeyen Kulüp',
                  description: userData.description || userData.bio,
                  profilePicture: userData.profilePicture,
                  university: userData.university,
                  category: userData.category,
                  isFollowing: true
                } as Club;
              } else {
                return {
                  id: userDoc.id,
                  firstName: userData.firstName || '',
                  lastName: userData.lastName || '',
                  profilePicture: userData.profilePicture,
                  email: userData.email,
                  university: userData.university,
                  department: userData.department,
                  classLevel: userData.classLevel,
                  isFollowing: true
                } as User;
              }
            }
          }
          return null;
        } catch (error) {
          console.error('Error fetching following user:', error);
          return null;
        }
      });
      
      const results = await Promise.all(promises);
      const validResults = results.filter((item) => item !== null) as (User | Club)[];
      
      setFollowing(validResults);
    } catch (error) {
      console.error('Error fetching following:', error);
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  }, [club]);
  
  // Refresh fonksiyonu
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchClubDetails(), fetchFollowing()]);
    setRefreshing(false);
  }, [fetchClubDetails, fetchFollowing]);
  
  // Profil görüntüle
  const handleViewProfile = (userId: string) => {
    console.log('Navigate to profile:', userId);
    // Navigation logic here
  };
  
  // Ana initialization useEffect - Club details listener'ını başlat
  useEffect(() => {
    if (!clubId) {
      navigation.goBack();
      return;
    }
    
    let unsubscribeClub: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unsubscribeClub = await fetchClubDetails();
      } catch (error) {
        console.error('Error setting up club details listener:', error);
      }
    };

    setupListener();

    return () => {
      console.log(`🔕 Cleaning up club details listener for club: ${clubId}`);
      if (unsubscribeClub) unsubscribeClub();
    };
  }, [clubId, navigation]);
  
  // Club data değiştiğinde following'i fetch et
  useEffect(() => {
    if (club) {
      fetchFollowing();
    }
  }, [club, fetchFollowing]);
  
  // Arama filtresi
  const filteredFollowing = following.filter(item => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    if ('name' in item) {
      // Club
      return item.name?.toLowerCase().includes(query) ||
             item.description?.toLowerCase().includes(query);
    } else {
      // User
      return item.firstName?.toLowerCase().includes(query) ||
             item.lastName?.toLowerCase().includes(query) ||
             item.email?.toLowerCase().includes(query);
    }
  });
  
  // Item render
  const renderItem = ({ item }: { item: User | Club }) => {
    const isClub = 'name' in item;
    
    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => handleViewProfile(item.id)}>
        <UniversalAvatar
          user={item}
          size={50}
          style={styles.avatar}
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>
            {isClub ? (item as Club).name : `${(item as User).firstName} ${(item as User).lastName}`}
          </Text>
          
          <Text style={styles.itemDetails}>
            {isClub 
              ? (item as Club).description || (item as Club).university || 'Kulüp'
              : `${(item as User).department || ''} ${(item as User).classLevel || ''}`.trim() || (item as User).university || 'Öğrenci'
            }
          </Text>
          
          {(item as User).email && (
            <Text style={styles.itemEmail}>{(item as User).email}</Text>
          )}
        </View>
        
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={24} 
          color="#ccc" 
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Takip edilenler yükleniyor...</Text>
        </View>
      ) : (
        <>
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder="Takip edilenlerde ara..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              iconColor="#666"
            />
          </View>
          
          {filteredFollowing.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-multiple-outline" size={64} color="#e0e0e0" />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'Arama sonucu bulunamadı' : 'Takip edilen yok'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? 'Farklı anahtar kelimeler deneyebilirsiniz.' 
                  : 'Bu kulüp henüz kimseyi takip etmiyor.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredFollowing}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <Divider />}
              contentContainerStyle={styles.listContent}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchBar: {
    backgroundColor: '#f5f5f5',
    elevation: 1,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
  listContent: {
    padding: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatar: {
    backgroundColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 16,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  itemEmail: {
    fontSize: 12,
    color: '#888',
  },
});

export default ClubFollowingScreen;
