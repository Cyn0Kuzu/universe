# Universe Campus 2025 - Deep Clean Build Script (PowerShell)
# ============================================================

Write-Host "🧹 Universe Campus 2025 - Deep Clean Build Script" -ForegroundColor Blue
Write-Host "==================================================" -ForegroundColor Blue

# Hata kontrolü
$ErrorActionPreference = "Continue"

Write-Host "📋 Starting comprehensive cleanup..." -ForegroundColor Blue

# 1. Metro ve Node.js süreçlerini durdur
Write-Host "🛑 Stopping Metro and Node processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*" -and $_.CommandLine -like "*metro*"} | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process | Where-Object {$_.ProcessName -like "*node*" -and $_.CommandLine -like "*expo*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. Node modules temizliği
Write-Host "📦 Cleaning Node.js dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "✅ node_modules removed" -ForegroundColor Green
}

if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "✅ package-lock.json removed" -ForegroundColor Green
}

if (Test-Path "yarn.lock") {
    Remove-Item -Force "yarn.lock"
    Write-Host "✅ yarn.lock removed" -ForegroundColor Green
}

# 3. Metro cache temizliği
Write-Host "🗑️ Cleaning Metro cache..." -ForegroundColor Yellow
$tempPaths = @(
    "$env:TEMP\metro-*",
    "$env:TEMP\react-*",
    "$env:TEMP\haste-*",
    "$env:TEMP\expo-*"
)

foreach ($path in $tempPaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
    }
}

Write-Host "✅ Metro cache cleaned" -ForegroundColor Green

# 4. Android temizliği
Write-Host "🤖 Cleaning Android build..." -ForegroundColor Yellow
Set-Location "android"

# Gradle cache temizliği
if (Test-Path ".gradle") {
    Remove-Item -Recurse -Force ".gradle"
    Write-Host "✅ .gradle removed" -ForegroundColor Green
}

# Build klasörleri
if (Test-Path "app\build") {
    Remove-Item -Recurse -Force "app\build"
    Write-Host "✅ app\build removed" -ForegroundColor Green
}

if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
    Write-Host "✅ build removed" -ForegroundColor Green
}

# Gradle wrapper cache
if (Test-Path "gradle\wrapper") {
    Remove-Item -Recurse -Force "gradle\wrapper"
    Write-Host "✅ gradle\wrapper removed" -ForegroundColor Green
}

# Gradle clean
Write-Host "🧽 Running Gradle clean..." -ForegroundColor Yellow
try {
    .\gradlew.bat clean
    .\gradlew.bat cleanBuildCache
} catch {
    Write-Host "⚠️ Gradle clean completed with warnings" -ForegroundColor Yellow
}

Set-Location ".."
Write-Host "✅ Android cleaned" -ForegroundColor Green

# 5. iOS temizliği (varsa)
if (Test-Path "ios") {
    Write-Host "🍎 Cleaning iOS build..." -ForegroundColor Yellow
    Set-Location "ios"
    
    if (Test-Path "Pods") {
        Remove-Item -Recurse -Force "Pods"
        Write-Host "✅ Pods removed" -ForegroundColor Green
    }
    
    if (Test-Path "build") {
        Remove-Item -Recurse -Force "build"
        Write-Host "✅ iOS build removed" -ForegroundColor Green
    }
    
    if (Test-Path "Podfile.lock") {
        Remove-Item -Force "Podfile.lock"
        Write-Host "✅ Podfile.lock removed" -ForegroundColor Green
    }
    
    Set-Location ".."
    Write-Host "✅ iOS cleaned" -ForegroundColor Green
}

# 6. Watchman temizliği (varsa)
Write-Host "👀 Cleaning Watchman..." -ForegroundColor Yellow
try {
    watchman watch-del-all
    Write-Host "✅ Watchman cleaned" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Watchman not available" -ForegroundColor Yellow
}

# 7. Expo cache temizliği
Write-Host "📱 Cleaning Expo cache..." -ForegroundColor Yellow
try {
    npx expo install --fix
    Write-Host "✅ Expo cache cleaned" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Expo cache clean completed with warnings" -ForegroundColor Yellow
}

# 8. Bağımlılıkları yeniden yükle
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✅ Dependencies installed" -ForegroundColor Green

# 9. Firebase config kontrolü
Write-Host "🔥 Checking Firebase configuration..." -ForegroundColor Yellow
if (Test-Path "android\app\google-services.json") {
    Write-Host "✅ google-services.json found" -ForegroundColor Green
} else {
    Write-Host "❌ google-services.json not found!" -ForegroundColor Red
    Write-Host "⚠️ Please download from Firebase Console" -ForegroundColor Yellow
}

# 10. Build test
Write-Host "🧪 Testing build configuration..." -ForegroundColor Yellow
Set-Location "android"
try {
    .\gradlew.bat assembleDebug --dry-run
    Write-Host "✅ Build configuration test completed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Build test completed with warnings" -ForegroundColor Yellow
}
Set-Location ".."

# 11. Son kontroller
Write-Host "📋 Final checks..." -ForegroundColor Blue

# Node version kontrolü
Write-Host "Node version:" -ForegroundColor Yellow
node --version

# NPM version kontrolü
Write-Host "NPM version:" -ForegroundColor Yellow
npm --version

# React Native CLI kontrolü
Write-Host "React Native CLI:" -ForegroundColor Yellow
try {
    npx react-native --version
} catch {
    Write-Host "React Native CLI not available" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deep clean completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Blue
Write-Host "1. Run: npx react-native run-android" -ForegroundColor Yellow
Write-Host "2. Monitor logs: adb logcat | findstr 'Firebase Auth ReactNative'" -ForegroundColor Yellow
Write-Host "3. Check Firebase connection in app" -ForegroundColor Yellow
Write-Host ""
Write-Host "✨ Your Universe Campus 2025 app is ready for testing!" -ForegroundColor Green




