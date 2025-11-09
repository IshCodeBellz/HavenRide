# Vercel Deployment Guide for Admin Features

## Important: Database Setup on Vercel

After deploying to Vercel, you need to ensure the database schema includes the admin fields.

### Step 1: Set Database URL Environment Variable

In Vercel Dashboard → Your Project → Settings → Environment Variables:

```
DATABASE_URL=your_production_postgres_url
```

### Step 2: Push Schema to Production Database

After deployment, run this locally (pointing to production DB):

```bash
# Set production DATABASE_URL in .env temporarily
npx prisma db push

# Or create a migration
npx prisma migrate deploy
```

### Step 3: Set Admin User

After deploying, you need to manually set at least one admin user.

**Option A: Using Prisma Studio**

```bash
# Connect to production database
npx prisma studio
```

Then find your user and set `isAdmin = true`

**Option B: Using SQL**

```sql
-- Replace with your actual email
UPDATE "User"
SET "isAdmin" = true
WHERE email = 'your-admin-email@example.com';
```

**Option C: Using Vercel Postgres Dashboard**

1. Go to Vercel → Storage → Your Database → SQL Editor
2. Run the UPDATE query above

### Step 4: Verify Admin Access

1. Log in with the admin user email
2. You should be redirected to `/admin`
3. The "ADMIN MODE" bar should appear at the top
4. Stats should display (Total Users, Active Drivers, Today's Rides)

---

## Troubleshooting on Vercel

### Stats Showing 0

**Problem**: Dashboard shows 0 for all stats even though data exists.

**Possible Causes**:

1. Database connection issues
2. `isAdmin` field not properly set
3. Prisma schema not synced

**Solutions**:

1. **Check Database Connection**

   - Verify `DATABASE_URL` environment variable is set correctly
   - Test connection using Prisma Studio: `npx prisma studio`

2. **Verify Schema**

   ```bash
   # Check if isAdmin field exists
   npx prisma db pull
   npx prisma generate
   ```

3. **Check Vercel Logs**

   - Go to Vercel Dashboard → Deployments → Your Deployment → Functions
   - Check `/api/admin/stats` function logs
   - Look for errors like "Property 'isAdmin' does not exist"

4. **Force Schema Update**
   ```bash
   # Push schema to production
   DATABASE_URL="your_prod_url" npx prisma db push --force-reset
   ```
   ⚠️ Warning: `--force-reset` will delete all data. Use with caution!

### Admin Mode Bar Not Showing

**Problem**: Logged in as admin but no "ADMIN MODE" bar appears.

**Solutions**:

1. **Check isAdmin in Database**

   ```sql
   SELECT id, email, role, "isAdmin" FROM "User" WHERE email = 'your@email.com';
   ```

   Should return `isAdmin: true`

2. **Clear Browser Cache**

   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Or clear cookies for the site

3. **Check API Response**

   - Open browser DevTools → Network tab
   - Navigate to `/admin`
   - Check `/api/users/me` response
   - Should include: `{ "role": "ADMIN", "isAdmin": true }`

4. **Redeploy**
   - Sometimes Vercel needs a redeploy to pick up schema changes
   - Go to Vercel Dashboard → Deployments → Redeploy

### TypeScript Errors in Vercel Build

**Problem**: Build fails with "Property 'isAdmin' does not exist" errors.

**Solution**:
These are type cache issues. The code works at runtime.

To fix in development:

```bash
npx prisma generate
# Then restart VS Code or TypeScript server
```

For Vercel builds, the errors are warnings and don't affect runtime. The deployment will still work.

---

## Environment Variables Needed

Ensure these are set in Vercel:

```env
# Database
DATABASE_URL=postgresql://...

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Ably (if using real-time features)
NEXT_PUBLIC_ABLY_PUBLISHABLE_KEY=...
ABLY_SECRET_KEY=...

# App URLs
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Post-Deployment Checklist

- [ ] Database schema pushed to production
- [ ] At least one admin user created (`isAdmin = true`)
- [ ] Environment variables set in Vercel
- [ ] Admin can access `/admin` route
- [ ] Admin mode bar appears
- [ ] Stats display correctly
- [ ] All admin pages accessible:
  - [ ] `/admin/users`
  - [ ] `/admin/rides`
  - [ ] `/admin/finance`
  - [ ] `/admin/compliance`
  - [ ] `/admin/support`
  - [ ] `/admin/dispatchers`
  - [ ] `/admin/settings`

---

## Quick Admin Setup Commands

```bash
# 1. Deploy to Vercel (automatic via git push)
git push origin main

# 2. Push schema to production DB
DATABASE_URL="your_prod_url" npx prisma db push

# 3. Generate Prisma client
npx prisma generate

# 4. Set admin user (use Vercel Postgres SQL Editor or psql)
# UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@example.com';

# 5. Verify deployment
# Visit: https://your-app.vercel.app/admin
```

---

## Database Schema Changes

The admin features require these fields in the User model:

```prisma
model User {
  id        String      @id
  email     String      @unique
  name      String?
  role      String?
  isAdmin   Boolean     @default(false)  // ← Required for admin access
  status    UserStatus  @default(ACTIVE)
  // ... other fields
}
```

If you see errors about missing fields, run:

```bash
npx prisma db push
npx prisma generate
```

---

## Monitoring Admin Features in Production

### Check Admin API Health

```bash
# Test stats endpoint (replace with your domain)
curl https://your-app.vercel.app/api/admin/stats \
  -H "Cookie: __session=your_session_cookie"
```

Should return:

```json
{
  "totalUsers": 10,
  "activeDrivers": 2,
  "todayRides": 5
}
```

### Vercel Function Logs

Monitor admin API calls:

1. Go to Vercel Dashboard
2. Select your project
3. Go to "Logs" or "Functions"
4. Filter by `/api/admin/*`

Look for errors or slow queries that might indicate issues.

---

## Support

If issues persist after following this guide:

1. Check Vercel function logs for errors
2. Verify database connection string
3. Confirm schema is up to date
4. Test locally with production database URL
5. Check browser console for JavaScript errors

Common error patterns:

- `P1001: Can't reach database server` → Check DATABASE_URL
- `Property 'isAdmin' does not exist` → Run `prisma generate`
- `Forbidden - Admin access required` → Set `isAdmin = true` in database
- Stats showing 0 → Check database has data, verify queries work

---

Last Updated: November 9, 2025
