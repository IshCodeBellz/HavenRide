# Admin System with isAdmin Flag

## Overview

The admin system now uses a **boolean `isAdmin` field** instead of relying on the `role` field. This allows admins to switch between different role views (DRIVER, RIDER, DISPATCHER) while maintaining their admin privileges.

## How It Works

### Database Schema

```prisma
model User {
  id        String   @id
  email     String   @unique
  name      String?
  role      String?
  isAdmin   Boolean  @default(false)  // ✅ Admin flag
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Role Switcher (Admins Only)

- **Location**: Top-right corner of any page using `AppLayout`
- **Visible**: Only when `isAdmin = true`
- **Options**:
  - 👑 Admin Panel → `/admin`
  - 🚗 Driver View → `/driver`
  - 👤 Rider View → `/rider`
  - 📋 Dispatcher View → `/dispatcher`

### Access Control

1. **Admin Pages** (`/admin/*`): Requires `isAdmin = true`
2. **Role-Specific Pages**: Checks current `role` field
3. **Role Switching**: Only available to users with `isAdmin = true`

## Setting Up an Admin User

### Method 1: Using Prisma Studio (Recommended)

```bash
npx prisma studio
```

1. Open Prisma Studio in browser
2. Navigate to `User` model
3. Find your user by email
4. Set `isAdmin` to `true`
5. Save changes

### Method 2: Using SQL

```bash
# Open PostgreSQL
psql -d havenride_full

# Run the SQL from SET_ADMIN.sql
UPDATE "User"
SET "isAdmin" = true
WHERE email = 'your-email@example.com';
```

### Method 3: Using SQL File

```bash
# Edit SET_ADMIN.sql and replace 'YOUR_CLERK_USER_ID' or email
# Then run:
psql -d havenride_full -f SET_ADMIN.sql
```

## API Endpoints

### `/api/users/me`

Returns current user data including `isAdmin` flag:

```json
{
  "role": "RIDER",
  "isAdmin": true
}
```

### `/api/admin/switch-role`

**POST** - Switch role (admin only)

```json
{
  "role": "DRIVER" | "RIDER" | "DISPATCHER"
}
```

**Security**: Verifies `isAdmin = true` before allowing role switch

### `/api/admin/stats`

**GET** - Fetch admin statistics
**Security**: Requires `isAdmin = true`

## User Flow

### Regular User (isAdmin = false)

1. Sign up → Auto-assigned RIDER role
2. Can only access `/rider` dashboard
3. Cannot switch roles

### Admin User (isAdmin = true)

1. Sign up → Admin manually sets `isAdmin = true`
2. Can access `/admin` dashboard
3. Can switch to any role view (DRIVER, RIDER, DISPATCHER)
4. Current role stored in `role` field
5. Always retains admin access regardless of current role

## Example: Admin Testing Driver Features

```
1. Admin logs in (role: ADMIN, isAdmin: true)
2. Sees role switcher in top-right
3. Clicks switcher → Selects "🚗 Driver"
4. API updates role to DRIVER
5. Redirects to /driver dashboard
6. Admin experiences driver view
7. Role switcher still visible (because isAdmin: true)
8. Can switch back to Admin Panel anytime
```

## Benefits

✅ **Better Separation**: Admin privileges separate from role-based permissions
✅ **Easy Testing**: Admins can test any role without losing admin access
✅ **Security**: Admin status is explicit and not tied to current role
✅ **Flexibility**: Admins can switch roles without backend intervention
✅ **Persistent**: Admin flag never changes when switching roles

## Migration Notes

### Before (Old System)

- Users had `role = "ADMIN"`
- Could not test other roles
- Switching role meant losing admin access

### After (New System)

- Users have `isAdmin = true` + `role = "RIDER/DRIVER/DISPATCHER"`
- Can freely switch roles
- Always retain admin access
- Role switcher always visible for admins

## Security Considerations

1. **Setting isAdmin**: Only done manually (Prisma Studio, SQL, or secure admin API)
2. **Role Switching**: API validates `isAdmin = true` before allowing switches
3. **Admin Pages**: All admin routes check `isAdmin` flag
4. **No Self-Elevation**: Regular users cannot set themselves as admin

## Troubleshooting

### Issue: Role switcher not visible

**Solution**: Check if `isAdmin = true` in database for your user

### Issue: Can't access /admin pages

**Solution**: Ensure `isAdmin = true` in User table

### Issue: Role switch doesn't work

**Solution**: Verify API endpoint `/api/admin/switch-role` is working and user has `isAdmin = true`

### Issue: After role switch, still see old dashboard

**Solution**: Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
