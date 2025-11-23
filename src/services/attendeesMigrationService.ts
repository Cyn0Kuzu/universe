/**
 * Katılımcı verilerini global collection'dan subcollection'a migration
 */
import type firebaseType from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { getFirebaseCompatSync } from '../firebase/compat';

const firebase = getFirebaseCompatSync() as typeof firebaseType;
const firestore = getFirebaseCompatSync().firestore();

export class AttendeesMigrationService {
  /**
   * Global eventAttendees collection'daki verileri events subcollection'a kopyala
   */
  static async migrateAttendeesToSubcollections(): Promise<void> {
    try {
      console.log('🔄 Starting attendees migration to subcollections...');

      // Tüm eventAttendees verilerini al
      const attendeesSnapshot = await firestore.collection('eventAttendees').get();
      
      console.log(`📊 Found ${attendeesSnapshot.size} attendee records to migrate`);

      let migratedCount = 0;
      let errorCount = 0;

      // Her bir attendee kaydını subcollection'a kopyala
      for (const doc of attendeesSnapshot.docs) {
        try {
          const attendeeData = doc.data();
          const { userId, eventId } = attendeeData;

          if (!userId || !eventId) {
            console.warn(`⚠️ Skipping invalid attendee record: ${doc.id}`);
            errorCount++;
            continue;
          }

          // Kullanıcı bilgilerini al
          let userData = null;
          try {
            const userDoc = await firestore.collection('users').doc(userId).get();
            userData = userDoc.data();
          } catch (userError) {
            console.warn(`⚠️ Could not fetch user data for ${userId}:`, userError);
          }

          // Subcollection'a ekle
          const subcollectionData = {
            ...attendeeData,
            userName: userData?.displayName || userData?.firstName || 'Kullanıcı',
            userEmail: userData?.email || '',
            userAvatar: userData?.profileImage || null,
            migratedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
          };

          await firestore
            .collection('events')
            .doc(eventId)
            .collection('attendees')
            .doc(userId)
            .set(subcollectionData, { merge: true });

          migratedCount++;
          
          if (migratedCount % 10 === 0) {
            console.log(`📊 Migration progress: ${migratedCount}/${attendeesSnapshot.size}`);
          }

        } catch (recordError) {
          console.error(`❌ Error migrating record ${doc.id}:`, recordError);
          errorCount++;
        }
      }

      console.log(`✅ Migration completed! Migrated: ${migratedCount}, Errors: ${errorCount}`);

    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }

  /**
   * Belirli bir etkinlik için katılımcıları kontrol et ve eksik olanları kopyala
   */
  static async syncEventAttendees(eventId: string): Promise<void> {
    try {
      console.log(`🔄 Syncing attendees for event: ${eventId}`);

      // Global collection'dan bu etkinliğin katılımcılarını al
      const globalAttendeesSnapshot = await firestore
        .collection('eventAttendees')
        .where('eventId', '==', eventId)
        .get();

      // Subcollection'dan mevcut katılımcıları al
      const subcollectionSnapshot = await firestore
        .collection('events')
        .doc(eventId)
        .collection('attendees')
        .get();

      const subcollectionUserIds = new Set(subcollectionSnapshot.docs.map(doc => doc.id));

      let syncedCount = 0;

      // Eksik katılımcıları subcollection'a ekle
      for (const doc of globalAttendeesSnapshot.docs) {
        const attendeeData = doc.data();
        const { userId } = attendeeData;

        if (!subcollectionUserIds.has(userId)) {
          // Kullanıcı bilgilerini al
          let userData = null;
          try {
            const userDoc = await firestore.collection('users').doc(userId).get();
            userData = userDoc.data();
          } catch (userError) {
            console.warn(`⚠️ Could not fetch user data for ${userId}:`, userError);
          }

          const subcollectionData = {
            ...attendeeData,
            userName: userData?.displayName || userData?.firstName || 'Kullanıcı',
            userEmail: userData?.email || '',
            userAvatar: userData?.profileImage || null,
            syncedAt: getFirebaseCompatSync().firestore.FieldValue.serverTimestamp()
          };

          await firestore
            .collection('events')
            .doc(eventId)
            .collection('attendees')
            .doc(userId)
            .set(subcollectionData);

          syncedCount++;
        }
      }

      console.log(`✅ Synced ${syncedCount} attendees for event ${eventId}`);

    } catch (error) {
      console.error(`❌ Failed to sync attendees for event ${eventId}:`, error);
    }
  }

  /**
   * Etkinlik sayılarını kontrol et ve düzelt
   */
  static async validateEventCounts(): Promise<void> {
    try {
      console.log('🔍 Validating event attendee counts...');

      const eventsSnapshot = await firestore.collection('events').get();
      
      for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;

        // Subcollection'daki gerçek sayıyı al
        const attendeesSnapshot = await firestore
          .collection('events')
          .doc(eventId)
          .collection('attendees')
          .get();

        const actualCount = attendeesSnapshot.size;
        const recordedCount = eventData.attendeesCount || 0;

        if (actualCount !== recordedCount) {
          console.log(`🔧 Fixing count for event ${eventId}: ${recordedCount} -> ${actualCount}`);
          
          await firestore.collection('events').doc(eventId).update({
            attendeesCount: actualCount
          });
        }
      }

      console.log('✅ Event count validation completed');

    } catch (error) {
      console.error('❌ Event count validation failed:', error);
    }
  }
}

export default AttendeesMigrationService;
