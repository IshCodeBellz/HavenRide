# Testing Your Mobile App

## Quick Test Setup

### Step 1: Start Next.js Dev Server

In one terminal, start your Next.js development server:

```bash
npm run dev
```

This will start the server at `http://localhost:3000`

### Step 2: Sync Capacitor for Development

In another terminal, sync Capacitor to point to your local dev server:

```bash
npm run mobile:dev
```

This configures Capacitor to load your app from `http://localhost:3000`

### Step 3: Open in Native IDE

**For iOS (macOS only):**
```bash
npm run mobile:ios
```

**For Android:**
```bash
npm run mobile:android
```

### Step 4: Run on Simulator/Device

- **iOS**: In Xcode, select a simulator and click the Play button
- **Android**: In Android Studio, select an emulator and click Run

## Important Notes

### For iOS Simulator:
- Make sure your Mac and iOS Simulator can access `localhost:3000`
- The app will load your Next.js dev server

### For Android Emulator:
- Android emulator uses `10.0.2.2` instead of `localhost` to access your host machine
- If `localhost:3000` doesn't work, update `capacitor.config.ts`:
  ```typescript
  const serverUrl = process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000';
  ```

### For Physical Devices:
- Your computer and device must be on the same WiFi network
- Find your computer's local IP address:
  ```bash
  # macOS/Linux
  ifconfig | grep "inet " | grep -v 127.0.0.1
  
  # Windows
  ipconfig
  ```
- Update `capacitor.config.ts` to use your IP:
  ```typescript
  const serverUrl = process.env.CAPACITOR_SERVER_URL || 'http://192.168.1.XXX:3000';
  ```
- Then run `npm run mobile:dev` again

## Production Testing

For production testing, deploy your app first, then:

```bash
# Set your production URL
export CAPACITOR_SERVER_URL=https://your-app.vercel.app
npm run mobile:dev
npm run mobile:ios  # or mobile:android
```

## Troubleshooting

### "Cannot connect to server"
- Make sure Next.js dev server is running (`npm run dev`)
- Check the URL in `capacitor.config.ts` matches your server
- For Android emulator, use `10.0.2.2` instead of `localhost`
- For physical devices, use your computer's local IP address

### "Blank screen"
- Check browser console in the native IDE for errors
- Verify your Next.js app loads correctly in a regular browser
- Make sure all environment variables are set

### "CORS errors"
- Next.js should handle CORS automatically
- If issues persist, check your Next.js API routes

## Next Steps

Once testing works locally:
1. Deploy your Next.js app to production (Vercel, etc.)
2. Update `CAPACITOR_SERVER_URL` to your production URL
3. Build release versions for App Store/Play Store
4. See [MOBILE_APP_SETUP.md](./MOBILE_APP_SETUP.md) for distribution guide

