# iOS Emülatör ve Çökme Analizi Rehberi

## ⚠️ ÖNEMLİ: Windows'ta iOS Emülatörü

**Windows'ta gerçek iOS emülatörü kurmak MÜMKÜN DEĞİL!** Apple iOS Simulator'ı sadece macOS'ta Xcode ile sağlar.

---

## 🎯 ÇÖZÜM SEÇENEKLERİ

### ✅ **1. EAS Build ile iOS Simulator Build (EN KOLAY)**

Expo Application Services (EAS) kullanarak iOS Simulator build'i alabilirsiniz:

```bash
# iOS Simulator build oluştur
eas build --profile preview --platform ios

# Build tamamlandıktan sonra:
# 1. Build linkini açın
# 2. .app dosyasını indirin
# 3. Mac'iniz varsa Xcode Simulator'da açın
```

**Avantajlar:**
- Mac gerekmez (build için)
- Ücretsiz plan mevcut
- Cloud build altyapısı

**Dezavantajlar:**
- Test için Mac gerekir (simulator'ı açmak için)

---

### ✅ **2. Bulut Mac Servisleri (ÖNERİLEN)**

Mac kiralayarak gerçek iOS Simulator kullanabilirsiniz:

#### **Seçenek A: MacinCloud**
- 💰 **Fiyat:** ~$20-50/ay
- 🌐 **Site:** https://www.macincloud.com
- ✅ **Artılar:** Anında Mac erişimi, Xcode dahil
- ❌ **Eksiler:** Aylık ücret

#### **Seçenek B: AWS EC2 Mac Instances**
- 💰 **Fiyat:** ~$1.08/saat (~$780/ay)
- 🌐 **Site:** https://aws.amazon.com/ec2/instance-types/mac/
- ✅ **Artılar:** Profesyonel, güvenilir
- ❌ **Eksiler:** Pahalı

#### **Seçenek C: MacStadium**
- 💰 **Fiyat:** ~$79-199/ay
- 🌐 **Site:** https://www.macstadium.com
- ✅ **Artılar:** CI/CD için optimize

---

### ✅ **3. Fiziksel iOS Cihaz Kullanımı**

Gerçek iPhone/iPad kullanarak test edebilirsiniz:

```bash
# 1. iOS cihazınızı USB ile bağlayın
# 2. Developer modunu açın (Settings > Privacy & Security > Developer Mode)
# 3. EAS Build ile development build oluşturun:
eas build --profile development --platform ios

# 4. Build linkinden .ipa dosyasını indirin
# 5. Cihazınıza yükleyin (TestFlight veya direkt yükleme)
```

**Avantajlar:**
- Gerçek cihaz performansı
- Mac gerekmez (build için)
- En gerçekçi test

---

### ✅ **4. Apple Developer Portal'dan Crash Log İndirme**

Mac olmadan da crash log'larını analiz edebilirsiniz:

1. **App Store Connect'e girin:**
   - https://appstoreconnect.apple.com
   - My Apps > [Uygulamanız] > TestFlight veya App Store

2. **Crash Reports bölümüne gidin:**
   - Analytics > Crash Reports
   - Veya TestFlight > Crash Reports

3. **Crash log'u indirin:**
   - Çökme tarihini seçin
   - "Download" butonuna tıklayın
   - `.crash` dosyasını indirin

4. **Online Symbolicator kullanın:**
   - https://www.ioscrashlogs.com
   - https://symbolicatecrash.com
   - `.crash` dosyasını ve `.dSYM` dosyanızı yükleyin

---

## 🔍 ÇÖKME ANALİZİ ADIMLARI (Windows'ta)

### Adım 1: Crash Log İndirme

```bash
# EAS Build'den dSYM dosyasını indirin
eas build:list --platform ios
# Build ID'nizi kullanarak:
eas build:download --platform ios [BUILD_ID]
```

### Adım 2: Crash Log Sembolizasyonu

**Seçenek A: Online Tool Kullan**
- https://www.ioscrashlogs.com
- https://symbolicatecrash.com
- Crash log + dSYM yükleyin

**Seçenek B: React Native Crash Analyzer**
```bash
# React Native için özel araçlar
npm install -g react-native-ios-symbolicate
```

### Adım 3: Yaygın Çökme Nedenleri

#### **1. Native Module Hatası**
```typescript
// Kontrol edin: src/ klasöründe native modül kullanımları
// Özellikle: expo-notifications, expo-image-picker, etc.
```

#### **2. Firebase Başlatma Hatası**
```typescript
// Kontrol: Firebase initialization
// iOS'ta Info.plist ayarları
```

#### **3. İzin (Permission) Hatası**
```typescript
// Kontrol: expo-notifications permissions
// iOS'ta Info.plist'te gerekli izinler var mı?
```

#### **4. Asset Yükleme Hatası**
```typescript
// Kontrol: assets/ klasöründeki dosyalar
// Özellikle: büyük görseller, fontlar
```

---

## 🛠️ HIZLI ÇÖKME TESPİTİ (Kod İnceleme)

### Kontrol Listesi:

- [ ] **App.tsx** - Uygulama başlatma kodunu kontrol edin
- [ ] **expo-notifications** - Bildirim başlatma kodunu kontrol edin
- [ ] **Firebase** - Firebase initialization kodunu kontrol edin
- [ ] **Native dependencies** - Tüm native modüller iOS uyumlu mu?
- [ ] **Info.plist** - Gerekli izinler tanımlı mı?
- [ ] **Assets** - Tüm asset'ler doğru yükleniyor mu?

---

## 📱 TEST EDİLMESİ GEREKEN CİHAZLAR

Apple'ın test ettiği cihaz:
- **iPad Air (5. nesil)** - iPadOS 26.0.1

**Dikkat:** iPadOS 26.0.1 çok yeni bir sürüm! Bu sürüm uyumluluğu kontrol edilmeli.

---

## 🚀 PRATİK ÇÖZÜM: En Hızlı Yol

1. **MacinCloud 1 aylık deneme** (varsa) veya en ucuz planı alın
2. **Xcode'u kurun** (Mac'te)
3. **iOS Simulator'ı açın** (iPad Air 5. nesil)
4. **EAS Build ile development build oluşturun:**
   ```bash
   eas build --profile development --platform ios
   ```
5. **Build'i Simulator'a yükleyin ve test edin**

---

## 💡 ÜCRETSİZ ALTERNATİF: Crash Log Analizi

Mac olmadan da çökme analizi yapabilirsiniz:

1. **App Store Connect'ten crash log indirin**
2. **Online symbolicator kullanın** (yukarıdaki linkler)
3. **Stack trace'i analiz edin**
4. **Kodunuzda ilgili satırları bulun**

---

## 📞 DESTEK

- **Expo Discord:** https://discord.gg/expo
- **Apple Developer Forums:** https://developer.apple.com/forums
- **Stack Overflow:** react-native, expo, ios tags

---

## ⚡ SONUÇ

**En hızlı çözüm:** 
1. MacinCloud 1 ay kiralayın (~$20)
2. Xcode kurun
3. iOS Simulator'da test edin

**Ücretsiz çözüm:**
1. Crash log'u App Store Connect'ten indirin
2. Online symbolicator kullanın
3. Kod analizi yapın

**Uzun vadeli çözüm:**
- Mac satın alın (Mac Mini en ucuz seçenek ~$600)
- Veya MacBook Air (en ucuz Mac laptop)







