# iOS Crash Log Alma Rehberi (Windows)

## 🚨 ÇÖKME ANALİZİ İÇİN CRASH LOG ALMA YÖNTEMLERİ

### YÖNTEM 1: App Store Connect (EN KOLAY) ⭐

**Windows'ta bile çalışır!**

1. **App Store Connect'e girin:**
   - https://appstoreconnect.apple.com
   - Apple ID ile giriş yapın

2. **Crash Reports bölümüne gidin:**
   - My Apps > Universe (uygulamanız)
   - Analytics > Crash Reports
   - Veya: TestFlight > Crash Reports

3. **Crash log'u indirin:**
   - Çökme tarihini seçin
   - "Download" butonuna tıklayın
   - `.crash` dosyası indirilir

4. **Online Symbolicator kullanın:**
   - https://www.ioscrashlogs.com
   - https://symbolicatecrash.com
   - `.crash` dosyasını yükleyin
   - `.dSYM` dosyanızı da yükleyin (EAS Build'den)

**Avantajlar:**
- ✅ Windows'ta çalışır
- ✅ Ücretsiz
- ✅ Kolay

---

### YÖNTEM 2: EAS Build'den dSYM İndirme

**Crash log'u sembolize etmek için dSYM gerekli:**

```bash
# 1. Build listesini görün
eas build:list --platform ios

# 2. Build ID'nizi bulun
# 3. dSYM dosyasını indirin
eas build:download --platform ios [BUILD_ID]
```

**dSYM dosyası nerede?**
- Build tamamlandıktan sonra EAS Build linkinden indirebilirsiniz
- Veya: `eas build:download` komutu ile

---

### YÖNTEM 3: Fiziksel Cihazdan Log Alma (Windows)

**iPhone/iPad'iniz varsa:**

1. **Cihazı Windows'a bağlayın:**
   - USB ile bağlayın
   - iTunes/Finder açın (Windows'ta iTunes)

2. **Log'ları toplayın:**
   - Windows'ta: `%APPDATA%\Apple Computer\Logs\CrashReporter\MobileDevice\`
   - Veya: `C:\Users\[KullanıcıAdı]\AppData\Roaming\Apple Computer\Logs\CrashReporter\MobileDevice\`

3. **Crash log'u bulun:**
   - Uygulamanızın adını içeren `.crash` dosyasını bulun
   - En yeni tarihli olanı seçin

**Not:** Windows'ta crash log'ları otomatik toplanmayabilir. En iyi yöntem App Store Connect.

---

### YÖNTEM 4: Online Symbolicator Kullanma

**Crash log'u analiz etmek için:**

1. **iOS Crash Logs Sitesi:**
   - https://www.ioscrashlogs.com
   - Ücretsiz
   - Kolay kullanım

2. **Symbolicate Crash:**
   - https://symbolicatecrash.com
   - Ücretsiz
   - Hızlı analiz

3. **Nasıl kullanılır:**
   - `.crash` dosyasını yükleyin
   - `.dSYM` dosyasını yükleyin (EAS Build'den)
   - "Symbolicate" butonuna tıklayın
   - Sembolize edilmiş log'u görün

**Sembolize edilmiş log'da göreceksiniz:**
- ✅ Hangi fonksiyon çöktü
- ✅ Hangi satırda hata var
- ✅ Hangi dosyada sorun var

---

## 🔍 CRASH LOG ANALİZİ - HIZLI KILAVUZ

### Crash Log'da Ne Aranır?

**1. Exception Type:**
```
Exception Type: EXC_CRASH (SIGABRT)
Exception Subtype: KERN_INVALID_ADDRESS
```
→ Native kod hatası

**2. Crashed Thread:**
```
Thread 0 Crashed:
0   libsystem_kernel.dylib        0x000000018a123abc __pthread_kill
1   libsystem_pthread.dylib       0x000000018a14b8b8 pthread_kill
```
→ Hangi thread çöktü

**3. Stack Trace:**
```
0   UniverseCampus                0x0000000100123456 -[AppDelegate application:didFinishLaunchingWithOptions:]
1   UIKitCore                     0x000000018b234567 -[UIApplication _run]
```
→ Hangi fonksiyon çöktü

**4. Binary Images:**
```
0x100000000 - 0x100ffffff UniverseCampus arm64  <abc123...>
```
→ Uygulama binary bilgisi

---

## 🎯 HIZLI ADIMLAR (Windows'ta)

### Adım 1: Crash Log İndir
```
1. App Store Connect'e git
2. My Apps > Universe
3. Analytics > Crash Reports
4. En son crash'i seç
5. Download'a tıkla
```

### Adım 2: dSYM İndir
```bash
eas build:download --platform ios [BUILD_ID]
```

### Adım 3: Online Symbolicator Kullan
```
1. https://www.ioscrashlogs.com aç
2. .crash dosyasını yükle
3. .dSYM dosyasını yükle
4. Symbolicate'e tıkla
```

### Adım 4: Analiz Et
```
- Hangi fonksiyon çöktü?
- Hangi satırda hata var?
- Hangi dosyada sorun var?
```

---

## 💡 YAYGIN CRASH NEDENLERİ

### 1. Native Module Hatası
```
"Terminating app due to uncaught exception 'NSInvalidArgumentException'"
```
→ Native modül (expo-notifications, expo-image-picker) sorunu

### 2. Memory Hatası
```
"Terminating app due to memory pressure"
```
→ Çok fazla bellek kullanımı

### 3. Permission Hatası
```
"User denied permission"
```
→ İzin reddedildi

### 4. Firebase Hatası
```
"Firebase initialization failed"
```
→ Firebase config sorunu

---

## 🚀 PRATİK ÇÖZÜM

**Windows'ta crash log almak için:**

1. ✅ **App Store Connect** kullanın (en kolay)
2. ✅ **Online Symbolicator** kullanın (ücretsiz)
3. ✅ **dSYM'i EAS Build'den** indirin

**Mac gerekmez!** Windows'ta bile crash log analizi yapabilirsiniz.

---

## 📞 DESTEK

- **App Store Connect:** https://appstoreconnect.apple.com
- **iOS Crash Logs:** https://www.ioscrashlogs.com
- **EAS Build Docs:** https://docs.expo.dev/build/introduction/







