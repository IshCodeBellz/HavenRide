#!/bin/bash

# iOS Simulator Run Script
# This script builds and runs the iOS app on a simulator

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Building and running iOS app on simulator...${NC}"

# Change to iOS directory
cd "$(dirname "$0")/../ios/App"

# Check if CocoaPods is installed
if ! command -v pod &> /dev/null; then
    echo -e "${RED}❌ CocoaPods is not installed.${NC}"
    echo -e "${YELLOW}Please install CocoaPods first:${NC}"
    echo -e "  sudo gem install cocoapods"
    echo -e ""
    echo -e "${YELLOW}Or if you're using Homebrew:${NC}"
    echo -e "  brew install cocoapods"
    exit 1
fi

# Install pods if needed
if [ ! -d "Pods" ]; then
    echo -e "${YELLOW}📦 Installing CocoaPods dependencies...${NC}"
    pod install
fi

# Get simulator name (default to iPhone 17 Pro Max if available, otherwise first available iPhone)
SIMULATOR_NAME="${1:-iPhone 17 Pro Max}"

# Check if simulator exists
if ! xcrun simctl list devices available | grep -q "$SIMULATOR_NAME"; then
    echo -e "${YELLOW}⚠️  Simulator '$SIMULATOR_NAME' not found. Available simulators:${NC}"
    xcrun simctl list devices available | grep -E '(iPhone|iPad)' | head -10
    echo -e "${YELLOW}Using first available iPhone...${NC}"
    # Extract simulator name from output format: "    iPhone 17 Pro Max (UUID) (Booted)"
    SIMULATOR_NAME=$(xcrun simctl list devices available | grep -E 'iPhone' | head -1 | sed -E 's/^[[:space:]]+([^(]+).*/\1/' | xargs)
    if [ -z "$SIMULATOR_NAME" ]; then
        echo -e "${RED}❌ No iPhone simulators found. Please install one from Xcode.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}📱 Using simulator: $SIMULATOR_NAME${NC}"

# Build the app
echo -e "${GREEN}🔨 Building app...${NC}"
xcodebuild \
    -workspace App.xcworkspace \
    -scheme App \
    -configuration Debug \
    -destination "platform=iOS Simulator,name=$SIMULATOR_NAME" \
    -derivedDataPath build \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    clean build

# Boot simulator if not already booted
echo -e "${GREEN}📲 Booting simulator...${NC}"
xcrun simctl boot "$SIMULATOR_NAME" 2>/dev/null || true

# Wait for simulator to be ready
sleep 2

# Find the built app
APP_PATH=$(find build/Build/Products/Debug-iphonesimulator -name "App.app" | head -1)

if [ -z "$APP_PATH" ]; then
    echo -e "${RED}❌ Could not find built app. Build may have failed.${NC}"
    exit 1
fi

# Install app on simulator
echo -e "${GREEN}📥 Installing app on simulator...${NC}"
xcrun simctl install booted "$APP_PATH"

# Launch app
echo -e "${GREEN}🚀 Launching app...${NC}"
xcrun simctl launch --console booted com.havenride.app

echo -e "${GREEN}✅ Done! App should be running on simulator.${NC}"

