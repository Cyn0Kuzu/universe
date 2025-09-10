# Universe AAB Build Script
param(
    [string]$OutputPath = "$env:USERPROFILE\Desktop"
)

Write-Host "Starting AAB Build for Universe App..." -ForegroundColor Green

# Proje dizinine git
Set-Location "c:\Users\lenovo\Desktop\universe"

Write-Host "1. Installing dependencies..." -ForegroundColor Yellow
npm install --legacy-peer-deps --silent

Write-Host "2. Exporting Expo bundle..." -ForegroundColor Yellow
npx expo export --platform android --clear 2>$null

Write-Host "3. Creating Android bundle..." -ForegroundColor Yellow
Set-Location "android"

# Gradle cache temizle
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle" -ErrorAction SilentlyContinue 2>$null

# Expo CLI kullanarak build
Set-Location ".."
Write-Host "4. Building with Expo..." -ForegroundColor Yellow

# EAS build local simulate
$buildCommand = "npx eas build --platform android --local --non-interactive"
try {
    Invoke-Expression $buildCommand
} catch {
    Write-Host "EAS build failed, trying alternative method..." -ForegroundColor Red
    
    # Alternative: React Native CLI
    try {
        npx react-native build-android --mode=release
    } catch {
        Write-Host "All build methods failed. Please check your environment." -ForegroundColor Red
        exit 1
    }
}

# AAB dosyasını bul ve kopyala
$aabPath = Get-ChildItem -Path "." -Recurse -Filter "*.aab" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if ($aabPath) {
    $destinationPath = Join-Path $OutputPath "universe-$(Get-Date -Format 'yyyyMMdd-HHmmss').aab"
    Copy-Item $aabPath.FullName $destinationPath
    Write-Host "AAB file copied to: $destinationPath" -ForegroundColor Green
} else {
    Write-Host "No AAB file found. Build may have failed." -ForegroundColor Red
}

Write-Host "Build process completed!" -ForegroundColor Green
