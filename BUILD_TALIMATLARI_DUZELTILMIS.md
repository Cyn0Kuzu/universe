# 🚀 Build Talimatları - Düzeltilmiş Versiyon

## ✅ Yapılan Düzeltmeler

1. ✅ `app.json` - `cli.appVersionSource: "remote"` eklendi
2. ✅ `eas.json` - `cli.appVersionSource: "remote"` eklendi
3. ✅ EAS CLI güncellendi (v16.26.0)

---

## 🤖 ANDROID AAB BUILD

### Komut:
```bash
cd C:\Users\lenovo\Desktop\Universe
eas build --platform android --profile production
```

### Build Sırasında:
- ✅ Version code otomatik artacak (500 → 501)
- ✅ AAB dosyası oluşturulacak
- ✅ İşlem süresi: 15-30 dakika

### Build Tamamlandıktan Sonra:
AAB dosyası hazır olacak. Google Play Console'a manuel yükleyebilirsiniz.

---

## 🍎 iOS BUILD VE TESTFLIGHT

### Adım 1: iOS Build

**Terminal'de çalıştırın:**
```bash
cd C:\Users\lenovo\Desktop\Universe
eas build --platform ios --profile production
```

**Build sırasında sorulacak:**
1. **"Do you want to log in to your Apple account?"** → `y` (Yes)
2. Apple ID: `cayankuzu.0@gmail.com`
3. Şifre: (Apple ID şifreniz)
4. İki faktörlü doğrulama kodu: (Telefonunuza gelecek)

**Build sırasında:**
- ✅ Build number otomatik artacak (42 → 43)
- ✅ IPA dosyası oluşturulacak
- ✅ İşlem süresi: 15-30 dakika

### Adım 2: TestFlight'a Otomatik Gönderme

Build tamamlandıktan sonra:
```bash
eas submit --platform ios
```

**Bu komut:**
- ✅ Son build'i otomatik bulur
- ✅ TestFlight'a yükler
- ✅ App Store Connect'e bağlanır

### Adım 3: TestFlight'ta Aktif Etme

1. https://appstoreconnect.apple.com → **My Apps** → **Universe Campus**
2. **TestFlight** sekmesine git
3. **iOS Builds** bölümünde yeni build'i bul
4. Build'in yanında **"+"** butonuna tıkla
5. **"Add to Test Group"** seç
6. **Internal Testing** grubunu seç
7. **"Add"** tıkla

✅ **Build artık TestFlight'ta aktif!**

---

## 📊 BUILD DURUMU TAKİBİ

### EAS Build Dashboard:
https://expo.dev/accounts/[account]/builds

### App Store Connect:
https://appstoreconnect.apple.com/apps/6754333896/testflight/ios

---

## ⚠️ ÖNEMLİ NOTLAR

### 1. Interactive Mode
- Build komutları interactive mode gerektiriyor
- Terminal'de manuel çalıştırmanız gerekiyor
- Apple ID girişi yapmanız gerekecek

### 2. Build Number
- iOS: Otomatik artacak (42 → 43)
- Android: Otomatik artacak (500 → 501)

### 3. Crash Fix'leri
- ✅ Tüm kritik crash noktaları düzeltildi
- ✅ Firebase lazy loading aktif
- ✅ Global error handler aktif
- ✅ iOS-specific crash prevention aktif

---

## 🎯 HIZLI BAŞLANGIÇ

### Android AAB:
```bash
cd C:\Users\lenovo\Desktop\Universe
eas build --platform android --profile production
```

### iOS + TestFlight:
```bash
# 1. Build oluştur
cd C:\Users\lenovo\Desktop\Universe
eas build --platform ios --profile production

# 2. Build tamamlandıktan sonra TestFlight'a gönder
eas submit --platform ios
```

---

## ✅ BAŞARI KONTROLÜ

### Build Başarılı:
```
✅ Build completed successfully!
✅ Build ID: [build-id]
✅ Download URL: [url]
```

### TestFlight Submit Başarılı:
```
✅ Successfully submitted to App Store Connect
✅ Processing: Build is being processed by Apple
```

---

## 📞 SORUN GİDERME

### Credentials Hatası:
```bash
eas credentials
```

### Build Log Kontrol:
https://expo.dev/builds

### EAS CLI Güncelleme:
```bash
npm install -g eas-cli@latest
```

