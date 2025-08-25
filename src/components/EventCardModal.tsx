import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { Modal, Portal, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { firebase } from '../firebase';
import StudentEventCard from './StudentEventCard';

const { height } = Dimensions.get('window');

interface EventCardModalProps {
  visible: boolean;
  onDismiss: () => void;
  eventId?: string;
}

// Normalize Firestore event to StudentEventCard shape
function normalizeEvent(data: any, id: string) {
  // Convert timestamps to Date
  const toDate = (v: any) => (v?.toDate ? v.toDate() : (v ? new Date(v) : undefined));
  const startDate = toDate(data?.startDate) || new Date();
  const endDate = toDate(data?.endDate) || new Date(startDate.getTime() + 60 * 60 * 1000);

  // Pick cover image
  const coverCandidates: any[] = [
    data?.imageUrl,
    data?.coverImageUrl,
    data?.coverImage,
    data?.image,
    Array.isArray(data?.images) ? data.images[0] : undefined,
    data?.photoUrl,
    data?.bannerUrl,
    data?.headerImage,
    data?.thumbnail,
  ];
  const cover = coverCandidates.find((u: any) => typeof u === 'string' && u?.trim());

  return {
    id,
    title: data?.title || data?.name || 'Etkinlik',
    description: data?.description || '',
    startDate,
    endDate,
    location: data?.location || data?.venue || undefined,
    imageUrl: cover || null,
    categories: data?.categories || (data?.category ? [data.category] : []),
    tags: data?.tags || [],
    university: data?.university,
    universityName: data?.universityName,
    department: data?.department,
    organizer: data?.organizer || undefined,
    organizerName: data?.organizerName,
    isFree: data?.isFree,
    price: data?.price,
    currency: data?.currency,
    earlyBirdPrice: data?.earlyBirdPrice,
    earlyBirdDeadline: data?.earlyBirdDeadline,
    studentDiscount: data?.studentDiscount,
    capacity: data?.capacity,
    attendeesCount: data?.attendeesCount || data?.participantCount,
    minAttendees: data?.minAttendees,
    maxAttendees: data?.maxAttendees,
    waitlistEnabled: data?.waitlistEnabled,
    waitlistCount: data?.waitlistCount,
    registrationDeadline: data?.registrationDeadline,
    registrationStartDate: data?.registrationStartDate,
    contactEmail: data?.contactEmail,
    contactPhone: data?.contactPhone,
    websiteUrl: data?.websiteUrl,
    socialMediaLinks: data?.socialMediaLinks,
    language: data?.language,
    requiredMaterials: data?.requiredMaterials,
    prerequisites: data?.prerequisites,
    targetAudience: data?.targetAudience,
    skillLevel: data?.skillLevel,
    ageRestriction: data?.ageRestriction,
    dresscode: data?.dresscode,
    difficulty: data?.difficulty,
    duration: data?.duration,
    hasCertificate: data?.hasCertificate,
    certificateTemplate: data?.certificateTemplate,
    isRecurring: data?.isRecurring,
    recurringType: data?.recurringType,
    recurringEndDate: data?.recurringEndDate,
    allowsGuestSpeakers: data?.allowsGuestSpeakers,
    providesFood: data?.providesFood,
    recordingAllowed: data?.recordingAllowed,
    liveStreamingAvailable: data?.liveStreamingAvailable,
    liveStreamUrl: data?.liveStreamUrl,
    hasParking: data?.hasParking,
    accessibilityFeatures: data?.accessibilityFeatures,
    weatherDependent: data?.weatherDependent,
    isPublic: data?.isPublic,
    requiresApproval: data?.requiresApproval,
    inviteOnly: data?.inviteOnly,
    accessCode: data?.accessCode,
    allowGuests: data?.allowGuests,
    likeCount: data?.likeCount,
    dislikeCount: data?.dislikeCount,
    commentCount: data?.commentCount,
    shareCount: data?.shareCount,
    viewsCount: data?.viewsCount,
    likesCount: data?.likesCount,
    commentsCount: data?.commentsCount,
    sharesCount: data?.sharesCount,
    eventType: data?.eventType,
    eventFormat: data?.eventFormat,
    collaborators: data?.collaborators,
    sponsoredBy: data?.sponsoredBy,
    relatedEvents: data?.relatedEvents,
    cancellationPolicy: data?.cancellationPolicy,
    refundPolicy: data?.refundPolicy,
    createdAt: data?.createdAt,
    updatedAt: data?.updatedAt,
    createdBy: data?.createdBy,
    lastModifiedBy: data?.lastModifiedBy,
    status: data?.status,
    cancellationReason: data?.cancellationReason,
    notes: data?.notes,
    internalNotes: data?.internalNotes,
    visibility: data?.visibility,
    settings: data?.settings,
    pricing: data?.pricing,
    certificate: data?.certificate,
    universityRestrictions: data?.universityRestrictions,
    clubId: data?.clubId,
    clubName: data?.clubName,
    creatorType: data?.creatorType,
    restrictionInfo: data?.restrictionInfo,
  };
}

const EventCardModal: React.FC<EventCardModalProps> = ({ visible, onDismiss, eventId }) => {
  const [loading, setLoading] = useState<boolean>(!!eventId);
  const [event, setEvent] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        unsub = firebase.firestore().collection('events').doc(eventId).onSnapshot(
          (doc) => {
            if (doc.exists) {
              const data = doc.data() || {};
              setEvent(normalizeEvent(data, doc.id));
              setError(null);
            } else {
              setError('Etkinlik bulunamadı');
            }
            setLoading(false);
          },
          (err) => {
            setError(err?.message || 'Etkinlik yüklenemedi');
            setLoading(false);
          }
        );
      } catch (e: any) {
        setError(e?.message || 'Etkinlik yüklenemedi');
        setLoading(false);
      }
    };
    fetchEvent();
    return () => { unsub?.(); };
  }, [eventId]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContainer}>
        <Surface style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Etkinlik</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#666" />
            </TouchableOpacity>
          </View>
          {loading && (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          )}
          {!loading && error && (
            <View style={styles.center}>
              <Text>{error}</Text>
            </View>
          )}
          {!loading && !error && event && (
            <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
              <StudentEventCard event={event} />
            </ScrollView>
          )}
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
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: height * 0.92,
    margin: 16,
    flex: 1
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600'
  },
  closeBtn: {
    padding: 6
  },
  center: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

export default EventCardModal;
