/**
 * 🗑️ ACCOUNT DELETION SERVICE
 * Kullanıcı hesabını ve tüm verilerini tamamen silen servis
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/storage';

export class AccountDeletionService {
  private static firestore = firebase.firestore();
  private static auth = firebase.auth();
  private static storage = firebase.storage();

  /**
   * 🔍 User ID doğrulama fonksiyonu
   */
  private static isValidUserId(userId: string): boolean {
    return !!(userId && typeof userId === 'string' && userId.trim().length > 0);
  }

  /**
   * 🗑️ Kullanıcı hesabını ve tüm verilerini siler
   */
  static async deleteUserAccount(userId: string, userType: 'student' | 'club'): Promise<void> {
    console.log(`🗑️ Starting account deletion for user: ${userId} (${userType})`);
    
    // User ID doğrulaması
    if (!userId || typeof userId !== 'string' || userId.length < 10) {
      throw new Error(`Invalid user ID: ${userId}`);
    }
    
    try {
      // 1. Firestore koleksiyonlarından kullanıcı verilerini sil
      await this.deleteUserFromFirestore(userId, userType);
      
      // 2. Storage'dan kullanıcı dosyalarını sil
      await this.deleteUserFromStorage(userId);
      
      // 3. Authentication'dan kullanıcıyı sil
      await this.deleteUserFromAuth();
      
      console.log(`✅ Account deletion completed for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Account deletion failed for user: ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 🗑️ Firestore'dan kullanıcı verilerini siler
   */
  private static async deleteUserFromFirestore(userId: string, userType: 'student' | 'club'): Promise<void> {
    console.log(`🗑️ Deleting Firestore data for user: ${userId}`);
    
    // User ID tekrar doğrula
    if (!userId || typeof userId !== 'string') {
      throw new Error(`Invalid userId in deleteUserFromFirestore: ${userId}`);
    }
    
    const batch = this.firestore.batch();

    // Kullanıcı ana dokümanlari
    const collections = [
      'users',
      'userStats', 
      'userScores',
      'userProfiles',
      'userActivities',
      'usernames', // Username rezervasyonu
      'emails'     // Email rezervasyonu
    ];

    // Kulüp ise ek koleksiyonlar
    if (userType === 'club') {
      collections.push(
        'clubs',
        'clubStats',
        'clubScores',
        'clubProfiles',
        'clubActivities',
        'events' // Kulübün oluşturduğu etkinlikler
      );
    }

    // Ana dokümanlari sil
    for (const collection of collections) {
      const docRef = this.firestore.collection(collection).doc(userId);
      batch.delete(docRef);
      console.log(`🗑️ Queued for deletion: ${collection}/${userId}`);
    }

    // Username ve email rezervasyonlarını sil (username/email ile)
    await this.deleteReservations(userId);

    // Alt koleksiyonları sil
    await this.deleteSubcollections(userId, userType);

    // Kullanıcının oluşturduğu/katıldığı içerikleri temizle
    await this.cleanupUserContent(userId, userType);

    // Event cleanup'ı dikkatli şekilde yap
    try {
      await this.cleanupEventData(userId, userType);
    } catch (error) {
      console.warn('⚠️ Event cleanup completed with some warnings (this is normal):', error);
    }

    // Batch'i execute et
    await batch.commit();
    console.log(`✅ Firestore data deleted for user: ${userId}`);
  }

  /**
   * 🗑️ Alt koleksiyonları siler
   */
  private static async deleteSubcollections(userId: string, userType: 'student' | 'club'): Promise<void> {
    const subcollections = [
      'userActivities',
      'notifications',
      'userFollowing', // Takip ettikleri
      'followers',     // Takip edenler
      'eventComments',
      'eventLikes',
      'eventParticipants', // Etkinlik katılımcıları
      'userStats',
      'userScores',
      'activities',    // Genel aktiviteler
      'interactions'   // Etkileşimler
    ];

    if (userType === 'club') {
      subcollections.push(
        'events',
        'clubMemberships', // Kulüp üyelikleri
        'membershipRequests',
        'announcements',
        'clubActivities',
        'clubStats',
        'clubScores',
        'clubInteractions' // Kulüp etkileşimleri
      );
    } else {
      subcollections.push(
        'clubMemberships', // Öğrenci kulüp üyelikleri
        'studentActivities' // Öğrenci aktiviteleri
      );
    }

    for (const subcollection of subcollections) {
      try {
        console.log(`🔍 Processing subcollection: ${subcollection}`);
        // userId ile başlayan kayıtları bul
        const queries = [
          this.firestore.collection(subcollection).where('userId', '==', userId),
          this.firestore.collection(subcollection).where('recipientId', '==', userId),
          this.firestore.collection(subcollection).where('followerId', '==', userId),
          this.firestore.collection(subcollection).where('followingId', '==', userId),
          this.firestore.collection(subcollection).where('authorId', '==', userId),
          this.firestore.collection(subcollection).where('createdBy', '==', userId),
          this.firestore.collection(subcollection).where('ownerId', '==', userId)
        ];

        if (userType === 'club') {
          queries.push(
            this.firestore.collection(subcollection).where('clubId', '==', userId),
            this.firestore.collection(subcollection).where('organizer.id', '==', userId),
            this.firestore.collection(subcollection).where('organizerId', '==', userId)
          );
        }
        
        for (const query of queries) {
          try {
            const snapshot = await query.get();
            
            if (!snapshot.empty) {
              const batch = this.firestore.batch();
              snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
              });
              
              await batch.commit();
              console.log(`🗑️ Deleted ${snapshot.size} documents from ${subcollection}`);
            }
          } catch (queryError: any) {
            // Permission denied hatalarını sessizce geç, diğer hataları logla
            if (queryError.code === 'permission-denied') {
              console.log(`🔒 Permission denied for ${subcollection}, skipping...`);
            } else {
              console.warn(`⚠️ Query failed for ${subcollection}:`, queryError);
            }
          }
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          console.log(`🔒 Permission denied for ${subcollection}, skipping...`);
        } else {
          console.warn(`⚠️ Could not delete from ${subcollection}:`, error);
        }
      }
    }
  }

  /**
   * 🗑️ Kullanıcının oluşturduğu içerikleri temizler
   */
  private static async cleanupUserContent(userId: string, userType: 'student' | 'club'): Promise<void> {
    // Etkinlik yorumlarını sil
    await this.deleteUserComments(userId);
    
    // Takip ilişkilerini sil
    await this.deleteFollowRelationships(userId);
    
    // Kulüp ise etkinlikleri ve üyelikleri sil
    if (userType === 'club') {
      await this.deleteClubEvents(userId);
      await this.deleteClubMemberships(userId);
    } else {
      // Öğrenci ise kulüp üyeliklerini sil
      await this.deleteStudentMemberships(userId);
    }

    // Bildirimleri sil
    await this.deleteUserNotifications(userId);
  }

  /**
   * 🗑️ Kullanıcının yorumlarını siler
   */
  private static async deleteUserComments(userId: string): Promise<void> {
    try {
      // Farklı yorum koleksiyonlarını kontrol et
      const commentCollections = ['comments', 'eventComments', 'userComments'];
      
      for (const collection of commentCollections) {
        try {
          // Collection Group query
          const commentsQuery = this.firestore.collectionGroup(collection).where('userId', '==', userId);
          const commentsSnapshot = await commentsQuery.get();
          
          if (!commentsSnapshot.empty) {
            const batch = this.firestore.batch();
            commentsSnapshot.docs.forEach(doc => {
              batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(`🗑️ Deleted ${commentsSnapshot.size} comments from ${collection}`);
          }
        } catch (error) {
          // Belirli collection için permissions hatası varsa, direct collection'ı dene
          try {
            const directQuery = this.firestore.collection(collection).where('userId', '==', userId);
            const directSnapshot = await directQuery.get();
            
            if (!directSnapshot.empty) {
              const batch = this.firestore.batch();
              directSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
              });
              
              await batch.commit();
              console.log(`🗑️ Deleted ${directSnapshot.size} comments from ${collection} (direct)`);
            }
          } catch (directError) {
            console.warn(`⚠️ Could not delete comments from ${collection}:`, directError);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not delete comments:', error);
    }
  }

  /**
   * 🗑️ Takip ilişkilerini siler
   */
  private static async deleteFollowRelationships(userId: string): Promise<void> {
    try {
      // Kullanıcının takip ettiklerini sil
      const followingQuery = this.firestore.collection('userFollowing').where('followerId', '==', userId);
      const followingSnapshot = await followingQuery.get();
      
      // Kullanıcıyı takip edenleri sil
      const followersQuery = this.firestore.collection('userFollowing').where('followingId', '==', userId);
      const followersSnapshot = await followersQuery.get();
      
      const batch = this.firestore.batch();
      
      followingSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      followersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      if (!followingSnapshot.empty || !followersSnapshot.empty) {
        await batch.commit();
        console.log(`🗑️ Deleted ${followingSnapshot.size + followersSnapshot.size} follow relationships`);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete follow relationships:', error);
    }
  }

  /**
   * 🗑️ Kulübün etkinliklerini siler
   */
  private static async deleteClubEvents(clubId: string): Promise<void> {
    try {
      const eventsQuery = this.firestore.collection('events').where('clubId', '==', clubId);
      const eventsSnapshot = await eventsQuery.get();
      
      const batch = this.firestore.batch();
      eventsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (!eventsSnapshot.empty) {
        await batch.commit();
        console.log(`🗑️ Deleted ${eventsSnapshot.size} club events`);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete club events:', error);
    }
  }

  /**
   * 🗑️ Kulübün üyeliklerini siler
   */
  private static async deleteClubMemberships(clubId: string): Promise<void> {
    try {
      const membershipsQuery = this.firestore.collection('clubMemberships').where('clubId', '==', clubId);
      const membershipsSnapshot = await membershipsQuery.get();
      
      const batch = this.firestore.batch();
      membershipsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (!membershipsSnapshot.empty) {
        await batch.commit();
        console.log(`🗑️ Deleted ${membershipsSnapshot.size} club memberships`);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete club memberships:', error);
    }
  }

  /**
   * 🗑️ Öğrencinin kulüp üyeliklerini siler
   */
  private static async deleteStudentMemberships(userId: string): Promise<void> {
    try {
      const membershipsQuery = this.firestore.collection('clubMemberships').where('userId', '==', userId);
      const membershipsSnapshot = await membershipsQuery.get();
      
      const batch = this.firestore.batch();
      membershipsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (!membershipsSnapshot.empty) {
        await batch.commit();
        console.log(`🗑️ Deleted ${membershipsSnapshot.size} student memberships`);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete student memberships:', error);
    }
  }

  /**
   * 🗑️ Kullanıcının bildirimlerini siler
   */
  private static async deleteUserNotifications(userId: string): Promise<void> {
    try {
      const notificationsQuery = this.firestore.collection('notifications').where('recipientId', '==', userId);
      const notificationsSnapshot = await notificationsQuery.get();
      
      const batch = this.firestore.batch();
      notificationsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (!notificationsSnapshot.empty) {
        await batch.commit();
        console.log(`🗑️ Deleted ${notificationsSnapshot.size} notifications`);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete notifications:', error);
    }
  }

  /**
   * 🗑️ Storage'dan kullanıcı dosyalarını siler
   */
  private static async deleteUserFromStorage(userId: string): Promise<void> {
    console.log(`🗑️ Deleting storage data for user: ${userId}`);
    
    // User ID tekrar doğrula
    if (!userId || typeof userId !== 'string') {
      throw new Error(`Invalid userId in deleteUserFromStorage: ${userId}`);
    }
    
    try {
      // Kullanıcı ile ilgili tüm storage path'lerini kontrol et
      const storagePaths = [
        `users/${userId}`,          // Ana kullanıcı klasörü
        `avatars/${userId}`,        // Avatar resimleri
        `covers/${userId}`,         // Kapak resimleri
        `events/${userId}`,         // Etkinlik resimleri
        `uploads/${userId}`,        // Genel yüklemeler
        `profile-images/${userId}`, // Profil resimleri
        `club-images/${userId}`,    // Kulüp resimleri
        `event-images/${userId}`    // Etkinlik resimleri
      ];

      for (const path of storagePaths) {
        try {
          const folderRef = this.storage.ref(path);
          const items = await folderRef.listAll().catch(() => ({ items: [], prefixes: [] }));
          
          // Dosyaları sil
          if (items.items.length > 0) {
            const deletePromises = items.items.map(item => 
              item.delete().catch(error => 
                console.warn(`⚠️ Could not delete file ${item.name}:`, error)
              )
            );
            await Promise.all(deletePromises);
            console.log(`🗑️ Deleted ${items.items.length} files from ${path}`);
          }
          
          // Alt klasörleri sil
          if (items.prefixes.length > 0) {
            const subfolderPromises = items.prefixes.map(async (prefix) => {
              try {
                const subItems = await prefix.listAll();
                return Promise.all(subItems.items.map(item => 
                  item.delete().catch(error => 
                    console.warn(`⚠️ Could not delete subfolder file ${item.name}:`, error)
                  )
                ));
              } catch (error) {
                console.warn(`⚠️ Could not access subfolder ${prefix.name}:`, error);
                return Promise.resolve();
              }
            });
            await Promise.all(subfolderPromises);
            console.log(`🗑️ Processed ${items.prefixes.length} subfolders from ${path}`);
          }
        } catch (error) {
          console.warn(`⚠️ Could not delete storage path ${path}:`, error);
        }
      }
      
      console.log(`✅ Storage data deletion completed for user: ${userId}`);
    } catch (error) {
      console.warn('⚠️ Could not delete storage data:', error);
    }
  }

  /**
   * 🗑️ Authentication'dan kullanıcıyı siler
   */
  private static async deleteUserFromAuth(): Promise<void> {
    console.log(`🗑️ Deleting user from authentication`);
    
    try {
      const user = this.auth.currentUser;
      if (user) {
        await user.delete();
        console.log(`✅ User deleted from authentication`);
      }
    } catch (error: any) {
      console.error('❌ Could not delete user from authentication:', error);
      
      // Handle requires-recent-login error with specific handling
      if (error.code === 'auth/requires-recent-login') {
        console.log('🔐 Recent authentication required - attempting reauthentication');
        throw new Error('REQUIRES_RECENT_LOGIN');
      }
      
      throw error;
    }
  }

  /**
   * 🔐 Kullanıcıyı yeniden doğrular ve hesabı siler
   */
  static async reauthenticateAndDelete(password: string): Promise<void> {
    try {
      const user = this.auth.currentUser;
      if (!user || !user.email) {
        throw new Error('Kullanıcı oturumu bulunamadı');
      }

      console.log('🔐 Reauthenticating user for account deletion...');
      
      // Create credential for reauthentication
      const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
      
      // Reauthenticate the user
      await user.reauthenticateWithCredential(credential);
      console.log('✅ User reauthenticated successfully');
      
      // Now attempt to delete the user account
      await user.delete();
      console.log('✅ User account deleted after reauthentication');
      
    } catch (error: any) {
      console.error('❌ Reauthentication and deletion failed:', error);
      
      // Provide user-friendly error messages
      if (error.code === 'auth/wrong-password') {
        throw new Error('Girdiğiniz şifre hatalı. Lütfen doğru şifrenizi girin.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Çok fazla deneme yapıldı. Lütfen bir süre bekleyip tekrar deneyin.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('İnternet bağlantınızı kontrol edin ve tekrar deneyin.');
      }
      
      throw error;
    }
  }

  /**
   * 🗑️ Username ve email rezervasyonlarını siler
   */
  private static async deleteReservations(userId: string): Promise<void> {
    try {
      // Önce kullanıcının username ve email'ini al
      const userDoc = await this.firestore.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Get the correct username - prefer preserved username over current username
        const username = userData?._preserveUsername || userData?.username;
        const email = userData?.email;

        const batch = this.firestore.batch();

        // Username rezervasyonunu sil - both current and preserved versions
        if (username) {
          const usernameRef = this.firestore.collection('usernames').doc(username);
          batch.delete(usernameRef);
          console.log(`🗑️ Queued username reservation deletion: ${username}`);
        }
        
        // Also delete the corrupted username if it's different
        if (userData?.username && userData.username !== username) {
          const corruptedUsernameRef = this.firestore.collection('usernames').doc(userData.username);
          batch.delete(corruptedUsernameRef);
          console.log(`🗑️ Queued corrupted username reservation deletion: ${userData.username}`);
        }
        
        // Also search for any username document that has this userId
        try {
          const usernameQuery = await this.firestore.collection('usernames').where('userId', '==', userId).get();
          usernameQuery.docs.forEach(doc => {
            batch.delete(doc.ref);
            console.log(`🗑️ Queued username reservation deletion by userId: ${doc.id}`);
          });
        } catch (error) {
          console.warn('⚠️ Could not query usernames by userId:', error);
        }

        // Email rezervasyonunu sil
        if (email) {
          const emailRef = this.firestore.collection('emails').doc(email);
          batch.delete(emailRef);
          console.log(`🗑️ Queued email reservation deletion: ${email}`);
        }

        await batch.commit();
        console.log(`✅ Reservations deleted for user: ${userId}`);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete reservations:', error);
    }
  }

  /**
   * 🗑️ Etkinlik verilerini temizler
   */
  private static async cleanupEventData(userId: string, userType: 'student' | 'club'): Promise<void> {
    console.log('🔄 Starting event data cleanup...');
    
    try {
      // Validate user ID
      if (!this.isValidUserId(userId)) {
        throw new Error(`Invalid userId for event cleanup: ${userId}`);
      }
      
      if (userType === 'club') {
        // Kulübün oluşturduğu tüm etkinlikleri sil
        console.log(`🏢 Processing club event cleanup for user: ${userId}`);
        
        const eventsQuery = this.firestore.collection('events').where('organizerId', '==', userId);
        const eventsSnapshot = await eventsQuery.get();
        
        console.log(`📊 Found ${eventsSnapshot.size} events created by club ${userId}`);
        
        const batch = this.firestore.batch();
        eventsSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        if (!eventsSnapshot.empty) {
          await batch.commit();
          console.log(`🗑️ Deleted ${eventsSnapshot.size} club events for user: ${userId}`);
        }

        // Etkinlik katılımcılarını temizle
        const participantsQuery = this.firestore.collectionGroup('eventParticipants').where('clubId', '==', userId);
        const participantsSnapshot = await participantsQuery.get();
        
        console.log(`📊 Found ${participantsSnapshot.size} event participants for club ${userId}`);
        
        if (!participantsSnapshot.empty) {
          const participantsBatch = this.firestore.batch();
          participantsSnapshot.docs.forEach(doc => {
            participantsBatch.delete(doc.ref);
          });
          await participantsBatch.commit();
          console.log(`🗑️ Deleted ${participantsSnapshot.size} event participants for club: ${userId}`);
        }
      } else {
        // Öğrenci ise katıldığı etkinliklerden çıkar
        console.log(`👥 Processing student event cleanup for user: ${userId}`);
        
        const participationsQuery = this.firestore.collectionGroup('eventParticipants').where('userId', '==', userId);
        const participationsSnapshot = await participationsQuery.get();
        
        console.log(`📊 Found ${participationsSnapshot.size} event participations for student ${userId}`);

        if (!participationsSnapshot.empty) {
          const batch = this.firestore.batch();
          participationsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          console.log(`🗑️ Deleted ${participationsSnapshot.size} student event participations for user: ${userId}`);
        }
        
        // EventAttendees koleksiyonundan da temizle
        try {
          const eventAttendeesQuery = this.firestore.collection('eventAttendees').where('userId', '==', userId);
          const eventAttendeesSnapshot = await eventAttendeesQuery.get();
          
          console.log(`📊 Found ${eventAttendeesSnapshot.size} eventAttendees records for student ${userId}`);
          
          if (!eventAttendeesSnapshot.empty) {
            const attendeesBatch = this.firestore.batch();
            eventAttendeesSnapshot.docs.forEach(doc => {
              attendeesBatch.delete(doc.ref);
            });
            await attendeesBatch.commit();
            console.log(`🗑️ Deleted ${eventAttendeesSnapshot.size} eventAttendees records for user: ${userId}`);
          }
        } catch (error: any) {
          if (error?.code === 'permission-denied') {
            console.log(`ℹ️ Permission denied for eventAttendees cleanup for user ${userId} (expected behavior)`);
          } else {
            console.warn(`⚠️ Error cleaning eventAttendees for user ${userId}:`, error);
          }
        }
      }
      
      console.log(`✅ Event data cleanup completed for user: ${userId} (type: ${userType})`);
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        console.log(`ℹ️ Event data cleanup permission denied for user ${userId} - this is expected for some operations`);
      } else {
        console.error(`❌ Event data cleanup failed for user ${userId}:`, error);
      }
      // Don't throw error to avoid breaking the entire deletion process
    }
  }
}

export default AccountDeletionService;
