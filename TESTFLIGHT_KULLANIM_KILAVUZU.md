# 📱 TestFlight Kullanım Kılavuzu

## 🚀 Uygulamanızı TestFlight'a Yükleme

### Adım 1: Build Oluşturma
```bash
eas build --platform ios --profile production
```

Build başarılı olduktan sonra, `.ipa` dosyası hazır olacak.

### Adım 2: TestFlight'a Submit Etme

**Otomatik Yöntem (Önerilen):**
```bash
eas submit --platform ios
```

Bu komut:
- ✅ Build'i otomatik bulur
- ✅ TestFlight'a yükler
- ✅ App Store Connect'e bağlanır

**Manuel Yöntem:**
1. App Store Connect'e girin: https://appstoreconnect.apple.com
2. **My Apps** → **Universe Campus** seçin
3. **TestFlight** sekmesine gidin
4. **iOS Builds** bölümünde **+** butonuna tıklayın
5. Build'i seçin ve **Submit** edin

---

## 👥 Test Uygulaması Ekleme (Internal Testing)

### 1. Test Kullanıcısı Eklemek

**App Store Connect'te:**
1. **Users and Access** → **Users** sekmesine gidin
2. **+** butonuna tıklayın
3. **Email** girin
4. **Role:** Internal Tester seçin
5. **Send Invitation** tıklayın

**Kullanıcı Email'i Alacak:**
- TestFlight uygulamasını App Store'dan indirmesi gerekir
- Email'deki link'e tıklayarak test kullanıcısı olarak eklenir

### 2. Internal Testing Grubu Oluşturma

1. **TestFlight** → **Internal Testing** → **Groups**
2. **+** butonuna tıklayın
3. Grup adı: "Internal Testers" gibi bir isim verin
4. Build'i bu gruba atayın

---

## 📲 TestFlight Uygulamasından Uygulama Yükleme

### Test Kullanıcısı İçin:

1. **App Store'dan TestFlight'u İndir:**
   - App Store'da "TestFlight" ara
   - Apple'ın resmi TestFlight uygulamasını indir

2. **Email'i Kontrol Et:**
   - App Store Connect'ten gönderilen davet email'ini aç
   - **"View in TestFlight"** linkine tıkla
   - Veya TestFlight uygulamasını aç ve email ile giriş yap

3. **Uygulamayı Yükle:**
   - TestFlight uygulamasında **"Universe Campus"** görünecek
   - **"Install"** veya **"Update"** butonuna tıkla
   - Uygulama cihaza yüklenecek

4. **Güncellemeleri Al:**
   - Yeni build yüklendiğinde bildirim gelir
   - TestFlight uygulamasında **"Update"** butonu görünür
   - Otomatik güncelleme de çalışır

---

## 🔄 Yeni Versiyon Yükleme ve Güncelleme

### Geliştirici (Siz) İçin:

**1. Yeni Build Oluştur:**
```bash
eas build --platform ios --profile production
```

**2. TestFlight'a Submit Et:**
```bash
eas submit --platform ios
```

**3. Test Kullanıcıları Otomatik Bildirilir:**
- Email bildirimi gönderilir
- TestFlight uygulamasında "Update Available" gösterilir

### Test Kullanıcısı İçin:

**Yeni Versiyonu Güncellemek:**
1. TestFlight uygulamasını aç
2. **"Universe Campus"** uygulamasını bul
3. **"Update"** butonu görünürse tıkla
4. Veya otomatik güncelleme açıksa bekleyin

**Hangi Versiyonu Kullanıyorum?**
1. TestFlight'ta uygulamayı aç
2. **"Version"** bilgisi görünür
3. Örnek: "Version 1.5.1 (35)"

---

## 🎯 TestFlight'tan Doğru Versiyonu Seçme

### Birden Fazla Build Varsa:

1. **App Store Connect** → **TestFlight** → **iOS Builds**
2. Tüm build'ler listelenir:
   - ✅ Version 1.5.1 (35) - Aktif
   - ⏸️ Version 1.5.0 (30) - Eski
   - ⏸️ Version 1.4.3 (29) - Eski

