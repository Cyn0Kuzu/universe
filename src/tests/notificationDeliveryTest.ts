// Test bildirim sistemi
import { firebase } from '../firebase';

export async function testNotificationDelivery() {
  console.log('🧪 Testing notification delivery...');
  
  try {
    // Bildirimler koleksiyonunu kontrol et
    const db = firebase.firestore();
    const notificationsQuery = await db.collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    console.log(`📋 Found ${notificationsQuery.size} notifications in database:`);
    
    notificationsQuery.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.title} - To: ${data.recipientId} (${data.recipientType}) - Type: ${data.type}`);
      console.log(`   Message: ${data.message}`);
      console.log(`   Read: ${data.read}, Created: ${data.createdAt?.toDate?.()}`);
      console.log('   ---');
    });
    
    // Belirli bir kulübün bildirimlerini kontrol et
    const clubNotifications = await db.collection('notifications')
      .where('recipientType', '==', 'club')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`📋 Club notifications (${clubNotifications.size} found):`);
    clubNotifications.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Club ${data.recipientId}: ${data.title} - ${data.message}`);
    });
    
    // Öğrenci bildirimlerini kontrol et
    const studentNotifications = await db.collection('notifications')
      .where('recipientType', '==', 'student')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    
    console.log(`📋 Student notifications (${studentNotifications.size} found):`);
    studentNotifications.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Student ${data.recipientId}: ${data.title} - ${data.message}`);
    });
    
  } catch (error) {
    console.error('❌ Notification test failed:', error);
  }
}

// Belirli kulüp/öğrenci için bildirim kontrol fonksiyonu  
export async function checkNotificationsForUser(userId: string, type: 'club' | 'student' = 'club') {
  console.log(`🔍 Checking notifications for ${type} ${userId}...`);
  
  try {
    const db = firebase.firestore();
    const notifications = await db.collection('notifications')
      .where('recipientId', '==', userId)
      .where('recipientType', '==', type)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();
    
    console.log(`📋 Found ${notifications.size} notifications for ${type} ${userId}:`);
    
    notifications.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.type}: ${data.title}`);
      console.log(`   From: ${data.senderName} (${data.senderId})`);
      console.log(`   Message: ${data.message}`);
      console.log(`   Read: ${data.read}, Priority: ${data.priority}`);
      console.log(`   Created: ${data.createdAt?.toDate?.()}`);
      if (data.metadata) {
        console.log(`   Metadata:`, data.metadata);
      }
      console.log('   ---');
    });
    
    return notifications.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
  } catch (error) {
    console.error(`❌ Failed to check notifications for ${type} ${userId}:`, error);
    return [];
  }
}
