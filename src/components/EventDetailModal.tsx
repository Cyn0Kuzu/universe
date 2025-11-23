import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Text, 
  Dimensions,
  Image,
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native';
import { 
  Modal, 
  Portal, 
  Surface, 
  useTheme, 
  Button, 
  Divider, 
  Chip, 
  IconButton 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirebaseCompatSync } from '../firebase/compat';
import { eventCategories, UNIVERSITIES_DATA } from '../constants';
import moment from 'moment';
import 'moment/locale/tr';
import { useImagePreview } from '../contexts/ImagePreviewContext';

const firebase = getFirebaseCompatSync();
// Initialize moment locale
moment.locale('tr');
const PRIMARY_COLOR = '#2196F3';
const { width, height } = Dimensions.get('window');

// ---- Robust pricing helpers (aligned with ClubEventCard) ----
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
  } catch (error) {
    console.error('shouldShowAsPaid hatası:', error);
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
  } catch (error) {
    console.error('getFormattedEventPrice hatası:', error);
    return 'Ücretsiz Etkinlik';
  }
};

// Format functions
const formatDate = (date: Date | string | number | undefined): string => {
  if (!date) return 'Belirtilmemiş';
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    return moment(dateObj).format('DD MMMM YYYY, HH:mm');
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

// Get university full name
const getUniversityName = (universityId: string): string => {
  const university = UNIVERSITIES_DATA.find(uni => uni.id === universityId);
  return university ? university.name : `${universityId} Üniversitesi`;
};

interface EventDetailModalProps {
  visible: boolean;
  eventId?: string;
  event?: any;
  onDismiss: () => void;
  onJoinEvent?: (eventId: string) => Promise<void>;
  onUnjoinEvent?: (eventId: string) => Promise<void>;
  isUserJoined?: boolean;
  initialTab?: number;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ 
  eventId,
  event: initialEventData, 
  visible, 
  onDismiss,
  onJoinEvent,
  onUnjoinEvent,
  isUserJoined: initialIsJoined,
  initialTab = 0
}) => {
  // Initial event data check
  // console.log('EventDetailModal - Initial Event:', initialEventData ? {
  //   id: initialEventData.id,
  //   price: initialEventData?.price,
  //   studentDiscount: initialEventData?.studentDiscount
  // } : 'No initial data');
  
  const theme = useTheme();
  const { showPreview } = useImagePreview();
  
  // State variables
  const [activeTab, setActiveTab] = useState(initialTab);
  const [event, setEvent] = useState<any>(initialEventData || null);
  const [loading, setLoading] = useState(!initialEventData && !!eventId);
  const [isJoined, setIsJoined] = useState<boolean>(initialIsJoined || false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [headerImageUrl, setHeaderImageUrl] = useState<string | null>(null);

  // Choose best cover/header image from event object
  const pickHeaderImage = (ev: any): string | null => {
    if (!ev) return null;
    const candidates = [
      ev.imageUrl,
      ev.coverImageUrl,
      ev.coverImage,
      ev.image,
      Array.isArray(ev.images) ? ev.images[0] : undefined,
      ev.photoUrl,
      ev.bannerUrl,
      ev.headerImage,
      ev.thumbnail,
    ].filter(Boolean) as string[];
    return candidates.find((u) => typeof u === 'string' && u.trim()) || null;
  };

  // Define the tabs
  const TABS = [
    { id: 'basicInfo', label: 'Temel Bilgiler', icon: 'information-outline' },
    { id: 'locationTime', label: 'Konum & Zaman', icon: 'map-clock-outline' },
    { id: 'attendanceFee', label: 'Katılım & Ücret', icon: 'account-group' },
    { id: 'features', label: 'Özellikler', icon: 'star-outline' },
  ];

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
            const ev = { id: doc.id, ...data, startDate, endDate };
            setEvent(ev);
            setHeaderImageUrl(pickHeaderImage(ev));
          } else {
            setEvent(null);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Etkinlik detayları dinlenemedi:', err);
          setLoading(false);
        }
      );
      return () => unsub();
    }
  }, [eventId, initialEventData]);

  // When initialEventData is provided, set header immediately
  useEffect(() => {
    if (initialEventData) {
      setHeaderImageUrl(pickHeaderImage(initialEventData));
    }
  }, [initialEventData]);

  // Resolve gs:// or storage paths for header image
  useEffect(() => {
    const resolveHeader = async () => {
      const raw = headerImageUrl;
      if (!raw) return;
      try {
        const url = raw.trim();
        if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
          return; // already usable
        }
        if (url.startsWith('gs://')) {
          try {
            const storageRef = (firebase as any).storage().refFromURL(url);
            const downloadUrl = await storageRef.getDownloadURL();
            setHeaderImageUrl(downloadUrl);
            return;
          } catch {}
        }
        if (url.startsWith('/') || !url.includes('://')) {
          try {
            const storageRef = (firebase as any).storage().ref(url.startsWith('/') ? url : `/${url}`);
            const downloadUrl = await storageRef.getDownloadURL();
            setHeaderImageUrl(downloadUrl);
            return;
          } catch {}
        }
      } catch {}
    };
    resolveHeader();
  }, [headerImageUrl]);

  // Handle join/unjoin event
  const handleJoinEvent = async () => {
    if (!eventId || isJoining) return;
    setIsJoining(true);
    
    try {
      if (isJoined) {
        if (onUnjoinEvent) await onUnjoinEvent(eventId);
        setIsJoined(false);
      } else {
        if (onJoinEvent) await onJoinEvent(eventId);
        setIsJoined(true);
      }
    } catch (error) {
      console.error('Etkinliğe katılım hatası:', error);
      Alert.alert(
        'Hata',
        'Etkinlik katılım işlemi gerçekleştirilemedi. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setIsJoining(false);
    }
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
              activeTab === index && { borderBottomColor: theme.colors.primary }
            ]}
            onPress={() => setActiveTab(index)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={20}
              color={activeTab === index ? PRIMARY_COLOR : '#666'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === index && { color: PRIMARY_COLOR }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Etiketiğin ücretli olup olmadığını kontrol etmek için üst seviyede tanımlanmış
  // shouldShowAsPaid fonksiyonunu kullanıyoruz
  
  // Etkinlik fiyatını al (pricing veya doğrudan price alanından)
  const getEventPrice = (event: any): number | string => {
    try {
      // İlk olarak event nesnesinin geçerliliğini kontrol et
      if (!event) return 0;
      
      // Pricing.price kontrolü (yeni format)
      if (event.pricing && 'price' in event.pricing) {
        const pricingPrice = Number(event.pricing.price);
        if (!isNaN(pricingPrice) && pricingPrice > 0) {
          return pricingPrice;
        }
      }
      
      // Direkt price kontrolü (eski format)
      if ('price' in event) {
        const price = Number(event.price);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
      
      // Hiçbir geçerli fiyat bulunamadı
      return 0;
    } catch (error) {
      console.error("getEventPrice hatası:", error);
      return 0; // Hata durumunda 0 dön
    }
  };
  
  // Render content based on active tab
  const renderTabContent = () => {
    if (!event) {
      return (
        <View style={styles.centerContainer}>
          <Text style={{ fontSize: 16, color: '#333' }}>Etkinlik bulunamadı</Text>
          <Text style={{ fontSize: 14, color: '#666', marginTop: 8 }}>
            Etkinlik bilgileri yüklenirken bir hata oluştu.
          </Text>
        </View>
      );
    }
    
    switch (activeTab) {
      case 0: // Temel Bilgiler
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Açıklama</Text>
              <Text style={styles.description}>
                {event.description || 'Bu etkinlik için henüz bir açıklama eklenmemiş.'}
              </Text>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Organizatör Bilgileri</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-group" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Kulüp:</Text>
                <Text style={styles.infoValue}>{event.clubName || event.organizerName || 'Belirtilmemiş'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="school" size={20} color="#4CAF50" />
                <Text style={styles.infoLabel}>Üniversite:</Text>
                <Text style={styles.infoValue}>{event.universityName || event.university || 'Belirtilmemiş'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Tarih:</Text>
                <Text style={styles.infoValue}>{formatDate(event.startDate || event.date)}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="tag-multiple" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Kategori:</Text>
                <Text style={styles.infoValue}>{getCategoryName(event.category) || 'Belirtilmemiş'}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="earth" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Erişim:</Text>
                <Text style={styles.infoValue}>
                  {event.universityRestrictions?.isOpenToAllUniversities ? 'Tüm Üniversitelere Açık' : 'Sadece Kendi Üniversitesine Açık'}
                </Text>
              </View>
            </View>
          </ScrollView>
        );
        
      case 1: // Konum & Zaman
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tarih ve Saat</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-start" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Başlangıç:</Text>
                <Text style={styles.infoValue}>{formatDate(event.startDate || event.date)}</Text>
              </View>
              
              {event.endDate && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="calendar-end" size={20} color="#FF5722" />
                  <Text style={styles.infoLabel}>Bitiş:</Text>
                  <Text style={styles.infoValue}>{formatDate(event.endDate)}</Text>
                </View>
              )}
              
              {event.duration && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#673AB7" />
                  <Text style={styles.infoLabel}>Süre:</Text>
                  <Text style={styles.infoValue}>{event.duration}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Konum</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons 
                  name={event.location?.type === 'online' ? 'web' : 'map-marker'} 
                  size={20} 
                  color={event.location?.type === 'online' ? '#2196F3' : '#4CAF50'}
                />
                <Text style={styles.infoLabel}>Tür:</Text>
                <Text style={styles.infoValue}>
                  {event.location?.type === 'online' ? 'Çevrimiçi' : 'Fiziksel Mekan'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="home" size={20} color="#666" />
                <Text style={styles.infoLabel}>Adres:</Text>
                <Text style={styles.infoValue}>
                  {event.location?.physicalAddress || event.venue || event.location || 'Belirtilmemiş'}
                </Text>
              </View>
              
              {event.room && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="door" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Oda/Salon:</Text>
                  <Text style={styles.infoValue}>{event.room}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );
        
      case 2: // Katılım & Ücret
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Kapasite Bilgileri</Text>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-group" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.infoLabel}>Katılımcı:</Text>
                <Text style={styles.infoValue}>{event.attendeesCount || 0}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-multiple" size={20} color="#666" />
                <Text style={styles.infoLabel}>Kapasite:</Text>
                <Text style={styles.infoValue}>{event.capacity || 'Sınırsız'}</Text>
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
                  color={
                    event.visibility === 'private' ? "#FF5722" :
                    event.settings?.requireApproval ? "#FF9800" :
                    event.universityRestrictions?.isOpenToAllUniversities ? "#4CAF50" :
                    "#2196F3"
                  }
                />
                <Text style={styles.infoLabel}>Erişim:</Text>
                <Text style={styles.infoValue}>
                  {event.visibility === 'private' ? 'Özel Etkinlik' :
                   event.settings?.requireApproval ? 'Onay Gerekli' :
                   event.universityRestrictions?.isOpenToAllUniversities ? 'Tüm Üniversitelere Açık' :
                   'Sadece Kendi Üniversitemize Açık'}
                </Text>
              </View>
            </View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ücret Bilgileri</Text>
              
              {/* Price info section - Geliştirilmiş güvenlik kontrolü ile */}
              <View style={styles.infoRow}>
                <MaterialCommunityIcons 
                  name={shouldShowAsPaid(event) ? "cash" : "cash-check"} 
                  size={20} 
                  color={shouldShowAsPaid(event) ? "#2196F3" : "#4CAF50"} 
                />
                <Text style={styles.infoLabel}>Ücret:</Text>
                <Text style={styles.infoValue}>
                  {getFormattedEventPrice(event)}
                </Text>
              </View>
              
              {/* Student Discount */}
              {event.studentDiscount && shouldShowAsPaid(event) && (
                <View style={[styles.infoRow, {marginLeft: 24}]}>
                  <MaterialCommunityIcons name="school" size={20} color="#FF9800" />
                  <Text style={styles.infoLabel}>Öğrenci İndirimi:</Text>
                  <Text style={styles.infoValue}>
                    %{event.studentDiscount}
                  </Text>
                </View>
              )}
              
              {event.paymentMethod && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="credit-card" size={20} color="#666" />
                  <Text style={styles.infoLabel}>Ödeme:</Text>
                  <Text style={styles.infoValue}>{event.paymentMethod}</Text>
                </View>
              )}
            </View>
          </ScrollView>
        );
        
      case 3: // Özellikler  
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Etkinlik Özellikleri</Text>
              
              {event.language && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="translate" size={20} color="#9C27B0" />
                  <Text style={styles.infoLabel}>Dil:</Text>
                  <Text style={styles.infoValue}>{event.language}</Text>
                </View>
              )}
              
              {event.targetAudience && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="account-group" size={20} color="#607D8B" />
                  <Text style={styles.infoLabel}>Hedef Kitle:</Text>
                  <Text style={styles.infoValue}>{event.targetAudience}</Text>
                </View>
              )}
              
              {event.skillLevel && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="chart-line" size={20} color="#FF9800" />
                  <Text style={styles.infoLabel}>Seviye:</Text>
                  <Text style={styles.infoValue}>{event.skillLevel}</Text>
                </View>
              )}
              
              {event.requiredMaterials && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="package-variant" size={20} color="#795548" />
                  <Text style={styles.infoLabel}>Gerekli Malzeme:</Text>
                  <Text style={styles.infoValue}>{event.requiredMaterials}</Text>
                </View>
              )}
            </View>
            
            {event.tags && event.tags.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Etiketler</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                  {event.tags.map((tag: string, index: number) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: '#E3F2FD',
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                        margin: 4,
                      }}
                    >
                      <Text style={{ color: '#1976D2', fontSize: 12 }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
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

  // Render loading indicator
  if (loading) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Etkinlik detayları yükleniyor...</Text>
          </View>
        </Modal>
      </Portal>
    );
  }

  // Render error state if event not found
  if (!event) {
    return (
      <Portal>
        <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#FF5252" />
            <Text style={styles.errorText}>Etkinlik bulunamadı</Text>
            <Button onPress={onDismiss} mode="contained" style={styles.closeButton}>
              Kapat
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  }

  return (
    <Portal>
      <Modal 
        visible={visible} 
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          {/* Header Image */}
          {headerImageUrl ? (
            <View style={styles.headerImageContainer}>
              <Image source={{ uri: headerImageUrl }} style={styles.headerImage} />
              <TouchableOpacity
                style={styles.imagePreviewButton}
                onPress={() =>
                  showPreview(headerImageUrl, event?.title || 'Etkinlik Görseli')
                }
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="magnify-plus-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : null}
          {/* Header with title and close button */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{event?.title || 'Etkinlik Detayları'}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            {renderTabs()}
          </View>
          
          {/* Tab Content */}
          <View style={styles.modalBody}>
            {renderTabContent()}
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    margin: 0,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  maxHeight: height * 0.9,
    margin: 24,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  headerImageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePreviewButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 8,
    borderRadius: 20,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  imageTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
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
  modalBody: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    color: '#666',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 16,
    color: '#757575',
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    color: '#757575',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  linkText: {
    color: PRIMARY_COLOR,
    textDecorationLine: 'underline',
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
});

export default EventDetailModal;
