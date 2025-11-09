# Windows'ta iOS Test için Fiziksel Cihaz Kullanımı

## 📱 Fiziksel iPhone/iPad ile Test (ÜCRETSİZ!)

### Adım 1: EAS Build ile Development Build Oluşturun

```bash
# Development build oluşturun (cihazınıza yüklemek için)
eas build --profile development --platform ios
```

### Adım 2: Build'i Cihazınıza Yükleyin

**Seçenek A: TestFlight (ÖNERİLEN)**
```bash
# 1. Production build oluşturun
eas build --platform ios --profile production

# 2. TestFlight'a gönderin
eas submit --platform ios

# 3. App Store Connect'ten TestFlight'a ekleyin
# 4. Cihazınızda TestFlight app'i ile yükleyin
```

**Seçenek B: Direkt Yükleme (Developer Account Gerekli)**
- Build linkinden .ipa dosyasını indirin
- iTunes/Finder ile cihazınıza yükleyin
- Developer mode'u açın (Settings > Privacy & Security > Developer Mode)

### Adım 3: Crash Log'ları Toplayın

**Windows'ta Crash Log Analizi:**
1. Cihazınızda uygulamayı çalıştırın
2. Çökme olduğunda cihaz log'larını toplayın:
   - Windows'ta: iTunes/Finder ile cihazı bağlayın
   - Log'ları manuel olarak çıkarın
3. Veya App Store Connect'ten crash log indirin:
   - https://appstoreconnect.apple.com
   - My Apps > Universe > Analytics > Crash Reports

### Avantajlar:
- ✅ Ücretsiz (cihazınız varsa)
- ✅ Gerçek cihaz performansı
- ✅ En gerçekçi test

### Dezavantajlar:
- ❌ Crash log analizi zor (Mac gerekir)
- ❌ Her test için build gerekir






