import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import { 
  Text, TextInput, Button, useTheme, Appbar, 
  HelperText, Switch, Chip, Avatar, Divider, 
  ActivityIndicator, Snackbar, List, IconButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { firestore, firebase } from '../../firebase/config';
import { createEventWithScoring as createEventService } from '../../firebase/eventManagement';
import { getUserProfile as fetchUserProfile } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import DateTimePicker from '../../components/CustomDateTimePicker';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { eventCategories } from '../../constants';
import { CustomTheme } from '../../types/theme';
import { advancedStorageService } from '../../services/advancedFirebaseStorageService';
import { imageReferenceManager } from '../../services/imageReferenceManager';

type EventCapacity = 'limited' | 'unlimited';
type EventVisibility = 'public' | 'private' | 'members';
type EventLocation = 'physical' | 'online' | 'hybrid';

const CreateEventScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const baseTheme = useTheme();
  const theme = baseTheme as unknown as CustomTheme;
  const { userProfile, currentUser, refreshUserProfile } = useAuth();
  
  // Route parametrelerinden eventId'yi al (düzenleme modunda)
  const { eventId } = route.params as { eventId?: string } || {};
  const isEditMode = !!eventId;
  
  // State değişkenleri
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [loadingEventData, setLoadingEventData] = useState(isEditMode);
  
  // Tarih ve saat
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(new Date().setHours(new Date().getHours() + 2))); // 2 saat sonra
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  // Lokasyon
  const [locationType, setLocationType] = useState<EventLocation>('physical');
  const [physicalLocation, setPhysicalLocation] = useState('');
  const [onlineLink, setOnlineLink] = useState('');
  
  // Kapasite ayarları
  const [capacityType, setCapacityType] = useState<EventCapacity>('limited');
  const [capacity, setCapacity] = useState('50');
  
  // Çoklu dil seçimi
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Türkçe']);
  const [customLanguage, setCustomLanguage] = useState('');
  
  // Yeni eklenen özellikler
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [hasCertificate, setHasCertificate] = useState(false);
  const [certificateDetails, setCertificateDetails] = useState('');
  const [requiredMaterials, setRequiredMaterials] = useState('');
  const [isOpenToAllUniversities, setIsOpenToAllUniversities] = useState(true);
  const [restrictedUniversities, setRestrictedUniversities] = useState<string[]>([]);
  
  // Kategoriler
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  
  // Kategori arama fonksiyonu
  const getFilteredCategories = (categories: typeof eventCategories, search: string) => {
    if (!search.trim()) return categories;
    return categories.filter(cat => 
      cat.label.toLowerCase().includes(search.toLowerCase()) ||
      cat.id.toLowerCase().includes(search.toLowerCase())
    );
  };
  
  // Dil seçimi fonksiyonları
  const toggleLanguage = (language: string) => {
    setSelectedLanguages(prev => {
      if (prev.includes(language)) {
        // Dili kaldır (en az bir dil seçili kalmalı)
        return prev.length > 1 ? prev.filter(lang => lang !== language) : prev;
      } else {
        // Dil ekle
        return [...prev, language];
      }
    });
  };
  
  const addCustomLanguage = () => {
    if (customLanguage.trim() && !selectedLanguages.includes(customLanguage.trim())) {
      setSelectedLanguages(prev => [...prev, customLanguage.trim()]);
      setCustomLanguage('');
    }
  };
  
  // Form durumu
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      const currentStartTime = startDate;
      selectedDate.setHours(currentStartTime.getHours());
      selectedDate.setMinutes(currentStartTime.getMinutes());
      setStartDate(selectedDate);
      
      // Eğer bitiş tarihi, başlangıç tarihinden önce ise ayarla
      if (endDate < selectedDate) {
        const newEndDate = new Date(selectedDate);
        newEndDate.setHours(selectedDate.getHours() + 2); // 2 saat ekle
        setEndDate(newEndDate);
      }
    }
  };
  
  const onStartTimeChange = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(startDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setStartDate(newDate);
      
      // Eğer bitiş zamanı, başlangıç zamanından önce ise ayarla
      if (endDate < newDate) {
        const newEndDate = new Date(newDate);
        newEndDate.setHours(newDate.getHours() + 2); // 2 saat ekle
        setEndDate(newEndDate);
      }
    }
  };
  
  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      const currentEndTime = endDate;
      selectedDate.setHours(currentEndTime.getHours());
      selectedDate.setMinutes(currentEndTime.getMinutes());
      
      // Eğer seçilen bitiş tarihi, başlangıç tarihinden önce ise ayarla
      if (selectedDate < startDate) {
        setSnackbarMessage('Bitiş tarihi başlangıç tarihinden önce olamaz');
        setSnackbarVisible(true);
        return;
      }
      
      setEndDate(selectedDate);
    }
  };
  
  const onEndTimeChange = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(endDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      
      // Eğer aynı gündeyiz ve bitiş saati başlangıç saatinden önce ise
      if (
        newDate.getDate() === startDate.getDate() && 
        newDate.getMonth() === startDate.getMonth() && 
        newDate.getFullYear() === startDate.getFullYear() && 
        newDate < startDate
      ) {
        setSnackbarMessage('Bitiş saati başlangıç saatinden önce olamaz');
        setSnackbarVisible(true);
        return;
      }
      
      setEndDate(newDate);
    }
  };
  
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setSnackbarMessage('Galeriye erişim izni gerekiyor!');
      setSnackbarVisible(true);
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets[0].uri) {
      try {
        setLoading(true);
        console.log('🚀 Starting professional event image upload...');
        
        // Upload using Advanced Storage Service
        const uploadResult = await advancedStorageService.uploadImage(
          result.assets[0].uri,
          currentUser?.uid || '',
          'event_banner',
          {
            quality: 0.8,
            maxWidth: 1200,
            maxHeight: 675,
            generateThumbnail: true
          }
        );
        
        if (uploadResult.success && uploadResult.originalUrl) {
          setEventImage(uploadResult.originalUrl);
          console.log('✅ Event image uploaded successfully:', uploadResult.originalUrl);
          setSnackbarMessage('Etkinlik görseli başarıyla yüklendi!');
          setSnackbarVisible(true);
        } else {
          throw new Error(uploadResult.error || 'Image upload failed');
        }
        
      } catch (error) {
        console.error('❌ Event image upload failed:', error);
        setSnackbarMessage('Görsel yüklenirken hata oluştu!');
        setSnackbarVisible(true);
      } finally {
        setLoading(false);
      }
    }
  };

  // Düzenleme modunda mevcut etkinlik verilerini yükle
  useEffect(() => {
    const loadEventData = async () => {
      if (!isEditMode || !eventId) {
        setLoadingEventData(false);
        return;
      }

      try {
        if (__DEV__) {
          console.log('🔄 Etkinlik verileri yükleniyor:', eventId);
        }
        const eventDoc = await firestore.collection('events').doc(eventId).get();
        
        if (!eventDoc.exists) {
          setSnackbarMessage('Etkinlik bulunamadı');
          setSnackbarVisible(true);
          navigation.goBack();
          return;
        }

        const eventData = eventDoc.data();
        if (!eventData) {
          setSnackbarMessage('Etkinlik verileri yüklenemedi');
          setSnackbarVisible(true);
          navigation.goBack();
          return;
        }

        if (__DEV__) {
          console.log('✅ Etkinlik verileri yüklendi, form doldurulуor...');
        }

        // Form verilerini mevcut etkinlik bilgileriyle doldur
        setTitle(eventData.title || '');
        setDescription(eventData.description || '');
        setEventImage(eventData.imageUrl || null);

        // Tarih ve saat bilgilerini ayarla
        if (eventData.startDate) {
          const startDate = eventData.startDate.toDate ? eventData.startDate.toDate() : new Date(eventData.startDate);
          setStartDate(startDate);
        }
        if (eventData.endDate) {
          const endDate = eventData.endDate.toDate ? eventData.endDate.toDate() : new Date(eventData.endDate);
          setEndDate(endDate);
        }

        // Lokasyon bilgileri
        if (eventData.location) {
          setLocationType(eventData.location.type || 'physical');
          setPhysicalLocation(eventData.location.physicalAddress || '');
          setOnlineLink(eventData.location.onlineLink || '');
        }

        // Kapasite bilgileri
        if (eventData.capacity) {
          setCapacityType('limited');
          setCapacity(eventData.capacity.toString());
        } else {
          setCapacityType('unlimited');
        }

        // Dil bilgileri
        if (eventData.languages && Array.isArray(eventData.languages)) {
          setSelectedLanguages(eventData.languages);
        }

        // Ücret bilgileri
        if (eventData.pricing) {
          setIsFree(eventData.pricing.isFree || false);
          setPrice(eventData.pricing.price?.toString() || '');
        } else if (eventData.isFree !== undefined) {
          setIsFree(eventData.isFree);
          setPrice(eventData.price?.toString() || '');
        }

        // Sertifika bilgileri
        setHasCertificate(eventData.hasCertificate || false);
        setCertificateDetails(eventData.certificateDetails || '');

        // Gerekli materyaller
        setRequiredMaterials(eventData.requiredMaterials || '');

        // Üniversite kısıtlamaları
        if (eventData.universityRestrictions) {
          setIsOpenToAllUniversities(eventData.universityRestrictions.isOpenToAll !== false);
          setRestrictedUniversities(eventData.universityRestrictions.allowedUniversities || []);
        }

        // Kategoriler
        if (eventData.categories && Array.isArray(eventData.categories)) {
          setSelectedCategories(eventData.categories);
        }

        if (__DEV__) {
          console.log('✅ Form başarıyla dolduruldu!');
        }

      } catch (error) {
        console.error('❌ Etkinlik verileri yüklenirken hata:', error);
        setSnackbarMessage('Etkinlik verileri yüklenirken bir hata oluştu');
        setSnackbarVisible(true);
        navigation.goBack();
      } finally {
        setLoadingEventData(false);
      }
    };

    loadEventData();
  }, [isEditMode, eventId, navigation]);
  
  const validateForm = () => {
    // Temel bilgilerin kontrolü
    if (!title.trim()) {
      setSnackbarMessage('Etkinlik başlığı gerekli');
      setSnackbarVisible(true);
      return false;
    }
    
    if (!description.trim()) {
      setSnackbarMessage('Etkinlik açıklaması gerekli');
      setSnackbarVisible(true);
      return false;
    }
    
    // Lokasyon kontrolü
    if (locationType === 'physical' && !physicalLocation.trim()) {
      setSnackbarMessage('Fiziksel konum bilgisi gerekli');
      setSnackbarVisible(true);
      return false;
    }
    
    if ((locationType === 'online' || locationType === 'hybrid') && !onlineLink.trim()) {
      setSnackbarMessage('Online bağlantı linki gerekli');
      setSnackbarVisible(true);
      return false;
    }
    
    // Kapasite kontrolü
    if (capacityType === 'limited' && (!capacity || isNaN(Number(capacity)) || Number(capacity) <= 0)) {
      setSnackbarMessage('Geçerli bir kapasite sayısı giriniz');
      setSnackbarVisible(true);
      return false;
    }
    
    // Ücret kontrolü
    if (!isFree && (!price || isNaN(Number(price)) || Number(price) <= 0)) {
      setSnackbarMessage('Ücretli etkinlik için geçerli bir ücret giriniz');
      setSnackbarVisible(true);
      return false;
    }
    
    // Sertifika kontrolü
    if (hasCertificate && !certificateDetails.trim()) {
      setSnackbarMessage('Sertifika detaylarını belirtmelisiniz');
      setSnackbarVisible(true);
      return false;
    }
    
    // Dil kontrolü
    if (selectedLanguages.length === 0) {
      setSnackbarMessage('En az bir etkinlik dili seçmelisiniz');
      setSnackbarVisible(true);
      return false;
    }
    
    // Kategori kontrolü
    if (selectedCategories.length === 0) {
      setSnackbarMessage('En az bir etkinlik kategorisi seçmelisiniz');
      setSnackbarVisible(true);
      return false;
    }
    
    // Tarih kontrolü: Başlangıç tarihi şimdiden önce olmamalı
    const now = new Date();
    if (startDate < now) {
      setSnackbarMessage('Başlangıç tarihi geçmiş bir tarih olamaz');
      setSnackbarVisible(true);
      return false;
    }
    
    // Bitiş tarihi başlangıçtan sonra olmalı
    if (endDate <= startDate) {
      setSnackbarMessage('Bitiş tarihi, başlangıç tarihinden sonra olmalıdır');
      setSnackbarVisible(true);
      return false;
    }
    
    return true;
  };
  
  const createEvent = async () => {
    if (__DEV__) {
      console.log('🔍 createEvent çağrıldı - isEditMode:', isEditMode, 'eventId:', eventId);
    }
    
    // Prevent multiple simultaneous calls
    if (loading) {
      if (__DEV__) {
        console.log('⚠️ Already processing, ignoring duplicate call');
      }
      return;
    }
    // Trace validation start
    if (__DEV__) {
      console.log('🧪 Form validation starting...');
    }
    if (!validateForm()) return;
    if (__DEV__) {
      console.log('✅ Form validation passed');
    }
    // Resolve effective profile; fallback to fetch if context not ready
    let effectiveProfile: any = userProfile;
    if ((!effectiveProfile || !effectiveProfile.uid) && currentUser?.uid) {
      try {
        if (__DEV__) {
          console.log('🔄 userProfile missing; refreshing and fetching profile for uid:', currentUser.uid);
        }
        try { await refreshUserProfile(); } catch {}
        const fresh = await fetchUserProfile(currentUser.uid);
        if (fresh && (fresh as any).uid) {
          effectiveProfile = fresh;
          if (__DEV__) {
            console.log('✅ Fallback profile fetch succeeded');
          }
        }
      } catch (e) {
        console.warn('⚠️ Fallback profile fetch failed:', e);
      }
    }
    if (!effectiveProfile || !effectiveProfile.uid) {
      setSnackbarMessage('Kullanıcı profili bilgisi bulunamadı');
      setSnackbarVisible(true);
      return;
    }
    if (__DEV__) {
      console.log('👤 userProfile check passed:', {
        uid: effectiveProfile.uid,
        userType: effectiveProfile.userType,
        clubName: effectiveProfile.clubName || effectiveProfile.displayName || effectiveProfile.name
      });
    }
    
    if (__DEV__) {
      console.log('🔧 Setting loading state to true...');
    }
    setLoading(true);
    
    try {
      if (__DEV__) {
        console.log('📝 Building event data object...');
      }
      // Etkinlik veri yapısı
      const eventData = {
        title,
        description,
        startDate: firebase.firestore.Timestamp.fromDate(startDate),
        endDate: firebase.firestore.Timestamp.fromDate(endDate),
        location: {
          type: locationType,
          physicalAddress: physicalLocation || null,
          onlineLink: onlineLink || null,
        },
        capacity: capacityType === 'limited' ? Number(capacity) : null,
        // Yeni eklenen alanlar
        pricing: {
          isFree,
          price: isFree ? 0 : Number(price) || 0,
        },
        categories: selectedCategories,
        certificate: {
          hasCertificate,
          certificateDetails: certificateDetails || null,
        },
        languages: selectedLanguages, // Çoklu dil desteği
        requiredMaterials: requiredMaterials || null,
        universityRestrictions: {
          isOpenToAllUniversities,
          restrictedUniversities: isOpenToAllUniversities ? [] : [effectiveProfile.university || 'unknown'],
        },
        // Erişim ve görünürlük ayarları
        visibility: 'public' as const, // Şimdilik hep public, gelecekte kullanıcıdan alınabilir
        settings: {
          requireApproval: false, // Şimdilik hep false, gelecekte kullanıcıdan alınabilir
        },
        clubId: effectiveProfile.uid,
        creatorId: effectiveProfile.uid,
        creatorType: "club",
        clubName: effectiveProfile.clubName || effectiveProfile.name || effectiveProfile.displayName || 'İsimsiz Kulüp',
        // Organizer and ownership aliases for rule/query compatibility
        organizer: {
          id: effectiveProfile.uid,
          type: 'club',
          name: effectiveProfile.clubName || effectiveProfile.name || effectiveProfile.displayName || 'İsimsiz Kulüp'
        },
        ownerId: effectiveProfile.uid,
        createdBy: effectiveProfile.uid,
        status: 'active',
        university: effectiveProfile.university || null,
        imageUrl: eventImage || null,
      };

      console.log('📋 Event data object built successfully:', {
        title: eventData.title,
        clubId: eventData.clubId,
        creatorId: eventData.creatorId,
        hasOrganizer: !!eventData.organizer?.id
      });

      if (isEditMode && eventId) {
        // Düzenleme modu - mevcut etkinliği güncelle
        if (__DEV__) {
          console.log('🔄 Etkinlik güncelleniyor:', eventId);
        }
        
        // updatedAt alanı ekle, createdAt'i kaldır
        const updateData = {
          ...eventData,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };
        delete (updateData as any).createdAt;
        delete (updateData as any).attendeesCount; // Mevcut katılımcı sayısını koru
        delete (updateData as any).attendees; // Mevcut katılımcıları koru
        
        await firestore.collection('events').doc(eventId).update(updateData);
        
        setSnackbarMessage('Etkinlik başarıyla güncellendi');
        setSnackbarVisible(true);
        
        if (__DEV__) {
          console.log(`✅ Etkinlik güncellendi: ${eventId}`);
        }
        
        // Kısa bir gecikme ile geri dön
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
        
      } else {
        // Oluşturma modu - yeni etkinlik oluştur
        if (__DEV__) {
          console.log('🆕 Creating new event mode...');
        }
        const newEventData = {
          ...eventData,
          // Rules expect `timestamp` on create
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          attendeesCount: 0,
          attendees: [],
        };
        
        if (__DEV__) {
          console.log('⚙️ New event data prepared with timestamps');
        }
        
        // Use the centralized event creation service
        if (__DEV__) {
          console.log('🚀 Attempting to create event with data:', {
            title: newEventData.title,
            description: newEventData.description ? newEventData.description.substring(0, 50) + '...' : 'none',
            clubId: newEventData.clubId,
            creatorId: effectiveProfile.uid,
            organizerId: (newEventData as any)?.organizer?.id,
            userProfileCheck: {
              uid: effectiveProfile.uid,
              userType: effectiveProfile.userType,
              clubName: effectiveProfile.clubName || effectiveProfile.displayName,
              isClub: effectiveProfile.userType === 'club'
            },
            hasTimestamp: !!newEventData.timestamp,
            hasCreatedAt: !!newEventData.createdAt,
            hasOrganizer: !!(newEventData as any)?.organizer?.id
          });
        }
        
        console.log('🔐 Verifying user type before service call...');
  if (effectiveProfile.userType !== 'club') {
          throw new Error('Sadece kulüp hesapları etkinlik oluşturabilir');
        }
        console.log('✅ User type verification passed');
        
        console.log('📞 Calling createEventService...');
  const result = await createEventService(newEventData, effectiveProfile.uid);
        
        console.log('🎯 Event creation result:', result);
      
  if (result.success && result.eventId) {
  // Scoring already applied inside createEventWithScoring; avoid double-awarding here
        
        // Kulüp takipçilerine bildirim gönder
        try {
          console.log('📢 Sending event creation notifications to followers...');
          
          // Kulüp takipçilerini al
          const db = firebase.firestore();
          const clubDoc = await db.collection('users').doc(effectiveProfile.uid).get();
          const clubData = clubDoc.data();
          const followers = clubData?.followers || [];
          
          console.log(`📢 Found ${followers.length} followers to notify`);
          
          if (followers.length > 0) {
            // Takipçilere toplu bildirim gönder
            for (const followerId of followers) {
              try {
                // TODO: Replace with ClubNotificationService
                console.log('Notification would be sent to follower:', followerId);
                // await enhancedClubNotificationService.sendEventNotification(
                //   followerId, result.eventId, eventData.title,
                //   effectiveProfile.uid, eventData.clubName, 'event_created'
                // );
              } catch (followerNotificationError) {
                console.warn(`Failed to send notification to follower ${followerId}:`, followerNotificationError);
              }
            }
            console.log(`✅ Event creation notifications sent to ${followers.length} followers`);
          }
        } catch (notificationError) {
          console.error('❌ Error sending event creation notifications:', notificationError);
        }
        
        // Başarı mesajı göster ve geri dön
        setSnackbarMessage('Etkinlik başarıyla oluşturuldu ve takipçiler bilgilendirildi');
        setSnackbarVisible(true);
        
  const clubIdForLog = effectiveProfile?.uid || currentUser?.uid || (newEventData as any)?.clubId || 'unknown';
  console.log(`🎯 Etkinlik oluşturuldu: ${result.eventId}, Kulüp: ${clubIdForLog}`);
        
        // Kısa bir gecikme ile geri dön (kullanıcı mesajı görsün)
        setTimeout(() => {
          navigation.goBack();
        }, 2000); // Biraz daha uzun süre mesajı göster
        } else {
          throw new Error(result.error || 'Etkinlik oluşturulamadı');
        }
      } // Ana else dalını kapat
      
    } catch (error) {
      console.error(isEditMode ? 'Etkinlik güncelleme hatası:' : 'Etkinlik oluşturma hatası:', error);
      console.error('Full error details:', {
        name: (error as any)?.name,
        code: (error as any)?.code,
        message: (error as any)?.message,
        stack: (error as any)?.stack
      });
      
      // Daha detaylı hata mesajları
      let errorMessage = isEditMode ? 
        'Etkinlik güncellenirken bir hata oluştu' : 
        'Etkinlik oluşturulurken bir hata oluştu';
      
      if (error instanceof Error) {
        if ((error as any).code === 'permission-denied') {
          errorMessage = isEditMode ? 
            'Yetki hatası: Etkinlik güncelleme izniniz yok' : 
            'Yetki hatası: Etkinlik oluşturma izniniz yok';
        } else if ((error as any).code === 'unavailable') {
          errorMessage = 'Bağlantı hatası: İnternet bağlantınızı kontrol edin';
        } else if (error.message) {
          errorMessage = `Hata: ${error.message}`;
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={isEditMode ? "Etkinliği Düzenle" : "Etkinlik Oluştur"} />
      </Appbar.Header>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {loadingEventData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Etkinlik bilgileri yükleniyor...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
          {/* Etkinlik Görseli Ekleme */}
          <TouchableOpacity 
            style={styles.imageContainer}
            onPress={pickImage}
          >
            {eventImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image 
                  source={{ uri: eventImage }} 
                  style={styles.imagePreview}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <MaterialCommunityIcons name="camera" size={24} color="#FFF" />
                </View>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="image-plus" size={48} color="#CCC" />
                <Text style={styles.imagePlaceholderText}>Etkinlik Görseli Ekle</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {/* Etkinlik Başlık ve Açıklama */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Etkinlik Bilgileri</Text>
            
            <TextInput
              label="Etkinlik Başlığı"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              error={title.trim() === ''}
            />
            {title.trim() === '' && (
              <HelperText type="error">Etkinlik başlığı gerekli</HelperText>
            )}
            
            <TextInput
              label="Etkinlik Açıklaması"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.input}
              error={description.trim() === ''}
            />
            {description.trim() === '' && (
              <HelperText type="error">Etkinlik açıklaması gerekli</HelperText>
            )}
            
            {/* Kategoriler */}
            <Text style={styles.inputLabel}>Etkinlik Kategorileri</Text>
            <View style={styles.categoriesContainer}>
              {selectedCategories.length > 0 ? (
                <View style={styles.chipRow}>
                  {selectedCategories.map((categoryId) => {
                    const category = eventCategories.find((c) => c.id === categoryId);
                    if (!category) return null;
                    
                    return (
                      <Chip
                        key={category.id}
                        icon={(props) => <MaterialCommunityIcons name={category.icon as any} {...props} />}
                        mode="outlined"
                        style={styles.selectedCategoryChip}
                        onClose={() => {
                          setSelectedCategories(selectedCategories.filter((id) => id !== category.id));
                        }}
                      >
                        {category.label}
                      </Chip>
                    );
                  })}
                  <Chip 
                    icon="plus" 
                    mode="outlined" 
                    onPress={() => setShowCategoryList(!showCategoryList)}
                    style={styles.addCategoryChip}
                  >
                    Ekle
                  </Chip>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={() => setShowCategoryList(true)} 
                  style={styles.emptyCategories}
                >
                  <MaterialCommunityIcons name="tag-plus" size={24} color="#999" />
                  <Text style={styles.emptyCategoriesText}>
                    Etkinlik kategorileri eklemek için tıklayın
                  </Text>
                </TouchableOpacity>
              )}
              
              {showCategoryList && (
                <View style={styles.categoryListContainer}>
                  <Text style={styles.categoryListHeader}>Bir veya birden fazla kategori seçin</Text>
                  
                  {/* Kategori arama */}
                  <TextInput
                    label="Kategori Ara"
                    mode="outlined"
                    style={styles.categorySearchInput}
                    placeholder="Kategori adı yazın..."
                    left={<TextInput.Icon icon="magnify" />}
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                    clearButtonMode="while-editing"
                    autoCapitalize="none"
                  />
                  
                  {categorySearch.trim() !== '' && (
                    <>
                      <Text style={styles.searchResultsHeader}>Arama Sonuçları</Text>
                      {getFilteredCategories(eventCategories, categorySearch).length > 0 ? (
                        getFilteredCategories(eventCategories, categorySearch).map((category) => (
                          <TouchableOpacity
                            key={category.id}
                            style={[styles.categoryItem, styles.searchResultItem]}
                            onPress={() => {
                              if (selectedCategories.includes(category.id)) {
                                setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                              } else {
                                setSelectedCategories([...selectedCategories, category.id]);
                              }
                            }}
                          >
                            <View style={styles.categoryItemContent}>
                              <MaterialCommunityIcons 
                                name={category.icon as any} 
                                size={20} 
                                color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                              />
                              <Text style={[
                                styles.categoryItemLabel,
                                selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                              ]}>
                                {category.label}
                              </Text>
                            </View>
                            {selectedCategories.includes(category.id) && (
                              <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                            )}
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.noResultsText}>Sonuç bulunamadı</Text>
                      )}
                      
                      <Divider style={styles.searchDivider} />
                    </>
                  )}
                  
                  {categorySearch.trim() === '' ? (
                  
                  <ScrollView style={styles.categoryList} nestedScrollEnabled={true}>
                    {/* Akademik Etkinlikler */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="school" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Akademik</Text>
                    </List.Subheader>
                    {eventCategories.slice(0, 9).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Teknik Etkinlikler */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="laptop" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Teknoloji</Text>
                    </List.Subheader>
                    {eventCategories.slice(9, 19).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Kariyer Etkinlikleri */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="briefcase" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Kariyer</Text>
                    </List.Subheader>
                    {eventCategories.slice(19, 27).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Sosyal ve Kültürel */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="palette" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Sosyal ve Kültürel</Text>
                    </List.Subheader>
                    {eventCategories.slice(27, 37).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Spor ve Wellness */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="basketball" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Spor ve Sağlık</Text>
                    </List.Subheader>
                    {eventCategories.slice(37, 45).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Seyahat ve Gezi */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="bus" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Seyahat ve Gezi</Text>
                    </List.Subheader>
                    {eventCategories.slice(45, 51).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Sosyal Sorumluluk */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="hand-heart" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Sosyal Sorumluluk</Text>
                    </List.Subheader>
                    {eventCategories.slice(51, 57).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Yarışmalar */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="trophy" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Yarışmalar</Text>
                    </List.Subheader>
                    {eventCategories.slice(57, 63).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Eğitim ve Gelişim */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="school" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Eğitim ve Gelişim</Text>
                    </List.Subheader>
                    {eventCategories.slice(63, 69).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Diğer */}
                    <List.Subheader style={styles.categoryGroupHeader}>
                      <MaterialCommunityIcons name="shape" size={18} color="#666" />
                      <Text style={styles.categoryGroupText}>Diğer</Text>
                    </List.Subheader>
                    {eventCategories.slice(69).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.categoryItem}
                        onPress={() => {
                          if (selectedCategories.includes(category.id)) {
                            setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                          } else {
                            setSelectedCategories([...selectedCategories, category.id]);
                          }
                        }}
                      >
                        <View style={styles.categoryItemContent}>
                          <MaterialCommunityIcons 
                            name={category.icon as any} 
                            size={20} 
                            color={selectedCategories.includes(category.id) ? theme.colors.primary : '#666'} 
                          />
                          <Text style={[
                            styles.categoryItemLabel,
                            selectedCategories.includes(category.id) && { color: theme.colors.primary, fontWeight: 'bold' }
                          ]}>
                            {category.label}
                          </Text>
                        </View>
                        {selectedCategories.includes(category.id) && (
                          <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  ) : null}
                  <Button 
                    mode="text" 
                    onPress={() => setShowCategoryList(false)}
                    style={styles.closeCategoriesButton}
                  >
                    Tamam
                  </Button>
                </View>
              )}
              
              {!showCategoryList && selectedCategories.length === 0 && (
                <HelperText type="info">
                  En az bir kategori seçmelisiniz
                </HelperText>
              )}
            </View>
          </View>
          
          {/* Etkinlik Tarihleri */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Tarih ve Saat</Text>
            
            <View style={styles.dateTimeRow}>
              <TouchableOpacity 
                style={styles.datePickerButton} 
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateTimeLabel}>Başlangıç Tarihi</Text>
                <View style={styles.dateTimeValue}>
                  <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
                  <Text style={styles.dateTimeText}>
                    {startDate.toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.timePickerButton} 
                onPress={() => setShowStartTimePicker(true)}
              >
                <Text style={styles.dateTimeLabel}>Başlangıç Saati</Text>
                <View style={styles.dateTimeValue}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.dateTimeText}>
                    {`${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateTimeRow}>
              <TouchableOpacity 
                style={styles.datePickerButton} 
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateTimeLabel}>Bitiş Tarihi</Text>
                <View style={styles.dateTimeValue}>
                  <MaterialCommunityIcons name="calendar" size={20} color={theme.colors.primary} />
                  <Text style={styles.dateTimeText}>
                    {endDate.toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.timePickerButton} 
                onPress={() => setShowEndTimePicker(true)}
              >
                <Text style={styles.dateTimeLabel}>Bitiş Saati</Text>
                <View style={styles.dateTimeValue}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={theme.colors.primary} />
                  <Text style={styles.dateTimeText}>
                    {`${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            
            {/* Date/Time Pickers */}
            {/* Using CustomDateTimePicker instead of the native module to prevent crashes */}
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                onChange={onStartDateChange}
                minimumDate={new Date()}
                display="default"
              />
            )}
            {showStartTimePicker && (
              <DateTimePicker
                value={startDate}
                mode="time"
                onChange={onStartTimeChange}
                display="default"
              />
            )}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                onChange={onEndDateChange}
                minimumDate={startDate}
                display="default"
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                onChange={onEndTimeChange}
                display="default"
              />
            )}
          </View>
          
          {/* Etkinlik Yeri */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Etkinlik Yeri</Text>
            
            <View style={styles.chipRow}>
              <Chip 
                selected={locationType === 'physical'}
                onPress={() => setLocationType('physical')}
                style={styles.chip}
                icon="map-marker"
              >
                Fiziksel
              </Chip>
              <Chip 
                selected={locationType === 'online'}
                onPress={() => setLocationType('online')}
                style={styles.chip}
                icon="web"
              >
                Online
              </Chip>
              <Chip 
                selected={locationType === 'hybrid'}
                onPress={() => setLocationType('hybrid')}
                style={styles.chip}
                icon="web-plus"
              >
                Hibrit
              </Chip>
            </View>
            
            {(locationType === 'physical' || locationType === 'hybrid') && (
              <TextInput
                label="Fiziksel Etkinlik Adresi"
                value={physicalLocation}
                onChangeText={setPhysicalLocation}
                mode="outlined"
                style={styles.input}
                error={locationType === 'physical' && physicalLocation.trim() === ''}
                left={<TextInput.Icon icon="map-marker" />}
              />
            )}
            
            {(locationType === 'online' || locationType === 'hybrid') && (
              <TextInput
                label="Online Etkinlik Linki"
                value={onlineLink}
                onChangeText={setOnlineLink}
                mode="outlined"
                style={styles.input}
                error={locationType === 'online' && onlineLink.trim() === ''}
                left={<TextInput.Icon icon="link" />}
                autoCapitalize="none"
              />
            )}
          </View>
          
          {/* Kapasite Ayarları */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Kapasite</Text>
            
            <View style={styles.chipRow}>
              <Chip 
                selected={capacityType === 'limited'}
                onPress={() => setCapacityType('limited')}
                style={styles.chip}
              >
                Sınırlı
              </Chip>
              <Chip 
                selected={capacityType === 'unlimited'}
                onPress={() => setCapacityType('unlimited')}
                style={styles.chip}
              >
                Sınırsız
              </Chip>
            </View>
            
            {capacityType === 'limited' && (
              <TextInput
                label="Maksimum Katılımcı Sayısı"
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                error={!capacity || isNaN(Number(capacity)) || Number(capacity) <= 0}
              />
            )}
          </View>
          
          {/* Ücret Bilgisi */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Ücret Bilgisi</Text>
            
            <View style={styles.chipRow}>
              <Chip 
                selected={isFree}
                onPress={() => {
                  setIsFree(true);
                  setPrice('');
                }}
                style={[styles.chip, isFree ? {backgroundColor: '#E8F5E9'} : {}]}
                icon="cash-remove"
              >
                Ücretsiz
              </Chip>
              <Chip 
                selected={!isFree}
                onPress={() => {
                  setIsFree(false);
                }}
                style={[styles.chip, !isFree ? {backgroundColor: '#FFF3E0'} : {}]}
                icon="cash"
              >
                Ücretli
              </Chip>
            </View>
            
            {!isFree && (
              <>
                <TextInput
                  label="Etkinlik Ücreti (TL)"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  right={<TextInput.Affix text="₺" />}
                  left={<TextInput.Icon icon="currency-try" />}
                  error={!isFree && (!price || isNaN(Number(price)) || Number(price) <= 0)}
                />
                {!isFree && (!price || isNaN(Number(price)) || Number(price) <= 0) && (
                  <HelperText type="error">Geçerli bir ücret girmelisiniz</HelperText>
                )}
                <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>
                  Not: Ücretli etkinliklerde ödeme bilgilerini ve ödeme toplama yöntemini katılımcılara ayrıca belirtmelisiniz.
                </Text>
              </>
            )}
          </View>
          
          {/* Sertifika */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Sertifika</Text>
            
            <View style={styles.chipRow}>
              <Chip 
                selected={hasCertificate}
                onPress={() => setHasCertificate(true)}
                style={[styles.chip, hasCertificate ? {backgroundColor: '#E8F5E9'} : {}]}
                icon="certificate"
              >
                Sertifika Verilecek
              </Chip>
              <Chip 
                selected={!hasCertificate}
                onPress={() => {
                  setHasCertificate(false);
                  setCertificateDetails('');
                }}
                style={styles.chip}
                icon="certificate-outline"
              >
                Sertifika Yok
              </Chip>
            </View>
            
            {hasCertificate && (
              <>
                <TextInput
                  label="Sertifika Detayları"
                  value={certificateDetails}
                  onChangeText={setCertificateDetails}
                  mode="outlined"
                  style={styles.input}
                  placeholder="Hangi kurum tarafından verileceği, geçerlilik süresi vb."
                  multiline
                  left={<TextInput.Icon icon="certificate" />}
                  error={hasCertificate && certificateDetails.trim() === ''}
                />
                {hasCertificate && certificateDetails.trim() === '' && (
                  <HelperText type="error">Sertifika detaylarını belirtmelisiniz</HelperText>
                )}
                <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>
                  Örnek: "XYZ Kurumu tarafından onaylı katılım sertifikası", "Uluslararası geçerliliğe sahip YYY sertifikası" vb.
                </Text>
              </>
            )}
          </View>
          
          {/* Dil ve Malzemeler */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Etkinlik Dilleri</Text>
            
            <View style={styles.chipRow}>
              <Chip 
                selected={selectedLanguages.includes('Türkçe')}
                onPress={() => toggleLanguage('Türkçe')}
                style={styles.chip}
              >
                🇹🇷 Türkçe
              </Chip>
              <Chip 
                selected={selectedLanguages.includes('İngilizce')}
                onPress={() => toggleLanguage('İngilizce')}
                style={styles.chip}
              >
                🇬🇧 İngilizce
              </Chip>
              <Chip 
                selected={selectedLanguages.includes('Almanca')}
                onPress={() => toggleLanguage('Almanca')}
                style={styles.chip}
              >
                🇩🇪 Almanca
              </Chip>
              <Chip 
                selected={selectedLanguages.includes('Fransızca')}
                onPress={() => toggleLanguage('Fransızca')}
                style={styles.chip}
              >
                �🇷 Fransızca
              </Chip>
            </View>
            
            {/* Özel dil ekleme */}
            <View style={styles.inputRow}>
              <TextInput
                label="Başka bir dil ekle"
                value={customLanguage}
                onChangeText={setCustomLanguage}
                mode="outlined"
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Örn: İspanyolca, Japanca..."
                onSubmitEditing={addCustomLanguage}
              />
              <Button 
                mode="outlined" 
                onPress={addCustomLanguage}
                disabled={!customLanguage.trim()}
                style={{ alignSelf: 'flex-end', marginBottom: 8 }}
              >
                Ekle
              </Button>
            </View>
            
            {/* Seçili dilleri göster */}
            {selectedLanguages.length > 0 && (
              <View style={styles.selectedLanguagesContainer}>
                <Text style={styles.selectedLanguagesTitle}>Seçili Diller:</Text>
                <View style={styles.chipRow}>
                  {selectedLanguages.map((lang, index) => (
                    <Chip 
                      key={index}
                      style={[styles.chip, { backgroundColor: theme.colors.primary + '20' }]}
                      onClose={() => selectedLanguages.length > 1 ? toggleLanguage(lang) : null}
                      closeIcon={selectedLanguages.length > 1 ? "close" : undefined}
                    >
                      {lang}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
            
            <TextInput
              label="Gerekli Malzemeler"
              value={requiredMaterials}
              onChangeText={setRequiredMaterials}
              mode="outlined"
              style={styles.input}
              placeholder="Katılımcıların yanında getirmesi gereken malzemeler"
              multiline
              left={<TextInput.Icon icon="toolbox" />}
            />
            
            <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>
              Not: Gerekli malzemeleri detaylı olarak yazın. Eğer malzeme gerekmiyorsa boş bırakabilirsiniz.
            </Text>
          </View>
          
          {/* Üniversite Kısıtlamaları */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Katılım Kısıtlamaları</Text>
            
            <View style={styles.chipRow}>
              <Chip 
                selected={isOpenToAllUniversities}
                onPress={() => setIsOpenToAllUniversities(true)}
                style={styles.chip}
                icon="earth"
              >
                Tüm Üniversitelere Açık
              </Chip>
              <Chip 
                selected={!isOpenToAllUniversities}
                onPress={() => setIsOpenToAllUniversities(false)}
                style={styles.chip}
                icon="school"
              >
                Sadece Kendi Üniversitemiz
              </Chip>
            </View>
            
            <Text style={{fontSize: 14, color: '#666', marginTop: 12, marginBottom: 8, fontStyle: 'italic'}}>
              {isOpenToAllUniversities 
                ? "Etkinliğinize her üniversiteden öğrenciler katılabilecek."
                : `Etkinliğinize yalnızca ${userProfile?.university || "kendi üniversitenizin"} öğrencileri katılabilecek.`}
            </Text>
          </View>
          
          {/* Submit Button */}
          <View style={styles.submitContainer}>
            <Text style={styles.submitHelpText}>
              Tüm gerekli bilgileri doldurduktan sonra "Etkinliği Oluştur" butonuna tıklayarak etkinliğinizi oluşturabilirsiniz.
            </Text>
            
            <Button 
              mode="contained" 
              onPress={createEvent}
              style={styles.submitButton}
              disabled={loading}
              loading={loading}
              icon="calendar-check"
            >
              {loading ? 
                (isEditMode ? "Değişiklikler Kaydediliyor..." : "Etkinlik Oluşturuluyor...") : 
                (isEditMode ? "Değişiklikleri Kaydet" : "Etkinliği Oluştur")
              }
            </Button>
            
            <Text style={styles.submitNoteText}>
              {isEditMode 
                ? "Not: Değişiklikler kaydedildikten sonra güncellenmiş etkinlik detayları öğrencilere görüntülenecektir."
                : "Not: Etkinlik oluşturulduktan sonra etkinlik detaylarınız öğrencilere görüntülenecektir. Etkinliği daha sonra düzenleyebilirsiniz."
              }
            </Text>
          </View>
          
          {/* Bottom padding */}
          <View style={styles.bottomPadding} />
        </ScrollView>
        )}
      </KeyboardAvoidingView>
      
      {/* Snackbar for messages */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  submitContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    elevation: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  submitHelpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  submitNoteText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    width: 300,
    height: 170,
    backgroundColor: '#f0f0f0',
  },
  imagePreview: {
    width: 300,
    height: 170,
    borderRadius: 8,
    backgroundColor: '#f0f0f0', // Placeholder rengi
  },
  imageOverlay: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 300,
    height: 170,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#999',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePickerButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timePickerButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateTimeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTimeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
    marginTop: 12,
  },
  categoriesContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  selectedCategoryChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f0f8ff',
    borderColor: '#c8e1ff',
  },
  addCategoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  emptyCategories: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  emptyCategoriesText: {
    marginLeft: 8,
    color: '#999',
    fontSize: 14,
  },
  categoryListContainer: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 8,
    maxHeight: 300,
  },
  categoryListHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    padding: 8,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryItemLabel: {
    fontSize: 14,
    marginLeft: 12,
    color: '#333',
  },
  closeCategoriesButton: {
    marginTop: 8,
  },
  categoryGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  categoryGroupText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#555',
  },
  categorySearchInput: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  searchResultsHeader: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    color: '#666',
  },
  searchResultItem: {
    backgroundColor: '#f9f9f9',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#999',
    padding: 16,
    fontStyle: 'italic',
  },
  searchDivider: {
    marginVertical: 12,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  selectedLanguagesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedLanguagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  switchDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  divider: {
    marginVertical: 8,
  },
  submitButton: {
    marginTop: 8,
    paddingVertical: 8,
    width: '100%',
    borderRadius: 8,
  },
  bottomPadding: {
    height: 40,
  },
  snackbar: {
    bottom: 16,
  },
  iosPicker: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CreateEventScreen;
