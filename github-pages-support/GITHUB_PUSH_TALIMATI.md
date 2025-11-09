# 📤 GitHub Pages'e Yükleme Talimatları

## 🎯 HEDEF
`github-pages-support/index.html` dosyasını GitHub'a yükleyip Pages'i aktif etmek.

---

## 📝 ADIM ADIM

### Seçenek 1: GitHub Web Üzerinden (En Kolay)

**1. GitHub'a Git:**
```
https://github.com/cyn0kuzu/universe
(veya universe repo adı neyse)
```

**2. Repository Oluştur (Eğer Yoksa):**
- GitHub'da "New repository" tıkla
- Repository name: `universe` (veya `support`)
- Public seç
- Create repository

**3. Dosya Yükle:**
- Repository'de "Add file" → "Upload files"
- `github-pages-support/index.html` dosyasını sürükle-bırak
- Commit message: "Add support page for App Store"
- "Commit changes" tıkla

**4. GitHub Pages Aktif Et:**
- Repository → **Settings**
- Sol sidebar → **Pages**
- Source: "Deploy from a branch"
- Branch: `main` (veya `master`)
- Folder: `/ (root)` veya `/docs`
- **Save**

**5. URL Kontrol Et:**
```
Eğer repo adı "universe" ise:
https://cyn0kuzu.github.io/universe/

Eğer repo adı "support" ise:
https://cyn0kuzu.github.io/support/

5-10 dakika içinde aktif olur!
```

---

### Seçenek 2: Git Komutları ile (Terminal)

**1. Repository Clone (Eğer Yoksa):**
```bash
cd C:\Users\lenovo\Desktop
git clone https://github.com/cyn0kuzu/universe.git
cd universe
```

**2. Dosyayı Kopyala:**
```bash
# github-pages-support/index.html dosyasını 
# universe klasörüne kopyala
copy ..\Universe\github-pages-support\index.html index.html
```

**3. Commit ve Push:**
```bash
git add index.html
git commit -m "Add support page for App Store Connect"
git push origin main
```

**4. GitHub Pages Aktif Et:**
- GitHub web → Repository → Settings → Pages
- Source: "Deploy from a branch"
- Branch: main
- Save

---

## ✅ KONTROL LİSTESİ

- [ ] HTML dosyası GitHub'a yüklendi
- [ ] GitHub Pages aktif edildi
- [ ] URL çalışıyor (tarayıcıda açıldı)
- [ ] Destek bilgileri görünüyor
- [ ] App Store Connect'te URL güncellendi

---

## 🔗 APP STORE CONNECT'E EKLE

**Son Adım:**
```
1. App Store Connect → Universe Campus
2. App Information
3. Support URL alanını bul
4. URL gir: https://cyn0kuzu.github.io/universe/
   (veya repo adı neyse o)
5. SAVE
```

---

## ⚠️ SORUN ÇÖZME

**URL çalışmıyor:**
- 5-10 dakika bekle (Pages ilk kez deploy oluyor)
- Repository Settings → Pages kontrol et
- Branch adı doğru mu? (main veya master)

**Sayfa boş görünüyor:**
- index.html dosyası root klasöründe mi?
- Tarayıcı cache'i temizle (Ctrl+F5)

**404 hatası:**
- URL'yi kontrol et
- Repository adı doğru mu?

---

**BAŞARILAR! 🚀**


