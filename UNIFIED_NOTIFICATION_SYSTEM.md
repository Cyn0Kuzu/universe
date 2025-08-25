# 🔔 Unified Notification System

Yeni, merkezi ve düzenli bildirim sistemi. Kulüp ve öğrenci hesapları için ayrı bildirim türleri destekler.

## 📋 Özellikler

### Kulüp Bildirimleri
- ❤️ Etkinlik beğenisi (beğeni/beğeni geri alma)
- 💬 Etkinlik yorumu (yorum ekleme/silme)
- 🎉 Etkinlik katılımı (katılım/ayrılma)
- 📝 Üyelik başvurusu
- 👥 Kulüp takibi (takip/takipten çıkma)
- 🤝 Kullanıcı takibi (takip/takipten çıkma)

### Öğrenci Bildirimleri
- 🎉 Yeni etkinlik (üye olduğu kulüplerden)
- 💬 Etkinlik yorumu (beğendiği/katıldığı etkinliklere)
- ✅ Üyelik onaylandı
- ❌ Üyelik reddedildi
- ⚠️ Üyelikten çıkarıldı
- 👥 Takip edildi/takipten çıkarıldı

## 🚀 Kullanım

### Temel Kullanım

```typescript
import { UnifiedNotificationService } from '../services/unifiedNotificationService';

// Kulübü bilgilendir: Etkinlik beğenildi
await UnifiedNotificationService.notifyClubEventLiked(
  clubId,
  eventId, 
  eventTitle,
  userId,
  userName,
  userImage
);

// Öğrenciyi bilgilendir: Üyelik onaylandı
await UnifiedNotificationService.notifyStudentMembershipApproved(
  studentId,
  clubId,
  clubName,
  clubImage
);
```

### Bildirim Türleri

```typescript
// Kulüp bildirim türleri
type ClubNotificationType = 
  | 'event_like'           // Etkinlik beğenildi
  | 'event_unlike'         // Etkinlik beğenisi geri alındı  
  | 'event_comment'        // Etkinlige yorum yapıldı
  | 'event_comment_delete' // Etkinlik yorumu silindi
  | 'event_join'           // Etkinliğe katılındı
  | 'event_leave'          // Etkinlikten ayrılındı
  | 'membership_request'   // Üyelik başvurusu
  | 'club_follow'          // Kulüp takip edildi
  | 'club_unfollow'        // Kulüp takipten çıkarıldı
  | 'user_follow'          // Kullanıcı takip edildi
  | 'user_unfollow';       // Kullanıcı takipten çıkarıldı

// Öğrenci bildirim türleri
type StudentNotificationType = 
  | 'club_new_event'           // Üye olduğunuz kulüp yeni etkinlik paylaştı
  | 'event_comment_received'   // Beğendiğiniz etkinliğe yorum yapıldı
  | 'joined_event_comment'     // Katıldığınız etkinliğe yorum yapıldı
  | 'membership_approved'      // Üyeliğiniz onaylandı
  | 'membership_rejected'      // Üyeliğiniz reddedildi
  | 'membership_removed'       // Üyelikten çıkarıldınız
  | 'user_followed'            // Sizi takip etti
  | 'user_unfollowed';         // Sizi takipten çıkardı
```

## 🔧 Entegrasyon

### Mevcut Kod Entegrasyonu

```typescript
// ClubEventCard.tsx - Beğeni sistemi
import { UnifiedNotificationService } from '../services/unifiedNotificationService';

// Beğeni
const userInfo = await UnifiedNotificationService.getUserInfo(currentUser.uid);
await UnifiedNotificationService.notifyClubEventLiked(
  event.clubId,
  event.id,
  event.title || 'Etkinlik',
  currentUser.uid,
  userInfo.name,
  userInfo.image
);

// Katılım
await UnifiedNotificationService.notifyClubEventJoined(
  event.clubId,
  event.id,
  event.title || 'Etkinlik',
  currentUser.uid,
  userInfo.name,
  userInfo.image
);
```

```typescript
// commentManagement.ts - Yorum sistemi
const userInfo = await UnifiedNotificationService.getUserInfo(userId);
await UnifiedNotificationService.notifyClubEventComment(
  eventData.clubId,
  eventId,
  eventData.title || 'Etkinlik',
  userId,
  userInfo.name,
  content,
  userInfo.image
);

// Beğenen öğrencileri bilgilendir
const likers = await UnifiedNotificationService.getEventLikers(eventId);
const likersExceptCommenter = likers.filter(likerId => likerId !== userId);
if (likersExceptCommenter.length > 0) {
  await UnifiedNotificationService.notifyStudentLikedEventComment(
    likersExceptCommenter,
    eventId,
    eventData.title || 'Etkinlik',
    userId,
    userInfo.name,
    content
  );
}
```

