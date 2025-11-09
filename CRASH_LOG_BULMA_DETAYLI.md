# iOS Crash Log Bulma - Detaylı Rehber

## 🔍 CRASH LOG'LARI NEREDE BULUNUR?

Apple'ın review mesajında "attached detailed crash logs" diyor ama TestFlight > Crash Feedback'de görünmüyor. İşte crash log'larını bulmanın yolları:

---

## 🎯 YÖNTEM 1: Review Mesajının Kendisinde (EN OLASI)

### Adım 1: Review Mesajını Açın
1. App Store Connect'e girin
2. My Apps > Universe
3. "Messages" sekmesine gidin
4. Apple'ın mesajını açın (Nov 3, 2025 tarihli)

### Adım 2: Eklere Bakın
- Mesajın altında **"Attachments"** veya **"Download"** butonu olabilir
- Veya mesajın içinde **crash log linki** olabilir
- **"View Details"** veya **"Download Crash Report"** butonuna tıklayın

### Adım 3: Crash Log İndirin
- Eğer ek varsa, direkt indirebilirsiniz
- `.crash` veya `.txt` dosyası olabilir

---

## 🎯 YÖNTEM 2: Analytics > Crash Reports (EN GÜVENİLİR)

### Adım 1: Analytics Bölümüne Gidin
1. App Store Connect > My Apps > Universe
2. Üst menüden **"Analytics"** sekmesine tıklayın
3. Sol menüden **"Crash Reports"** seçin

### Adım 2: Crash Log'ları Filtreleyin
- **Tarih:** Nov 3, 2025 civarı
- **Version:** 1.0 veya 1.5.1
- **Device:** iPad Air (5th generation)
- **OS Version:** iPadOS 26.0.1

### Adım 3: Crash Log İndirin
- Listeden crash'i seçin
- **"Download"** butonuna tıklayın
- `.crash` dosyası indirilir

---

## 🎯 YÖNTEM 3: Submission Details Sayfasında

### Adım 1: Submission Details'e Gidin
1. App Store Connect > My Apps > Universe
2. **"App Store"** sekmesine gidin
3. **"iOS App"** > **"Version History"** 
4. **Version 1.0** veya **1.5.1** build'ine tıklayın
5. Submission Details sayfasına gidin

### Adım 2: Crash Log'ları Kontrol Edin
- Submission Details sayfasında **"Crash Reports"** bölümü olabilir
- Veya **"Review Information"** altında olabilir

---

## 🎯 YÖNTEM 4: Email Kontrolü

### Apple'dan Email Geldi mi?
- Apple genellikle crash log'larını **email ile de gönderir**
- Email'inizi kontrol edin:
  - Gelen kutusu
  - Spam klasörü
  - Apple Developer hesabınıza kayıtlı email

---

## 🎯 YÖNTEM 5: EAS Build'den Crash Log İndirme

### Build ID'nizi Bulun
```bash
# Submission ID: 8878a6ea-fee4-47c6-b364-d4efaa1bcf22
# Bu submission ID ile ilişkili build'i bulun

# 1. Build listesini görün
eas build:list --platform ios

# 2. Nov 3-4 tarihli build'i bulun
# 3. Build ID'yi kopyalayın
```

### Crash Log ve dSYM İndirin
```bash
# Build ID ile crash log ve dSYM indirin
eas build:download --platform ios [BUILD_ID]

# İndirilen dosyalar:
# - .crash dosyası (eğer varsa)
# - .dSYM dosyası (symbolication için)
```

---

## 🔍 ADIM ADIM CRASH LOG BULMA

### Senaryo 1: Review Mesajında Ek Var

1. **App Store Connect'e girin**
2. **My Apps > Universe**
3. **"Messages" sekmesine gidin**
4. **Nov 3, 2025 tarihli mesajı açın**
5. **Mesajın altında "Attachments" veya "Download" butonunu arayın**
6. **Crash log'u indirin**

### Senaryo 2: Analytics'te Var

1. **App Store Connect > My Apps > Universe**
2. **Üst menüden "Analytics" sekmesine gidin**
3. **Sol menüden "Crash Reports" seçin**
4. **Tarih filtresi:** Nov 3-4, 2025
5. **Version filtresi:** 1.0 veya 1.5.1
6. **Crash log'u bulun ve indirin**

### Senaryo 3: Submission Details'te Var

1. **App Store Connect > My Apps > Universe**
2. **"App Store" sekmesine gidin**
3. **"iOS App" > "Version History"**
4. **Version 1.0 veya 1.5.1 build'ine tıklayın**
5. **"Review Information" veya "Crash Reports" bölümünü kontrol edin**

---

## 💡 APPLE'IN CRASH LOG'LARI NEREYE KOYAR?

Apple genellikle crash log'larını şu yerlerde paylaşır:

1. ✅ **Review Mesajında ek olarak** (en yaygın)
2. ✅ **Analytics > Crash Reports** (otomatik)
3. ✅ **Submission Details sayfasında** (bazen)
4. ✅ **Email ile** (bazen)

**TestFlight > Crash Feedback** genellikle **test kullanıcılarından** gelen crash'ler için. Apple'ın review crash'leri genellikle Analytics'te olur.

---

## 🚨 CRASH LOG BULAMAZSANIZ NE YAPMALI?

### Seçenek 1: Apple'a Mesaj Gönderin

1. App Store Connect > My Apps > Universe
2. "Messages" sekmesine gidin
3. Apple'ın mesajına **"Reply"** yapın
4. Şunu yazın:
   ```
   Hello,
   
   I cannot find the crash logs mentioned in your review. 
   Could you please provide the crash logs again or 
   direct me to where I can find them?
   
   Submission ID: 8878a6ea-fee4-47c6-b364-d4efaa1bcf22
   
   Thank you.
   ```

### Seçenek 2: Apple'a Telefon Arayın

1. Review mesajında **"Request a phone call"** butonuna tıklayın
2. Apple temsilcisi sizinle iletişime geçecek
3. Crash log'ları talep edin

---

## 📊 CRASH LOG BULMAK İÇİN KONTROL LİSTESİ

- [ ] Review mesajında ek var mı? (Attachments/Download butonu)
- [ ] Analytics > Crash Reports bölümünde var mı?
- [ ] Submission Details sayfasında var mı?
- [ ] Email'inizde Apple'dan mesaj var mı?
- [ ] TestFlight > Crash Feedback'de var mı? (genellikle yok)
- [ ] EAS Build'den indirilebilir mi?

---

## 🎯 EN HIZLI YÖNTEM

**Şimdi yapın:**

1. ✅ **App Store Connect > My Apps > Universe**
2. ✅ **"Analytics" sekmesine gidin**
3. ✅ **"Crash Reports" seçin**
4. ✅ **Tarih filtresi:** Nov 3-4, 2025
5. ✅ **Crash log'u bulun ve indirin**

Eğer Analytics'te yoksa:
- Review mesajının eklerini kontrol edin
- Apple'a mesaj gönderin

---

## 📞 DESTEK

- **App Store Connect:** https://appstoreconnect.apple.com
- **Apple Developer Support:** https://developer.apple.com/support/
- **Review Mesajına Reply:** App Store Connect > Messages

---

## ✅ SONUÇ

**Crash log'ları genellikle:**
1. ✅ **Analytics > Crash Reports** (en yaygın)
2. ✅ **Review mesajında ek olarak** (bazen)
3. ✅ **Submission Details'te** (nadiren)

**Bulamazsanız:**
- Apple'a mesaj gönderin
- Veya telefon isteyin

**Hemen kontrol edin:** Analytics > Crash Reports






