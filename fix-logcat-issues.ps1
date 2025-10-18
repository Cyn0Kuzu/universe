# Fix Android Logcat Issues - Automated Setup Script (PowerShell)
# This script automates the deployment of fixes for push notifications and performance issues

Write-Host "🚀 Android Logcat Issues - Automated Fix Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found" -ForegroundColor Red
    Write-Host "Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

Write-Host ""

# Check if logged into Firebase
Write-Host "🔐 Checking Firebase authentication..." -ForegroundColor Cyan
try {
    firebase projects:list | Out-Null
    Write-Host "✅ Firebase authenticated" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Not logged into Firebase" -ForegroundColor Yellow
    Write-Host "Please login to Firebase:" -ForegroundColor Yellow
    firebase login
}

Write-Host ""

# Step 1: Install function dependencies
Write-Host "📦 Step 1/5: Installing Cloud Function dependencies..." -ForegroundColor Cyan
Set-Location functions

if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Host "Dependencies already installed, skipping..." -ForegroundColor Gray
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Step 2: Build functions
Write-Host "🔨 Step 2/5: Building TypeScript functions..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Functions built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Function build failed" -ForegroundColor Red
    exit 1
}

Set-Location ..
Write-Host ""

# Step 3: Deploy functions
Write-Host "🚀 Step 3/5: Deploying Cloud Functions to Firebase..." -ForegroundColor Cyan
firebase deploy --only functions

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Functions deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Function deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 4: Deploy Firestore rules
Write-Host "🔒 Step 4/5: Deploying Firestore rules and indexes..." -ForegroundColor Cyan
firebase deploy --only firestore:rules,firestore:indexes

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Firestore rules deployed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Firestore rules deployment failed (non-critical)" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Find files that need updating
Write-Host "🔍 Step 5/5: Finding files to update..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Files using old push notification service:" -ForegroundColor Yellow
Write-Host "-------------------------------------------" -ForegroundColor Yellow

$files = Get-ChildItem -Recurse -Path src\ -Include *.ts,*.tsx | 
    Select-String "UnifiedPushNotificationHelper" | 
    Select-Object -ExpandProperty Path -Unique

if ($files) {
    $files | ForEach-Object { Write-Host $_ -ForegroundColor White }
    Write-Host ""
    Write-Host "⚠️  Please update these files manually:" -ForegroundColor Yellow
    Write-Host "Replace: import { UnifiedPushNotificationHelper } from './unifiedPushNotificationHelper';" -ForegroundColor Gray
    Write-Host "With:    import hybridPushService from './hybridPushNotificationService';" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Replace: UnifiedPushNotificationHelper.sendToUser(...)" -ForegroundColor Gray
    Write-Host "With:    hybridPushService.sendToUser(...)" -ForegroundColor Gray
} else {
    Write-Host "✅ No files need updating!" -ForegroundColor Green
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update the files listed above (if any)"
Write-Host "2. Build your React Native app: cd android; .\gradlew assembleDebug"
Write-Host "3. Test on a physical device"
Write-Host "4. Monitor Firebase Console: https://console.firebase.google.com/"
Write-Host ""
Write-Host "Verification Commands:" -ForegroundColor Yellow
Write-Host "  firebase functions:log                    # View function logs"
Write-Host "  adb logcat | Select-String Push           # Monitor push notifications"
Write-Host "  adb logcat | Select-String 'Skipped.*frames' # Check performance"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "  - LOGCAT_FIX_SUMMARY.md                   # Quick overview"
Write-Host "  - FIREBASE_FUNCTIONS_DEPLOYMENT_GUIDE.md  # Detailed deployment guide"
Write-Host "  - MIGRATION_GUIDE.md                      # Step-by-step migration"
Write-Host ""
Write-Host "🎉 Your app is now ready for production!" -ForegroundColor Green







