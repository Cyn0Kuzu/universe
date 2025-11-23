#!/bin/bash

echo "🧹 Starting comprehensive clean build process for Universe Campus..."
echo "================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Step 1: Cleaning project..."
echo "----------------------------------------"

# Stop any running Metro bundler
print_status "Stopping Metro bundler..."
pkill -f "metro" || print_warning "No Metro process found"

# Node modules cleanup
print_status "Removing node_modules..."
rm -rf node_modules
rm -f package-lock.json

# Metro cache cleanup
print_status "Cleaning Metro cache..."
rm -rf /tmp/metro-*
rm -rf /tmp/haste-*
rm -rf $TMPDIR/react-*
rm -rf $TMPDIR/metro-*

# Android cleanup
if [ -d "android" ]; then
    print_status "Cleaning Android build..."
    cd android

    # Gradle cleanup
    ./gradlew clean || print_warning "Gradle clean failed"
    ./gradlew cleanBuildCache || print_warning "Gradle cleanBuildCache failed"

    # Remove build directories
    rm -rf .gradle
    rm -rf app/build
    rm -rf build

    cd ..
fi

# Watchman cleanup (if available)
if command -v watchman &> /dev/null; then
    print_status "Cleaning Watchman cache..."
    watchman watch-del-all || print_warning "Watchman cleanup failed"
fi

print_success "✅ Project cleanup completed!"
echo ""

print_status "Step 2: Installing dependencies..."
echo "----------------------------------------"
npm install

if [ $? -eq 0 ]; then
    print_success "✅ Dependencies installed successfully!"
else
    print_error "❌ Failed to install dependencies"
    exit 1
fi

echo ""

print_status "Step 3: Resetting Metro bundler..."
echo "----------------------------------------"
print_status "Starting Metro bundler with cache reset..."
npx react-native start --reset-cache &
METRO_PID=$!

# Wait a bit for Metro to start
sleep 5

print_success "✅ Metro bundler started!"
echo ""

print_status "Step 4: Building Android..."
echo "----------------------------------------"

if [ -d "android" ]; then
    cd android

    print_status "Assembling Android debug build..."
    ./gradlew assembleDebug

    if [ $? -eq 0 ]; then
        print_success "✅ Android build completed successfully!"
    else
        print_error "❌ Android build failed"
        cd ..
        exit 1
    fi

    cd ..
else
    print_warning "Android directory not found, skipping Android build"
fi

echo ""

print_status "Step 5: Running app..."
echo "----------------------------------------"
print_status "Starting React Native Android..."
npx react-native run-android

if [ $? -eq 0 ]; then
    print_success "✅ App started successfully!"
else
    print_error "❌ Failed to start app"
    exit 1
fi

echo ""

print_status "Step 6: Final cleanup..."
echo "----------------------------------------"

# Kill Metro if still running
if [ ! -z "$METRO_PID" ]; then
    kill $METRO_PID 2>/dev/null || print_warning "Could not kill Metro process"
fi

print_success "🎉 Clean build process completed!"
print_status "Your Universe Campus app is now optimized and ready to run."
echo ""
print_status "Next steps:"
echo "  - Test the app for performance improvements"
echo "  - Check that all features work correctly"
echo "  - Monitor for any new warnings or errors"
echo ""
print_status "If you encounter issues, run this script again or check the logs."

exit 0










