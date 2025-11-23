# 🚨 GitHub Pages Sorun Çözümü

## ❌ SORUN
Web'de hala eski bilgiler görünüyor: 9.1, 9.2, 10, 11 bölümleri

## 🔍 NEDEN?

GitHub Pages ayarları yanlış olabilir:
- `docs/` klasörü seçili olabilir
- Farklı branch seçili olabilir
- Başka bir repository'den serve ediliyor olabilir

## ✅ ÇÖZÜM: GitHub Web'den Ayarları Düzelt

### ADIM 1: GitHub Repository'ye Git
```
https://github.com/Cyn0Kuzu/universe
(veya https://github.com/cyn0kuzu/universe)
```

### ADIM 2: Settings → Pages

1. Repository'de **Settings** tıkla
2. Sol sidebar → **Pages**
3. **Source** bölümünü kontrol et:
   - **Branch:** `main` seçili olmalı
   - **Folder:** `/ (root)` seçili olmalı
   - **NOT:** `/docs` veya başka bir klasör DEĞİL!

4. Eğer `/docs` seçiliyse:
   - `main` / `/ (root)` olarak değiştir
   - **Save** tıkla

### ADIM 3: Pages'i Yeniden Aktif Et

1. Source'u değiştir: `/docs` → `/ (root)`
2. **Save** tıkla
3. 5-10 dakika bekle
4. Sayfayı kontrol et

### ADIM 4: Cache Temizle

**GitHub tarafı:**
- Ayarları değiştirdikten sonra otomatik yenilenir (5-10 dk)

**Tarayıcı tarafı:**
- Ctrl + Shift + Delete → Cache temizle
- VEYA: Ctrl + F5 (hard refresh)

---

## 🔄 ALTERNATİF ÇÖZÜM: Force Push

Eğer ayarlar doğruysa ama hala eski içerik görünüyorsa:

```bash
cd C:\Users\lenovo\Desktop\Universe\universe-repo

# index.html'i tekrar yaz
# (zaten temiz)

git add index.html
git commit -m "Force update index.html - remove all old content"
git push origin main --force
```

⚠️ **NOT:** `--force` kullanmadan önce başkalarıyla çalışmıyorsan kullan.

---

## ✅ DOĞRU GITHUB PAGES AYARLARI

```
Repository: Cyn0Kuzu/universe (veya cyn0kuzu/universe)
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

**YANLIŞ:**
- Folder: `/docs` ❌
- Branch: `gh-pages` ❌
- Branch: `universe_versiyon_2` ❌

---

## 🎯 KONTROL

1. GitHub → Settings → Pages kontrol et
2. Source: `main` / `/ (root)` olmalı
3. Eğer `/docs` seçiliyse → `/ (root)` yap
4. Save
5. 10 dakika bekle
6. https://cyn0kuzu.github.io/universe/ aç
7. Sadece butonlar görünmeli (eski bilgiler yok)

---

**EN ÖNEMLİSİ:** GitHub Settings → Pages → Folder `/ (root)` olmalı!


