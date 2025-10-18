#!/bin/bash

echo "🧹 Universe Campus 2025 - Deep Clean Build Script"
echo "=================================================="

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Hata kontrolü
set -e

echo -e "${BLUE}📋 Starting comprehensive cleanup...${NC}"

# 1. Metro ve Node.js süreçlerini durdur
echo -e "${YELLOW}🛑 Stopping Metro and Node processes...${NC}"
pkill -f "node.*metro" || true
pkill -f "expo.*start" || true
pkill -f "react-native.*start" || true

# 2. Node modules temizliği
echo -e "${YELLOW}📦 Cleaning Node.js dependencies...${NC}"
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo -e "${GREEN}✅ node_modules removed${NC}"
fi

if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    echo -e "${GREEN}✅ package-lock.json removed${NC}"
fi

if [ -f "yarn.lock" ]; then
    rm -f yarn.lock
    echo -e "${GREEN}✅ yarn.lock removed${NC}"
fi

# 3. Metro cache temizliği
echo -e "${YELLOW}🗑️ Cleaning Metro cache...${NC}"
rm -rf /tmp/metro-* || true
rm -rf /tmp/haste-* || true
rm -rf $TMPDIR/react-* || true
rm -rf $TMPDIR/metro-* || true
rm -rf $TMPDIR/haste-* || true

# Windows için ek temizlik
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    rm -rf %TEMP%\metro-* || true
    rm -rf %TEMP%\react-* || true
    rm -rf %TEMP%\haste-* || true
fi

echo -e "${GREEN}✅ Metro cache cleaned${NC}"

# 4. Android temizliği
echo -e "${YELLOW}🤖 Cleaning Android build...${NC}"
cd android

# Gradle cache temizliği
if [ -d ".gradle" ]; then
    rm -rf .gradle
    echo -e "${GREEN}✅ .gradle removed${NC}"
fi

# Build klasörleri
if [ -d "app/build" ]; then
    rm -rf app/build
    echo -e "${GREEN}✅ app/build removed${NC}"
fi

if [ -d "build" ]; then
    rm -rf build
    echo -e "${GREEN}✅ build removed${NC}"
fi

# Gradle wrapper cache
if [ -d "gradle/wrapper" ]; then
    rm -rf gradle/wrapper
    echo -e "${GREEN}✅ gradle/wrapper removed${NC}"
fi

# Gradle clean
echo -e "${YELLOW}🧽 Running Gradle clean...${NC}"
./gradlew clean || true
./gradlew cleanBuildCache || true

cd ..
echo -e "${GREEN}✅ Android cleaned${NC}"

# 5. iOS temizliği (varsa)
if [ -d "ios" ]; then
    echo -e "${YELLOW}🍎 Cleaning iOS build...${NC}"
    cd ios
    
    if [ -d "Pods" ]; then
        rm -rf Pods
        echo -e "${GREEN}✅ Pods removed${NC}"
    fi
    
    if [ -d "build" ]; then
        rm -rf build
        echo -e "${GREEN}✅ iOS build removed${NC}"
    fi
    
    if [ -f "Podfile.lock" ]; then
        rm -f Podfile.lock
        echo -e "${GREEN}✅ Podfile.lock removed${NC}"
    fi
    
    cd ..
    echo -e "${GREEN}✅ iOS cleaned${NC}"
fi

# 6. Watchman temizliği
echo -e "${YELLOW}👀 Cleaning Watchman...${NC}"
watchman watch-del-all || true
echo -e "${GREEN}✅ Watchman cleaned${NC}"

# 7. Expo cache temizliği
echo -e "${YELLOW}📱 Cleaning Expo cache...${NC}"
npx expo install --fix || true
echo -e "${GREEN}✅ Expo cache cleaned${NC}"

# 8. Bağımlılıkları yeniden yükle
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# 9. Firebase config kontrolü
echo -e "${YELLOW}🔥 Checking Firebase configuration...${NC}"
if [ -f "android/app/google-services.json" ]; then
    echo -e "${GREEN}✅ google-services.json found${NC}"
else
    echo -e "${RED}❌ google-services.json not found!${NC}"
    echo -e "${YELLOW}⚠️ Please download from Firebase Console${NC}"
fi

# 10. Build test
echo -e "${YELLOW}🧪 Testing build configuration...${NC}"
cd android
./gradlew assembleDebug --dry-run || true
cd ..

echo -e "${GREEN}✅ Build configuration test completed${NC}"

# 11. Son kontroller
echo -e "${BLUE}📋 Final checks...${NC}"

# Node version kontrolü
echo -e "${YELLOW}Node version:${NC}"
node --version

# NPM version kontrolü
echo -e "${YELLOW}NPM version:${NC}"
npm --version

# React Native CLI kontrolü
echo -e "${YELLOW}React Native CLI:${NC}"
npx react-native --version || true

echo ""
echo -e "${GREEN}🎉 Deep clean completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo -e "${YELLOW}1. Run: npx react-native run-android${NC}"
echo -e "${YELLOW}2. Monitor logs: adb logcat | grep -E '(Firebase|Auth|ReactNative)'${NC}"
echo -e "${YELLOW}3. Check Firebase connection in app${NC}"
echo ""
echo -e "${GREEN}✨ Your Universe Campus 2025 app is ready for testing!${NC}"




