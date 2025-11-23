# Android Build Temizleme Script - Expo Projesi
# PowerShell Script

Write-Host "🧹 Android Build Temizleme Başlatılıyor..." -ForegroundColor Cyan

# Proje dizinine git
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

# 1. Expo cache temizle
Write-Host "`n📦 Expo cache temizleniyor..." -ForegroundColor Yellow
npx expo start --clear --no-dev 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Expo cache temizlendi" -ForegroundColor Green
} else {
    Write-Host "⚠️ Expo cache temizleme atlandı" -ForegroundColor Yellow
}

# 2. Android build klasörlerini temizle
Write-Host "`n📱 Android build klasörleri temizleniyor..." -ForegroundColor Yellow
$androidBuildDirs = @(
    "android\app\build",
    "android\build",
    "android\.gradle"
)

foreach ($dir in $androidBuildDirs) {
    $fullPath = Join-Path $projectRoot $dir
    if (Test-Path $fullPath) {
        Remove-Item -Recurse -Force $fullPath -ErrorAction SilentlyContinue
        Write-Host "  ✅ $dir temizlendi" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ $dir bulunamadı (zaten temiz)" -ForegroundColor Gray
    }
}

# 3. Metro bundler cache temizle
Write-Host "`n🚇 Metro bundler cache temizleniyor..." -ForegroundColor Yellow
$metroCache = Join-Path $env:TEMP "metro-*"
Remove-Item -Recurse -Force $metroCache -ErrorAction SilentlyContinue
Write-Host "✅ Metro cache temizlendi" -ForegroundColor Green

# 4. Watchman cache temizle (eğer yüklüyse)
Write-Host "`n👀 Watchman cache temizleniyor..." -ForegroundColor Yellow
try {
    watchman watch-del-all 2>&1 | Out-Null
    Write-Host "✅ Watchman cache temizlendi" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Watchman bulunamadı (atlandı)" -ForegroundColor Gray
}

# 5. Node modules temizleme (opsiyonel - yorum satırını kaldırarak aktif edebilirsiniz)
# Write-Host "`n📚 Node modules temizleniyor..." -ForegroundColor Yellow
# Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
# Write-Host "✅ Node modules temizlendi" -ForegroundColor Green

Write-Host "`n✨ Temizleme tamamlandı!" -ForegroundColor Green
Write-Host "`n📝 Sonraki adımlar:" -ForegroundColor Cyan
Write-Host "   1. npm install (eğer node_modules temizlediyseniz)" -ForegroundColor White
Write-Host "   2. npx expo run:android" -ForegroundColor White

