/**
 * 🧪 Unified Notification System Test
 * Bu dosya yeni bildirim sisteminin tüm özelliklerini test eder
 */

import { UnifiedNotificationService } from '../services/unifiedNotificationService';

// Test için örnek veri
const testData = {
  clubId: 'club_test_123',
  studentId: 'student_test_456',
  eventId: 'event_test_789',
  
  clubInfo: {
    name: 'Test Kulüp',
    image: 'https://example.com/club-image.jpg'
  },
  
  studentInfo: {
    name: 'Test Öğrenci',
    image: 'https://example.com/student-image.jpg',
    username: 'teststudent',
    university: 'Test Üniversitesi'
  },
  
  eventInfo: {
    title: 'Test Etkinliği',
    commentContent: 'Bu bir test yorumudur.'
  }
};

/**
 * 🔔 Kulüp bildirimlerini test et
 */
export const testClubNotifications = async () => {
  console.log('🧪 Testing Club Notifications...');
  
  try {
    // 1. Etkinlik beğenildi
    console.log('1️⃣ Testing event liked notification...');
    await UnifiedNotificationService.notifyClubEventLiked(
      testData.clubId,
      testData.eventId,
      testData.eventInfo.title,
      testData.studentId,
      testData.studentInfo.name,
      testData.studentInfo.image
    );
    console.log('✅ Event liked notification sent');
    
    // 2. Etkinliğe yorum yapıldı
    console.log('2️⃣ Testing event comment notification...');
    await UnifiedNotificationService.notifyClubEventComment(
      testData.clubId,
      testData.eventId,
      testData.eventInfo.title,
      testData.studentId,
      testData.studentInfo.name,
      testData.eventInfo.commentContent,
      testData.studentInfo.image
    );
    console.log('✅ Event comment notification sent');
    
    // 3. Etkinliğe katılındı
    console.log('3️⃣ Testing event joined notification...');
    await UnifiedNotificationService.notifyClubEventJoined(
      testData.clubId,
      testData.eventId,
      testData.eventInfo.title,
      testData.studentId,
      testData.studentInfo.name,
      testData.studentInfo.image
    );
    console.log('✅ Event joined notification sent');
    
    // 4. Üyelik başvurusu
    console.log('4️⃣ Testing membership request notification...');
    await UnifiedNotificationService.notifyClubMembershipRequest(
      testData.clubId,
      testData.studentId,
      testData.studentInfo.name,
      testData.studentInfo.image,
      testData.studentInfo.university
    );
    console.log('✅ Membership request notification sent');
    
    // 5. Kulüp takip edildi
    console.log('5️⃣ Testing club followed notification...');
    await UnifiedNotificationService.notifyClubFollowed(
      testData.clubId,
      testData.studentId,
      testData.studentInfo.name,
      testData.studentInfo.image,
      testData.studentInfo.university
    );
    console.log('✅ Club followed notification sent');
    
    console.log('🎉 All club notifications tested successfully!');
    
  } catch (error) {
    console.error('❌ Club notifications test failed:', error);
  }
};

/**
 * 👨‍🎓 Öğrenci bildirimlerini test et
 */
export const testStudentNotifications = async () => {
  console.log('🧪 Testing Student Notifications...');
  
  try {
    // 1. Yeni etkinlik paylaşıldı
    console.log('1️⃣ Testing new event notification...');
    await UnifiedNotificationService.notifyStudentClubNewEvent(
      [testData.studentId],
      testData.eventId,
      testData.eventInfo.title,
      testData.clubId,
      testData.clubInfo.name,
      testData.clubInfo.image
    );
    console.log('✅ New event notification sent');
    
    // 2. Üyelik onaylandı
    console.log('2️⃣ Testing membership approved notification...');
    await UnifiedNotificationService.notifyStudentMembershipApproved(
      testData.studentId,
      testData.clubId,
      testData.clubInfo.name,
      testData.clubInfo.image
    );
    console.log('✅ Membership approved notification sent');
    
    // 3. Üyelik reddedildi
    console.log('3️⃣ Testing membership rejected notification...');
    await UnifiedNotificationService.notifyStudentMembershipRejected(
      testData.studentId,
      testData.clubId,
      testData.clubInfo.name,
      'Test sebep'
    );
    console.log('✅ Membership rejected notification sent');
    
    // 4. Kullanıcı takip etti
    console.log('4️⃣ Testing user followed notification...');
    await UnifiedNotificationService.notifyStudentFollowed(
      testData.studentId,
      'follower_test_123',
      'Test Takipçi',
      'https://example.com/follower-image.jpg',
      'testfollower'
    );
    console.log('✅ User followed notification sent');
    
    console.log('🎉 All student notifications tested successfully!');
    
  } catch (error) {
    console.error('❌ Student notifications test failed:', error);
  }
};

/**
 * 🔧 Yardımcı fonksiyonları test et
 */
export const testHelperFunctions = async () => {
  console.log('🧪 Testing Helper Functions...');
  
  try {
    // 1. Kullanıcı bilgilerini getir
    console.log('1️⃣ Testing getUserInfo...');
    const userInfo = await UnifiedNotificationService.getUserInfo(testData.studentId);
    console.log('User info:', userInfo);
    
    // 2. Etkinlik bilgilerini getir
    console.log('2️⃣ Testing getEventInfo...');
    const eventInfo = await UnifiedNotificationService.getEventInfo(testData.eventId);
    console.log('Event info:', eventInfo);
    
    // 3. Kulüp bilgilerini getir
    console.log('3️⃣ Testing getClubInfo...');
    const clubInfo = await UnifiedNotificationService.getClubInfo(testData.clubId);
    console.log('Club info:', clubInfo);
    
    // 4. Etkinlik beğenenleri getir
    console.log('4️⃣ Testing getEventLikers...');
    const likers = await UnifiedNotificationService.getEventLikers(testData.eventId);
    console.log('Event likers:', likers.length);
    
    // 5. Etkinlik katılımcıları getir
    console.log('5️⃣ Testing getEventAttendees...');
    const attendees = await UnifiedNotificationService.getEventAttendees(testData.eventId);
    console.log('Event attendees:', attendees.length);
    
    console.log('🎉 All helper functions tested successfully!');
    
  } catch (error) {
    console.error('❌ Helper functions test failed:', error);
  }
};

/**
 * 🚀 Tüm testleri çalıştır
 */
export const runAllNotificationTests = async () => {
  console.log('🚀 Starting Unified Notification System Tests...');
  
  // Test sırası önemli - önce yardımcılar, sonra bildirimler
  await testHelperFunctions();
  await testClubNotifications();
  await testStudentNotifications();
  
  console.log('✅ All tests completed!');
};

// Test verilerini dışa aktar
export { testData };

/**
 * Kullanım örneği:
 * 
 * import { runAllNotificationTests } from '../testNotificationSystem';
 * 
 * // Tüm testleri çalıştır
 * runAllNotificationTests();
 * 
 * // Sadece kulüp bildirimlerini test et
 * testClubNotifications();
 * 
 * // Sadece öğrenci bildirimlerini test et
 * testStudentNotifications();
 */
