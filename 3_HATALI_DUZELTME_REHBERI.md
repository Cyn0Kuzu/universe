# 🔧 3 Hatayı Düzeltme Rehberi

## ❌ SORUNLAR

1. **1.5.0 Safety: Developer Information** → Support URL sorunu
2. **2.1.0 Performance: App Completeness** → Crash sorunu
3. **2.3.10 Performance: Accurate Metadata** → Screenshots sorunu

---

## ✅ 1. SUPPORT URL DÜZELTME (1.5.0 Safety)

### Sorun:
Support URL çalışmıyor veya yetersiz bilgi var.

### Çözüm - GitHub Pages:

**Adım 1: GitHub'a Git**
```
1. GitHub.com → Login
2. cyn0kuzu hesabına git
3. "universe" repository'sini bul
   (veya yeni repo oluştur: "support")
```

**Adım 2: index.html Oluştur/Düzenle**
```html
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universe Campus - Destek</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 { color: #6750A4; }
        h2 { color: #333; margin-top: 30px; }
        .contact-box {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        a { color: #6750A4; }
    </style>
</head>
<body>
    <h1>🚀 Universe Campus - Destek</h1>
    
    <div class="contact-box">
        <h2>📧 İletişim</h2>
        <p><strong>Email:</strong> <a href="mailto:destek@universe-kampus.com">destek@universe-kampus.com</a></p>
        <p><strong>Geri Bildirim:</strong> <a href="mailto:feedback@universe-kampus.com">feedback@universe-kampus.com</a></p>
        <p><strong>Yanıt Süresi:</strong> 24-48 saat içinde</p>
    </div>

    <h2>❓ Sıkça Sorulan Sorular</h2>
    
    <h3>Uygulamayı nasıl kullanabilirim?</h3>
    <p>
        - Üniversite email adresinizle giriş yapın<br>
        - Kampüsünüzdeki etkinlikleri keşfedin<br>
        - İlgi alanınıza göre kulüplere katılın<br>
        - Etkinliklere kayıt olun ve katılın
    </p>

    <h3>Teknik destek nasıl alabilirim?</h3>
    <p>
        Teknik sorunlar için yukarıdaki email adresine yazabilirsiniz. 
        Sorununuzu detaylı açıklayın ve ekran görüntüsü ekleyin.
    </p>

    <h3>Hesabımı nasıl silebilirim?</h3>
    <p>
        Hesap silme işlemi için destek email'ine yazın. 
        KVKK gereği hesabınız 30 gün içinde tamamen silinecektir.
    </p>

    <h2>🐛 Hata Bildirim</h2>
    <p>
        Uygulamada bir hata veya sorun yaşıyorsanız, lütfen bizimle iletişime geçin. 
        Sorunu mümkün olduğunca detaylı açıklayın:
    </p>
    <ul>
        <li>Hatanın ne zaman olduğu</li>
        <li>Hangi işlem sırasında olduğu</li>
        <li>Ekran görüntüsü (varsa)</li>
        <li>Cihaz modeli ve iOS versiyonu</li>
    </ul>

    <h2>📱 Uygulama Bilgileri</h2>
    <p>
        <strong>Versiyon:</strong> 1.5.1<br>
        <strong>Platform:</strong> iOS<br>
        <strong>Minimum iOS:</strong> 15.1+
    </p>

    <hr>
    <p style="text-align: center; color: #666;">
        © 2025 Universe Campus. Tüm hakları saklıdır.
    </p>
</body>
</html>
```

**Adım 3: GitHub Pages'i Aktif Et**
```
1. Repository → Settings
2. Pages (sol sidebar)
3. Source: "Deploy from a branch"
4. Branch: main
5. Folder: / (root)
6. Save
```

**Adım 4: URL Kontrol Et**
```
URL: https://cyn0kuzu.github.io/universe/
(veya repo adı neyse o)

5 dakika içinde aktif olur.
Tarayıcıda aç ve kontrol et!
```

**Adım 5: App Store Connect'e Ekle**
```
1. App Store Connect → Universe Campus
2. App Information
3. Support URL: https://cyn0kuzu.github.io/universe/
4. SAVE
```

---

## ✅ 2. CRASH DÜZELTME (2.1.0 Performance)

