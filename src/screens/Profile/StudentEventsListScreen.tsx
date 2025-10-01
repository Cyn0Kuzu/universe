import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { firebase } from '../../firebase';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import StudentEventCard from '../../components/StudentEventCard';
import { useUserAvatar } from '../../hooks';

type StudentEventsListScreenRouteProp = RouteProp<
  {
    StudentEventsList: { userId: string; userName?: string };
  },
  'StudentEventsList'
>;

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: {
    type: string;
    physicalAddress?: string;
    onlineLink?: string;
  };
  attendeesCount?: number;
  capacity?: number;
  categories?: string[];
  imageUrl?: string;
  clubName?: string;
  clubId?: string;
  pricing?: {
    isFree: boolean;
    price?: number;
  };
}

const StudentEventsListScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<StudentStackParamList>>();
  const route = useRoute<StudentEventsListScreenRouteProp>();
  const { userId } = route.params;
  const { avatarData } = useUserAvatar(userId);
  const liveUserName = avatarData?.displayName || 'Kullanıcı';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  // Not: Filtreleme ve arama kaldırıldı. Varsayılan: tümü, tarihe göre sıralı.
  
  // Kullanıcının katıldığı etkinlikleri getir (eventAttendees authoritative, attendedEvents fallback)
  const fetchUserEvents = useCallback(async () => {
    try {
      setLoading(true);
      const db = firebase.firestore();
      
      // Öncelik: eventAttendees koleksiyonundan katıldığı etkinlikleri al
      let attendedEventIds: string[] = [];
      try {
        const attendeeSnap = await db
          .collection('eventAttendees')
          .where('userId', '==', userId)
          .get();
        attendedEventIds = attendeeSnap.docs
          .map(d => d.data()?.eventId)
          .filter((id): id is string => typeof id === 'string');
      } catch (err) {
        console.warn('⚠️ eventAttendees sorgusu başarısız, attendedEvents alanına düşülüyor:', err);
      }

      // Fallback: users.attendedEvents alanı
      if (attendedEventIds.length === 0) {
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.data();
        if (userData && Array.isArray(userData.attendedEvents)) {
          attendedEventIds = userData.attendedEvents as string[];
        }
      }
      
  // Benzersiz ID'leri al
  attendedEventIds = Array.from(new Set(attendedEventIds));

  if (attendedEventIds.length === 0) {
        setAllEvents([]);
        setLoading(false);
        return;
      }
      
      // Katıldığı etkinliklerin detaylarını al
  const eventsData: Event[] = [];
      
      // Batch olarak etkinlik detaylarını getir
  const batchSize = 10;
      for (let i = 0; i < attendedEventIds.length; i += batchSize) {
        const batch = attendedEventIds.slice(i, i + batchSize);
        
        const eventsSnapshot = await db.collection('events')
          .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
          .get();
        
        eventsSnapshot.forEach(doc => {
          const data = doc.data();
          const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
          const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
          eventsData.push({
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            startDate,
            endDate,
            location: data.location || { type: 'physical', physicalAddress: 'Belirtilmemiş' },
            attendeesCount: data.attendeesCount || 0,
            capacity: data.capacity,
            categories: data.categories || [],
            imageUrl: data.imageUrl,
            clubName: data.clubName,
            clubId: data.clubId,
            pricing: {
              isFree: data.isFree !== undefined ? data.isFree : true,
              price: data.price || 0
            }
          });
        });
      }
      // Tarihe göre sırala (yeni tarihler üstte)
      eventsData.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
      setAllEvents(eventsData);
    } catch (error) {
      console.error('Error fetching user events:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserEvents();
  }, [fetchUserEvents]);
  
  // Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserEvents();
    setRefreshing(false);
  }, [fetchUserEvents]);
  
  // Geri git
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Etkinlik detayına git
  const handleEventPress = (eventId: string) => {
    navigation.navigate('ViewEvent', { eventId });
  };
  
  // Event card render - unified StudentEventCard
  const renderEventCard = ({ item }: { item: Event }) => (
    <View style={{ marginHorizontal: 12, marginBottom: 12 }}>
      <StudentEventCard
        event={{
          id: item.id,
          title: item.title,
          description: item.description,
          startDate: item.startDate,
          endDate: item.endDate,
          location: item.location,
          imageUrl: item.imageUrl,
          categories: item.categories,
          clubName: item.clubName,
          clubId: item.clubId,
          pricing: item.pricing,
        }}
        onNavigate={(eventId) => handleEventPress(eventId)}
        isUserJoined={true}
        showOrganizer={true}
      />
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar style="dark" />
      
      <View style={[styles.header, Platform.OS === 'android' ? { paddingTop: 6 } : null]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {`${liveUserName} - Katıldığı Etkinlikler`}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.subHeader}>
        <MaterialCommunityIcons name="calendar-check" size={16} color="#666" />
        <Text style={styles.subHeaderText}>{allEvents.length} etkinlik</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Etkinlikler yükleniyor...</Text>
        </View>
    ) : allEvents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="calendar-account" size={64} color="#e0e0e0" />
      <Text style={styles.emptyTitle}>Katıldığı etkinlik bulunmuyor</Text>
      <Text style={styles.emptyText}>Henüz herhangi bir etkinliğe katılmamış.</Text>
        </View>
      ) : (
        <FlatList
          data={allEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingTop: 8 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  paddingVertical: 14,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  shadowRadius: 2,
  borderBottomWidth: StyleSheet.hairlineWidth,
  borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  subHeaderText: {
    fontSize: 13,
    color: '#666',
  },
  placeholder: {
    width: 40,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    backgroundColor: '#f5f5f5',
    elevation: 1,
    borderRadius: 10,
    marginBottom: 12,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeChip: {
    marginRight: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  eventCard: {
    marginVertical: 6,
    elevation: 2,
    backgroundColor: '#fff',
  },
  pastEventCard: {
    opacity: 0.8,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 12,
  },
  clubName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E88E5',
    marginBottom: 8,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 4,
    height: 28,
  },
  categoryText: {
    fontSize: 12,
  },
  moreCategories: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  pastEventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  pastEventText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
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
});

export default StudentEventsListScreen;
