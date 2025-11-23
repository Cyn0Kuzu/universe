import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { Appbar, Avatar, Chip } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirebaseCompatSync } from '../../firebase/compat';
import { eventCategories } from '../../constants';
import moment from 'moment';
import 'moment/locale/tr';

const firebase = getFirebaseCompatSync();
// Initialize moment locale and define primary color
moment.locale('tr');
const PRIMARY_COLOR = '#2196F3';

type TabsEventDetailParams = {
  ViewEvent: {
    eventId: string;
    event?: any;
    showDetailTabs?: boolean;
    initialTab?: number;
  };
};

// Define route and navigation prop types
type EventDetailRouteProp = RouteProp<TabsEventDetailParams, 'ViewEvent'>;
type EventDetailNavigationProp = NativeStackNavigationProp<TabsEventDetailParams, 'ViewEvent'>;

// Define the tabs
const TABS = [
  { id: 'basicInfo', label: 'Temel Bilgiler', icon: 'information-outline' },
  { id: 'locationTime', label: 'Konum & Zaman', icon: 'map-clock-outline' },
  { id: 'attendanceFee', label: 'Katılım & Ücret', icon: 'account-group' },
  { id: 'features', label: 'Özellikler', icon: 'star-outline' },
];

const EventDetailScreen = () => {
  const navigation = useNavigation<EventDetailNavigationProp>();
  const route = useRoute<EventDetailRouteProp>();
  
  const { eventId, event: initialEventData, initialTab = 0 } = route.params || {};
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [event, setEvent] = useState<any>(initialEventData || null);
  const [loading, setLoading] = useState(!initialEventData);

  // Robust pricing helpers (same as EventDetailModal/ClubEventCard)
  const normalizeBoolean = (val: any): boolean | undefined => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val > 0;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      if (["true","1","yes","evet"].includes(s)) return true;
      if (["false","0","no","hayir","hayır"].includes(s)) return false;
    }
    return undefined;
  };
  const parsePriceNumber = (raw: any): number | null => {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    const txt = String(raw).replace(/,/g, '.');
    const m = txt.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    return isNaN(n) ? null : n;
  };
  const extractEventPrice = (ev: any): number | null => {
    try {
      const candidates: any[] = [
        ev?.pricing?.price,
        ev?.price,
        ev?.pricing?.amount,
        ev?.pricing?.minPrice,
        ev?.pricing?.maxPrice,
        ev?.ticketPrice,
        ev?.fee,
        Array.isArray(ev?.tickets) ? ev.tickets.map((t: any) => t?.price) : undefined,
        Array.isArray(ev?.tiers) ? ev.tiers.map((t: any) => t?.price) : undefined,
        Array.isArray(ev?.fees) ? ev.fees.map((f: any) => f?.amount) : undefined,
        ev?.earlyBirdPrice,
      ].flat().filter((v: any) => v !== undefined && v !== null);
      const parsed = candidates
        .map((v: any) => parsePriceNumber(v))
        .filter((n: number | null) => typeof n === 'number' && isFinite(n)) as number[];
      if (!parsed.length) return null;
      const positives = parsed.filter((n) => n > 0);
      if (positives.length) return Math.min(...positives);
      return Math.max(...parsed);
    } catch {
      return null;
    }
  };
  const shouldShowAsPaid = (ev: any): boolean => {
    if (!ev) return false;
    try {
      const isFreeRaw = ev?.pricing?.isFree ?? ev?.isFree;
      const isFree = normalizeBoolean(isFreeRaw);
      if (isFree === true) return false;
      const price = extractEventPrice(ev);
      if (price !== null && price > 0) return true;
      if (isFree === false) return true;
      return false;
    } catch {
      return false;
    }
  };
  const getFormattedEventPrice = (ev: any): string => {
    if (!ev) return 'Ücretsiz Etkinlik';
    try {
      const isFreeRaw = ev?.pricing?.isFree ?? ev?.isFree;
      const isFree = normalizeBoolean(isFreeRaw);
      if (isFree === true) return 'Ücretsiz Etkinlik';
      const price = extractEventPrice(ev);
      if (typeof price === 'number' && isFinite(price)) {
        if (price <= 0) return 'Ücretsiz Etkinlik';
        return `${price.toFixed(2).replace(/\.00$/, '')} TL`;
      }
      if (isFree === false) return 'Ücretli Etkinlik';
      return 'Ücretsiz Etkinlik';
    } catch {
      return 'Ücretsiz Etkinlik';
    }
  };

  // Live fetch event if not provided using onSnapshot
  useEffect(() => {
    if (!initialEventData && eventId) {
      setLoading(true);
      const ref = getFirebaseCompatSync().firestore().collection('events').doc(eventId);
      const unsub = ref.onSnapshot(
        (doc) => {
          if (doc.exists) {
            const data = doc.data() || {};
            let startDate: Date;
            let endDate: Date;
            try {
              startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate || Date.now());
              endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate || Date.now());
            } catch {
              startDate = new Date();
              endDate = new Date(startDate.getTime() + 60*60*1000);
            }
            setEvent({ id: doc.id, ...data, startDate, endDate });
          } else {
            setEvent(null);
          }
          setLoading(false);
        },
        () => setLoading(false)
      );
      return () => unsub();
    }
  }, [eventId, initialEventData]);

  // Format date and time
  const formatDate = (date: Date | string | number | undefined): string => {
    if (!date) return 'Belirtilmemiş';
    try {
      return moment(date).format('D MMMM YYYY');
    } catch (e) {
      return 'Geçersiz Tarih';
    }
  };

  const formatTime = (date: Date | string | number | undefined): string => {
    if (!date) return '';
    try {
      return moment(date).format('HH:mm');
    } catch (e) {
      return '';
    }
  };

  // Get category name
  const getCategoryName = (categoryId: string) => {
    const category = eventCategories.find(cat => cat.id === categoryId);
    return category ? category.label : 'Diğer';
  };

  // Handle back button press
  const handleBack = () => {
    navigation.goBack();
  };

  // Render tabs
  const renderTabs = () => {
    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
      >
        {TABS.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabButton,
              activeTab === index && { borderBottomColor: '#2196F3' }
            ]}
            onPress={() => setActiveTab(index)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={20}
              color={activeTab === index ? '#2196F3' : '#666'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === index && { color: '#2196F3' }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Render content based on active tab
  const renderTabContent = () => {
    if (!event) return <View style={styles.centerContainer}><Text>Etkinlik bulunamadı</Text></View>;
    
    switch (activeTab) {
      case 0: // Temel Bilgiler
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Açıklama</Text>
              <Text style={styles.description}>{event.description || 'Açıklama bulunmuyor.'}</Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-group" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Kulüp:</Text>
                <Text style={styles.infoValue}>{event.clubName || 'Belirtilmemiş'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="school" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Üniversite:</Text>
                <Text style={styles.infoValue}>{event.universityName || event.university || 'Belirtilmemiş'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons 
                  name={
                    event.visibility === 'private' ? "lock" :
                    event.settings?.requireApproval ? "account-check" :
                    event.universityRestrictions?.isOpenToAllUniversities ? "earth" :
                    "school"
                  } 
                  size={20} 
                  color={PRIMARY_COLOR} 
                />
                <Text style={styles.infoLabel}>Erişim:</Text>
                <Text style={styles.infoValue}>
                  {event.visibility === 'private' ? 'Özel Etkinlik' :
                   event.settings?.requireApproval ? 'Onay Gerekli' :
                   event.universityRestrictions?.isOpenToAllUniversities ? 'Tüm Üniversitelere Açık' :
                   'Sadece Kendi Üniversitemize Açık'}
                </Text>
              </View>
              
              <View style={styles.categoriesContainer}>
                <Text style={styles.categoriesTitle}>Kategoriler:</Text>
                <View style={styles.chipContainer}>
                  {event.categories ? (
                    event.categories.map((categoryId: string, index: number) => (
                      <Chip key={index} style={styles.chip}>
                        {getCategoryName(categoryId)}
                      </Chip>
                    ))
                  ) : (
                    <Chip style={styles.chip}>conference</Chip>
                  )}
                </View>
              </View>
            </View>
          </ScrollView>
        );
        
      case 1: // Konum & Zaman
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tarih ve Saat Bilgileri</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-start" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Başlangıç:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(event.startDate)} {formatTime(event.startDate)}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-end" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Bitiş:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(event.endDate)} {formatTime(event.endDate)}
                </Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Konum Bilgileri</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons 
                  name={event.location?.type === 'online' ? 'web' : 'map-marker'} 
                  size={20} 
                  color={PRIMARY_COLOR} 
                />
                <Text style={styles.infoLabel}>Tür:</Text>
                <Text style={styles.infoValue}>
                  {event.location?.type === 'online' ? 'Çevrimiçi Etkinlik' : 'Fiziksel Konum'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons 
                  name={event.location?.type === 'online' ? 'link' : 'home-map-marker'} 
                  size={20} 
                  color={PRIMARY_COLOR} 
                />
                <Text style={styles.infoLabel}>Adres:</Text>
                <Text style={styles.infoValue}>
                  {event.location?.type === 'online' 
                    ? (event.location?.onlineLink || 'Link Belirtilmemiş')
                    : (event.location?.physicalAddress || 'Adres Belirtilmemiş')}
                </Text>
              </View>
            </View>
          </ScrollView>
        );
        
      case 2: // Katılım & Ücret
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kapasite ve Kayıt Bilgileri</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-multiple" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Kapasite:</Text>
                <Text style={styles.infoValue}>
                  {event.capacity || 'Sınırsız'} kişi
                </Text>
              </View>
              
              <Text style={styles.subheader}>Doluluk Oranı</Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { 
                      width: `${Math.min(100, ((event.attendeesCount || 0) / (event.capacity || 1)) * 100)}%` 
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                %{Math.min(100, Math.round(((event.attendeesCount || 0) / (event.capacity || 1)) * 100))}/{event.capacity || 0}
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ücret Bilgileri</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons 
                  name={shouldShowAsPaid(event) ? 'cash' : 'cash-check'} 
                  size={20} 
                  color={PRIMARY_COLOR} 
                />
                <Text style={styles.infoLabel}>Ücret:</Text>
                <Text style={[
                  styles.infoValue,
                  !shouldShowAsPaid(event) ? styles.freeText : {}
                ]}>
                  {getFormattedEventPrice(event)}
                </Text>
              </View>
            </View>
          </ScrollView>
        );
        
      case 3: // Özellikler
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Etkinlik Özellikleri</Text>
              
              <View style={styles.featureRow}>
                <MaterialCommunityIcons name="lock" size={24} color={PRIMARY_COLOR} />
                <Text style={styles.featureText}>
                  {event.visibility === 'private' ? 'Özel etkinlik' : 'Herkese açık etkinlik'}
                </Text>
              </View>
              
              {/* Diğer özellikler buraya eklenebilir */}
            </View>
          </ScrollView>
        );
        
      default:
        return (
          <View style={styles.centerContainer}>
            <Text>Seçilen sekme bulunamadı</Text>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={handleBack} />
        <Appbar.Content title={event?.title || 'Etkinlik Detayları'} />
      </Appbar.Header>
      
      {/* Search field (for demonstration) */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchText}>{event?.title || 'abc'}</Text>
        <MaterialCommunityIcons name="close" size={24} color="#000" />
      </View>
      
      {/* Tabs */}
      {renderTabs()}
      
      {/* Tab Content */}
      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 100,
    justifyContent: 'center',
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '500',
    color: '#666',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
    minWidth: 100,
  },
  infoValue: {
    fontSize: 16,
    flex: 1,
  },
  subheader: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  categoriesContainer: {
    marginTop: 16,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  freeText: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    marginLeft: 16,
  },
});

export default EventDetailScreen;
