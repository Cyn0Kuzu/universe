import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getFirebaseCompatSync } from '../firebase/compat';
import { useTheme } from 'react-native-paper';
import { eventCategories } from '../constants';
import StudentEventCard from './StudentEventCard';

interface UpcomingEventsListProps {
  clubId: string | undefined;
}

const firebase = getFirebaseCompatSync();

const UpcomingEventsList: React.FC<UpcomingEventsListProps> = ({ clubId }) => {
  interface Event {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    formattedDate: string;
    formattedTime: string;
    location?: {
      physicalAddress?: string;
      onlineLink?: string;
    };
    [key: string]: any;
  }
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    if (!clubId) {
      setLoading(false);
      return;
    }

    const fetchUpcomingEvents = async () => {
      try {
        // Şu anki tarihi al
        const now = new Date();
        
        // Firestore'dan kulübün yaklaşan (7 gün içinde) etkinliklerini çek (en fazla 3 tane)
        const eventsRef = getFirebaseCompatSync().firestore().collection('events');
        const nowTs = firebase.firestore.Timestamp.fromDate(new Date());
        const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const sevenDaysTs = firebase.firestore.Timestamp.fromDate(sevenDaysLater);
        const query = eventsRef
          .where('clubId', '==', clubId)
          .where('startDate', '>=', nowTs)
          .where('startDate', '<=', sevenDaysTs)
          .orderBy('startDate', 'asc')
          .limit(3);
        
        let snapshot;
        try {
          snapshot = await query.get();
        } catch (queryError) {
          console.error('Etkinlik sorgusu için index hatası:', queryError);
          if (queryError instanceof Error && queryError.message.includes('requires an index')) {
            console.warn('Bu sorgu için bir Firestore indeksi gerekiyor. firestore.indexes.json dosyasını kontrol edin.');
          }
          throw queryError;
        }
        
        if (snapshot.empty) {
          setEvents([]);
          setLoading(false);
          return;
        }
        
        const eventsList: Event[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          // Timestamp'leri Date nesnesine dönüştürme
          const startDate = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
          const endDate = data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate);
          
          return {
            id: doc.id,
            ...data,
            startDate,
            endDate,
            title: data.title || 'İsimsiz Etkinlik',
            formattedDate: startDate.toLocaleDateString('tr-TR'),
            formattedTime: `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`
          };
        });
        
        setEvents(eventsList);
      } catch (error) {
        console.error('Etkinlikler yüklenirken hata oluştu:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUpcomingEvents();
  }, [clubId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Etkinlikler yükleniyor...</Text>
      </View>
    );
  }
  
  if (events.length === 0) {
    return (
      <View style={styles.noEventsContainer}>
        <MaterialCommunityIcons name="calendar-blank" size={50} color="#CCCCCC" />
        <Text style={styles.noEventsText}>Henüz planlanmış etkinlik bulunmuyor</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.eventsContainer}>
      {events.map(event => (
        <StudentEventCard key={event.id} event={event} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  eventsContainer: {
    marginTop: 6,
  },
  eventCard: {
    marginBottom: 8,
  },
  noEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  noEventsText: {
    marginTop: 8,
    color: '#999',
    fontSize: 13,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#999',
    fontSize: 13,
  },
});

export default UpcomingEventsList;