3. **Hangi Build'i Test Edilecek?**
   - En son yüklenen build otomatik aktif olur
   - Eski build'i seçmek için: **"..."** → **"Expire"** veya silin

4. **Test Grubuna Atama:**
   - Build'in yanında **"Add to Group"** butonuna tıklayın
   - Test grubunu seçin (Internal Testing veya External Testing)

---

## ✅ TestFlight Kontrol Listesi

### Build Yüklemeden Önce:
- [ ] Version ve build number doğru mu? (`app.json`)
- [ ] Crash fix'leri uygulandı mı?
- [ ] Firebase initialization basitleştirildi mi?
- [ ] ATT (App Tracking Transparency) eklendi mi?
- [ ] Support URL doğru mu?

### TestFlight'a Yükleme:
- [ ] Build başarılı oldu mu?
- [ ] `eas submit` komutu çalıştı mı?
- [ ] App Store Connect'te build görünüyor mu?
- [ ] Test grubuna atandı mı?

### Test Kullanıcıları İçin:
- [ ] Email davetiyesi gönderildi mi?
- [ ] TestFlight uygulaması indirildi mi?
- [ ] Uygulama yüklendi mi?
- [ ] Versiyon bilgisi doğru mu?

---

## 🐛 Sorun Giderme

### "Build Not Found" Hatası:
- Build'in tamamlanmasını bekleyin (EAS Dashboard'da kontrol edin)
- Build ID'yi manuel olarak verin:
  ```bash
  eas submit --platform ios --id BUILD_ID
  ```

### TestFlight'ta Uygulama Görünmüyor:
- Test grubuna atandığından emin olun
- Build'in işlenmesi 5-10 dakika sürebilir
- Apple'ın onay süreci (bazen 24 saat)

### "Update Available" Görünmüyor:
- TestFlight uygulamasını yeniden başlatın
- Yeni build'in test grubuna atandığından emin olun
- App Store Connect'te build durumunu kontrol edin

### Crash Oluyor:
- Logları kontrol edin: TestFlight → Uygulama → **"View Crash Reports"**
- Xcode Console logları inceleyin
- Firebase initialization loglarını kontrol edin

---

## 📊 Build Durumunu Kontrol Etme

### EAS Dashboard:
1. https://expo.dev/accounts/cayan/projects/universe-kampus/builds
2. Build durumunu görün:
   - 🟡 **in progress** - Build devam ediyor
   - 🟢 **finished** - Build tamamlandı
   - 🔴 **errored** - Build başarısız

### App Store Connect:
1. https://appstoreconnect.apple.com
2. **TestFlight** → **iOS Builds**
3. Build durumu:
   - ⏳ **Processing** - İşleniyor
   - ✅ **Ready to Submit** - TestFlight'a hazır
   - ❌ **Invalid** - Hatalı

---

## 🎓 Önemli Notlar

### Version ve Build Number:
- **Version:** `1.5.1` (app.json'da `version`)
- **Build Number:** `35` (app.json'da `ios.buildNumber`)
- Her build için build number artırılmalı!

### Crash Fix'ler:
- ✅ Firebase initialization basitleştirildi
- ✅ Persistence kaldırıldı (iOS crash önlemi)
- ✅ `isMounted` flag eklendi (unmounted component crash önlemi)
- ✅ `useCallback` kullanıldı (race condition önlemi)

### App Store Connect Ayarları:
- **Support URL:** `https://cyn0kuzu.github.io/universe/` ✅
- **Privacy Labels:** "Used to Track You" = OFF ✅
- **Screenshots:** Doğru iOS cihaz görüntüleri ✅

---

## 🚀 Hızlı Komutlar

```bash
# Build oluştur
eas build --platform ios --profile production

# TestFlight'a yükle
eas submit --platform ios

# Build durumunu kontrol et
eas build:list --platform ios --limit 1

# Build loglarını gör
eas build:view [BUILD_ID]
```

---

**🎉 Artık crash olmayan, stabil versiyon TestFlight'ta!**

Sorun olursa:
- EAS Dashboard: https://expo.dev
- App Store Connect: https://appstoreconnect.apple.com
- Build logları: `eas build:view [BUILD_ID]`


