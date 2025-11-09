# HavenRide – Full Build (Unified)

This bundle combines all features we've produced: **intelligent auto-assign algorithm**, pickup PIN verification, real-time chat, driver documentation gate, dispatcher masked calls, rider/driver profiles, **live map tracking with Mapbox**, **CSV export reports**, **incident management schema**, admin dashboard (roles, settings, metrics, ops), earnings tracking, accounting webhooks, automated receipts, and more.

## Quick start

1. **Install deps**:
   ```bash
   npm install
   ```
2. **Environment** – create `.env`:

   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/havenride

   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...

   # Ably (optional but recommended)
   NEXT_PUBLIC_ABLY_KEY=xxx:yyy
   ABLY_SERVER_KEY=xxx:yyy

   # Stripe (optional in dev)
   STRIPE_SECRET_KEY=sk_live_or_test
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test

   # Twilio (masked calling)
   PUBLIC_BASE_URL=https://your-app.vercel.app
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_FROM_NUMBER=+44xxxxxxxxxx

   # Email (Resend) for receipts/confirmations
   RESEND_API_KEY=re_...

   # Accounting webhook (optional)
   ACCOUNTING_WEBHOOK_URL=https://example.com/accounting
   ACCOUNTING_WEBHOOK_SECRET=supersecret

   # Admin restrictions (optional)
   ADMIN_EMAIL_ALLOWLIST=ceo@yourorg.com,cto@yourorg.com

   # Fares fallback (DB Settings overrides at runtime)
   BASE_FARE=6
   PER_KM=1.8
   WHEELCHAIR_MULT=1.15

   # Payout rate (driver earnings)
   DRIVER_PAYOUT_RATE=0.75

   # Mapbox (live tracking)
   NEXT_PUBLIC_MAPBOX_TOKEN=pk_...
   ```

3. **Generate & migrate Prisma**:
   ```bash
   npx prisma generate
   npx prisma migrate dev -n havenride_full_build
   ```
4. **Run**:
   ```bash
   npm run dev
   ```

## Key routes

- Rider: `/rider`, `/rider/profile`, `/rider/past-rides`, `/rider/support`
- Driver: `/driver`, `/driver/profile`, `/driver/earnings`, `/driver/past-rides`, `/driver/support`, `/driver-signup` (sign up as driver)
- Dispatcher: `/dispatcher`, `/dispatcher/map` (live tracking), `/dispatcher/reports` (analytics & CSV export)
- Admin: `/admin`, `/admin/settings`, `/admin/metrics`, `/admin/ops`, `/role-select` (admin only)

## ✨ Key Features

### For Dispatchers
- **🗺️ Live Map Tracking**: Real-time Mapbox visualization of all online drivers and active bookings with color-coded markers
- **🤖 Intelligent Auto-Assignment**: AI-powered driver matching using proximity (60%), ratings (30%), and wheelchair capability (10%)
- **💬 Real-time Chat**: Direct messaging with drivers and riders via Ably integration
- **📊 CSV Export**: Download booking reports and driver performance metrics with date filtering
- **🚨 Incident Management**: Structured tracking of SOS alerts, accidents, delays, and operational issues (schema ready)
- **📱 Manual Assignment**: Traditional driver selection with filtering and online status

### For Riders
- **📍 Saved Locations**: Store frequently used addresses (home, work, hospital)
- **💳 Payment Methods**: Manage multiple credit/debit cards with default selection
- **♿ Accessibility Preferences**: Auto-request wheelchair vehicles and assistance
- **📞 In-ride Support**: Chat with driver and dispatcher during trips
- **📜 Ride History**: View past rides with detailed information

### For Drivers
- **💰 Earnings Dashboard**: Track daily/weekly/monthly earnings with breakdowns
- **📋 Past Rides**: Complete ride history with rider details and fares
- **🗺️ Live Navigation**: Real-time location tracking during active rides
- **💬 Chat Support**: Communicate with dispatcher and riders
- **📄 Documentation**: Upload vehicle and license documents for verification

### For Admins
- **👥 Role Management**: Assign ADMIN/DISPATCHER roles with security controls
- **⚙️ Dynamic Settings**: Configure base fares, per-km rates, wheelchair multipliers
- **📈 Metrics Dashboard**: Platform statistics, revenue tracking, user counts
- **🔧 Operations Panel**: Monitor system health, manage users and drivers
- **📧 Email Allowlist**: Restrict admin access to approved email addresses

## Role Assignment 🔐

- **New users**: Auto-assigned `RIDER` role
- **Drivers**: Sign up via `/driver-signup` → Get `DRIVER` role
- **Admins**: First admin created manually via SQL (see `FIRST_ADMIN_SETUP.sql`)
- **Security**: Only admins can assign ADMIN/DISPATCHER roles

For detailed role management, see [`docs/ROLE_SYSTEM_GUIDE.md`](docs/ROLE_SYSTEM_GUIDE.md)

## Notes

- Realtime uses **Ably**; without keys, UI degrades gracefully (no-op publish/subscribe).
- Payments: if Stripe is not set, a dummy client secret is used (dev only).
- Receipts & Accounting fire **best-effort** on completion and won’t block the driver flow.
