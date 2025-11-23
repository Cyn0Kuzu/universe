import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Avatar, Divider, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ClubStackParamList } from '../../navigation/ClubNavigator';
import { UniversalAvatar } from '../../components/common';
import { globalFollowStateManager } from '../../services/globalFollowStateManager';

const firebase = getFirebaseCompatSync();

type ClubFollowersScreenRouteProp = RouteProp<
  {
    ClubFollowers: { clubId: string };
  },
  'ClubFollowers'
>;

interface User {
  id: string;
  displayName?: string;
  name?: string;
  username?: string;
  email?: string;
  profileImage?: string;
  university?: string;
  department?: string;
  userType?: string;
  isFollowing?: boolean;
}

const ClubFollowersScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ClubStackParamList>>();
  const route = useRoute<ClubFollowersScreenRouteProp>();
  const { currentUser } = useAuth();
  
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const clubId = route.params?.clubId || currentUser?.uid;

  console.log('🔍 ClubFollowersScreen - clubId:', clubId);
  console.log('🔍 ClubFollowersScreen - route.params:', route.params);

  // Avatar label'ı güvenli şekilde al
  const getAvatarLabel = (user: User): string => {
    if (user.displayName && user.displayName.trim()) {
      return user.displayName.trim()[0].toUpperCase();
    }
    if (user.name && user.name.trim()) {
      return user.name.trim()[0].toUpperCase();
    }
    if (user.email && user.email.trim()) {
      return user.email.trim()[0].toUpperCase();
    }
    return 'K'; // Kullanıcı için varsayılan
  };

  // Kullanıcı adını güvenli şekilde al
  const getUsernameDisplay = (user: User): string => {
    // Eğer kullanıcının username'i varsa onu kullan
    if (user.username && user.username.trim()) {
      return user.username.toLowerCase();
    }
    
    // DisplayName'den username oluştur
    if (user.displayName && user.displayName.trim()) {
      const cleanName = user.displayName
        .replace(/[^a-zA-Z0-9çğıöşüÇĞIİÖŞÜ\s]/g, '') // Özel karakterleri temizle
        .replace(/\s+/g, '') // Boşlukları kaldır
        .toLowerCase();
      if (cleanName.length > 0) {
        return cleanName;
      }
    }
    
    // Email'den username oluştur
    if (user.email && user.email.includes('@')) {
      return user.email.split('@')[0].toLowerCase();
    }
    
    return 'kullanici';
  };
  
  useEffect(() => {
    if (!clubId) return;
    
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        unsubscribe = await fetchFollowers();
      } catch (error) {
        console.error('Error setting up club followers listener:', error);
      }
    };

    setupListener();

    return () => {
      console.log(`🔕 Cleaning up club followers listener for club: ${clubId}`);
      if (unsubscribe) unsubscribe();
    };
  }, [clubId]);
  
  const fetchFollowers = async () => {
    try {
      setLoading(true);
      console.log(`🔔 Setting up real-time club followers listener for club: ${clubId}`);
      
      // Real-time listener for users who follow this club
      const unsubscribe = getFirebaseCompatSync().firestore()
        .collection('users')
        .where('followedClubs', 'array-contains', clubId)
        .onSnapshot(async (userFollowersSnapshot) => {
          console.log(`🔄 Club followers list changed for club ${clubId}, updating...`);
          console.log(`📊 Snapshot size: ${userFollowersSnapshot.size}`);
          console.log(`📊 Snapshot empty: ${userFollowersSnapshot.empty}`);
          
          if (userFollowersSnapshot.empty) {
            console.log(`ℹ️ No followers found for club ${clubId}`);
            setFollowers([]);
            setLoading(false);
            return;
          }
          
          const followersList: User[] = [];
          
          // Process each follower
          for (const doc of userFollowersSnapshot.docs) {
            const userData = doc.data();
            
            // Skip if it's not a valid user or it's the current user
            if (!userData) continue;
            
            followersList.push({
              id: doc.id,
              displayName: userData.displayName || userData.name || 'İsimsiz Kullanıcı',
              email: userData.email,
              profileImage: userData.profileImage,
              university: userData.university,
              department: userData.department,
              userType: userData.userType || 'student'
            });
          }
          
          setFollowers(followersList);
          console.log(`✅ Club followers data updated: ${followersList.length} users`);
        }, (error) => {
          console.error('❌ Club followers real-time listener error:', error);
          setFollowers([]);
        });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up club followers listener:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const navigateToProfile = (userId: string, userType: string) => {
    try {
      if (userType === 'student') {
        // Öğrenci profili için ViewProfile sayfasına git
        navigation.navigate('ViewProfile' as any, { userId });
      } else if (userType === 'club') {
        // Kulüp profili için ViewClub sayfasına git
        navigation.navigate('ViewClub' as any, { clubId: userId });
      } else {
        // Varsayılan olarak öğrenci profili
        navigation.navigate('ViewProfile' as any, { userId });
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback olarak ana sayfaya git
      navigation.goBack();
    }
  };
  
  const renderItem = ({ item }: { item: User }) => {
    return (
      <TouchableOpacity 
        style={styles.userCard} 
        onPress={() => navigateToProfile(item.id, item.userType || 'student')}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <UniversalAvatar
            user={item}
            size={50}
          />
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.displayName || item.name || 'İsimsiz Kullanıcı'}
          </Text>
          {/* Kullanıcı adı */}
          <Text style={styles.userUsername}>
            @{getUsernameDisplay(item)}
          </Text>
          <Text style={styles.userDetails}>
            {item.university || 'Üniversite Belirtilmemiş'}
            {item.department ? `, ${item.department}` : ''}
          </Text>
        </View>
        
        <Button 
          mode="outlined"
          compact
          style={styles.viewButton}
          onPress={async () => {
            try {
              // Kulüp perspektifinden takipçiyi kaldır (takipten çıkar)
              const currentClubId = clubId;
              if (!currentClubId) return;
              const db = getFirebaseCompatSync().firestore();
              const batch = db.batch();
              // Kulübün followers listesinden kullanıcıyı kaldır
              const clubRef = db.collection('users').doc(currentClubId);
              batch.update(clubRef, {
                followers: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(item.id),
                followerCount: getFirebaseCompatSync().firestore.FieldValue.increment(-1)
              });
              // Kullanıcının followedClubs listesinden kulübü kaldır
              const userRef = db.collection('users').doc(item.id);
              batch.update(userRef, {
                followedClubs: getFirebaseCompatSync().firestore.FieldValue.arrayRemove(currentClubId)
              });
              await batch.commit();
              // Listeyi yerelde güncelle
              setFollowers(prev => prev.filter(f => f.id !== item.id));
            } catch (e) {
              console.error('Takipçiyi kaldırma hatası:', e);
            }
          }}
        >
          Takipten Çıkar
        </Button>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Takipçiler yükleniyor...</Text>
        </View>
      ) : followers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Henüz takipçiniz bulunmamaktadır.</Text>
        </View>
      ) : (
        <FlatList
          data={followers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <Divider />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    elevation: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  userAvatar: {
    // Avatar için ekstra stil
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  viewButton: {
    borderColor: '#1E88E5',
    borderRadius: 20,
  }
});

export default ClubFollowersScreen;
