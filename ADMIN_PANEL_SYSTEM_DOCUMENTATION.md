# 🛡️ Admin Paneli Sistemi - Detaylı Dokümantasyon

Bu dokümantasyon, Universe uygulamasındaki admin paneli sisteminin tüm altyapısını, yapısını, özelliklerini ve silme işlemlerini detaylı bir şekilde açıklamaktadır. Bu bilgileri başka bir uygulamada uygulayabilmek için hazırlanmıştır.

---

## 📋 İçindekiler

1. [Sistem Mimarisi](#sistem-mimarisi)
2. [Güvenlik ve Kimlik Doğrulama](#güvenlik-ve-kimlik-doğrulama)
3. [Firestore Veritabanı Yapısı](#firestore-veritabanı-yapısı)
4. [Frontend Bileşenleri](#frontend-bileşenleri)
5. [Backend (Cloud Functions)](#backend-cloud-functions)
6. [Banner Sistemi](#banner-sistemi)
7. [Push Bildirim Sistemi](#push-bildirim-sistemi)
8. [Silme İşlemleri](#silme-işlemleri)
9. [Kurulum Adımları](#kurulum-adımları)

---

## 🏗️ Sistem Mimarisi

### Genel Bakış

Admin paneli sistemi, **3 katmanlı bir mimari** kullanır:

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React Native)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Admin Panel  │  │ Admin Banner │  │ Push Listener │  │
│  │   Screen     │  │  Component   │  │  Component    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            │                             │
│                   ┌────────▼────────┐                    │
│                   │  Service Layer  │                    │
│                   │ adminControlService│                 │
│                   └────────┬────────┘                    │
└────────────────────────────┼─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│              FIRESTORE (Veritabanı)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ adminConfigs│  │adminPushQueue│  │    users     │    │
│  │  (Banner)    │  │  (Push Queue)│  │  (Admin Doc) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└────────────────────────────┬──────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│         CLOUD FUNCTIONS (Backend İşlemleri)               │
│  ┌──────────────────────────────────────────────────┐    │
│  │  processAdminPushQueue (Push İşleme)              │    │
│  │  - Expo Push API                                  │    │
│  │  - FCM (Firebase Cloud Messaging)                 │    │
│  │  - Audience Filtering                             │    │
│  └──────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────┘
```

---

## 🔐 Güvenlik ve Kimlik Doğrulama

### 1. Admin Session Manager (`adminSessionManager.ts`)

**Amaç:** Admin paneline özel bir Firebase Authentication hesabı oluşturur ve yönetir.

#### Özellikler:

- **Özel Admin Hesabı:** Admin paneli için ayrı bir Firebase Auth hesabı (`cayankuzu.0@gmail.com`)
- **Otomatik Hesap Oluşturma:** Hesap yoksa otomatik oluşturur
- **Şifre Sıfırlama:** Şifre yanlışsa otomatik şifre sıfırlama e-postası gönderir
- **User Document Senkronizasyonu:** Firestore'da admin kullanıcı dokümanını oluşturur/günceller

#### Kod Yapısı:

```typescript
// Sabitler
const ADMIN_AUTH_EMAIL = 'cayankuzu.0@gmail.com';
const ADMIN_AUTH_PASSWORD = ' universe'; // Başında boşluk var

// Ana Fonksiyon
export const ensureAdminSession = async (): Promise<void> => {
  // 1. Mevcut kullanıcı kontrolü
  if (auth.currentUser?.email === ADMIN_AUTH_EMAIL) {
    await ensureAdminUserDocument(auth.currentUser);
    return;
  }

  // 2. Diğer kullanıcı varsa çıkış yap
  if (auth.currentUser) {
    await auth.signOut();
  }

  // 3. Giriş yapmayı dene
  try {
    const credential = await auth.signInWithEmailAndPassword(
      ADMIN_AUTH_EMAIL,
      ADMIN_AUTH_PASSWORD
    );
    await ensureAdminUserDocument(credential.user);
  } catch (error) {
    // 4. Hesap yoksa oluştur
    if (error?.code === 'auth/user-not-found') {
      const newCredential = await auth.createUserWithEmailAndPassword(
        ADMIN_AUTH_EMAIL,
        ADMIN_AUTH_PASSWORD
      );
      await ensureAdminUserDocument(newCredential.user);
    }
    // 5. Şifre yanlışsa şifre sıfırlama e-postası gönder
    else if (error?.code === 'auth/email-already-in-use') {
      await auth.sendPasswordResetEmail(ADMIN_AUTH_EMAIL);
    }
  }
};

// Firestore'da admin kullanıcı dokümanını oluştur/güncelle
const ensureAdminUserDocument = async (user: firebase.User | null) => {
  const baseProfile = {
    uid: user.uid,
    email: ADMIN_AUTH_EMAIL,
    name: 'Universe Admin',
    displayName: 'Universe Admin',
    userType: 'student',
    role: 'admin',                    // ⭐ ÖNEMLİ: role: 'admin'
    isAdminPanelAccount: true,       // ⭐ ÖNEMLİ: Admin panel hesabı işareti
    lastAdminLoginAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  
  await userRef.set(baseProfile, { merge: true });
};
```

#### Firestore User Document Yapısı:

```javascript
{
  uid: "firebase-auth-uid",
  email: "cayankuzu.0@gmail.com",
  name: "Universe Admin",
  displayName: "Universe Admin",
  userType: "student",
  role: "admin",                    // ⭐ Güvenlik kurallarında kullanılır
  isAdminPanelAccount: true,        // ⭐ Admin panel hesabı işareti
  lastAdminLoginAt: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

---

### 2. Login Screen Entegrasyonu

**Dosya:** `src/screens/Auth/LoginScreen.tsx`

#### Admin Giriş Kısayolu:

```typescript
// Login ekranında özel bir kontrol
const adminCreds = await AdminControlService.getAdminCredentials();
const matchesStoredSecret = 
  normalizedInputEmail === normalizedStoredEmail &&
  (password === adminCreds.password || password.trim() === adminCreds.password.trim());

const matchesDefaultShortcut =
  normalizedInputEmail === 'universe' &&
  (password === ' universe' || password.trim() === 'universe');

if (matchesStoredSecret || matchesDefaultShortcut) {
  await ensureAdminSession();
  navigation.navigate('AdminPanel');
}
```

**Varsayılan Giriş Bilgileri:**
- Email: `universe` (küçük harf)
- Password: ` universe` (başında boşluk) veya `universe`

---

### 3. Firestore Security Rules

**Dosya:** `firestore.rules`

#### Admin Kontrol Fonksiyonu:

```javascript
function isAdmin() {
  return request.auth != null && 
         request.auth.token.email == 'cayankuzu.0@gmail.com' &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

#### Admin Configs Koleksiyonu Kuralları:

```javascript
match /adminConfigs/{configId} {
  // Herkes okuyabilir (banner gösterimi için)
  allow read: if true;
  
  // Sadece admin oluşturabilir/güncelleyebilir
  allow create, update: if 
    isAuthenticated() && 
    (isAdmin() || request.auth.token.email == 'cayankuzu.0@gmail.com') && 
    hasValidAdminBannerConfig();
  
  // Sadece admin silebilir
  allow delete: if 
    isAuthenticated() && 
    (isAdmin() || request.auth.token.email == 'cayankuzu.0@gmail.com');
}
```

#### Admin Push Queue Koleksiyonu Kuralları:

```javascript
match /adminPushQueue/{messageId} {
  // Herkes okuyabilir (push listener için)
  allow read: if true;
  
  // Sadece admin oluşturabilir
  allow create: if 
    isAuthenticated() && 
    (isAdmin() || request.auth.token.email == 'cayankuzu.0@gmail.com') && 
    hasValidAdminPushPayload();
  
  // Güncelleme yasak (sadece Cloud Functions güncelleyebilir)
  allow update: if false;
  
  // Sadece admin silebilir
  allow delete: if 
    isAuthenticated() && 
    (isAdmin() || request.auth.token.email == 'cayankuzu.0@gmail.com');
}
```

---

## 🗄️ Firestore Veritabanı Yapısı

### 1. `adminConfigs` Koleksiyonu

**Yol:** `adminConfigs/controlPanel`

**Yapı:**

```javascript
{
  banner: {
    enabled: boolean,              // Banner aktif mi?
    title: string,                  // Banner başlığı
    message: string,                // Banner mesajı
    ctaLabel?: string,               // Buton metni (opsiyonel)
    ctaUrl?: string,                 // Buton linki (opsiyonel)
    persistent?: boolean,            // Kalıcı banner mı? (kapatılamaz)
    bannerId?: string,               // Banner ID (dismiss kontrolü için)
    updatedAt: Timestamp             // Son güncelleme zamanı
  }
}
```

**Örnek Doküman:**

```javascript
{
  banner: {
    enabled: true,
    title: "Yeni Özellik Duyurusu",
    message: "Uygulamamıza yeni özellikler eklendi!",
    ctaLabel: "Detayları Gör",
    ctaUrl: "https://example.com/features",
    persistent: false,
    bannerId: "1703123456789",
    updatedAt: Timestamp(2024, 12, 21, 10, 30, 0)
  }
}
```

---

### 2. `adminPushQueue` Koleksiyonu

**Yol:** `adminPushQueue/{messageId}` (otomatik ID)

**Yapı:**

```javascript
{
  title: string,                    // Push başlığı
  message: string,                  // Push mesajı
  ctaLabel?: string,                // Buton metni (opsiyonel)
  ctaUrl?: string,                  // Buton linki (opsiyonel)
  category?: string,                // Kategori (announcement, club, vb.)
  deliveryMode?: 'global' | 'localOnly',  // Global veya sadece uygulama içi
  audience?: 'all' | 'students' | 'clubs', // Hedef kitle
  createdAt: Timestamp,             // Oluşturulma zamanı
  delivered: boolean,                // Gönderildi mi?
  status?: string,                   // Durum (delivered, failed, local_only)
  processedAt?: Timestamp,           // İşlenme zamanı
  stats?: {                          // İstatistikler (Cloud Functions tarafından)
    audience: string,
    totalCandidates: number,
    expo: { sent: number, failed: number },
    fcm: { sent: number, failed: number }
  },
  errors?: string[]                  // Hata mesajları
}
```

**Örnek Doküman:**

```javascript
{
  title: "Yeni Etkinlik Duyurusu",
  message: "Bu hafta sonu büyük bir etkinlik var!",
  ctaLabel: "Etkinliği Gör",
  ctaUrl: "https://example.com/event/123",
  category: "announcement",
  deliveryMode: "global",
  audience: "all",
  createdAt: Timestamp(2024, 12, 21, 10, 30, 0),
  delivered: true,
  status: "delivered",
  processedAt: Timestamp(2024, 12, 21, 10, 30, 5),
  stats: {
    audience: "all",
    totalCandidates: 1500,
    expo: { sent: 800, failed: 0 },
    fcm: { sent: 700, failed: 0 }
  }
}
```

---

## 🎨 Frontend Bileşenleri

### 1. Admin Panel Screen (`AdminPanelScreen.tsx`)

**Dosya:** `src/screens/Admin/AdminPanelScreen.tsx`

**Özellikler:**

#### A. Banner Yönetimi

```typescript
// State Yönetimi
const [bannerTitle, setBannerTitle] = useState('');
const [bannerMessage, setBannerMessage] = useState('');
const [bannerCtaLabel, setBannerCtaLabel] = useState('');
const [bannerCtaUrl, setBannerCtaUrl] = useState('');
const [bannerPersistent, setBannerPersistent] = useState(false);
const [bannerEnabled, setBannerEnabled] = useState(false);

// Banner Yayınlama
const handlePublishBanner = async () => {
  await AdminControlService.publishBanner({
    enabled: bannerEnabled,
    title: bannerTitle.trim(),
    message: bannerMessage.trim(),
    ctaLabel: bannerCtaLabel.trim(),
    ctaUrl: bannerCtaUrl.trim(),
    persistent: bannerPersistent,
    bannerId: activeBannerId,
  });
};

// Banner Temizleme
const handleClearBanner = async () => {
  await AdminControlService.clearBanner();
};
```

#### B. Push Bildirim Gönderme

```typescript
// State Yönetimi
const [pushTitle, setPushTitle] = useState('');
const [pushMessage, setPushMessage] = useState('');
const [pushCtaLabel, setPushCtaLabel] = useState('');
const [pushCtaUrl, setPushCtaUrl] = useState('');
const [pushAudience, setPushAudience] = useState<'all' | 'students' | 'clubs'>('all');
const [pushLocalOnly, setPushLocalOnly] = useState(false);

// Push Gönderme
const handleSendPush = async () => {
  await AdminControlService.sendPushNotification({
    title: pushTitle.trim(),
    message: pushMessage.trim(),
    ctaLabel: pushCtaLabel.trim(),
    ctaUrl: pushCtaUrl.trim(),
    category: pushAudience === 'clubs' ? 'club' : 'announcement',
    audience: pushAudience,
    deliveryMode: pushLocalOnly ? 'localOnly' : 'global',
  });
};
```

#### C. Admin Giriş Bilgileri Yönetimi

```typescript
// State Yönetimi
const [adminUsername, setAdminUsername] = useState('');
const [adminPassword, setAdminPassword] = useState('');
const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');

// Giriş Bilgilerini Güncelleme
const handleSaveCredentials = async () => {
  await AdminControlService.updateAdminCredentials(
    adminUsername.trim(),
    adminPassword.trim()
  );
};
```

---

### 2. Admin Control Service (`adminControlService.ts`)

**Dosya:** `src/services/adminControlService.ts`

**Ana Fonksiyonlar:**

#### A. Banner İşlemleri

```typescript
// Banner Yayınlama
async publishBanner(config: Omit<AdminBannerConfig, 'updatedAt'>): Promise<void> {
  const bannerId = config.bannerId || `${Date.now()}`;
  await ADMIN_DOC_REF.set({
    banner: {
      ...config,
      bannerId,
      updatedAt: FieldValue.serverTimestamp(),
    },
  }, { merge: true });
}

// Banner Temizleme
async clearBanner(): Promise<void> {
  await ADMIN_DOC_REF.set({
    banner: {
      enabled: false,
      message: '',
      title: '',
      updatedAt: FieldValue.serverTimestamp(),
    },
  }, { merge: true });
}

// Banner Okuma
async getBannerConfig(): Promise<AdminBannerConfig | null> {
  const snapshot = await ADMIN_DOC_REF.get();
  return (snapshot.data()?.banner as AdminBannerConfig) ?? null;
}

// Banner Real-time Dinleme
subscribeToBanner(callback: (banner: AdminBannerConfig | null) => void): () => void {
  return ADMIN_DOC_REF.onSnapshot(
    (snapshot) => {
      const data = snapshot.data();
      if (data?.banner) {
        callback(data.banner as AdminBannerConfig);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('❌ Admin banner listener error:', error);
      callback(null);
    }
  );
}
```

#### B. Push Bildirim İşlemleri

```typescript
// Push Bildirimi Gönderme
async sendPushNotification(payload: AdminPushPayload): Promise<void> {
  const doc: Record<string, any> = {
    title: payload.title,
    message: payload.message,
    createdAt: FieldValue.serverTimestamp(),
    delivered: false,
    category: payload.category || 'announcement',
    deliveryMode: payload.deliveryMode || 'global',
    audience: payload.audience || 'all',
  };

  if (payload.ctaLabel?.trim()) {
    doc.ctaLabel = payload.ctaLabel.trim();
  }
  if (payload.ctaUrl?.trim()) {
    doc.ctaUrl = payload.ctaUrl.trim();
  }

  await PUSH_COLLECTION.add(doc);
}

// Push Queue Real-time Dinleme
subscribeToPushQueue(callback: (changes: firebase.firestore.DocumentChange[]) => void): () => void {
  return PUSH_COLLECTION.orderBy('createdAt', 'asc').onSnapshot(
    (snapshot) => {
      callback(snapshot.docChanges());
    },
    (error) => {
      console.error('❌ Admin push listener error:', error);
    }
  );
}
```

#### C. Admin Giriş Bilgileri

```typescript
// Giriş Bilgilerini Okuma
async getAdminCredentials(): Promise<AdminCredentials> {
  return SecureStorage.getAdminCredentials(DEFAULT_ADMIN_CREDENTIALS);
}

// Giriş Bilgilerini Güncelleme
async updateAdminCredentials(username: string, password: string): Promise<void> {
  return SecureStorage.setAdminCredentials({ username, password });
}
```

---

### 3. Global Admin Banner Component (`GlobalAdminBanner.tsx`)

**Dosya:** `src/components/admin/GlobalAdminBanner.tsx`

**Özellikler:**

- **Real-time Banner Güncellemeleri:** Firestore'dan banner değişikliklerini dinler
- **Dismiss Yönetimi:** Kullanıcı banner'ı kapatırsa AsyncStorage'da saklar
- **Kalıcı Banner Desteği:** `persistent: true` ise kapatılamaz
- **CTA (Call-to-Action) Desteği:** Banner'da buton ve link desteği

**Kod Yapısı:**

```typescript
const GlobalAdminBanner: React.FC = () => {
  const [banner, setBanner] = useState<AdminBannerConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  // Real-time banner dinleme
  useEffect(() => {
    const unsubscribe = AdminControlService.subscribeToBanner((config) => {
      setBanner(config);
    });
    return () => unsubscribe();
  }, []);

  // Dismiss kontrolü
  useEffect(() => {
    if (banner && banner.enabled) {
      if (!banner.persistent && banner.bannerId === dismissedId) {
        setVisible(false);
        return;
      }
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [banner, dismissedId]);

  // Banner kapatma
  const handleDismiss = async () => {
    if (banner.bannerId && !banner.persistent) {
      await AsyncStorage.setItem(DISMISS_STORAGE_KEY, banner.bannerId);
      setDismissedId(banner.bannerId);
    }
    setVisible(false);
  };

  // CTA buton tıklama
  const handleAction = () => {
    if (banner.ctaUrl && /^https?:\/\//i.test(banner.ctaUrl)) {
      Linking.openURL(banner.ctaUrl);
    }
  };

  if (!visible || !banner) {
    return null;
  }

  return (
    <Portal>
      <Surface style={styles.banner}>
        <View style={styles.header}>
          <Text style={styles.title}>{banner.title}</Text>
          {!banner.persistent && (
            <IconButton icon="close" onPress={handleDismiss} />
          )}
        </View>
        <Text style={styles.message}>{banner.message}</Text>
        {banner.ctaLabel && banner.ctaUrl && (
          <Button mode="contained" onPress={handleAction}>
            {banner.ctaLabel}
          </Button>
        )}
        {banner.persistent && (
          <Text style={styles.persistentText}>
            Bu banner kalıcıdır ve kapatılamaz.
          </Text>
        )}
      </Surface>
    </Portal>
  );
};
```

**App.tsx'te Kullanımı:**

```typescript
import GlobalAdminBanner from './components/admin/GlobalAdminBanner';

const App: React.FC = () => {
  return (
    <Provider>
      <GlobalAdminBanner />
      {/* Diğer bileşenler */}
    </Provider>
  );
};
```

---

### 4. Admin Push Listener Component (`AdminPushListener.tsx`)

**Dosya:** `src/components/admin/AdminPushListener.tsx`

**Özellikler:**

- **Local-Only Push Desteği:** `deliveryMode: 'localOnly'` olan push'ları işler
- **Duplicate Prevention:** Aynı push'u birden fazla kez göstermez (AsyncStorage cache)
- **Real-time Queue Monitoring:** Firestore'dan push queue değişikliklerini dinler

**Kod Yapısı:**

```typescript
const AdminPushListener: React.FC = () => {
  const processedIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);

  // AsyncStorage'dan işlenmiş push ID'lerini yükle
  useEffect(() => {
    const hydrateProcessedIds = async () => {
      const stored = await AsyncStorage.getItem(PROCESSED_PUSH_IDS_KEY);
      if (stored) {
        const parsed: string[] = JSON.parse(stored);
        processedIdsRef.current = new Set(parsed);
      }
      hydratedRef.current = true;
    };

    hydrateProcessedIds();

    // Push queue'yu dinle
    const unsubscribe = AdminControlService.subscribeToPushQueue(async (changes) => {
      if (!hydratedRef.current) return;

      for (const change of changes) {
        if (change.type !== 'added') continue;
        const doc = change.doc;

        // Zaten işlenmiş mi?
        if (processedIdsRef.current.has(doc.id)) {
          continue;
        }

        const data = doc.data();
        
        // Sadece localOnly push'ları işle (global push'lar Cloud Functions tarafından işlenir)
        if (data.deliveryMode && data.deliveryMode !== 'localOnly') {
          continue;
        }

        // Expo Notification gönder
        await Notifications.scheduleNotificationAsync({
          content: {
            title: data.title,
            body: data.message,
            data,
          },
          trigger: null, // Hemen göster
        });

        // İşlenmiş olarak işaretle
        processedIdsRef.current.add(doc.id);
        await persistProcessedIds();
      }
    });

    return () => unsubscribe();
  }, []);

  return null; // Görünmez component
};
```

**App.tsx'te Kullanımı:**

```typescript
import AdminPushListener from './components/admin/AdminPushListener';

const App: React.FC = () => {
  return (
    <Provider>
      <AdminPushListener />
      {/* Diğer bileşenler */}
    </Provider>
  );
};
```

---

## ⚙️ Backend (Cloud Functions)

### 1. Process Admin Push Queue Function

**Dosya:** `functions/src/index.ts`

**Fonksiyon:** `processAdminPushQueue`

**Tetiklenme:** `adminPushQueue` koleksiyonuna yeni bir doküman eklendiğinde

**İşlem Akışı:**

```typescript
export const processAdminPushQueue = functions.firestore
  .document('adminPushQueue/{messageId}')
  .onCreate(async (snap, context) => {
    const payload = snap.data() as AdminPushQueuePayload;

    // 1. Validasyon
    if (!payload.title || !payload.message) {
      await snap.ref.update({
        delivered: false,
        status: 'failed',
        error: 'Missing title or message',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }

    // 2. LocalOnly kontrolü (Cloud Functions işlemez)
    if (payload.deliveryMode === 'localOnly') {
      await snap.ref.update({
        delivered: true,
        status: 'local_only',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }

    // 3. Audience filtreleme
    const audience = payload.audience || 'all';
    const usersSnapshot = await admin.firestore().collection('users').get();
    
    const expoTokens = new Set<string>();
    const fcmTokens = new Set<string>();
    let totalCandidates = 0;

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Audience filtreleme
      if (audience === 'students' && data.userType !== 'student') return;
      if (audience === 'clubs' && data.userType !== 'club') return;

      totalCandidates++;

      // Expo token'ları topla
      if (data.expoPushToken) {
        expoTokens.add(data.expoPushToken);
      }
      
      // FCM token'ları topla
      if (data.fcmToken) {
        fcmTokens.add(data.fcmToken);
      }
    });

    // 4. Expo Push gönderimi
    const expoSummary = await sendExpoBroadcast(
      Array.from(expoTokens),
      payload.title,
      payload.message,
      dataPayload
    );

    // 5. FCM Push gönderimi
    const fcmSummary = await sendFcmBroadcast(
      Array.from(fcmTokens),
      payload.title,
      payload.message,
      dataPayload
    );

    // 6. Sonuçları güncelle
    const delivered = expoSummary.sent + fcmSummary.sent > 0;
    
    await snap.ref.update({
      delivered,
      status: delivered ? 'delivered' : 'failed',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      stats: {
        audience,
        totalCandidates,
        expo: expoSummary,
        fcm: fcmSummary,
      },
      errors: [...expoSummary.errors, ...fcmSummary.errors].slice(0, 25),
    });

    return null;
  });
```

**Expo Push Gönderimi:**

```typescript
async function sendExpoBroadcast(
  tokens: string[],
  title: string,
  message: string,
  data: Record<string, string>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (tokens.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  const chunks = [];
  for (let i = 0; i < tokens.length; i += 100) {
    chunks.push(tokens.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const chunk of chunks) {
    const messages = chunk.map(token => ({
      to: token,
      sound: 'default',
      title,
      body: message,
      data,
      priority: 'high',
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      
      if (result.data) {
        result.data.forEach((ticket: any) => {
          if (ticket.status === 'ok') {
            sent++;
          } else {
            failed++;
            errors.push(ticket.message || 'Unknown error');
          }
        });
      }
    } catch (error: any) {
      failed += chunk.length;
      errors.push(error.message || 'Network error');
    }
  }

  return { sent, failed, errors };
}
```

**FCM Push Gönderimi:**

```typescript
async function sendFcmBroadcast(
  tokens: string[],
  title: string,
  message: string,
  data: Record<string, string>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  if (tokens.length === 0) {
    return { sent: 0, failed: 0, errors: [] };
  }

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const token of tokens) {
    try {
      await admin.messaging().send({
        token,
        notification: {
          title,
          body: message,
        },
        data: {
          ...data,
          title,
          body: message,
        },
        android: {
          priority: 'high',
        },
        apns: {
          headers: {
            'apns-priority': '10',
          },
        },
      });
      sent++;
    } catch (error: any) {
      failed++;
      errors.push(error.message || 'Unknown error');
    }
  }

  return { sent, failed, errors };
}
```

---

## 🎯 Banner Sistemi

### Banner Akışı

```
1. Admin Panel → Banner Oluştur
   ↓
2. AdminControlService.publishBanner()
   ↓
3. Firestore: adminConfigs/controlPanel → banner objesi güncellenir
   ↓
4. GlobalAdminBanner Component → Real-time listener tetiklenir
   ↓
5. Tüm cihazlarda banner gösterilir
```

### Banner Özellikleri

- **Real-time Güncelleme:** Firestore listener ile anında güncellenir
- **Dismiss Yönetimi:** Kullanıcı banner'ı kapatırsa AsyncStorage'da saklanır
- **Kalıcı Banner:** `persistent: true` ise kapatılamaz
- **CTA Desteği:** Buton ve link desteği
- **Portal Kullanımı:** React Native Paper Portal ile üstte gösterilir

---

## 📱 Push Bildirim Sistemi

### Push Akışı (Global Mode)

```
1. Admin Panel → Push Oluştur
   ↓
2. AdminControlService.sendPushNotification()
   ↓
3. Firestore: adminPushQueue → Yeni doküman eklenir
   ↓
4. Cloud Function: processAdminPushQueue tetiklenir
   ↓
5. Audience filtreleme (all/students/clubs)
   ↓
6. Token toplama (Expo + FCM)
   ↓
7. Expo Push API → Expo token'lara gönder
   ↓
8. FCM API → FCM token'lara gönder
   ↓
9. Firestore: adminPushQueue → Sonuçlar güncellenir (stats, delivered, status)
   ↓
10. Tüm cihazlara push bildirimi gönderilir
```

### Push Akışı (Local-Only Mode)

```
1. Admin Panel → Push Oluştur (localOnly: true)
   ↓
2. AdminControlService.sendPushNotification()
   ↓
3. Firestore: adminPushQueue → Yeni doküman eklenir
   ↓
4. Cloud Function: processAdminPushQueue → localOnly olduğu için atlanır
   ↓
5. AdminPushListener Component → Real-time listener tetiklenir
   ↓
6. Expo Notification API → Sadece uygulama açıkken gösterilir
```

### Push Özellikleri

- **Audience Filtering:** Tüm kullanıcılar, sadece öğrenciler, sadece kulüpler
- **Dual Token Support:** Expo Push Token + FCM Token
- **Delivery Modes:** Global (uygulama kapalıyken bile) veya Local-Only (sadece uygulama açıkken)
- **Statistics:** Gönderim istatistikleri (sent, failed, errors)
- **Error Handling:** Detaylı hata raporlama

---

## 🗑️ Silme İşlemleri

### 1. Banner Silme

**Frontend (Admin Panel):**

```typescript
const handleClearBanner = async () => {
  await AdminControlService.clearBanner();
};
```

**Backend (AdminControlService):**

```typescript
async clearBanner(): Promise<void> {
  await ADMIN_DOC_REF.set({
    banner: {
      enabled: false,
      message: '',
      title: '',
      updatedAt: FieldValue.serverTimestamp(),
    },
  }, { merge: true });
}
```

**Firestore Sonucu:**

```javascript
{
  banner: {
    enabled: false,  // Banner devre dışı
    message: '',     // Mesaj temizlendi
    title: '',       // Başlık temizlendi
    updatedAt: Timestamp
  }
}
```

**GlobalAdminBanner Component:**

```typescript
// Banner enabled: false olduğunda otomatik gizlenir
useEffect(() => {
  if (banner && banner.enabled) {
    setVisible(true);
  } else {
    setVisible(false);  // ⭐ Banner gizlenir
  }
}, [banner]);
```

---

### 2. Push Queue Silme

**Firestore Rules:**

```javascript
match /adminPushQueue/{messageId} {
  allow delete: if 
    isAuthenticated() && 
    (isAdmin() || request.auth.token.email == 'cayankuzu.0@gmail.com');
}
```

**Manuel Silme (Firebase Console veya Admin Panel):**

```typescript
// Admin panelinde silme butonu eklenebilir
const handleDeletePush = async (messageId: string) => {
  await firestore.collection('adminPushQueue').doc(messageId).delete();
};
```

**Otomatik Temizleme (Cloud Function - Opsiyonel):**

```typescript
// Eski push'ları otomatik temizle (30 günden eski)
export const cleanupOldPushQueue = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const oldPushes = await admin.firestore()
      .collection('adminPushQueue')
      .where('createdAt', '<', thirtyDaysAgo)
      .get();

    const batch = admin.firestore().batch();
    oldPushes.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Cleaned up ${oldPushes.size} old push queue items`);
  });
```

---

### 3. Admin Kullanıcı Dokümanı Silme

**Firestore Rules:**

```javascript
match /users/{userId} {
  allow delete: if isAdmin();
}
```

**Manuel Silme:**

```typescript
// Sadece admin silebilir
const deleteUser = async (userId: string) => {
  await firestore.collection('users').doc(userId).delete();
};
```

---

## 🚀 Kurulum Adımları

### 1. Firebase Projesi Kurulumu

```bash
# Firebase CLI kurulumu
npm install -g firebase-tools

# Firebase'e giriş yap
firebase login

# Projeyi başlat
firebase init

# Firestore'u seç
# Functions'ı seç
# Hosting'i seç (opsiyonel)
```

---

### 2. Firestore Security Rules

**Dosya:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper fonksiyonlar
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return request.auth != null && 
             request.auth.token.email == 'YOUR_ADMIN_EMAIL@example.com' &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Admin Configs
    match /adminConfigs/{configId} {
      allow read: if true;
      allow create, update: if isAuthenticated() && (isAdmin() || request.auth.token.email == 'YOUR_ADMIN_EMAIL@example.com');
      allow delete: if isAuthenticated() && (isAdmin() || request.auth.token.email == 'YOUR_ADMIN_EMAIL@example.com');
    }
    
    // Admin Push Queue
    match /adminPushQueue/{messageId} {
      allow read: if true;
      allow create: if isAuthenticated() && (isAdmin() || request.auth.token.email == 'YOUR_ADMIN_EMAIL@example.com');
      allow update: if false; // Sadece Cloud Functions güncelleyebilir
      allow delete: if isAuthenticated() && (isAdmin() || request.auth.token.email == 'YOUR_ADMIN_EMAIL@example.com');
    }
  }
}

// Deploy
firebase deploy --only firestore:rules
```

---

### 3. Cloud Functions Kurulumu

**Dosya:** `functions/package.json`

```json
{
  "name": "functions",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "20"
  },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

**Dosya:** `functions/src/index.ts`

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const processAdminPushQueue = functions.firestore
  .document('adminPushQueue/{messageId}')
  .onCreate(async (snap, context) => {
    // Yukarıdaki kodları buraya ekle
  });
```

**Deploy:**

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

---

### 4. Frontend Kurulumu

**A. Admin Session Manager**

```typescript
// src/services/adminSessionManager.ts
// Yukarıdaki kodu ekle
```

**B. Admin Control Service**

```typescript
// src/services/adminControlService.ts
// Yukarıdaki kodu ekle
```

**C. Admin Panel Screen**

```typescript
// src/screens/Admin/AdminPanelScreen.tsx
// Yukarıdaki kodu ekle
```

**D. Global Admin Banner**

```typescript
// src/components/admin/GlobalAdminBanner.tsx
// Yukarıdaki kodu ekle
```

**E. Admin Push Listener**

```typescript
// src/components/admin/AdminPushListener.tsx
// Yukarıdaki kodu ekle
```

**F. App.tsx Entegrasyonu**

```typescript
import GlobalAdminBanner from './components/admin/GlobalAdminBanner';
import AdminPushListener from './components/admin/AdminPushListener';

const App: React.FC = () => {
  return (
    <Provider>
      <GlobalAdminBanner />
      <AdminPushListener />
      {/* Diğer bileşenler */}
    </Provider>
  );
};
```

**G. Navigation Entegrasyonu**

```typescript
// src/navigation/AuthNavigator.tsx
import AdminPanelScreen from '../screens/Admin/AdminPanelScreen';

<Stack.Screen
  name="AdminPanel"
  component={AdminPanelScreen}
  options={{ headerShown: false }}
/>
```

**H. Login Screen Entegrasyonu**

```typescript
// src/screens/Auth/LoginScreen.tsx
import { ensureAdminSession } from '../../services/adminSessionManager';

// Login fonksiyonunda admin kontrolü ekle
if (email === 'universe' && password === ' universe') {
  await ensureAdminSession();
  navigation.navigate('AdminPanel');
}
```

---

## 📝 Özet

### Admin Paneli Sistemi Özellikleri:

1. ✅ **Güvenli Giriş:** Özel admin hesabı ve Firestore security rules
2. ✅ **Banner Yönetimi:** Real-time banner gösterimi ve yönetimi
3. ✅ **Push Bildirimleri:** Global ve local-only push desteği
4. ✅ **Audience Filtering:** Tüm kullanıcılar, öğrenciler, kulüpler
5. ✅ **Statistics:** Gönderim istatistikleri ve hata raporlama
6. ✅ **Real-time Updates:** Firestore listener'lar ile anında güncelleme
7. ✅ **Dismiss Management:** Banner kapatma yönetimi
8. ✅ **Persistent Banners:** Kapatılamaz banner desteği

### Dosya Yapısı:

```
src/
├── screens/
│   └── Admin/
│       └── AdminPanelScreen.tsx
├── services/
│   ├── adminControlService.ts
│   └── adminSessionManager.ts
├── components/
│   └── admin/
│       ├── GlobalAdminBanner.tsx
│       └── AdminPushListener.tsx
└── screens/
    └── Auth/
        └── LoginScreen.tsx (admin giriş entegrasyonu)

functions/
└── src/
    └── index.ts (processAdminPushQueue)

firestore.rules (security rules)
```

---

## 🔒 Güvenlik Notları

1. **Admin Email:** `cayankuzu.0@gmail.com` yerine kendi admin email'inizi kullanın
2. **Admin Password:** Güçlü bir şifre kullanın
3. **Firestore Rules:** Admin kontrollerini her zaman kontrol edin
4. **Cloud Functions:** Admin işlemlerini Cloud Functions'da yapın
5. **Token Security:** Push token'ları güvenli bir şekilde saklayın

---

## 📚 Ek Kaynaklar

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [FCM (Firebase Cloud Messaging)](https://firebase.google.com/docs/cloud-messaging)

---

**Son Güncelleme:** 2024-12-21
**Versiyon:** 1.0