### Sorun:
Uygulama açılışta crash ediyor.

### Çözüm:

**Kod hazır ama build edilmedi!**

**Adım 1: Build Yap**
```bash
cd C:\Users\lenovo\Desktop\Universe

# Build başlat
eas build --platform ios --profile production
```

**Bekleme:**
- 10-15 dakika
- Build tamamlanınca TestFlight'a otomatik yüklenir

**Adım 2: Test Et (TestFlight)**
```
1. iPhone'a TestFlight app yükle
2. TestFlight'ta uygulama açılır
3. "Install" tıkla
4. App açılır
5. Crash olmamalı!
```

**Adım 3: Submit Et**
```
1. App Store Connect → Universe Campus
2. Versions → Yeni build (33) seç
3. Submit for Review
```

**Önemli:**
- v1.5.1 crash fix'i içeriyor
- Build edildikten sonra crash olmamalı

---

## ✅ 3. SCREENSHOTS DÜZELTME (2.3.10 Metadata)

### Sorun:
- Screenshots'da watermark var (iOS Simulator yazısı)
- Non-iOS device görüntüleri var
- Yanlış device size

### Çözüm:

**Yöntem 1: Watermark Kaldırma (Hızlı)**

1. Screenshot'ları aç (Photos veya editör)
2. Watermark kısmını crop yap
3. Yeni boyut: 1290x2796 px (iPhone 15 Pro Max)
4. Save

**Yöntem 2: Yeni Screenshot Alma (En İyi)**

**Mac/Simulator Varsa:**
```bash
# Terminal
xcrun simctl boot "iPhone 15 Pro Max"
open -a Simulator

# Simulator'da:
# 1. Uygulamayı aç
# 2. Cmd + S (screenshot al)
# 3. ~/Desktop'te kaydedilir
# 4. Watermark YOK!
```

**Windows/Figma ile:**
```
1. Figma'da iPhone 15 Pro Max template aç
2. App ekranlarını tasarla
3. Export: 1290x2796 px
4. Watermark YOK!
```

**Yöntem 3: Online Tool (En Kolay)**

1. **remove.bg** veya benzeri tool kullan
2. Screenshot yükle
3. Watermark'ı otomatik kaldır
4. Download

**Gereken Screenshot'lar:**
- **iPhone 6.7"** (Pro Max): 1290x2796 px → 5-8 screenshot
- **iPhone 6.5"** (Plus): 1242x2688 px → 5-8 screenshot
- **iPad Pro 12.9"**: 2048x2732 px → 5-8 screenshot

**Kurallar:**
- ✅ iOS-style status bar
- ✅ Gerçek iOS cihazlardan
- ❌ Watermark YOK
- ❌ Simulator yazısı YOK
- ❌ Non-iOS device YOK

**App Store Connect'e Yükle:**
```
1. App Store Connect → Universe Campus
2. Versions → Screenshots
3. Her device size için:
   - Eski screenshot'ları sil
   - Yeni screenshot'ları yükle
4. SAVE
```

**NOT:** Bazı screenshot'lar "View All Sizes in Media Manager" tıklayarak güncellenebilir.

---

## 📋 ÖZET CHECKLIST

### Şimdi Yapılabilir (Bugün):

- [ ] **Support URL:** GitHub Pages'e detaylı sayfa ekle
- [ ] **Screenshots:** Watermark'ları kaldır veya yeni al
- [ ] **URL Kontrol:** Support URL çalışıyor mu?

### 01 Kasım (Build limit reset):

- [ ] **Build:** `eas build --platform ios --profile production`
- [ ] **Test:** TestFlight'ta test et
- [ ] **Submit:** App Store Connect'te submit et

---

## 🎯 BEKLENEN SONUÇ

✅ Support URL → Detaylı bilgi var
✅ Crash → Yeni build ile düzeltildi
✅ Screenshots → Watermark'sız, doğru device

→ **APPROVED!** 🎉

---

## ⚡ HIZLI BAŞLANGIÇ

1. **10 dakika:** GitHub Pages'i düzelt
2. **1 saat:** Screenshots'ları hazırla
3. **01 Kasım:** Build yap ve submit et

**BAŞARILAR! 🚀**


