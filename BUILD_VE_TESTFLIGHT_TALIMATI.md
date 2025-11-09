# 🚀 Yeni Build ve TestFlight'a Gönderme Talimatları

## 📋 ÖNEMLİ NOTLAR

### ✅ Crash Düzeltmeleri Tamamlandı
- ✅ AuthContext.tsx - Firebase lazy loading
- ✅ firebase/index.ts - Lazy getter'lar
- ✅ App.tsx - Global error handler iyileştirmeleri
- ✅ Tüm kritik crash noktaları düzeltildi

### 📱 Build Bilgileri
- **Version:** 1.5.1
- **iOS Build Number:** 42 (otomatik artacak)
- **Android Version Code:** 500 (otomatik artacak)

---

## 🍎 iOS BUILD VE TESTFLIGHT'A GÖNDERME

### ⚠️ ÖNEMLİ: Terminal'de Manuel Çalıştırın

Bu komutlar interactive mode gerektiriyor. Terminal'de manuel olarak çalıştırmanız gerekiyor.

### Adım 1: iOS Build Oluştur

**Terminal'de şu komutu çalıştırın:**

```bash
cd C:\Users\lenovo\Desktop\Universe
eas build --platform ios --profile production
```

**Build sırasında sorulacak sorular:**
1. **"Do you want to log in to your Apple account?"** → `y` (Yes)
2. Apple ID ve şifre girin (cayankuzu.0@gmail.com)
3. İki faktörlü doğrulama kodu girin (telefonunuza gelecek)

**İşlem Süresi:** 15-30 dakika

**Build sırasında:**
- ✅ Credentials kontrol edilecek
- ✅ Build number otomatik artacak (42 → 43)
- ✅ IPA dosyası oluşturulacak

### Adım 2: Build Tamamlandıktan Sonra

Build başarılı olduğunda:
```
✅ Build completed successfully!
Build ID: [build-id]
IPA URL: [ipa-url]
```

### Adım 3: TestFlight'a Otomatik Gönderme

```bash
eas submit --platform ios
```

**Bu komut:**
- ✅ Son build'i otomatik bulur
- ✅ TestFlight'a yükler
- ✅ App Store Connect'e bağlanır

**İşlem Süresi:** 5-10 dakika

### Adım 4: TestFlight'ta Aktif Etme

**App Store Connect'te:**
1. https://appstoreconnect.apple.com → **My Apps** → **Universe Campus**
2. **TestFlight** sekmesine git
3. **iOS Builds** bölümünde yeni build'i bul (Version 1.5.1, Build 43)
4. Build'in yanında **"+"** butonuna tıkla
5. **"Add to Test Group"** seç
6. **Internal Testing** grubunu seç (veya oluştur)
7. **"Add"** tıkla

✅ **Build artık TestFlight'ta aktif!**

---

## 🤖 ANDROID AAB BUILD

### Adım 1: Android Credentials Kontrol

Android için keystore gerekli. Önce credentials'ı kontrol et:

```bash
eas credentials
```

**Seçenek A: Mevcut Keystore Varsa**
- Remote credentials kullanılacak
- Build direkt başlayacak

**Seçenek B: Keystore Yoksa**
- Yeni keystore oluşturulacak
- Interactive mode'da çalıştırılmalı

### Adım 2: Android AAB Build

```bash
eas build --platform android --profile production
```

**İşlem Süresi:** 15-30 dakika

**Build sırasında:**
- ✅ Version code otomatik artacak (500 → 501)
- ✅ AAB dosyası oluşturulacak

### Adım 3: Google Play Store'a Gönderme (Opsiyonel)

```bash
eas submit --platform android
```

**Not:** Google Play Console'da app hazır olmalı.

---

## 🔧 MANUEL BUILD (Alternatif)

### iOS için Xcode ile (Mac Gerekli)

```bash
cd ios
pod install
cd ..
npx expo prebuild --platform ios
```

Sonra Xcode'da:
1. `ios/UniverseCampus.xcworkspace` aç
2. Product → Archive
3. Organizer → Distribute App → App Store Connect

### Android için (Local)

```bash
cd android
./gradlew bundleRelease
```

AAB dosyası: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 📊 BUILD DURUMU TAKİBİ

### EAS Build Dashboard
https://expo.dev/accounts/[account]/builds

### App Store Connect
https://appstoreconnect.apple.com/apps/6754333896/testflight/ios

---

## ⚠️ ÖNEMLİ NOTLAR

### 1. Credentials Sorunu
- Eğer credentials hatası alırsanız, interactive mode'da çalıştırın
- `--non-interactive` flag'ini kaldırın

### 2. Build Number
- iOS: Otomatik artacak (42 → 43)
- Android: Otomatik artacak (500 → 501)

### 3. TestFlight Processing
- Build yüklendikten sonra Apple 5-10 dakika işleyecek
- Email bildirimi gelecek
- App Store Connect'te görünecek

### 4. Crash Fix'leri
- ✅ Tüm kritik crash noktaları düzeltildi
- ✅ Firebase lazy loading aktif
- ✅ Global error handler aktif
- ✅ iOS-specific crash prevention aktif

---

## 🎯 HIZLI BAŞLANGIÇ

### iOS Build + TestFlight (Tek Komut)

```bash
# Build oluştur
eas build --platform ios --profile production

# Build tamamlandıktan sonra (başka terminal'de)
eas submit --platform ios
```

### Android AAB Build

```bash
eas build --platform android --profile production
```

---

## ✅ BAŞARI KONTROLÜ

### iOS Build Başarılı:
```
✅ Build completed successfully!
✅ IPA URL: [url]
```

### TestFlight Submit Başarılı:
```
✅ Successfully submitted to App Store Connect
✅ Processing: Build is being processed by Apple
```

### TestFlight'ta Görünür:
- App Store Connect → TestFlight → iOS Builds
- Version 1.5.1, Build 43 görünecek
- "+" butonuna tıklayıp test grubuna ekleyebilirsiniz

---

## 📞 DESTEK

Sorun olursa:
1. Build log'larını kontrol edin: https://expo.dev/builds
2. Credentials'ı kontrol edin: `eas credentials`
3. EAS CLI'yi güncelleyin: `npm install -g eas-cli@latest`

