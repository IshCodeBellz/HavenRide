import { CapacitorConfig } from '@capacitor/cli';

// For production, set CAPACITOR_SERVER_URL to your deployed URL
// Example: CAPACITOR_SERVER_URL=https://your-app.vercel.app
// For local development, set CAPACITOR_SERVER_URL=http://localhost:3000
const serverUrl = process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000';

const config: CapacitorConfig = {
  appId: 'com.havenride.app',
  appName: 'HavenRide',
  webDir: 'public', // Use public folder for static assets
  // Point to Next.js server (dev or production)
  server: {
    url: serverUrl,
    androidScheme: serverUrl.startsWith('https') ? 'https' : 'http',
    iosScheme: serverUrl.startsWith('https') ? 'https' : 'http',
    cleartext: !serverUrl.startsWith('https'), // Allow HTTP for localhost
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0F3D3E',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0F3D3E',
    },
  },
};

export default config;

