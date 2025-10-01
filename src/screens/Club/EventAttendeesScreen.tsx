import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Card, Text, Button, Avatar, Menu, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { firebase } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { UniversalAvatar } from '../../components/common';

type Attendee = {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  username?: string;
  university?: string;
  profileImage?: string | null;
  avatarIcon?: string | null;
  avatarColor?: string | null;
};

const EventAttendeesScreen = ({ route, navigation }: any) => {
  const { eventId, eventName } = route.params;
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState<Attendee | null>(null);
  const { currentUser } = useAuth();
  const db = firebase.firestore();

  useEffect(() => {
    fetchAttendees();
  }, []);

  const fetchAttendees = async () => {
    try {
      setLoading(true);
      console.log('🔍 EventAttendeesScreen: Fetching attendees for event:', eventId);
      
      let attendeesList: Attendee[] = [];
      
      // Method 1: Get attendees from event document's attendees array (PRIMARY)
      try {
        console.log('📊 Method 1: Trying event document attendees array...');
        const eventDoc = await db.collection('events').doc(eventId).get();
        
        if (eventDoc.exists) {
          const eventData = eventDoc.data();
          const attendeesArray = eventData?.attendees || [];
          console.log('✅ Method 1: Found attendees array with', attendeesArray.length, 'user IDs');
          
          if (attendeesArray.length > 0) {
            // Fetch user details for each attendee
            const userPromises = attendeesArray.map((userId: string) => 
              db.collection('users').doc(userId).get()
            );
            
            const userDocs = await Promise.all(userPromises);
            attendeesList = userDocs
              .filter(doc => doc.exists)
              .map(doc => ({
                id: doc.id,
                name: doc.data()?.displayName || doc.data()?.firstName + ' ' + doc.data()?.lastName || 'İsimsiz Kullanıcı',
                email: doc.data()?.email || '',
                photoURL: doc.data()?.photoURL || null,
              }));
            
            console.log('✅ Method 1: Successfully loaded', attendeesList.length, 'attendees from event document');
          }
        } else {
          console.log('⚠️ Method 1: Event document not found');
        }
      } catch (eventDocError) {
        console.log('❌ Method 1: Event document failed:', (eventDocError as Error).message || eventDocError);
      }
      
      // Method 2: Try eventAttendees collection (FALLBACK)
      if (attendeesList.length === 0) {
        try {
          console.log('📊 Method 2: Trying eventAttendees collection...');
          const eventAttendeesQuery = db.collection('eventAttendees').where('eventId', '==', eventId);
          const eventAttendeesSnapshot = await eventAttendeesQuery.get();
          
          if (!eventAttendeesSnapshot.empty) {
            console.log('✅ Method 2: Found', eventAttendeesSnapshot.docs.length, 'records in eventAttendees');
            // eventAttendees koleksiyonundan kullanıcı ID'lerini al
            const userIds = eventAttendeesSnapshot.docs.map(doc => doc.data().userId);
            
            if (userIds.length > 0) {
              // Batch olarak kullanıcı bilgilerini al
              const userPromises = userIds.map(userId => 
                db.collection('users').doc(userId).get()
              );
              
              const userDocs = await Promise.all(userPromises);
              attendeesList = userDocs
                .filter(doc => doc.exists)
                .map(doc => ({
                  id: doc.id,
                  name: doc.data()?.displayName || doc.data()?.firstName + ' ' + doc.data()?.lastName || 'İsimsiz Kullanıcı',
                  email: doc.data()?.email || '',
                  photoURL: doc.data()?.photoURL || null,
                }));
              
              console.log('✅ Method 2: Successfully loaded', attendeesList.length, 'attendees');
            }
          } else {
            console.log('⚠️ Method 2: eventAttendees collection is empty, trying next method...');
          }
        } catch (eventAttendeesError) {
          console.log('❌ Method 2: eventAttendees collection failed:', (eventAttendeesError as Error).message || eventAttendeesError);
        }
      }
      
      // Method 3: Try events/{eventId}/attendees subcollection (FALLBACK)
      if (attendeesList.length === 0) {
        try {
          console.log('📊 Method 3: Trying events/{eventId}/attendees subcollection...');
          const attendeesSubcollectionQuery = db.collection('events').doc(eventId).collection('attendees');
          const attendeesSnapshot = await attendeesSubcollectionQuery.get();
          
          if (!attendeesSnapshot.empty) {
            console.log('✅ Method 3: Found', attendeesSnapshot.docs.length, 'records in subcollection');
            const userIds = attendeesSnapshot.docs.map(doc => doc.id);
            
            if (userIds.length > 0) {
              const userPromises = userIds.map(userId => 
                db.collection('users').doc(userId).get()
              );
              
              const userDocs = await Promise.all(userPromises);
              attendeesList = userDocs
                .filter(doc => doc.exists)
                .map(doc => ({
                  id: doc.id,
                  name: doc.data()?.displayName || doc.data()?.firstName + ' ' + doc.data()?.lastName || 'İsimsiz Kullanıcı',
                  email: doc.data()?.email || '',
                  photoURL: doc.data()?.photoURL || null,
                }));
              
              console.log('✅ Method 3: Successfully loaded', attendeesList.length, 'attendees');
            }
          } else {
            console.log('⚠️ Method 3: subcollection is empty, trying next method...');
          }
        } catch (subcollectionError) {
          console.log('❌ Method 3: subcollection failed:', (subcollectionError as Error).message || subcollectionError);
        }
      }
      
      // Method 4: Try attendingEvents field (LAST RESORT - expected to fail with permissions)
      if (attendeesList.length === 0) {
        try {
          console.log('📊 Method 4: Trying legacy attendingEvents field (permission error expected)...');
          const attendeesQuery = db.collection('users')
            .where('attendingEvents', 'array-contains', eventId);
          
          const attendeesSnapshot = await attendeesQuery.get();
          attendeesList = attendeesSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            name: doc.data().displayName || doc.data().firstName + ' ' + doc.data().lastName || 'İsimsiz Kullanıcı',
            email: doc.data().email || '',
            photoURL: doc.data().photoURL || null,
          }));
          
          console.log('✅ Method 4: Successfully loaded', attendeesList.length, 'attendees');
        } catch (attendingEventsError) {
          console.log('ℹ️ Method 4: attendingEvents field failed (this is expected):', (attendingEventsError as Error).message || attendingEventsError);
        }
      }
      
      console.log('🎯 Final result: Loaded', attendeesList.length, 'total attendees');
      setAttendees(attendeesList);
      setLoading(false);
    } catch (error) {
      console.error('💥 Critical error fetching attendees:', error);
      Alert.alert('Hata', 'Katılımcılar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      setLoading(false);
    }
  };

  const removeAttendee = async (attendeeId: string) => {
    try {
      // Remove from event's attendees array
      const eventRef = db.collection('events').doc(eventId);
      await eventRef.update({
        attendees: firebase.firestore.FieldValue.arrayRemove(attendeeId),
        attendeesCount: firebase.firestore.FieldValue.increment(-1)
      });

      // Remove from user's attending list
      const userDocRef = db.collection('users').doc(attendeeId);
      await userDocRef.update({
        joinedEvents: firebase.firestore.FieldValue.arrayRemove(eventId)
      });

      // Remove from eventAttendees collection
      try {
        await db.collection('eventAttendees').doc(`${eventId}_${attendeeId}`).delete();
      } catch (error) {
        console.warn('eventAttendees koleksiyonundan çıkarılamadı:', error);
      }

      // Remove from events/{eventId}/attendees subcollection
      try {
        await db.collection('events').doc(eventId).collection('attendees').doc(attendeeId).delete();
      } catch (error) {
        console.warn('attendees alt koleksiyonundan çıkarılamadı:', error);
      }

      // Update local state
      setAttendees(currentAttendees => 
        currentAttendees.filter(attendee => attendee.id !== attendeeId)
      );

      Alert.alert('Başarılı', 'Katılımcı etkinlikten çıkarıldı');
    } catch (error) {
      console.error('Katılımcı çıkarma hatası:', error);
      Alert.alert('Hata', 'Katılımcı çıkarılamadı');
    }
  };

  const handleMenuOpen = (attendee: Attendee) => {
    setSelectedAttendee(attendee);
    setMenuVisible(true);
  };

  const filteredAttendees = attendees.filter(attendee => {
    if (viewType === 'all') return true;
    // Additional filtering options can be added here based on viewType
    return true;
  });

  const renderAttendee = ({ item }: { item: Attendee }) => (
    <View>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.attendeeInfo}>
            <UniversalAvatar 
              user={{
                id: item.id,
                name: item.name,
                profileImage: item.profileImage,
                avatarIcon: item.avatarIcon,
                avatarColor: item.avatarColor
              }}
              size={40}
              style={styles.avatar}
              fallbackIcon="account"
              fallbackColor="#3498db"
            />
            <TouchableOpacity 
              style={styles.textContainer}
              onPress={() => navigation.navigate('ViewProfile', { userId: item.id })}
            >
              <Text style={styles.nameText}>{item.name}</Text>
              {item.username && <Text style={styles.usernameText}>@{item.username}</Text>}
              <Text style={styles.emailText}>{item.email}</Text>
              {item.university && <Text style={styles.universityText}>{item.university}</Text>}
            </TouchableOpacity>
          </View>
          <Button
            icon="dots-vertical"
            onPress={() => handleMenuOpen(item)}
          >
            Seçenekler
          </Button>
        </Card.Content>
      </Card>
      
      {selectedAttendee?.id === item.id && (
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          contentStyle={{ marginTop: -100, marginLeft: 200 }}
          anchor={<View />}
        >
          <Menu.Item 
            icon="account-remove"
            title="Etkinlikten çıkar" 
            onPress={() => {
              setMenuVisible(false);
              Alert.alert(
                'Katılımcıyı Çıkar',
                `${item.name} kişisini bu etkinlikten çıkarmak istediğinizden emin misiniz?`,
                [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Çıkar', onPress: () => removeAttendee(item.id), style: 'destructive' }
                ]
              );
            }} 
          />
          <Menu.Item 
            icon="account"
            title="Profili görüntüle" 
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('ViewProfile', { userId: item.id });
            }} 
          />
        </Menu>
      )}
    </View>
  );

  const renderFilterButtons = () => (
    <View style={styles.filterButtons}>
      <Button 
        mode={viewType === 'all' ? 'contained' : 'outlined'} 
        onPress={() => setViewType('all')}
        style={styles.filterButton}
      >
        Tümü
      </Button>
      <Button 
        mode={viewType === 'checked-in' ? 'contained' : 'outlined'} 
        onPress={() => setViewType('checked-in')}
        style={styles.filterButton}
      >
        Kayıt Yaptıranlar
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Etkinlik Katılımcıları</Text>
        <View style={styles.placeholder} />
      </View>
      
      {renderFilterButtons()}
      
      {loading ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : attendees.length > 0 ? (
        <FlatList
          data={filteredAttendees}
          renderItem={renderAttendee}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text>Bu etkinlik için katılımcı bulunamadı.</Text>
        </View>
      )}
    </SafeAreaView>
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
  filterButtons: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
    backgroundColor: '#3498db',
  },
  textContainer: {
    flex: 1,
  },
  nameText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  usernameText: {
    fontSize: 14,
    color: '#777',
  },
  emailText: {
    fontSize: 12,
    color: '#666',
  },
  universityText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: 50,
  },
});

export default EventAttendeesScreen;
