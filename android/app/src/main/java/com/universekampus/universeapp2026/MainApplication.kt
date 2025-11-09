package com.universekampus.universeapp2026

import android.app.Application
import android.content.res.Configuration
import android.os.StrictMode
import androidx.annotation.NonNull

import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactHost
import com.facebook.react.config.ReactFeatureFlags
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
          override fun getPackages(): List<com.facebook.react.ReactPackage> {
            // Expo autolinking handles packages automatically
            return emptyList()
          }

          override fun getJSMainModuleName(): String = ".expo/.virtual-metro-entry"

          override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

          override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
          override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(this.applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    
    // Debug modda StrictMode'u devre dışı bırak (performans için)
    if (BuildConfig.DEBUG) {
      StrictMode.setThreadPolicy(
        StrictMode.ThreadPolicy.Builder()
          .detectAll()
          .penaltyLog()
          .build()
      )
      StrictMode.setVmPolicy(
        StrictMode.VmPolicy.Builder()
          .detectAll()
          .penaltyLog()
          .build()
      )
    }
    
    // Firebase'i başlat (crash'lerden kaçınmak için try-catch)
    try {
      // Firebase initialization will be handled by google-services.json
      // No need to manually initialize here
    } catch (e: Exception) {
      // Firebase already initialized or error occurred
      android.util.Log.w("MainApplication", "Firebase initialization note: ${e.message}")
    }
    
    SoLoader.init(this, false)
    
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    
    // Flipper is deprecated and removed
    
    // Expo lifecycle dispatcher - optional, handled by autolinking
    try {
      val dispatcherClass = Class.forName("expo.modules.ApplicationLifecycleDispatcher")
      val onApplicationCreateMethod = dispatcherClass.getMethod("onApplicationCreate", Application::class.java)
      onApplicationCreateMethod.invoke(null, this)
    } catch (e: Exception) {
      // Expo modules not available or already handled by autolinking
    }
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    // Expo lifecycle dispatcher - optional, handled by autolinking
    try {
      val dispatcherClass = Class.forName("expo.modules.ApplicationLifecycleDispatcher")
      val onConfigurationChangedMethod = dispatcherClass.getMethod("onConfigurationChanged", Application::class.java, Configuration::class.java)
      onConfigurationChangedMethod.invoke(null, this, newConfig)
    } catch (e: Exception) {
      // Expo modules not available or already handled by autolinking
    }
  }
}
