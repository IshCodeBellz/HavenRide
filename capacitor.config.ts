import { CapacitorConfig } from "@capacitor/cli";

// For production, set CAPACITOR_SERVER_URL to your deployed URL
// Example: CAPACITOR_SERVER_URL=https://your-app.vercel.app
// For local development with dev server:
//   - Android emulator: CAPACITOR_SERVER_URL=http://10.0.2.2:3000
//   - Physical device: CAPACITOR_SERVER_URL=http://YOUR_LOCAL_IP:3000
//   - Find your IP: ifconfig (macOS/Linux) or ipconfig (Windows)
// If not set, the app will use built files (no server needed)
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.havenride.app",
  appName: "HavenRide",
  webDir: "public",
  // Use server config for dev server - this loads content from Next.js dev server
  ...(serverUrl && {
    server: {
      url: serverUrl,
      androidScheme: "http",
      iosScheme: "http",
      cleartext: true,
    },
  }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#5C7E9B",
      androidSplashResourceName: "splash",
      androidScaleType: "FIT_CENTER",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#5C7E9B",
    },
  },
};

export default config;
