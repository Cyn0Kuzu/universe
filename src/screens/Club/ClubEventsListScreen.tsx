import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Searchbar, Appbar, useTheme, Chip, Divider, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClubStackParamList } from '../../navigation/ClubNavigator';
import { StudentStackParamList } from '../../navigation/StudentNavigator';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { useAuth } from '../../contexts/AuthContext';
import ClubEventCard from '../../components/ClubEventCard';
import { eventCategories } from '../../constants';

type ClubNavigationProp = NativeStackNavigationProp<ClubStackParamList>;
type StudentNavigationProp = NativeStackNavigationProp<StudentStackParamList>;
type CombinedNavigationProp = ClubNavigationProp | StudentNavigationProp;

interface Event {
  id: string;
  title?: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  date: string;
  time: string;
  status: string;
  attendees: number;
  capacity?: number;
  location?: {
    type?: string;
    physicalAddress?: string;
    onlineLink?: string;
  };
  attendeesCount?: number;
  categories?: string[];
  imageUrl?: string;
  clubName?: string;
  clubId?: string;
  [key: string]: any;
}

interface RouteParams {
  clubId: string;
  clubName: string;
}

const ClubEventsListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<CombinedNavigationProp>();
  const route = useRoute();
  const { clubId, clubName } = route.params as RouteParams;
  const { userProfile } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!clubId) {
      setLoading(false);
      return;
    }
    
    try {
  setLoading(true);
      
      // Şu anki tarihi al
      const now = new Date();
      
  // Firestore'dan etkinlikleri çek
  const eventsRef = firebase.firestore().collection('events');
  // Şema uyumluluğu: birden fazla alanı kontrol ederek fetch et
  // Warn once per field to avoid log spam
  const warnedFieldsRef = (global as any).__clubEventsListWarnedFields || new Set<string>();
  (global as any).__clubEventsListWarnedFields = warnedFieldsRef;

  const robustFetch = async (field: string) => {
    try {
      return await eventsRef.where(field, '==', clubId).orderBy('startDate', 'asc').get();
    } catch (err: any) {
      if (err?.message?.includes('requires an index') || err?.code === 'failed-precondition') {
        if (!warnedFieldsRef.has(field) && __DEV__) {
          warnedFieldsRef.add(field);
          console.info(`ℹ️ Firebase index missing for ${field}+startDate, using fallback query`);
        }
        return await eventsRef.where(field, '==', clubId).get();
      }
      throw err;
    }
  };

  const [r1, r2, r3, r4, r5] = await Promise.allSettled([
    robustFetch('clubId'),
    robustFetch('organizerId'),
    robustFetch('creatorId'),
    robustFetch('createdBy'),
    robustFetch('organizer.id')
  ]);

  const docMap = new Map<string, any>();
  const add = (snap: any) => { if (snap && snap.docs) for (const d of snap.docs) docMap.set(d.id, d); };
  if (r1.status === 'fulfilled') add(r1.value);
  if (r2.status === 'fulfilled') add(r2.value);
  if (r3.status === 'fulfilled') add(r3.value);
  if (r4.status === 'fulfilled') add(r4.value);
  if (r5.status === 'fulfilled') add(r5.value);

  const eventsList: Event[] = Array.from(docMap.values()).map(doc => {
        const data = doc.data();
        // Timestamp'leri Date nesnesine dönüştürme
        const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
        const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
        
        return {
          id: doc.id,
          ...data,
          clubId: data.clubId || data.organizerId || data.creatorId || data.createdBy || data?.organizer?.id || clubId,
          startDate,
          endDate,
          // Ekran için formatlı tarih ve zaman
          date: startDate.toLocaleDateString('tr-TR'),
          time: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')} - ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
          // Etkinliğin durumunu belirle
          status: (startDate.getTime() >= now.getTime() || (startDate.getTime() <= now.getTime() && endDate.getTime() >= now.getTime()))
            ? 'upcoming'
            : (endDate.getTime() < now.getTime() ? 'past' : 'other'),
          // Katılımcı sayısı
          attendees: data.attendeesCount || 0,
          attendeesCount: data.attendeesCount || 0,
          // Lokasyon bilgisi
          location: data.location || { type: 'physical', physicalAddress: data.physicalAddress || 'Belirtilmemiş' },
          // clubId zaten üstte backfill edildi
          clubName: clubName || data.clubName || ''
        };
      });
      
      // Arama filtresi uygula
      let filteredEvents = eventsList;
      
      // Status görünümüne göre filtrele
      if (viewMode === 'upcoming') {
        filteredEvents = filteredEvents.filter(e => e.status === 'upcoming');
      } else if (viewMode === 'past') {
        // geçmiş için: bitiş tarihi şimdi'den küçük olanlar
        filteredEvents = filteredEvents.filter(e => e.endDate.getTime() < now.getTime());
      }
      
      // Arama sorgusu filtresi
      if (searchQuery) {
        filteredEvents = filteredEvents.filter(event => 
          event.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
          event.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Kategori filtresi
      if (selectedCategory) {
        filteredEvents = filteredEvents.filter(event => 
          event.categories?.includes(selectedCategory)
        );
      }
      
      // Yaklaşanları en yakın tarihten itibaren sırala, geçmişi en yakın geçmişten
      filteredEvents.sort((a, b) => {
        try {
          const aStart = a.startDate?.getTime?.() ?? new Date(a.startDate as any).getTime();
          const bStart = b.startDate?.getTime?.() ?? new Date(b.startDate as any).getTime();
          if (viewMode === 'past') return bStart - aStart; // yakın geçmiş önce
          return aStart - bStart; // yakında olan önce
        } catch {
          return 0;
        }
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata oluştu:', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, clubName, viewMode, searchQuery, selectedCategory]);

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }
    fetchEvents();
  }, [fetchEvents, clubId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const handleViewEvent = (eventId: string) => {
    // Determine if the user is a club or student based on userProfile.userType
    if (userProfile?.userType === 'club') {
      // Club user navigation
      (navigation as ClubNavigationProp).navigate('ViewEvent', { eventId });
    } else {
      // Student user navigation
      (navigation as StudentNavigationProp).navigate('ViewEvent', { eventId });
    }
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'upcoming' ? 'past' : 'upcoming');
  };

  const toggleCategory = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null); // Deselect if already selected
    } else {
      setSelectedCategory(category); // Select if not already selected
    }
  };

  const renderCategoryChips = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {eventCategories.map(category => (
          <Chip
            key={category.id}
            selected={selectedCategory === category.id}
            onPress={() => toggleCategory(category.id)}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && { backgroundColor: theme.colors.primary + '20' }
            ]}
            textStyle={selectedCategory === category.id ? { color: theme.colors.primary, fontWeight: 'bold' } : {}}
          >
            {category.label}
          </Chip>
        ))}
      </ScrollView>
    );
  };

  const renderItem = ({ item }: { item: Event }) => (
    <View style={styles.eventCardContainer}>
      <ClubEventCard 
        event={{...item, organizerId: item.clubId || ''}} 
        isAdminView={false}
        onEdit={() => {}}
        onDelete={() => {}}
        onViewAttendees={() => {}}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={`${clubName} Etkinlikleri`} />
        <Appbar.Action 
          icon={viewMode === 'upcoming' ? 'calendar-clock' : 'calendar-check'} 
          onPress={toggleViewMode} 
          color={theme.colors.primary}
        />
      </Appbar.Header>
      
      <View style={styles.content}>
        <Searchbar
          placeholder="Etkinlik ara..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        {renderCategoryChips()}
        
        <Divider style={styles.divider} />
        
        <View style={styles.statusContainer}>
          <TouchableOpacity 
            style={[
              styles.statusButton, 
              viewMode === 'upcoming' && styles.activeStatus,
              { borderColor: theme.colors.primary }
            ]} 
            onPress={() => setViewMode('upcoming')}
          >
            <Text style={[
              styles.statusText, 
              viewMode === 'upcoming' && { color: theme.colors.primary, fontWeight: 'bold' }
            ]}>
              Yaklaşan Etkinlikler
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.statusButton, 
              viewMode === 'past' && styles.activeStatus,
              { borderColor: theme.colors.primary }
            ]} 
            onPress={() => setViewMode('past')}
          >
            <Text style={[
              styles.statusText, 
              viewMode === 'past' && { color: theme.colors.primary, fontWeight: 'bold' }
            ]}>
              Geçmiş Etkinlikler
            </Text>
          </TouchableOpacity>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : events.length > 0 ? (
          <FlatList
            data={events}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name={viewMode === 'upcoming' ? 'calendar-plus' : 'calendar-remove'} 
              size={64} 
              color={theme.colors.primary}
            />
            <Text style={styles.emptyText}>
              {viewMode === 'upcoming' 
                ? 'Yaklaşan etkinlik bulunamadı' 
                : 'Geçmiş etkinlik bulunamadı'
              }
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  searchbar: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingRight: 16,
  },
  categoryChip: {
    marginRight: 8,
    height: 36,
  },
  divider: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeStatus: {
    borderBottomWidth: 2,
  },
  statusText: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 16,
  },
  eventCardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ClubEventsListScreen;
