# 🔧 GitHub Pages Düzeltme - Manuel Adımlar

## ❌ SORUN
Web'de hala eski bilgiler görünüyor ama local'de dosya temiz.

## 🎯 ÇÖZÜM

### GitHub Web Üzerinden Manuel Düzeltme (ZORUNLU)

**1. GitHub'a Git:**
```
https://github.com/cyn0kuzu/universe
```
VEYA
```
https://github.com/Cyn0Kuzu/universe
```

**2. Settings → Pages:**
- Repository sayfasında **Settings** butonuna tıkla
- Sol sidebar'dan **Pages** seçeneğine tıkla

**3. Source Ayarlarını Kontrol Et:**
```
Source: Deploy from a branch
Branch: main          ← Bu olmalı
Folder: / (root)      ← BU ÇOK ÖNEMLİ!
```

**4. Eğer Folder `/docs` ise:**
- `main` branch seç
- Folder: `/ (root)` olarak değiştir
- **Save** tıkla

**5. Bekle:**
- 10-15 dakika bekle (GitHub Pages yeniden build ediyor)

**6. Kontrol Et:**
- https://cyn0kuzu.github.io/universe/ aç
- Ctrl + F5 (hard refresh)

---

## ⚠️ EĞER HALA ÇALIŞMIYORSA

### Alternatif 1: Force Update

Terminal'de:
```bash
cd C:\Users\lenovo\Desktop\Universe\universe-repo

# Boş bir commit yap (GitHub Pages'i tetiklemek için)
git commit --allow-empty -m "Trigger GitHub Pages rebuild"
git push origin main
```

### Alternatif 2: GitHub Actions ile Deploy

Repository'de `.github/workflows/pages.yml` oluştur (eğer yoksa).

---

## ✅ DOĞRU AYARLAR

| Ayar | Değer |
|------|-------|
| Source | Deploy from a branch |
| Branch | main |
| Folder | **/ (root)** ← EN ÖNEMLİSİ |
| Custom domain | (boş) |

---

**MUTLAKA GitHub Web'den Settings → Pages kontrol et!**

Local dosya temiz ama GitHub Pages `/docs` klasörünü kullanıyor olabilir.


