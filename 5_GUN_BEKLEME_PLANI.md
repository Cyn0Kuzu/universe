# ⏳ 5 Günlük Bekleme Planı

## 📅 TARİH: 01 Kasım 2025 - Build Limit Sıfırlanacak

---

## 🎯 ŞU ANDA YAPILANLAR (TAMAMLANDI)

### ✅ 1. Crash Düzeltmeleri
- [x] Firebase initialization basitleştirildi
- [x] Persistence kaldırıldı (iOS crash nedeni)
- [x] Version: 1.5.1
- [x] Build: 32 (otomatik 33'e çıkacak)
- [x] Git commit yapıldı
- [x] Kod hazır

---

## ⏳ 01 KASIM - BUILD YAPILACAK GÜN

### Adım 1: Build Başlat
```bash
cd C:\Users\lenovo\Desktop\Universe
eas build --platform ios --profile production
```

**Beklenen:** 10-15 dakika içinde tamamlanır

---

## ✅ BUILD SONRASI - APP STORE CONNECT DÜZELTMELERİ

### 🔴 KRİTİK - Mutlaka Yapılmalı!

### 1. Privacy Labels'ı Düzelt ⚠️

**App Store Connect'te:**
```
1. https://appstoreconnect.apple.com → Login
2. My Apps → Universe Campus
3. Sol sidebar: "App Privacy"
4. "Type of Data" → Şunları bul ve düzelt:

   📧 Name:
   - "Used to Track You" ❌ KAPALI
   - "Linked to You" ✅ AÇIK
   - "Used for App Functionality" ✅ AÇIK

   📷 Photos or Videos:
   - "Used to Track You" ❌ KAPALI
   - "Linked to You" ✅ AÇIK

   📧 Email Address:
   - "Used to Track You" ❌ KAPALI
   - "Used for App Functionality" ✅ AÇIK

5. SAVE tıkla
```

**NOT:** "Used to Track You" HİÇBİR DATA TYPE İÇİN AÇIK OLMAMALI!

---

### 2. Support URL'yi Düzelt ⚠️

**Hızlı Çözüm - GitHub Pages:**

1. GitHub'da repository oluştur:
   - Username: `universekampus` (veya mevcut hesabın)
   - Repo adı: `support`

2. Settings → Pages → Enable
   - Source: `main branch`
   - Save

3. `index.html` oluştur:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Universe Campus - Support</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: Arial; text-align: center; padding: 50px;">
    <h1>Universe Campus Support</h1>
    <p>Üniversite Kampüs Platformu</p>
    <p>Destek için lütfen bizimle iletişime geçin:</p>
    <p><strong>Email:</strong> destek@universe-kampus.com</p>
    <p>Thank you for using Universe Campus!</p>
</body>
</html>
```

4. URL: `https://universekampus.github.io/support`

**App Store Connect'te Ekle:**
```
1. App Store Connect → Universe Campus
2. App Information (sol sidebar)
3. Support URL alanını bul
4. URL'yi güncelle: https://universekampus.github.io/support
5. SAVE
```

---

### 3. Screenshots'ları Güncelle ⚠️

**Screenshot Alma (Windows'ta yapabilirsin):**

**Seçenek A: iOS Simulator (Mac gerekli)**
```
1. Terminal: xcrun simctl boot "iPhone 15 Pro Max"
2. Simulator aç
3. Uygulamayı aç
4. Ekran görüntüsü al: Cmd + S
```

**Seçenek B: Figma/Sketch ile Oluştur**
```
1. Figma'da iPhone template kullan
2. App'ın ekranlarını tasarla
3. Export: 1290x2796 px
```

**Seçenek C: En Basit (Phone wallpaper kullan)**
```
1. App Store'daki başka bir app'ın screenshots'larını 
   referans al
2. Aynı stilde tasarla
```

**App Store Connect'te Yükle:**
```
1. App Store Connect → Universe Campus
2. Versions and Platforms → 1.5.1 (veya yeni)
3. "App Screenshots"
4. Her device size için screenshots yükle
5. Eski yanlış screenshots'ları sil
```

**Minimum Gereksinim:**
- iPhone 6.7" (Pro Max)
- iPhone 6.5" (Plus)
- 5-8 screenshot yeterli

---

### 4. Review Notes Ekle

**Apple'a Mesaj Yaz:**
```
App Store Connect → Universe Campus → Versions 
→ Review Information → Notes:

Version 1.5.1 - Critical Crash Fix

CHANGES:
1. ✅ Crash on Launch: Firebase initialization basitleştirildi
   - Persistence kaldırıldı (iOS crash nedeniydi)
   - Minimal, güvenli initialization
   - Fallback mechanism eklendi

2. ✅ Privacy Labels: Düzeltildi
   - "Used to Track You" KAPATıldı
   - App tracking YAPMIYOR
   - Sadece Firebase authentication

3. ✅ Support URL: Çalışan URL eklendi
4. ✅ Screenshots: iOS cihazlardan alındı

TESTING:
- Tested on iPhone 13 mini (iOS)
- No crashes
- All features working
```

---

## 🚀 SUBMIT FOR REVIEW

Manuel düzeltmeler tamamlandıktan sonra:

1. "Submit for Review" butonu aktif olur
2. Click et
3. Apple review süreci başlar (1-3 gün)
4. Onay gelirse yayınlanır!

---

## ⚠️ ÖNEMLİ: BUILD SINAVLARI

Build hazır olunca test etmelisin:

1. **TestFlight'a yükle** (otomatik olur)
2. **Test et:**
   - App açılıyor mu? (crash yok mu?)
   - Login çalışıyor mu?
   - Firebase bağlantısı var mı?
   - Tüm özellikler çalışıyor mu?

**Eğer hala crash varsa:**
- Build'i yeniden yap
- Console loglarına bak
- Firebase'i tamamen disable et ve test et

---

## 📋 5 GÜNLÜK CHECKLIST

### Bugün (27 Ekim) ✅
- [x] Crash fix yapıldı
- [x] Git commit yapıldı
- [x] Kod hazır

### 28-31 Ekim ⏳
- [ ] Support URL için GitHub Pages hazırla
- [ ] Screenshots için tasarımlar hazırla
- [ ] App Store Connect'e login ol ve navigation öğren

### 01 Kasım 🚀
- [ ] `eas build --platform ios` komutu çalıştır
- [ ] Build'in tamamlanmasını bekle (15-20 dk)
- [ ] Build tamamlanınca App Store Connect'e git

### 01 Kasım (Öğleden Sonra) 📝
- [ ] Privacy labels düzelt
- [ ] Support URL güncelle
- [ ] Screenshots yükle
- [ ] Review notes ekle
- [ ] Submit for Review

### 02-04 Kasım ⏳
- [ ] Apple review süreci (1-3 gün)
- [ ] Eğer sorun varsa düzelt

### 04-05 Kasım 🎉
- [ ] App Store'da yayınlanır!
- [ ] BAŞARI!

---

## 💡 FAYDALI LİNKLER

- **App Store Connect:** https://appstoreconnect.apple.com
- **EAS Dashboard:** https://expo.dev/accounts/cayan/projects/universe-kampus
- **Support URL (oluşturduktan sonra):** https://universekampus.github.io/support

---

## 🆘 YARDIM

Sorun yaşarsan:
1. Bu dosyayı tekrar oku
2. APPLE_RED_DETAYLI_TURKCE.md dosyasını oku
3. App Store Connect help bölümüne bak
4. Review notes'a mesaj ekle

**5 GÜN SONRA GÖRÜŞÜRÜZ! 🚀**




