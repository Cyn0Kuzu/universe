# Universe Campus - Version 1.2.1 Release Notes

**Release Date:** September 30, 2025  
**Version Code:** 7  
**Build Type:** Bug Fix & Stability Release  
**Target SDK:** Android 13/14/15 (API 33-35)

---

## 🎯 Release Overview

Bu sürüm, kritik stabilite sorunlarını çözen ve Android 13+ uyumluluğunu sağlayan bir bug fix release'dir.

---

## ✅ Critical Bug Fixes

### 🔴 Production Crash Fixes
- **Font Loading Mechanism:** Production build'lerde font yükleme başarısız olduğunda uygulamanın çökmesi sorunu düzeltildi
- **Unhandled Promise Rejections:** Promise rejection'ların logbox'ta ignore edilmesi durduruldu, tüm async hatalar artık doğru yakalanıyor
- **Proguard Optimizations:** Release build'lerde code shrinking sırasında kritik sınıfların silinmesi engellendi

### 🟡 Stability Improvements
- **Firebase Error Handling:** Geliştirilmiş hata yakalama ve loglama mekanizmaları
- **Firestore Cache:** Offline durumda daha iyi performans için unlimited cache ayarlandı
- **Storage Bucket Validation:** Firebase Storage yapılandırma sorunları startup'ta tespit ediliyor

---

## 🆕 New Features & Enhancements

### 📱 Android 13/14/15 (API 33-35) Support
- ✅ Granular media permissions (READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, READ_MEDIA_AUDIO)
- ✅ POST_NOTIFICATIONS permission (Android 13+)
- ✅ Scoped storage support with legacy fallback (Android 12 ve altı)
- ✅ Full API 35 compatibility

### 🔧 Build & Configuration
- ✅ Updated to JDK 17.0.12 LTS
- ✅ Target SDK updated to API 35
- ✅ Compile SDK updated to API 35
- ✅ Build Tools 35.0.0
- ✅ Kotlin 1.9.22 with API 35 compatibility flags

### 🛡️ Enhanced Proguard Rules
- React Native core classes protected
- Hermes engine unicode support preserved
- Expo modules fully protected
- React Native Reanimated animations protected
- Gesture Handler and Screens navigation protected
- Native methods preserved
- Debug symbols retained for crash reporting

---

## 🔒 Security & Permissions

### Updated Permissions (Android 13+)
```xml
<!-- Granular media access (API 33+) -->
READ_MEDIA_IMAGES
READ_MEDIA_VIDEO
READ_MEDIA_AUDIO

<!-- Notifications (API 33+) -->
POST_NOTIFICATIONS

<!-- Legacy storage (API ≤ 32) -->
READ_EXTERNAL_STORAGE (maxSdkVersion="32")
WRITE_EXTERNAL_STORAGE (maxSdkVersion="32")
```

---

## 📊 Technical Details

### Supported Android Versions
- **Minimum:** Android 6.0 (API 23)
- **Target:** Android 15 (API 35)
- **Recommended:** Android 10+ (API 29+)

### Architecture Support
- ✅ armeabi-v7a (32-bit ARM)
- ✅ arm64-v8a (64-bit ARM) - **Primary**
- ✅ x86 (32-bit Intel)
- ✅ x86_64 (64-bit Intel)

### Bundle Size Optimizations
- Proguard enabled: Code shrinking and obfuscation
- Resource shrinking: Unused resources removed
- Full debug symbols: Preserved for crash reporting

---

## 🐛 Known Issues

### Minor Issues
- Font loading warnings may appear in logs (fonts load correctly via Expo)
- First-time permission requests on Android 13+ require user interaction

### Non-Breaking Warnings
- Non-serializable values in navigation state (React Navigation internal)

---

## 📝 Migration Notes

### For Users
- **First Launch:** App may request new permissions (media, notifications) on Android 13+
- **Performance:** First launch may take slightly longer due to cache initialization
- **Storage:** Granular media permissions provide better privacy control

### For Developers
- JDK 17.0.12 required for building
- Update local Java installation path in `gradle.properties` if needed
- Clean build recommended after updating: `./gradlew clean`

---

## 🔧 Build Instructions

### Release Build (AAB)
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

### Output Location
```
android/app/build/outputs/bundle/release/app-release.aab
```

### Signing Configuration
- Keystore: `universe-release-key.keystore`
- Alias: `universe-key-alias`
- Configured in: `gradle.properties`

---

## ✨ Credits

**Development Team:** Universe Campus Development Team  
**QA Testing:** Comprehensive testing on Android 11-15  
**Build Tools:** Gradle 8.x, Android Gradle Plugin 8.x  
**Framework:** React Native 0.73.6 + Expo SDK 50  

---

## 📞 Support

For issues or questions:
- Firebase Project ID: `universe-a6f60`
- Package Name: `com.universekampus.universeapp`
- Bundle ID (iOS): `com.universekampus.app`

---

**Last Updated:** September 30, 2025  
**Build Approved By:** AI Development Assistant ✅

