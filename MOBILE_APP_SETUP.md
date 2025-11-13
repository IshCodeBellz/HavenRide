# HavenRide Mobile App Setup Guide

This guide explains how to build and deploy HavenRide as a native mobile app for iOS and Android using Capacitor.

## Overview

HavenRide uses **Capacitor** to wrap your Next.js web application into native iOS and Android apps. This allows you to:

- Reuse your existing web code
- Access native device features (camera, GPS, push notifications, etc.)
- Distribute through App Store and Google Play
- Maintain a single codebase

## Prerequisites

### For iOS Development:

- macOS (required for iOS development)
- Xcode (latest version from Mac App Store)
- CocoaPods: `sudo gem install cocoapods`
- Apple Developer Account ($99/year for App Store distribution)

### For Android Development:

- Android Studio (download from [developer.android.com](https://developer.android.com/studio))
- Java Development Kit (JDK) 17 or later
- Android SDK (installed via Android Studio)
- Google Play Developer Account ($25 one-time fee)

## Initial Setup

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Build Your Next.js App

First, build your Next.js application:

```bash
npm run build
```

### 3. Add Native Platforms

Add iOS and/or Android platforms to your project:

```bash
# Add iOS platform (macOS only)
npx cap add ios

# Add Android platform
npx cap add android
```

This creates `ios/` and `android/` directories in your project root.

## Configuration

### Environment Variables

For production mobile apps, you'll want to point Capacitor to your deployed Next.js app:

```env
# In your .env file
CAPACITOR_SERVER_URL=https://your-app.vercel.app
```

**Important**: Your Next.js app must be deployed and accessible via HTTPS for the mobile app to work properly.

### Capacitor Configuration

The `capacitor.config.ts` file is already configured. Key settings:

- **appId**: `com.havenride.app` - Change this to your own bundle identifier
- **appName**: `HavenRide` - Display name in app stores
- **webDir**: `public` - Points to the public folder containing static assets (including index.html)

## Development Workflow

### Building for Mobile

1. **Build Next.js app**:

   ```bash
   npm run build
   ```

2. **Sync Capacitor** (copies web assets to native projects):

   ```bash
   npm run mobile:sync
   ```

3. **Open in native IDE**:

   ```bash
   # iOS (macOS only)
   npm run mobile:ios

   # Android
   npm run mobile:android
   ```

### Quick Build Script

Use the combined script:

```bash
npm run mobile:build
```

This builds Next.js and syncs Capacitor in one command.

## Platform-Specific Setup

### iOS Setup

1. **Open Xcode**:

   ```bash
   npm run mobile:ios
   ```

2. **Configure Signing**:

   - Select your project in Xcode
   - Go to "Signing & Capabilities"
   - Select your Team (Apple Developer Account)
   - Xcode will automatically manage certificates

3. **Configure App Icons**:

   - In Xcode, go to `ios/App/App/Assets.xcassets/AppIcon.appiconset`
   - Add your app icons (various sizes required)
   - Or use an icon generator tool

4. **Configure Splash Screen**:

   - Splash screen is configured in `capacitor.config.ts`
   - Customize in Xcode if needed

5. **Run on Simulator or Device**:
   - Select a simulator/device from the top bar
   - Click the Play button or press `Cmd+R`

### Android Setup

1. **Open Android Studio**:

   ```bash
   npm run mobile:android
   ```

2. **Configure App Icons**:

   - Navigate to `android/app/src/main/res/`
   - Replace icons in `mipmap-*` folders
   - Use Android Asset Studio: [assetstudio.appspot.com](https://romannurik.github.io/AndroidAssetStudio/)

3. **Configure Signing**:

   - Create a keystore for release builds:
     ```bash
     keytool -genkey -v -keystore havenride-release.keystore -alias havenride -keyalg RSA -keysize 2048 -validity 10000
     ```
   - Add to `android/app/build.gradle`:
     ```gradle
     android {
         signingConfigs {
             release {
                 storeFile file('havenride-release.keystore')
                 storePassword 'your-password'
                 keyAlias 'havenride'
                 keyPassword 'your-password'
             }
         }
         buildTypes {
             release {
                 signingConfig signingConfigs.release
             }
         }
     }
     ```

4. **Run on Emulator or Device**:
   - Create/start an Android Virtual Device (AVD) in Android Studio
   - Click Run or press `Shift+F10`

## App Store Distribution

### iOS (App Store)

1. **Archive Build**:

   - In Xcode: Product → Archive
   - Wait for archive to complete

2. **Upload to App Store Connect**:

   - Window → Organizer
   - Select your archive → Distribute App
   - Follow the wizard to upload

3. **App Store Connect**:
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Complete app information, screenshots, description
   - Submit for review

### Android (Google Play)

1. **Generate Release APK/AAB**:

   ```bash
   cd android
   ./gradlew bundleRelease  # For App Bundle (recommended)
   # OR
   ./gradlew assembleRelease  # For APK
   ```

2. **Upload to Google Play Console**:
   - Go to [play.google.com/console](https://play.google.com/console)
   - Create new app or select existing
   - Upload the AAB/APK file
   - Complete store listing, screenshots, description
   - Submit for review

## Native Features & Plugins

Capacitor plugins are already installed for common features:

- **@capacitor/app**: App lifecycle events
- **@capacitor/haptics**: Haptic feedback
- **@capacitor/keyboard**: Keyboard management
- **@capacitor/status-bar**: Status bar customization
- **@capacitor/splash-screen**: Splash screen control

### Adding More Plugins

To add additional native features:

```bash
# Example: Add camera plugin
npm install @capacitor/camera
npx cap sync
```

Available plugins: [capacitorjs.com/docs/plugins](https://capacitorjs.com/docs/plugins)

## Troubleshooting

### Build Errors

**Issue**: "Cannot find module" errors

- **Solution**: Run `npm install` and `npx cap sync`

**Issue**: iOS build fails with signing errors

- **Solution**: Configure signing in Xcode (Signing & Capabilities tab)

**Issue**: Android build fails

- **Solution**: Make sure Android SDK is installed and `ANDROID_HOME` is set

### Runtime Issues

**Issue**: App shows blank screen

- **Solution**:
  1. Check that Next.js app is built: `npm run build`
  2. Check `CAPACITOR_SERVER_URL` points to a valid HTTPS URL
  3. Check browser console in native IDE for errors

**Issue**: API calls fail

- **Solution**: Ensure your deployed Next.js app has CORS configured if needed, and that `CAPACITOR_SERVER_URL` is correct

**Issue**: Maps not loading

- **Solution**: Check Mapbox token is set in environment variables

### Development Tips

1. **Hot Reload**: Capacitor doesn't support hot reload. After code changes:

   ```bash
   npm run build && npx cap sync
   ```

2. **Testing**: Test on real devices, not just simulators, especially for GPS/camera features

3. **Debugging**: Use Chrome DevTools for Android and Safari Web Inspector for iOS

## Production Checklist

Before submitting to app stores:

- [ ] Update `appId` in `capacitor.config.ts` to your own bundle ID
- [ ] Update app icons for both platforms
- [ ] Configure splash screens
- [ ] Set `CAPACITOR_SERVER_URL` to production URL
- [ ] Test on real devices (iOS and Android)
- [ ] Test all features (maps, payments, real-time updates)
- [ ] Configure app signing (Android keystore, iOS certificates)
- [ ] Update app version in `package.json` and native projects
- [ ] Prepare app store assets (screenshots, descriptions, privacy policy)

## Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)

## Support

For issues specific to:

- **Capacitor**: [GitHub Issues](https://github.com/ionic-team/capacitor/issues)
- **Next.js**: [Next.js Discussions](https://github.com/vercel/next.js/discussions)
- **HavenRide**: Check project documentation or create an issue
