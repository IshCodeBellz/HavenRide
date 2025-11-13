# Mobile App Quick Start

## 🚀 Quick Setup (5 minutes)

### 1. Add Native Platforms

```bash
# iOS (macOS only)
npx cap add ios

# Android
npx cap add android
```

### 2. Build and Sync

```bash
# Build Next.js and sync to native projects
npm run mobile:build
```

### 3. Open in Native IDE

```bash
# iOS (macOS only)
npm run mobile:ios

# Android
npm run mobile:android
```

### 4. Run on Device/Simulator

- **iOS**: Click Play button in Xcode
- **Android**: Click Run button in Android Studio

## 📱 Available Scripts

- `npm run mobile:build` - Build Next.js + sync Capacitor
- `npm run mobile:sync` - Sync web assets to native projects
- `npm run mobile:ios` - Open iOS project in Xcode
- `npm run mobile:android` - Open Android project in Android Studio
- `npm run mobile:copy` - Copy web assets only

## 🔧 Production Setup

1. **Deploy your Next.js app** (e.g., to Vercel)
2. **Set environment variable**:
   ```env
   CAPACITOR_SERVER_URL=https://your-app.vercel.app
   ```
3. **Rebuild and sync**:
   ```bash
   npm run mobile:build
   ```

## 📚 Full Documentation

See [MOBILE_APP_SETUP.md](./MOBILE_APP_SETUP.md) for complete guide.

## ⚠️ Important Notes

- **iOS development requires macOS** and Xcode
- **Android development** requires Android Studio
- Your Next.js app **must be deployed** (HTTPS) for production mobile apps
- After code changes, run `npm run mobile:build` to update native apps
