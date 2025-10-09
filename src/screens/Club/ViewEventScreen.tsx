import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert, Modal, FlatList, TouchableOpacity } from 'react-native';
import { Text, Button, IconButton, Appbar, useTheme } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ClubStackParamList } from '../../navigation/ClubNavigator';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { eventCategories } from '../../constants';
import { UniversalAvatar } from '../../components/common';
import { useUserAvatar } from '../../hooks/useUserAvatar';

// -- Ücret/Ücretsiz tespiti ve yazdırma için yardımcılar (ClubEventCard ile aynı mantık) --
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

// Define params for ViewEvent screen
type ViewEventParams = {
  ViewEvent: {
    eventId: string;
  };
};

// Combine with the original ClubStackParamList
type CombinedParamList = ClubStackParamList & ViewEventParams;

type ViewEventRouteProp = RouteProp<CombinedParamList, 'ViewEvent'>;
type ViewEventNavigationProp = NativeStackNavigationProp<CombinedParamList>;

interface User {
  id: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  username?: string;
  university?: string;
  universityName?: string; // For club accounts
  department?: string;
  role?: string;
  userType?: 'student' | 'club';
  bio?: string;
}

interface Event {
  id: string;
  title?: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  location?: {
    type?: string;
    physicalAddress?: string;
    onlineLink?: string;
  };
  attendeesCount?: number;
  categories?: string[];
  imageUrl?: string;
  clubName?: string;
  universityName?: string;
  pricing?: {
    isFree?: boolean;
    price?: number;
  };
  likes?: string[];
  likesCount?: number;
  attendees?: string[];
  [key: string]: any;
}

const ViewEventScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<ViewEventNavigationProp>();
  const route = useRoute<ViewEventRouteProp>();
  const eventId = route.params.eventId;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDescription, setShowDescription] = useState(true);
  const [showAllDetails, setShowAllDetails] = useState(false);
  
  // Modal states
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [attendeesModalVisible, setAttendeesModalVisible] = useState(false);
  const [likesUsers, setLikesUsers] = useState<User[]>([]);
  const [attendeesUsers, setAttendeesUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Firestore'dan etkinlik detaylarını çekme
  // Function to handle displaying likes
  const handleShowLikes = async () => {
    if (!event || !event.likes || event.likes.length === 0) {
      Alert.alert('Bilgi', 'Henüz beğenen kullanıcı bulunmamaktadır.');
      return;
    }
    
    try {
      setLoadingUsers(true);
      setLikesModalVisible(true);
      
      const userPromises = event.likes.map(userId => 
        firebase.firestore().collection('users').doc(userId).get()
          .then(doc => {
            if (doc.exists) {
              return { id: doc.id, ...doc.data() } as User;
            }
            return null;
          })
          .catch(error => {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
          })
      );
      
      const usersData = await Promise.all(userPromises);
      const validUsers = usersData.filter(user => user !== null) as User[];
      setLikesUsers(validUsers);
    } catch (error) {
      console.error('Error fetching likes:', error);
      Alert.alert('Hata', 'Beğenen kullanıcılar yüklenirken bir sorun oluştu.');
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // Function to handle displaying attendees
  const handleShowAttendees = async () => {
    if (!event || !event.attendees || event.attendees.length === 0) {
      Alert.alert('Bilgi', 'Henüz katılımcı bulunmamaktadır.');
      return;
    }
    
    try {
      setLoadingUsers(true);
      setAttendeesModalVisible(true);
      
      const userPromises = event.attendees.map(userId => 
        firebase.firestore().collection('users').doc(userId).get()
          .then(doc => {
            if (doc.exists) {
              return { id: doc.id, ...doc.data() } as User;
            }
            return null;
          })
          .catch(error => {
            console.error(`Error fetching user ${userId}:`, error);
            return null;
          })
      );
      
      const usersData = await Promise.all(userPromises);
      const validUsers = usersData.filter(user => user !== null) as User[];
      setAttendeesUsers(validUsers);
    } catch (error) {
      console.error('Error fetching attendees:', error);
      Alert.alert('Hata', 'Katılımcılar yüklenirken bir sorun oluştu.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Function to navigate to a user's profile
  const handleUserPress = (userId: string, userType: string) => {
    if (userType === 'club') {
      navigation.navigate('ViewClub' as any, { clubId: userId });
    } else {
      navigation.navigate('ViewProfile' as any, { userId: userId });
    }
    
    // Close modals
    setLikesModalVisible(false);
    setAttendeesModalVisible(false);
  };

  useEffect(() => {
    if (!eventId) {
      Alert.alert('Hata', 'Etkinlik ID bilgisi eksik', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
      return;
    }
    setLoading(true);
    const unsubscribe = firebase.firestore().collection('events').doc(eventId).onSnapshot(
      (eventDoc) => {
        try {
          if (!eventDoc.exists) {
            Alert.alert('Hata', 'Etkinlik bulunamadı', [
              { text: 'Tamam', onPress: () => navigation.goBack() }
            ]);
            setLoading(false);
            return;
          }
          const eventData = eventDoc.data() || {};
          let startDate: Date;
          let endDate: Date;
          try {
            startDate = eventData.startDate?.toDate ?
              eventData.startDate.toDate() :
              new Date(eventData.startDate || Date.now());
            endDate = eventData.endDate?.toDate ?
              eventData.endDate.toDate() :
              new Date(eventData.endDate || Date.now());
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              throw new Error('Geçersiz tarih formatı');
            }
          } catch (dateError) {
            console.error('Tarih dönüştürme hatası:', dateError);
            startDate = new Date();
            endDate = new Date();
            endDate.setHours(endDate.getHours() + 1);
          }
          setEvent({ id: eventDoc.id, ...eventData, startDate, endDate });
        } catch (e) {
          console.error('Etkinlik detayları işlenemedi:', e);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Etkinlik detayı dinleme hatası:', error);
        Alert.alert(
          'Hata',
          `Etkinlik detayları yüklenirken bir sorun oluştu: ${error?.message || 'Bilinmeyen hata'}`,
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [eventId, navigation]);

  const formatEventDate = (startDate: Date, endDate: Date) => {
    if (!startDate || !endDate) return { startDate: '', endDate: '', formattedDay: '', time: '' };
    
    try {
      // Sayısal tarih formatı (21.07.2025)
      const numericDateStart = startDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const numericDateEnd = endDate.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Gün adı (Salı)
      const dayNameStart = startDate.toLocaleDateString('tr-TR', { weekday: 'long' });
      const formattedDayNameStart = dayNameStart.charAt(0).toUpperCase() + dayNameStart.slice(1);
      
      // Ay adı (Temmuz)
      const monthName = startDate.toLocaleDateString('tr-TR', { month: 'long' });
      const formattedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      // Saat formatı
      const timeFormat = (date: Date) => {
        if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
          return '00:00';
        }
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      };
      
      // İstenen format: "00.00.0000 Salı Temmuz"
      const formattedStart = `${numericDateStart} ${formattedDayNameStart} ${formattedMonthName}`;
      
      // Gün adı ve ay - bitiş tarihi için
      const dayNameEnd = endDate.toLocaleDateString('tr-TR', { weekday: 'long' });
      const formattedDayNameEnd = dayNameEnd.charAt(0).toUpperCase() + dayNameEnd.slice(1);
      
      const monthNameEnd = endDate.toLocaleDateString('tr-TR', { month: 'long' });
      const formattedMonthNameEnd = monthNameEnd.charAt(0).toUpperCase() + monthNameEnd.slice(1);
      
      // Başlangıç ve bitiş saatleri
      const startTime = timeFormat(startDate);
      const endTime = timeFormat(endDate);
      
      return {
        startDate: numericDateStart,
        endDate: numericDateEnd,
        formattedDay: `${formattedDayNameStart} ${formattedMonthName}`,
        formattedDayEnd: `${formattedDayNameEnd} ${formattedMonthNameEnd}`,
        time: `${startTime} - ${endTime}`
      };
    } catch (error) {
      console.error('Tarih formatı hatası:', error);
      return { 
        startDate: 'Tarih bilgisi yok', 
        endDate: 'Tarih bilgisi yok', 
        formattedDay: '', 
        formattedDayEnd: '', 
        time: 'Saat bilgisi yok' 
      };
    }
  };

  // Default image if no event image is available
  const defaultImage = 'https://firebasestorage.googleapis.com/v0/b/universe-a6f60.appspot.com/o/defaults%2Fevent-default.jpg?alt=media&token=c1b9974f-dcc8-4e2a-b739-812de0383a63';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Etkinlik detayları yükleniyor...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color={theme.colors.error} />
        <Text style={styles.errorText}>Etkinlik bulunamadı</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Geri Dön
        </Button>
      </View>
    );
  }

  const eventDates = formatEventDate(event.startDate, event.endDate);
  // Live organizer identity (club)
  const clubId = (event as any)?.clubId as string | undefined;
  const { avatarData: clubAvatar } = useUserAvatar(clubId);
  const liveClubName = clubAvatar?.displayName || event.clubName;
  const liveClubUniversity = clubAvatar?.university || event.universityName;

  // Reusable live row for user lists
  const LiveUserRow: React.FC<{ item: any }> = ({ item }) => {
    const uid = item?.id;
    const { avatarData } = useUserAvatar(uid);
    const displayName = avatarData?.displayName || item?.displayName || item?.userName || 'İsimsiz Kullanıcı';
    const username = avatarData?.userName || item?.username || (item?.email ? item.email.split('@')[0] : '');
    const university = avatarData?.university || item?.universityName || item?.university || '';
    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(uid, item.userType || 'student')}
      >
        <UniversalAvatar
          user={{ id: uid, displayName, profileImage: item?.photoURL || item?.profileImage }}
          size={50}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{displayName}</Text>
          {!!username && (
            <Text style={styles.userDetail}>@{username}</Text>
          )}
          {!!university && (
            <Text style={styles.userDetail}>{university}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Likes Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={likesModalVisible}
        onRequestClose={() => setLikesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Beğenenler</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setLikesModalVisible(false)}
              />
            </View>
            
            {loadingUsers ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <FlatList
                data={likesUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <LiveUserRow item={item} />}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Henüz beğenen kullanıcı bulunmamaktadır</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Attendees Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={attendeesModalVisible}
        onRequestClose={() => setAttendeesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Katılımcılar</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setAttendeesModalVisible(false)}
              />
            </View>
            
            {loadingUsers ? (
              <ActivityIndicator size="large" color={theme.colors.primary} />
            ) : (
              <FlatList
                data={attendeesUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <LiveUserRow item={item} />}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Henüz katılımcı bulunmamaktadır</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Etkinlik Detayları" />
        <Appbar.Action icon="share-variant" onPress={() => {
          try {
            if (event?.title) {
              Alert.alert(
                'Paylaş',
                `"${event.title}" etkinliğini paylaşmak istiyor musunuz?`,
                [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Paylaş', onPress: () => console.log('Etkinlik paylaşıldı:', event.id) }
                ]
              );
            }
          } catch (error) {
            console.error('Paylaşım hatası:', error);
          }
        }} />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: event.imageUrl || defaultImage }} 
            style={styles.image}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />
          <View style={styles.imageOverlay}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={styles.clubInfo}>
              <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
              <View style={styles.clubDetails}>
                <Text style={styles.clubName}>{liveClubName}</Text>
                <Text style={styles.universityName}>{liveClubUniversity || 'Üniversite Bilgisi Yok'}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.content}>
          {/* Başlık - zaten resim üzerinde gösteriliyor */}
          
          {/* Görünürlük Durumu */}
          <View style={styles.section}>
            <View style={styles.publicStatusContainer}>
              <MaterialCommunityIcons 
                name={event.isPublic !== false ? "eye" : "eye-off"} 
                size={24} 
                color={theme.colors.primary} 
              />
              <Text style={styles.publicStatusText}>
                {event.isPublic !== false ? 'Herkese Açık Etkinlik' : 'Yalnızca Üyelere Özel Etkinlik'}
              </Text>
            </View>
          </View>
          
          {/* Açıklama - her zaman gösterilir */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Açıklama</Text>
            </View>
            <Text style={styles.description}>
              {event.description || 'Bu etkinlik için açıklama bulunmuyor.'}
            </Text>
          </View>
          
          {/* Detayları Göster Butonu */}
          <Button 
            mode="outlined" 
            style={styles.detailsButton}
            icon="information"
            onPress={() => setShowAllDetails(!showAllDetails)}
          >
            {showAllDetails ? 'Detayları Gizle' : 'Detayları Göster'}
          </Button>

          {showAllDetails && (
            <>
              {/* Tarih ve Saat Bilgileri */}
              <View style={styles.dateTimeCard}>
                <Text style={[styles.sectionTitle, {marginBottom: 16, color: '#4caf50'}]}>📅 Tarih ve Saat Bilgileri</Text>
                <View style={styles.dateTimeItem}>
                  <MaterialCommunityIcons name="calendar" size={24} color={theme.colors.primary} />
                  <View style={styles.dateTimeContent}>
                    <Text style={styles.dateTimeLabel}>Başlangıç Tarihi</Text>
                    <Text style={styles.dateTimeValue}>{eventDates.startDate}</Text>
                    <Text style={styles.dateTimeSubvalue}>{eventDates.formattedDay}</Text>
                  </View>
                </View>
                
                <View style={styles.dateTimeItem}>
                  <MaterialCommunityIcons name="clock-outline" size={24} color={theme.colors.primary} />
                  <View style={styles.dateTimeContent}>
                    <Text style={styles.dateTimeLabel}>Saat</Text>
                    <Text style={styles.dateTimeValue}>{eventDates.time}</Text>
                  </View>
                </View>
                
                {event.startDate.toDateString() !== event.endDate.toDateString() && (
                  <View style={styles.dateTimeItem}>
                    <MaterialCommunityIcons name="calendar-end" size={24} color={theme.colors.primary} />
                    <View style={styles.dateTimeContent}>
                      <Text style={styles.dateTimeLabel}>Bitiş Tarihi</Text>
                      <Text style={styles.dateTimeValue}>{eventDates.endDate}</Text>
                      <Text style={styles.dateTimeSubvalue}>{eventDates.formattedDayEnd}</Text>
                    </View>
                  </View>
                )}
              </View>
              
              {/* Konum Bilgileri */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: '#2196f3'}]}>📍 Konum Bilgileri</Text>
                <View style={styles.locationContent}>
                  <MaterialCommunityIcons 
                    name={event.location?.type === 'online' ? 'web' : 'map-marker'} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.locationText}>
                    {event.location?.type === 'online' 
                      ? (event.location?.onlineLink || 'Online Etkinlik') 
                      : event.location?.physicalAddress || 'Konum bilgisi bulunamadı'}
                  </Text>
                </View>
              </View>
              
              {/* Fiyat ve Ücret Bilgileri */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: '#ff9800'}]}>💰 Fiyat ve Ücret Bilgileri</Text>
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons 
                    name={shouldShowAsPaid(event) ? 'cash' : 'cash-remove'}
                    size={24} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.detailText}>
                    {getFormattedEventPrice(event)}
                  </Text>
                </View>
                {event?.studentDiscount && shouldShowAsPaid(event) && (
                  <Text style={styles.detailSubtitle}>
                    Öğrenci indirimi: %{event.studentDiscount}
                  </Text>
                )}
              </View>
              
              {/* Katılım Kısıtlamaları ve Onay Gereksinimleri */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: '#e91e63'}]}>🚫 Katılım Kısıtlamaları ve Onay</Text>
                
                {/* Katılımcı Onayı */}
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color={theme.colors.primary} />
                  <Text style={styles.detailLabel}>Katılımcı Onayı:</Text>
                  <Text style={styles.detailText}>
                    {event.requiresApproval ? '✅ Katılım için onay gerektirir' : '❌ Onay gerekmez'}
                  </Text>
                </View>
                
                {/* Misafir Katılımı */}
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="account-multiple-plus" size={20} color={theme.colors.primary} />
                  <Text style={styles.detailLabel}>Misafir Katılımı:</Text>
                  <Text style={styles.detailText}>
                    {event.allowGuests ? '✅ Misafir katılımına açık' : '❌ Sadece kayıtlı üyeler'}
                  </Text>
                </View>
                
                {/* Görünürlük Durumu */}
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="eye" size={20} color={theme.colors.primary} />
                  <Text style={styles.detailLabel}>Görünürlük:</Text>
                  <Text style={styles.detailText}>
                    {event.isPublic !== false ? '🌐 Herkese açık etkinlik' : '🔒 Yalnızca üyelere özel'}
                  </Text>
                </View>
                
                {/* Özel Kısıtlamalar */}
                {event.restrictionInfo && (
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color={theme.colors.primary} />
                    <Text style={styles.detailLabel}>Özel Kısıtlamalar:</Text>
                    <Text style={styles.detailText}>{event.restrictionInfo}</Text>
                  </View>
                )}
              </View>
              
              {/* Gerekli Malzemeler ve Sertifika */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: '#9c27b0'}]}>🎓 Malzemeler ve Sertifika</Text>
                
                {/* Gerekli Malzemeler */}
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="toolbox" size={20} color={theme.colors.primary} />
                  <Text style={styles.detailLabel}>Gerekli Malzemeler:</Text>
                  <Text style={styles.detailText}>
                    {event.requiredMaterials || 'Özel malzeme gerekmez'}
                  </Text>
                </View>
                
                {/* Sertifika */}
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="certificate" size={20} color={theme.colors.primary} />
                  <Text style={styles.detailLabel}>Sertifika:</Text>
                  <Text style={styles.detailText}>
                    {event.hasCertificate ? '🏆 Katılım sertifikası verilecektir' : '❌ Sertifika verilmeyecektir'}
                  </Text>
                </View>
              </View>
              
              {/* Etkinlik Kapasitesi ve Dil */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: '#607d8b'}]}>ℹ️ Diğer Bilgiler</Text>
                
                {/* Kapasite */}
                {event.capacity && (
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="account-group" size={20} color={theme.colors.primary} />
                    <Text style={styles.detailLabel}>Kapasite:</Text>
                    <Text style={styles.detailText}>{event.capacity} kişi</Text>
                  </View>
                )}
                
                {/* Dil */}
                <View style={styles.detailItem}>
                  <MaterialCommunityIcons name="translate" size={20} color={theme.colors.primary} />
                  <Text style={styles.detailLabel}>Etkinlik Dili:</Text>
                  <Text style={styles.detailText}>{event.language || 'Türkçe'}</Text>
                </View>
              </View>
              
              {/* İletişim Bilgileri */}
              {(event.contactEmail || event.contactPhone) && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: '#795548'}]}>📞 İletişim Bilgileri</Text>
                  {event.contactEmail && (
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="email" size={20} color={theme.colors.primary} />
                      <Text style={styles.detailLabel}>E-posta:</Text>
                      <Text style={styles.detailText}>{event.contactEmail}</Text>
                    </View>
                  )}
                  {event.contactPhone && (
                    <View style={styles.detailItem}>
                      <MaterialCommunityIcons name="phone" size={20} color={theme.colors.primary} />
                      <Text style={styles.detailLabel}>Telefon:</Text>
                      <Text style={styles.detailText}>{event.contactPhone}</Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Kategoriler */}
              {event.categories && event.categories.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, {color: '#3f51b5'}]}>🏷️ Etkinlik Kategorileri</Text>
                  <View style={styles.categoriesContainer}>
                    {event.categories.map(categoryId => {
                      try {
                        const category = eventCategories.find(c => c.id === categoryId);
                        if (!category) {
                          console.warn(`Kategori bulunamadı: ${categoryId}`);
                          return null;
                        }
                        
                        if (!category.icon) {
                          console.warn(`Kategori ikon bilgisi eksik: ${categoryId}`);
                          return (
                            <View key={categoryId} style={styles.categoryTag}>
                              <MaterialCommunityIcons name="tag" size={16} color="#555" />
                              <Text style={styles.categoryText}>{category.label}</Text>
                            </View>
                          );
                        }
                        
                        return (
                          <View key={categoryId} style={styles.categoryTag}>
                            <MaterialCommunityIcons name={category.icon as any} size={16} color="#555" />
                            <Text style={styles.categoryText}>{category.label}</Text>
                          </View>
                        );
                      } catch (error) {
                        console.error(`Kategori işlenirken hata: ${categoryId}`, error);
                        return null;
                      }
                    })}
                  </View>
                </View>
              )}
            </>
          )}
          
          <View style={styles.attendanceSection}>
            <View style={styles.attendanceInfo}>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={handleShowAttendees}
              >
                <MaterialCommunityIcons name="account-multiple" size={24} color={theme.colors.primary} />
                <Text style={styles.attendanceText}>
                  {event.attendeesCount || 0} Katılımcı
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Like information */}
            <View style={styles.attendanceInfo}>
              <TouchableOpacity 
                style={styles.infoButton}
                onPress={handleShowLikes}
              >
                <MaterialCommunityIcons name="thumb-up" size={24} color={theme.colors.primary} />
                <Text style={styles.attendanceText}>
                  {event.likesCount || 0} Beğeni
                </Text>
              </TouchableOpacity>
            </View>
            
            <Button 
              mode="contained" 
              style={styles.attendButton}
              icon="check"
              onPress={() => {
                try {
                  // Here would go logic to handle event attendance
                  Alert.alert(
                    'Katılım',
                    'Etkinliğe katılmak istediğinize emin misiniz?',
                    [
                      { text: 'İptal', style: 'cancel' },
                      { 
                        text: 'Katıl', 
                        onPress: () => {
                          // Simulating successful attendance
                          Alert.alert('Başarılı', 'Etkinliğe katılımınız kaydedildi!');
                        }
                      }
                    ]
                  );
                } catch (error) {
                  console.error('Etkinliğe katılma hatası:', error);
                  Alert.alert('Hata', 'Etkinliğe katılım sırasında bir sorun oluştu');
                }
              }}
            >
              Katıl
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  userDetail: {
    color: '#666',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
    fontStyle: 'italic',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  publicStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  publicStatusText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#444',
    fontWeight: '500',
  },
  detailsButton: {
    marginVertical: 16,
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  toggleButton: {
    margin: 0,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
    height: 300,
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    height: '100%',
    width: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  clubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubDetails: {
    marginLeft: 8,
  },
  clubName: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
    fontWeight: '500',
  },
  universityName: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginTop: 2,
  },
  content: {
    padding: 16,
  },
  dateTimeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',  // Highlight color for date section
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateTimeContent: {
    marginLeft: 12,
  },
  dateTimeLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dateTimeSubvalue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 16,
    color: '#444',
    marginLeft: 12,
    flex: 1,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ebebeb',
  },
  categoryText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 6,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  attendanceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',  // Highlight color for attendance
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#444',
  },
  attendButton: {
    borderRadius: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginLeft: 10,
    marginRight: 5,
  },
  detailText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
  },
  detailSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
});

export default ViewEventScreen;
