# 🔧 Windows Long Path Sorunu - Çözüm Rehberi

## ❌ Sorun

Windows'ta dosya yolu çok uzun (191 karakter) ve CMake'in 260 karakter sınırını aşıyor:
```
C_/Users/cayan/OneDrive/Desktop/universe-jules-sonrasi/node_modules/react-native-reanimated/Common/cpp/reanimated/RuntimeDecorators/ReanimatedWorkletRuntimeDecorator.cpp.o
```

## ✅ ÇÖZÜM 1: Windows Long Path Desteğini Etkinleştir (ÖNERİLEN)

### Adım 1: Yönetici olarak PowerShell açın

### Adım 2: Long Path desteğini etkinleştirin:
```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

### Adım 3: Bilgisayarı yeniden başlatın

### Adım 4: Build'i tekrar deneyin:
```powershell
cd android
.\gradlew.bat bundleRelease
```

---

## ✅ ÇÖZÜM 2: Proje Dizini Kısaltın

Projeyi daha kısa bir yola taşıyın:
- **Eski:** `C:\Users\cayan\OneDrive\Desktop\universe-jules-sonrasi`
- **Yeni:** `C:\Projects\universe` (veya `C:\u` gibi çok kısa)

```powershell
# Projeyi taşıyın
Move-Item "C:\Users\cayan\OneDrive\Desktop\universe-jules-sonrasi" "C:\u"

# Yeni dizinde build yapın
cd C:\u\android
.\gradlew.bat bundleRelease
```

---

## ✅ ÇÖZÜM 3: Symbolic Link Kullanın

Projeyi kısa bir yola symbolic link ile bağlayın:

```powershell
# Yönetici olarak çalıştırın
New-Item -ItemType SymbolicLink -Path "C:\u" -Target "C:\Users\cayan\OneDrive\Desktop\universe-jules-sonrasi"

# Kısa yoldan build yapın
cd C:\u\android
.\gradlew.bat bundleRelease
```

---

## 📝 Notlar

- **Çözüm 1** en profesyonel ve kalıcı çözümdür
- **Çözüm 2** en hızlı çözümdür (projeyi taşımanız gerekir)
- **Çözüm 3** projeyi taşımadan kısa yol kullanmanızı sağlar

---

## 🔍 Kontrol

Long Path desteğinin aktif olup olmadığını kontrol edin:
```powershell
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled"
```

`LongPathsEnabled : 1` görüyorsanız aktif demektir.

