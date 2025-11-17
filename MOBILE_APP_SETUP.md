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

#### Finding Your Android SDK Path

After installing Android Studio, the Android SDK is typically located at:

- **macOS**: `~/Library/Android/sdk` or `/Users/<your-username>/Library/Android/sdk`
- **Linux**: `~/Android/Sdk` or `/home/<your-username>/Android/Sdk`
- **Windows**: `%LOCALAPPDATA%\Android\Sdk` or `C:\Users\<your-username>\AppData\Local\Android\Sdk`

**To find your SDK path in Android Studio:**

1. Open Android Studio
2. Go to **Preferences** (macOS) or **Settings** (Windows/Linux)
3. Navigate to **Appearance & Behavior** → **System Settings** → **Android SDK**
4. The SDK location is shown at the top of the SDK Manager window

**Set ANDROID_HOME environment variable:**

Add to your shell profile (`~/.zshrc` for zsh, `~/.bashrc` for bash):

```bash
# macOS/Linux
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

Then reload your shell:

```bash
source ~/.zshrc  # or source ~/.bashrc
```

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

**For Production:**
Point Capacitor to your deployed Next.js app:

```env
# In your .env file
CAPACITOR_SERVER_URL=https://your-app.vercel.app
```

**For Local Development:**
Android emulators cannot access `localhost` on your host machine. Use one of these options:

**Option 1: Use Android Emulator Special IP (Recommended)**

```env
# Android emulator uses 10.0.2.2 to access host's localhost
CAPACITOR_SERVER_URL=http://10.0.2.2:3000
```

**Option 2: Use Your Local Network IP**

```env
# Find your IP: ifconfig (macOS/Linux) or ipconfig (Windows)
CAPACITOR_SERVER_URL=http://192.168.1.XXX:3000
```

**Option 3: Build and Sync (No Server Needed)**
Build your Next.js app and sync it to the native project. The app will use the built static files instead of connecting to a server:

```bash
npm run build
npm run mobile:sync
```

**Important**:

- For production, your Next.js app must be deployed and accessible via HTTPS
- For local development with emulator, use `10.0.2.2` instead of `localhost`
- Make sure your Next.js dev server is running if using Option 1 or 2

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

1. **Configure Android SDK Path** (if prompted):

   When you first open Android Studio, you may be prompted to provide the Android SDK path. Use one of these common locations:

   - **macOS**: `/Users/<your-username>/Library/Android/sdk`
   - **Linux**: `/home/<your-username>/Android/Sdk`
   - **Windows**: `C:\Users\<your-username>\AppData\Local\Android\Sdk`

   If Android Studio doesn't detect your SDK automatically:

   - Click the **Browse** button (folder icon) next to the SDK path field
   - Navigate to the SDK location listed above
   - Select the folder and click **OK**

2. **Open Android Studio**:

   ```bash
   npm run mobile:android
   ```

3. **Configure App Icons**:

   - Navigate to `android/app/src/main/res/`
   - Replace icons in `mipmap-*` folders
   - Use Android Asset Studio: [assetstudio.appspot.com](https://romannurik.github.io/AndroidAssetStudio/)

4. **Configure Signing**:

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

5. **Run on Emulator or Device**:

   **Using an Emulator:**

   - In Android Studio, open **Device Manager** (toolbar icon or Tools → Device Manager)
   - Click **Create Device** if you don't have one
   - Select a device (e.g., Pixel 5) and system image (e.g., API 33)
   - Click the **Play** button to start the emulator
   - Wait for it to fully boot, then click **Run** or press `Shift+F10`

   **Using a Physical Device:**

   - Enable Developer Options and USB Debugging on your Android device
   - Connect via USB
   - Accept the USB debugging prompt
   - Click **Run** or press `Shift+F10` in Android Studio

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

- **Solution**:
  1. Make sure Android SDK is installed via Android Studio
  2. Set `ANDROID_HOME` environment variable (see Prerequisites section)
  3. Verify SDK path is correct: `echo $ANDROID_HOME` (macOS/Linux) or `echo %ANDROID_HOME%` (Windows)
  4. Ensure Android SDK Platform Tools are installed in Android Studio SDK Manager

**Issue**: Android Studio prompts for SDK path

- **Solution**:
  1. If you see a dialog asking for SDK path, click Browse and navigate to:
     - macOS: `~/Library/Android/sdk`
     - Linux: `~/Android/Sdk`
     - Windows: `%LOCALAPPDATA%\Android\Sdk`
  2. If SDK doesn't exist, install it via Android Studio:
     - Open Android Studio → Preferences/Settings → Android SDK
     - Install Android SDK Platform and SDK Platform-Tools

**Issue**: "No target device found" error

- **Solution**: You need to either start an Android emulator or connect a physical device:

  **Option 1: Create and Start an Android Emulator (AVD)**

  1. In Android Studio, click the **Device Manager** icon in the toolbar (or Tools → Device Manager)
  2. Click **Create Device**
  3. Select a device definition (e.g., Pixel 5, Pixel 6)
  4. Click **Next**
  5. Select a system image (e.g., API 33, API 34) - download if needed
  6. Click **Next** → **Finish**
  7. Click the **Play** button next to your AVD to start it
  8. Wait for the emulator to fully boot (home screen visible)
  9. Try running your app again

  **Option 2: Connect a Physical Android Device**

  1. Enable **Developer Options** on your Android device:
     - Go to Settings → About Phone
     - Tap **Build Number** 7 times
  2. Enable **USB Debugging**:
     - Go to Settings → Developer Options
     - Enable **USB Debugging**
  3. Connect device via USB
  4. Accept the USB debugging prompt on your device
  5. Verify device is detected: `adb devices` (should show your device)
  6. Try running your app again

  **Quick Check**: Run `adb devices` in terminal to see available devices

### Runtime Issues

**Issue**: "ERR_CONNECTION_REFUSED" or "Webpage not available" error

- **Solution**: This happens when the app tries to connect to `localhost` but can't reach your dev server:

  **For Android Emulator:**

  1. Android emulators can't access `localhost` on your host machine
  2. Set `CAPACITOR_SERVER_URL=http://10.0.2.2:3000` in your `.env` file (10.0.2.2 is the special IP for Android emulator)
  3. Make sure your Next.js dev server is running: `npm run dev`
  4. Rebuild and sync: `npm run mobile:build`
  5. Or build the app instead: `npm run build && npm run mobile:sync` (no server needed)

  **For Physical Android Device:**

  1. Find your computer's local IP address: `ifconfig` (macOS/Linux) or `ipconfig` (Windows)
  2. Set `CAPACITOR_SERVER_URL=http://YOUR_IP:3000` (e.g., `http://192.168.1.100:3000`)
  3. Make sure your device and computer are on the same WiFi network
  4. Make sure your Next.js dev server is running
  5. Rebuild and sync: `npm run mobile:build`

**Issue**: App shows blank screen

- **Solution**:
  1. Check that Next.js app is built: `npm run build`
  2. Check `CAPACITOR_SERVER_URL` points to a valid URL (or remove it to use built files)
  3. Sync Capacitor: `npm run mobile:sync`
  4. Check browser console in native IDE for errors
  5. If using a server URL, verify the server is accessible from your device/emulator

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