```typescript
// membership.ts - Üyelik sistemi
const userInfo = await UnifiedNotificationService.getUserInfo(userId);
await UnifiedNotificationService.notifyClubMembershipRequest(
  clubId,
  userId,
  userInfo.name,
  userInfo.image,
  userInfo.university
);

// Onay
const clubInfo = await UnifiedNotificationService.getClubInfo(clubId);
await UnifiedNotificationService.notifyStudentMembershipApproved(
  requestData.userId,
  clubId,
  clubInfo.name,
  clubInfo.image
);
```

## 📊 Veri Yapısı

### Temel Bildirim Yapısı

```typescript
interface BaseNotification {
  id?: string;
  recipientId: string;           // Alan kişi ID'si
  recipientType: 'club' | 'student';
  senderId: string;              // Gönderen kişi ID'si
  senderName: string;
  senderImage?: string;
  senderUsername?: string;
  title: string;                 // Bildirim başlığı
  message: string;               // Bildirim mesajı
  type: string;                  // Bildirim türü
  category: 'membership' | 'events' | 'social' | 'system';
  priority: 'high' | 'medium' | 'low';
  read: boolean;
  createdAt: firebase.firestore.Timestamp;
  metadata?: any;                // Ek veriler
}
```

## 🧪 Test Etme

```typescript
// Test dosyası import et
import { runAllNotificationTests } from '../tests/testNotificationSystem';

// Tüm testleri çalıştır
runAllNotificationTests();

// Sadece belirli testler
import { testClubNotifications, testStudentNotifications } from '../tests/testNotificationSystem';
testClubNotifications();
testStudentNotifications();
```

## 📱 Firestore Koleksiyonu

Bildirimler `notifications` koleksiyonunda saklanır:

```
notifications/
  ├── {notificationId}/
  │   ├── recipientId: string      // "club_123" veya "student_456"
  │   ├── recipientType: string    // "club" veya "student"  
  │   ├── senderId: string         // Gönderen kullanıcı ID'si
  │   ├── senderName: string       // "Ahmet Yılmaz"
  │   ├── title: string            // "Etkinlik Beğenildi ❤️"
  │   ├── message: string          // "Ahmet Yılmaz 'Java Workshop' etkinliğinizi beğendi"
  │   ├── type: string             // "event_like"
  │   ├── category: string         // "events"
  │   ├── priority: string         // "medium"
  │   ├── read: boolean            // false
  │   ├── createdAt: timestamp     // 2025-01-12T10:30:00Z
  │   └── metadata: object         // { eventId: "...", eventTitle: "..." }
```

## ✅ Sistem Durumu

### ✅ Tamamlanan Entegrasyonlar
- [x] Yorum sistemi (commentManagement.ts)
- [x] Etkinlik katılım/beğeni (ClubEventCard.tsx) 
- [x] Üyelik sistemi (membership.ts)
- [x] Takip sistemi (clubFollowSyncService.ts)
- [x] Yeni etkinlik bildirimleri (eventManagement.ts)
- [x] Test sistemi (testNotificationSystem.ts)

### ⚠️ Yapılacaklar
- [ ] Bildirim okuma durumu güncelleme
- [ ] Push notification entegrasyonu
- [ ] Bildirim tercih yönetimi
- [ ] Toplu bildirim silme
- [ ] Bildirim geçmişi arşivleme

## 🔄 Eski Sistemden Geçiş

Bu sistem, mevcut `ClubNotificationService` ve `DetailedNotificationService` sistemlerinin yerini alır. Eski sistemler kademeli olarak kaldırılacak.

```typescript
// ESKİ SISTEM ❌
await clubNotificationService.sendNewCommentNotification(...);
await DetailedNotificationService.notifyEventLiked(...);

// YENİ SISTEM ✅
await UnifiedNotificationService.notifyClubEventComment(...);
await UnifiedNotificationService.notifyClubEventLiked(...);
```

## 🛠️ Teknik Detaylar

- **Firebase Firestore**: Bildirim depolama
- **Real-time**: Gerçek zamanlı bildirim dinleme
- **Type Safety**: TypeScript tip güvenliği
- **Error Handling**: Kapsamlı hata yönetimi
- **Performance**: Optimized queries ve batch operations
- **Scalable**: Büyük kullanıcı tabanı için ölçeklenebilir

## 📞 Destek

Sorunlar için GitHub Issues açın veya development ekibiyle iletişime geçin.
