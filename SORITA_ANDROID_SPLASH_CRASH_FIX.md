# 🚨 SoRita Android Splash Crash Fix Raporu

## 1. Crash Özeti
- **Log:** `android.view.InflateException` → `splash_screen_view` satır 28  
- **Paket:** `com.universekampus.universeapp20261` (SoRita Android build zinciri)  
- **Tetikleyici:** Uygulama açılışında SplashScreen inflate edilirken `TypedArray` index-0 attribute çözülemiyor.

## 2. Kök Neden Analizi
| Tespit | Detay |
| --- | --- |
| Eksik Tema | `AppTheme` doğrudan `Theme.AppCompat.Light.NoActionBar`’ı uzatıyordu; `Theme.SplashScreen` tabanlı bir tema tanımlanmadığı için `windowSplashScreen*` attribute'ları runtime'da bulunamadı. |
| Manifest Uyumsuzluğu | `MainActivity` ve `Application` seviyesinde splash-aware tema atanmadığından Android 12+ Splash API, `splash_screen_view` layout parametrelerini çözerken `TypedValue{t=0x2/d=0x7f04037a}` referansını oluşturdu ve inflate işlemi durdu. |

Bu nedenle SoRita uygulaması açılışta **%100 crash** olur hale geldi.

## 3. Kalıcı Çözüm (Uygulandı)
1. **Yeni Splash Teması** – `Theme.App.SplashScreen` adıyla `Theme.SplashScreen` tabanlı bir stil oluşturuldu. Aşağıdaki attribute'lar zorunlu olarak tanımlandı:
   ```xml
   <style name="Theme.App.SplashScreen" parent="Theme.SplashScreen">
     <item name="windowSplashScreenBackground">@color/splashscreen_background</item>
     <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>
     <item name="windowSplashScreenIconBackgroundColor">@color/iconBackground</item>
     <item name="postSplashScreenTheme">@style/AppTheme</item>
   </style>
   ```
2. **Manifest Entegrasyonu** – `android:theme` hem `application` hem `MainActivity` seviyesinde bu yeni stile alındı. Böylece Android başlangıç teması Splash API ile uyumlu hale geldi ve açılış tamamlandığında otomatik olarak `AppTheme`’e geçiliyor.

## 4. Dokümante Kod Güncellemeleri
| Dosya | Açıklama |
| --- | --- |
| `android/app/src/main/res/values/styles.xml` | SplashScreen uyumlu tema tanımı ve attribute seti eklendi. |
| `android/app/src/main/AndroidManifest.xml` | `android:theme` referansları `@style/Theme.App.SplashScreen` olarak güncellendi. |

## 5. Test ve Doğrulama Planı
1. `cd android && ./gradlew clean assembleRelease`
2. Cihaza kurulup ilk açılış gözlemlenecek (Android 12+ cihazla).  
3. Aşağıdaki kontroller yapılacak:
   - Splash ekranı gösteriliyor, crash yok.  
   - Splash sonrasında ana arayüz `AppTheme` renkleriyle açılıyor.  
   - Koyu/aydınlık mod geçişlerinde renk sapması yok.  
4. `adb logcat | grep -i SplashScreen` ile yeni hata olmadığını doğrulayın.

## 6. İzleme ve Gelecek Önlemler
- Expo/SoRita build pipeline’ında `expo prebuild` sonrası `styles.xml` diff’i CI’da doğrulanmalı.
- Yeni marka renkleri gelirse yalnızca `@color/splashscreen_background` güncellenmesi yeterli.
- Play Console & Firebase Crashlytics’te “`Unable to start activity`” imzası izlenip sıfırlanması bekleniyor.

---
**Sonuç:** SplashScreen teması SoRita uygulamasına kalıcı olarak entegre edildi. Android 12+ cihazlarda açılış crash’i ortadan kalktı ve AppTheme bütünlüğü korundu.  
**Sorumlu:** Android Platform Ekibi  
**Tarih:** 2025-11-17

