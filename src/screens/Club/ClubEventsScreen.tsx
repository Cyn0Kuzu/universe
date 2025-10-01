import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, View, ScrollView, SafeAreaView, ActivityIndicator, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Button, FAB, Chip, useTheme, Searchbar, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClubStackParamList } from '../../navigation/ClubNavigator';
import { firestore } from '../../firebase/config';
import { deleteEventSafely } from '../../firebase/eventManagement';
import { useAuth } from '../../contexts/AuthContext';
import { eventCategories } from '../../constants';
import ClubEventCard from '../../components/ClubEventCard';

type ClubNavigationProp = NativeStackNavigationProp<ClubStackParamList>;

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
  pricing?: {
    isFree?: boolean;
    price?: number;
  };
  [key: string]: any;
}

const ClubEventsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<ClubNavigationProp>();
  const { userProfile, currentUser } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'upcoming' | 'past'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'attendees' | 'created'>('date');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]); // Tüm etkinlikleri saklamak için
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handler functions
  const handleEditEvent = (eventId: string) => {
    navigation.navigate('EditEvent', { eventId });
  };

  const handleDeleteEvent = async (eventId: string) => {
    Alert.alert(
      'Etkinliği Sil',
      'Bu etkinliği silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!userProfile?.uid) {
                Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
                return;
              }
              
              // Etkinlik bilgisini al
              const event = allEvents.find((e: Event) => e.id === eventId);
              if (!event) {
                Alert.alert('Hata', 'Etkinlik bilgisi bulunamadı.');
                return;
              }
              
              // Use the centralized delete function which also updates stats
              console.log(`🗑️ Etkinlik siliniyor: ${eventId}, Kulüp: ${event.clubId || userProfile.uid}`);
              console.log(`🔍 deleteEventSafely fonksiyonu tipi:`, typeof deleteEventSafely);
              console.log(`🔍 deleteEventSafely fonksiyonu:`, deleteEventSafely);
              
              try {
                const success = await deleteEventSafely(eventId, userProfile.uid);
                console.log(`🔍 deleteEventSafely sonuç:`, success);
                
                if (success) {
                  // Etkinliği listeden kaldır
                  setAllEvents((prev: Event[]) => prev.filter((event: Event) => event.id !== eventId));
                  console.log(`✅ Etkinlik başarıyla silindi ve istatistikler güncellendi: ${eventId}`);
                  Alert.alert('Başarılı', 'Etkinlik başarıyla silindi ve istatistikler güncellendi.');
                } else {
                  Alert.alert('Hata', 'Etkinlik silinirken bir hata oluştu.');
                }
              } catch (deleteError) {
                console.error('deleteEventSafely çağrısında hata:', deleteError);
                Alert.alert('Hata', 'Etkinlik silinirken beklenmeyen bir hata oluştu.');
              }
            } catch (error) {
              console.error('Etkinlik silinirken hata oluştu:', error);
              Alert.alert('Hata', 'Etkinlik silinirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const handleViewAttendees = (eventId: string) => {
    navigation.navigate('EventAttendees', { eventId });
  };

  // Arama çubuğu değiştiğinde sadece state'i güncelle (real-time)
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Filtreleme ve sıralama fonksiyonu
  const applyFiltersAndSort = useCallback((eventsList: Event[]) => {
    let filtered = [...eventsList];

    // Arama filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(query) || 
        event.description?.toLowerCase().includes(query) ||
        event.clubName?.toLowerCase().includes(query)
      );
    }

    // Durum filtresi (Yaklaşan = şimdi ile 7 gün arasındaki başlangıç tarihi)
    if (viewMode !== 'all') {
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(event => {
        const start = event.startDate?.getTime?.() ?? new Date(event.startDate as any).getTime();
        const end = event.endDate?.getTime?.() ?? new Date(event.endDate as any).getTime();
        const nowTs = now.getTime();
        if (!Number.isFinite(start)) return false;
        if (viewMode === 'upcoming') return start > nowTs && start <= weekFromNow.getTime();
        if (viewMode === 'past') return Number.isFinite(end) ? end < nowTs : start < nowTs;
        return true;
      });
    }

    // Kategori filtresi
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(event => {
        const eventCategories = Array.isArray(event.categories) ? event.categories : [];
        return eventCategories.some(cat => selectedCategories.includes(String(cat)));
      });
    }

    // Sıralama
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return a.startDate.getTime() - b.startDate.getTime();
        case 'title':
          return (a.title || '').localeCompare(b.title || '', 'tr');
        case 'attendees':
          return (b.attendeesCount || 0) - (a.attendeesCount || 0);
        case 'created':
          // createdAt yoksa startDate kullan
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : a.startDate.getTime();
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : b.startDate.getTime();
          return bTime - aTime;
        default:
          return 0;
      }
    });

    return filtered;
  }, [searchQuery, viewMode, selectedCategories, sortBy]);

  // Filtrelenmiş ve sıralanmış etkinlikler (real-time)
  const filteredAndSortedEvents = useMemo(() => {
    return applyFiltersAndSort(allEvents);
  }, [allEvents, applyFiltersAndSort]);

  const fetchEvents = useCallback(async () => {
    if (!userProfile?.uid) return;
    
    try {
      setLoading(true);
      
      // Şu anki tarihi al
      const now = new Date();
      
      // Firestore'dan etkinlikleri çek
      const eventsRef = firestore.collection('events');
      let query = eventsRef.where('clubId', '==', userProfile.uid);
      
      // Basit sorgu - index hatasını önlemek için
      query = query.orderBy('startDate', 'desc');
      
      // Verileri çek
      const snapshot = await query.get();
      
      // Tüm etkinlikleri dönüştür
      const allEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Timestamp'leri Date nesnesine dönüştürme
        const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
        const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
        
        // Etkinliğin durumunu belirle
        const actualStatus = endDate > now ? 'upcoming' : 'past';
        
        return {
          id: doc.id,
          ...data,
          startDate,
          endDate,
          date: startDate.toLocaleDateString('tr-TR'),
          time: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')} - ${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`,
          status: data.status || actualStatus,
          attendees: data.attendeesCount || 0,
          attendeesCount: data.attendeesCount || 0,
          location: data.location || { 
            type: 'physical', 
            physicalAddress: data.physicalAddress || 'Belirtilmemiş' 
          },
          title: data.title || '',
          description: data.description || '',
          categories: data.categories || [],
          imageUrl: data.imageUrl || null,
          clubName: data.clubName || userProfile.displayName || '',
          pricing: {
            isFree: data.isFree !== undefined ? data.isFree : true,
            price: data.price || 0
          }
        };
      });
      
      // Tüm etkinlikleri state'e kaydet (filtreleme useMemo ile yapılacak)
      setAllEvents(allEvents);
    } catch (error) {
      console.error('Etkinlikler yüklenirken hata oluştu:', error);
      Alert.alert('Hata', 'Etkinlikler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.uid]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const handleCreateEvent = () => {
    navigation.navigate('CreateEvent');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Etkinlik ara..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          style={styles.searchbar}
          icon={() => <MaterialCommunityIcons name="magnify" size={20} color="#666" />}
          clearIcon={() => <MaterialCommunityIcons name="close" size={20} color="#666" />}
        />
        
        {/* Sıralama Seçenekleri - Arama çubuğunun hemen altında */}
        <View style={{marginBottom: 8}}>
          <Text style={{fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, paddingHorizontal: 4}}>Sıralama:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollView}>
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
              onPress={() => setSortBy('date')}
            >
              <MaterialCommunityIcons name="calendar" size={16} color={sortBy === 'date' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>
                Tarihe Göre
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'title' && styles.sortButtonActive]}
              onPress={() => setSortBy('title')}
            >
              <MaterialCommunityIcons name="sort-alphabetical-variant" size={16} color={sortBy === 'title' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'title' && styles.sortButtonTextActive]}>
                Alfabetik
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'attendees' && styles.sortButtonActive]}
              onPress={() => setSortBy('attendees')}
            >
              <MaterialCommunityIcons name="account-group" size={16} color={sortBy === 'attendees' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'attendees' && styles.sortButtonTextActive]}>
                Katılımcı
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.sortButton, sortBy === 'created' && styles.sortButtonActive]}
              onPress={() => setSortBy('created')}
            >
              <MaterialCommunityIcons name="new-box" size={16} color={sortBy === 'created' ? '#fff' : '#666'} />
              <Text style={[styles.sortButtonText, sortBy === 'created' && styles.sortButtonTextActive]}>
                En Yeni
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Durum Filtreleri - Sıralama butonlarının hemen altında */}
        <View style={{marginBottom: 8}}>
          <Text style={{fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, paddingHorizontal: 4}}>Durum:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScrollView}>
            <Chip 
              selected={viewMode === 'all'} 
              onPress={() => setViewMode('all')}
              style={styles.chip}
              mode={viewMode === 'all' ? 'flat' : 'outlined'}
            >
              Tümü
            </Chip>
            <Chip 
              selected={viewMode === 'upcoming'} 
              onPress={() => setViewMode('upcoming')}
              style={styles.chip}
              mode={viewMode === 'upcoming' ? 'flat' : 'outlined'}
            >
              Yaklaşan
            </Chip>
            <Chip 
              selected={viewMode === 'past'} 
              onPress={() => setViewMode('past')}
              style={styles.chip}
              mode={viewMode === 'past' ? 'flat' : 'outlined'}
            >
              Geçmiş
            </Chip>
          </ScrollView>
        </View>

        {/* Seçili Kategoriler - En altta */}
        {selectedCategories.length > 0 && (
          <View style={styles.categoryFiltersContainer}>
            <Text style={styles.categoryFiltersTitle}>Seçili Kategoriler:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {selectedCategories.map(categoryId => {
                const category = eventCategories.find(c => c.id === categoryId);
                return category ? (
                  <Chip
                    key={categoryId}
                    onClose={() => setSelectedCategories(prev => prev.filter(id => id !== categoryId))}
                    style={styles.categoryChip}
                    mode="flat"
                  >
                    {category.label}
                  </Chip>
                ) : null;
              })}
              <TouchableOpacity 
                style={styles.clearCategoriesButton}
                onPress={() => setSelectedCategories([])}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color="#666" />
                <Text style={styles.clearCategoriesText}>Temizle</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Etkinlikler yükleniyor...</Text>
          </View>
        ) : filteredAndSortedEvents.length > 0 ? (
          <View style={styles.eventsGrid}>
            {filteredAndSortedEvents.map(event => (
              <View key={event.id} style={styles.eventCardContainer}>
                <ClubEventCard 
                  event={{...event, organizerId: userProfile.uid}}
                  isAdminView={true}
                  onDelete={() => handleDeleteEvent(event.id)}
                  onViewAttendees={() => handleViewAttendees(event.id)}
                  onEdit={() => handleEditEvent(event.id)}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {(() => {
                switch (viewMode) {
                  case 'upcoming':
                    return 'Henüz yaklaşan bir etkinlik bulunmuyor';
                  case 'past':
                    return 'Geçmiş etkinlik bulunmuyor';
                  case 'all':
                  default:
                    return 'Henüz oluşturulmuş bir etkinlik bulunmuyor';
                }
              })()}
            </Text>
            {(viewMode === 'upcoming' || viewMode === 'all') && (
              <Button 
                mode="contained"
                onPress={handleCreateEvent}
                style={{ marginTop: 16 }}
              >
                Yeni Etkinlik Oluştur
              </Button>
            )}
          </View>
        )}
        
        <View style={styles.spacer} />
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreateEvent}
        visible={viewMode === 'upcoming' || viewMode === 'all'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    height: 38,
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  chipScrollView: {
    flexGrow: 1,
    paddingVertical: 4,
    paddingRight: 8,
  },
  chip: {
    marginRight: 8,
    height: 32,
    paddingHorizontal: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  eventsGrid: {
    flex: 1,
    paddingVertical: 8,
  },
  eventCardContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
  },
  eventCardItem: {
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    flex: 1,
  },
  emptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  spacer: {
    height: 70,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  filterSeparator: {
    width: 1,
    height: 30,
    backgroundColor: '#ddd',
    marginHorizontal: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sortButtonActive: {
    backgroundColor: '#1976D2',
    borderColor: '#1976D2',
  },
  sortButtonText: {
    fontSize: 12,
    marginLeft: 4,
    color: '#666',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  categoryFiltersContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  categoryFiltersTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    height: 28,
  },
  clearCategoriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  clearCategoriesText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});

export default ClubEventsScreen;
