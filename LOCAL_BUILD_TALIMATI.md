# 🏗️ Local iOS Build - Manuel Build Talimatları

## ✅ Local Build Yapmanın Avantajları
- ✅ Ücretsiz (EAS limit yok)
- ✅ Hızlı (internet hızına bağlı)
- ✅ Tam kontrol

## 📝 ADIM ADIM

### 1. iOS Dependencies Kur
```bash
cd ios
pod install
cd ..
```

### 2. Xcode ile Build Yap

**Seçenek A: Xcode GUI**
```bash
# iOS klasörüne git
cd ios

# Xcode'u aç
open UniverseCampus.xcworkspace

# Xcode'da:
# 1. Yukarıda "Any iOS Device" seç
# 2. Product → Scheme → UniverseCampus seç
# 3. Product → Archive
# 4. Organizer açılır
# 5. "Distribute App" butonuna tıkla
# 6. "App Store Connect" seç
# 7. Upload et
```

**Seçenek B: Terminal ile (Hızlı)**
```bash
cd ios

# Archive oluştur
xcodebuild -workspace UniverseCampus.xcworkspace \
  -scheme UniverseCampus \
  -configuration Release \
  -archivePath build/UniverseCampus.xcarchive \
  archive

# IPA oluştur (Upload için)
xcodebuild -exportArchive \
  -archivePath build/UniverseCampus.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

### 3. ExportOptions.plist Oluştur
```bash
# ios/ExportOptions.plist dosyası oluştur:
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>HBRG8P523Z</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
```

### 4. TestFlight'a Upload

**Manuel Upload (Transporter App):**
1. macOS'te "Transporter" app'i aç
2. IPA dosyasını sürükle-bırak
3. "Deliver" butonuna tıkla
4. Apple ID ile giriş yap
5. Upload tamamlanır (10-20 dakika)

**Alternatif: CLI ile upload**
```bash
xcrun altool --upload-app \
  --file build/UniverseCampus.ipa \
  --apiKey YOUR_API_KEY \
  --apiIssuer YOUR_ISSUER_ID
```

---

## ⚠️ SORUN ÇÖZME

### Pod Install Hatası
```bash
cd ios
pod deintegrate
rm Podfile.lock
pod install
```

### Build Errors
```bash
# Clean build
cd ios
rm -rf build
xcodebuild clean

# Tekrar dene
```

---

## 🎯 BAŞARI KRİTERLERİ

✅ Archive başarılı
✅ IPA dosyası oluşturuldu
✅ TestFlight'a upload edildi
✅ Build listesinde görünüyor

---

**Tavsiye:** Eğer macOS yoksa, Windows'ta EAS bekleyebilirsin veya plan yükseltme yapabilirsin.




