# 🧹 Android Build Temizleme Rehberi - Expo Projesi

## 📋 Durum

Bu bir **Expo projesi** olduğu için standart Android Gradle wrapper (`gradlew`) dosyaları bulunmamaktadır. Expo projelerinde build işlemleri Expo CLI üzerinden yapılır.

---

## ✅ ÇÖZÜM: Expo Build Temizleme Komutları

### 1. Hızlı Temizleme (Önerilen)

```powershell
# Proje dizininde
cd "C:\Users\cayan\OneDrive\Desktop\universe-jules-sonrasi"

# Expo cache temizle
npx expo start --clear

# Android build temizle
npx expo run:android --clean
```

### 2. Manuel Temizleme

```powershell
# Proje dizininde
cd "C:\Users\cayan\OneDrive\Desktop\universe-jules-sonrasi"

# Android build klasörlerini temizle
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue

# Metro bundler cache temizle
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue

# Watchman cache temizle (eğer yüklüyse)
watchman watch-del-all
```

### 3. Kapsamlı Temizleme (Tüm Cache'ler)

```powershell
# Proje dizininde
cd "C:\Users\cayan\OneDrive\Desktop\universe-jules-sonrasi"

# 1. Expo cache
npx expo start --clear

# 2. Android build klasörleri
Remove-Item -Recurse -Force android\app\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\build -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force android\.gradle -ErrorAction SilentlyContinue

# 3. Metro bundler cache
Remove-Item -Recurse -Force $env:TEMP\metro-* -ErrorAction SilentlyContinue

# 4. Watchman cache
watchman watch-del-all

# 5. Node modules (opsiyonel - yeniden yüklemek için)
# Remove-Item -Recurse -Force node_modules
# npm install
```

---

## 🚀 Otomatik Script Kullanımı

Oluşturulan `android-clean.ps1` script'ini kullanabilirsiniz:

```powershell
# Proje dizininde
cd "C:\Users\cayan\OneDrive\Desktop\universe-jules-sonrasi"

# Script'i çalıştır
.\android-clean.ps1
```

---

## 📝 Expo Build Komutları

### Android Build

```powershell
# Development build
npx expo run:android

# Production build
npx expo run:android --variant release

# Temiz build
npx expo run:android --clean
```

### iOS Build

```powershell
# Development build
npx expo run:ios

# Production build
npx expo run:ios --configuration Release

# Temiz build
npx expo run:ios --clean
```

---

## 🔍 Sorun Giderme

### Gradlew Bulunamadı Hatası

**Sorun:** `.\gradlew : The term '.\gradlew' is not recognized`

**Çözüm:** Bu bir Expo projesi, `gradlew` kullanmayın. Bunun yerine:
- `npx expo run:android --clean` kullanın
- Veya `android-clean.ps1` script'ini kullanın

### Build Hataları

**Sorun:** Build başarısız oluyor

**Çözüm:**
1. Cache'leri temizleyin (yukarıdaki komutlar)
2. `npm install` çalıştırın
3. `npx expo prebuild --clean` çalıştırın (eğer native modüller varsa)

---

## ✅ Özet

- ✅ Expo projesi için `gradlew` kullanmayın
- ✅ `npx expo run:android --clean` kullanın
- ✅ `android-clean.ps1` script'ini kullanabilirsiniz
- ✅ Manuel temizleme için yukarıdaki PowerShell komutlarını kullanın

---

**Not:** Expo projelerinde native Android build dosyaları (`gradlew`, `gradlew.bat`) genellikle `npx expo prebuild` komutu çalıştırıldığında oluşturulur. Bu komut native modüller için gereklidir.

