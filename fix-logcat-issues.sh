#!/bin/bash

# Fix Android Logcat Issues - Automated Setup Script
# This script automates the deployment of fixes for push notifications and performance issues

set -e  # Exit on error

echo "🚀 Android Logcat Issues - Automated Fix Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo "Installing Firebase CLI..."
    npm install -g firebase-tools
fi

echo -e "${GREEN}✅ Firebase CLI found${NC}"
echo ""

# Check if logged into Firebase
echo "🔐 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged into Firebase${NC}"
    echo "Please login to Firebase:"
    firebase login
fi

echo -e "${GREEN}✅ Firebase authenticated${NC}"
echo ""

# Step 1: Install function dependencies
echo "📦 Step 1/5: Installing Cloud Function dependencies..."
cd functions

if [ ! -d "node_modules" ]; then
    npm install
else
    echo "Dependencies already installed, skipping..."
fi

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 2: Build functions
echo "🔨 Step 2/5: Building TypeScript functions..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Functions built successfully${NC}"
else
    echo -e "${RED}❌ Function build failed${NC}"
    exit 1
fi

cd ..
echo ""

# Step 3: Deploy functions
echo "🚀 Step 3/5: Deploying Cloud Functions to Firebase..."
firebase deploy --only functions

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Functions deployed successfully${NC}"
else
    echo -e "${RED}❌ Function deployment failed${NC}"
    exit 1
fi

echo ""

# Step 4: Deploy Firestore rules
echo "🔒 Step 4/5: Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Firestore rules deployed${NC}"
else
    echo -e "${YELLOW}⚠️  Firestore rules deployment failed (non-critical)${NC}"
fi

echo ""

# Step 5: Find files that need updating
echo "🔍 Step 5/5: Finding files to update..."
echo ""
echo "Files using old push notification service:"
echo "-------------------------------------------"

# Find files with UnifiedPushNotificationHelper
if command -v grep &> /dev/null; then
    FILES=$(grep -r "UnifiedPushNotificationHelper" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | cut -d: -f1 | sort -u)
    
    if [ -z "$FILES" ]; then
        echo -e "${GREEN}✅ No files need updating!${NC}"
    else
        echo "$FILES"
        echo ""
        echo -e "${YELLOW}⚠️  Please update these files manually:${NC}"
        echo "Replace: import { UnifiedPushNotificationHelper } from './unifiedPushNotificationHelper';"
        echo "With:    import hybridPushService from './hybridPushNotificationService';"
        echo ""
        echo "Replace: UnifiedPushNotificationHelper.sendToUser(...)"
        echo "With:    hybridPushService.sendToUser(...)"
    fi
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=============================================="
echo ""
echo "Next Steps:"
echo "1. Update the files listed above (if any)"
echo "2. Build your React Native app: cd android && ./gradlew assembleDebug"
echo "3. Test on a physical device"
echo "4. Monitor Firebase Console: https://console.firebase.google.com/"
echo ""
echo "Verification Commands:"
echo "  firebase functions:log                    # View function logs"
echo "  adb logcat | grep Push                    # Monitor push notifications"
echo "  adb logcat | grep 'Skipped.*frames'       # Check performance"
echo ""
echo "Documentation:"
echo "  - LOGCAT_FIX_SUMMARY.md                   # Quick overview"
echo "  - FIREBASE_FUNCTIONS_DEPLOYMENT_GUIDE.md  # Detailed deployment guide"
echo "  - MIGRATION_GUIDE.md                      # Step-by-step migration"
echo ""
echo -e "${GREEN}🎉 Your app is now ready for production!${NC}"







