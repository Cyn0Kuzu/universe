# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo
-keep class expo.modules.** { *; }
-keep class com.facebook.react.bridge.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**

# React Navigation
-keep class com.swmansion.gesturehandler.** { *; }
-keep class com.swmansion.rnscreens.** { *; }

# KotlinPoet - Missing class warnings
-dontwarn javax.lang.model.**
-dontwarn com.squareup.kotlinpoet.**
-keep class com.squareup.kotlinpoet.** { *; }

# Kotlin
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.**

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Debug symbols for crash reporting
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-renamesourcefileattribute SourceFile

# Prevent stripping of native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep all classes that have @Keep annotation
-keep @androidx.annotation.Keep class * {*;}
-keepclassmembers class * {
    @androidx.annotation.Keep *;
}

# React Native - Additional protections
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep,allowobfuscation @interface com.facebook.proguard.annotations.KeepGettersAndSetters
-keep,allowobfuscation @interface com.facebook.common.internal.DoNotStrip

-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}

-keep @com.facebook.common.internal.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.common.internal.DoNotStrip *;
}

-keep @com.facebook.proguard.annotations.KeepGettersAndSetters class *
-keepclassmembers @com.facebook.proguard.annotations.KeepGettersAndSetters class * {
  void set*(***);
  *** get*();
}

# Hermes - Prevent crashes
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# Expo modules - Critical for app stability
-keep class expo.modules.** { *; }
-keepclassmembers class expo.modules.** { *; }
-keep interface expo.modules.** { *; }

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }
-keepclassmembers class com.swmansion.rnscreens.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }
-keepclassmembers class com.swmansion.gesturehandler.** { *; }

# React Native Reanimated - Critical for animations
-keep class com.swmansion.reanimated.** { *; }
-keepclassmembers class com.swmansion.reanimated.** { *; }
-keep interface com.swmansion.reanimated.** { *; }

# Prevent crashes from missing classes
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Optimization flags for AAB - Conservative to prevent Android 15 conflicts
-optimizationpasses 3
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose

# ============================================================================
# ANDROID 15 KOTLIN COMPATIBILITY - CRITICAL FIX
# Prevents removeFirst/removeLast method conflicts between Kotlin and Java
# ============================================================================

# Suppress warnings for Kotlin collections
-dontwarn kotlin.collections.**
-dontwarn kotlin.jvm.internal.**
-dontwarn kotlin.jvm.functions.**

# CRITICAL: Keep ALL Kotlin collection classes and methods
-keep,allowoptimization class kotlin.collections.** { *; }
-keep,allowoptimization class kotlin.collections.CollectionsKt { *; }
-keep,allowoptimization class kotlin.collections.ArraysKt { *; }
-keep,allowoptimization class kotlin.collections.MutableCollectionsKt { *; }
-keep,allowoptimization class kotlin.collections.builders.** { *; }
-keep,allowoptimization class kotlin._Collections** { *; }
-keep,allowoptimization class kotlin._Arrays** { *; }

# Keep ALL extension function methods that conflict with Android 15
-keepclassmembers,allowoptimization class * {
    *** removeFirst();
    *** removeFirst(...);
    *** removeLast();
    *** removeLast(...);
    *** removeFirstOrNull();
    *** removeFirstOrNull(...);
    *** removeLastOrNull();
    *** removeLastOrNull(...);
}

# CRITICAL: Protect Kotlin extension functions from being inlined/optimized
-keepclassmembers,allowoptimization class kotlin.** {
    public static *** removeFirst(...);
    public static *** removeLast(...);
    public static *** removeFirstOrNull(...);
    public static *** removeLastOrNull(...);
    public static *** removeAt(...);
}

# ============================================================================
# REACT-NATIVE-SCREENS COMPLETE PROTECTION
# Specifically protects com.swmansion.rnscreens.c.a and all related classes
# ============================================================================

# Keep EVERYTHING in react-native-screens without any optimization
-keep,allowshrinking class com.swmansion.rnscreens.** { *; }
-keepclassmembers,allowshrinking class com.swmansion.rnscreens.** { *; }
-keepnames class com.swmansion.rnscreens.** { *; }
-keepclasseswithmembers class com.swmansion.rnscreens.** { *; }

# CRITICAL: Specifically protect the problematic class
-keep,allowshrinking class com.swmansion.rnscreens.c.** { *; }
-keepclassmembers,allowshrinking class com.swmansion.rnscreens.c.** { *; }
-keep,allowshrinking class com.swmansion.rnscreens.c.a { *; }
-keepclassmembers,allowshrinking class com.swmansion.rnscreens.c.a {
    *;
}

# Prevent obfuscation of react-native-screens methods
-keepattributes *Annotation*,Signature,Exception,InnerClasses,EnclosingMethod

# ============================================================================
# R8 OPTIMIZATION CONTROL
# Prevent aggressive optimizations that cause method conflicts
# ============================================================================

# Don't optimize Kotlin collections and related classes
-keep,allowobfuscation,allowshrinking class kotlin.collections.* { <methods>; }
-keep,allowobfuscation,allowshrinking interface kotlin.collections.* { <methods>; }

# Prevent aggressive optimizations that cause Kotlin-Java conflicts
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*,!method/inlining/*,!method/removal/*,!code/allocation/variable

# Add any project specific keep options here:
