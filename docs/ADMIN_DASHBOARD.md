# HavenRide Admin Dashboard Documentation

## Overview

The HavenRide Admin Dashboard provides comprehensive platform oversight and management capabilities for system administrators. This documentation covers all admin features, API endpoints, and usage guidelines.

---

## Table of Contents

1. [Access & Security](#access--security)
2. [User Management](#user-management)
3. [System Oversight](#system-oversight)
4. [Finance & Billing](#finance--billing)
5. [Compliance](#compliance)
6. [Support Center](#support-center)
7. [Dispatcher Management](#dispatcher-management)
8. [API Reference](#api-reference)
9. [Database Schema](#database-schema)

---

## Access & Security

### Authentication

- **Route**: `/admin`
- **Protection**: `RoleGate` component requiring `["ADMIN"]` role
- **Verification**: All API endpoints verify `isAdmin: true` in database

### Role Assignment

Admin role must be set in database:

```sql
UPDATE "User" SET "isAdmin" = true WHERE email = 'admin@havenride.com';
```

---

## User Management

**Location**: `/app/admin/users`

### Features

#### 1. User Listing

- View all users (Riders, Drivers, Dispatchers, Admins)
- Search by name or email
- Filter by user type: ALL, RIDER, DRIVER

#### 2. User Information Display

- Name and email
- Role badges (color-coded)
- Account status
- Join date

#### 3. User Actions

**Edit User**

- Click "Edit" button
- Modify: Name, Email, Role
- Changes saved to database immediately

**Suspend User**

- Click "Suspend" button
- Confirmation dialog required
- Sets user status to `SUSPENDED`
- User cannot access platform while suspended

**Activate User**

- Available for suspended users
- Restores user access
- Sets status to `ACTIVE`

**Delete User**

- Click "Delete" button
- Confirmation required
- **Soft Delete**: If user has booking history, status set to `DEACTIVATED`
- **Hard Delete**: If no bookings, user permanently removed
- **Protection**: Cannot delete your own admin account

### Statistics Dashboard

- Total Users
- Total Riders
- Total Drivers
- Total Admins

### API Endpoints

```
GET    /api/admin/users              - Fetch all users
PATCH  /api/admin/users/[id]         - Edit user details
PUT    /api/admin/users/[id]         - Suspend/Activate user
DELETE /api/admin/users/[id]         - Delete user
```

---

## System Oversight

**Location**: `/app/admin/rides`, `/app/admin/settings`

### Rides Monitor

#### Features

- Real-time ride tracking
- Status filtering (8 statuses)
- Date filtering (today, week, month, all)
- Analytics dashboard

#### Ride Statuses

1. `REQUESTED` - New booking created
2. `ASSIGNED` - Driver assigned
3. `EN_ROUTE` - Driver heading to pickup
4. `ARRIVED` - Driver at pickup location
5. `IN_PROGRESS` - Ride in progress
6. `COMPLETED` - Ride finished
7. `CANCELED` - Booking canceled

#### Displayed Information

- Booking ID
- Rider name/email
- Driver name/email
- Route (pickup → dropoff)
- Status badge
- Final fare
- Creation date

#### Statistics

- Total Rides
- Active Rides
- Completed Rides
- Canceled Rides

### Platform Configuration

**Location**: `/app/admin/settings`

#### Fare Settings

Configure platform pricing:

```typescript
{
  baseFare: number,        // Base fare in £ (0-100)
  perKm: number,          // Price per kilometer (0-50)
  wheelchairMult: number  // Wheelchair accessibility multiplier (1-3)
}
```

**Example Calculation**:

```
Standard ride (10km): £6.00 + (£1.80 × 10km) = £24.00
Wheelchair ride (10km): £24.00 × 1.15 = £27.60
```

#### Feature Flags

**Require Pickup PIN Verification**

- Riders must enter PIN before pickup
- Enhances security and identity verification

**Send Receipt Emails Automatically**

- Automatically email receipts after ride completion
- Includes fare breakdown and payment details

#### Saving Settings

- Changes saved to database via API
- Audit log created for all settings changes
- Validation applied to all numeric values

### API Endpoints

```
GET   /api/admin/rides              - Fetch all bookings
GET   /api/admin/settings           - Get current settings
PATCH /api/admin/settings           - Update settings
```

---

## Finance & Billing

**Location**: `/app/admin/finance`

### Features

#### Revenue Dashboard

- **Total Revenue**: Sum of all completed ride fares
- **Platform Commission**: Default 15% of revenue
- **Driver Earnings**: Revenue minus commission
- **Pending Payouts**: Outstanding payments to drivers

#### Timeframe Filtering

- Week: Last 7 days
- Month: Last 30 days
- Year: Last 365 days
- All: All-time data

#### Payment Methods Tracking

- Stripe transactions count
- LA Invoicing transactions count
- Visual breakdown

#### Driver Payouts Table

Displays for each driver:

- Driver name and email
- Total earnings from rides
- Platform commission (15%)
- Net payout amount
- Number of rides
- Payment status

#### Recent Transactions

- Last 5 completed transactions
- Booking ID
- Rider and driver names
- Amount
- Payment method
- Date

### Financial Calculations

```typescript
const commissionRate = 0.15; // 15%

// Per booking
commission = finalFareAmount * commissionRate;
driverEarnings = finalFareAmount - commission;

// Aggregated
totalRevenue = sum(all completed bookings.finalFareAmount);
totalCommission = totalRevenue * commissionRate;
totalDriverEarnings = totalRevenue - totalCommission;
```

### API Endpoints

```
GET /api/admin/finance?timeframe=week   - Financial data with optional timeframe
```

---

## Compliance

**Location**: `/app/admin/compliance`

### Driver Verification Management

#### Information Tracked

- **License Number**: Driver's license ID
- **Insurance Expiry**: Insurance policy expiration date
- **DBS Check**: Date of last Disclosure and Barring Service check
- **DBS Expiry**: When DBS check expires
- **Wheelchair Training**: Accessibility training completion date
- **Verification Status**: PENDING, APPROVED, REJECTED, EXPIRED

#### Visual Indicators

- ⚠️ **Red Highlight**: Insurance expiring within 30 days
- 🟢 **Green Badge**: Verified drivers
- 🟡 **Yellow Badge**: Pending verification
- 🔴 **Red Badge**: Rejected or expired

#### Driver Approval Workflow

1. Driver submits verification documents
2. Admin reviews in compliance section
3. Admin clicks "Approve" button
4. System updates `docsVerified: true`
5. Driver can start accepting rides

#### Statistics

- Total Drivers
- Verified Drivers
- Pending Review
- Expiring Soon (insurance within 30 days)

#### GDPR Compliance

Information box displays:

- Data protection compliance notice
- User privacy rights
- Data access and deletion procedures

### API Endpoints

```
GET  /api/admin/compliance                       - Fetch all drivers with verification
POST /api/admin/compliance/drivers/[id]/approve  - Approve driver verification
```

---

## Support Center

**Location**: `/app/admin/support`

### Support Ticket Management

#### Ticket Information

- Ticket ID
- User (name/email)
- Subject
- Category
- Priority (URGENT, HIGH, MEDIUM, LOW)
- Status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)
- Creation date

#### Filtering

Filter tickets by status:

- All Tickets
- Open
- In Progress
- Resolved
- Closed

#### Statistics

- Total Tickets
- Open Tickets (red)
- In Progress (amber)
- Resolved (green)

### System Notifications Broadcasting

#### Broadcast Feature

Send system-wide notifications to users:

**Target Audiences**:

- All Users
- Riders Only
- Drivers Only
- Dispatchers Only

**Broadcast Fields**:

- Title (required)
- Message (required)
- Target Role (required)

**Use Cases**:

- Platform maintenance announcements
- Policy updates
- Emergency notifications
- Feature launches

#### How to Broadcast

1. Click "Broadcast Notification" button
2. Enter notification title
3. Write message content
4. Select target audience
5. Click "Send Broadcast"
6. Notification delivered to selected user group

### API Endpoints

```
GET  /api/admin/support                - Fetch support tickets
POST /api/admin/support/broadcast      - Send system notification
```

---

## Dispatcher Management

**Location**: `/app/admin/dispatchers`

### Features

#### Dispatcher Overview

View all dispatchers with:

- Profile information (name, email)
- Assigned region
- Assigned shift
- Rides dispatched count
- Average response time
- Status (ACTIVE/INACTIVE)
- Last active date

#### Performance Metrics

**Statistics Dashboard**:

- Total Dispatchers
- Active Dispatchers
- Total Rides Dispatched
- Average Response Time (seconds)

**Performance Overview**:

- Top Performer (most rides dispatched)
- Fastest Response (lowest avg response time)
- Total Coverage (active vs total)

#### Region Assignment

Assign dispatchers to London areas:

- North London
- South London
- East London
- West London
- Central London
- Greater London

#### Shift Assignment

Assign work shifts:

- Morning (6AM-2PM)
- Afternoon (2PM-10PM)
- Night (10PM-6AM)
- Day (8AM-4PM)
- Evening (4PM-12AM)
- 24/7 On-Call

#### Assignment Workflow

1. Click "Assign" button for dispatcher
2. Modal opens showing current assignments
3. Select region from dropdown
4. Select shift from dropdown
5. Click "Save Assignment"
6. Changes saved to database

### API Endpoints

```
GET  /api/admin/dispatchers              - Fetch all dispatchers
POST /api/admin/dispatchers/[id]/assign  - Assign region/shift
```

---

## API Reference

### Authentication

All admin API endpoints require:

1. Valid Clerk session (`userId` from `auth()`)
2. User with `isAdmin: true` in database

**Response for unauthorized requests**:

```json
{
  "error": "Unauthorized",
  "status": 401
}
```

**Response for non-admin users**:

```json
{
  "error": "Forbidden - Admin access required",
  "status": 403
}
```

### User Management APIs

#### GET /api/admin/users

Fetch all users with rider/driver relations.

**Response**:

```json
{
  "users": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "RIDER",
      "status": "ACTIVE",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "rider": { ... },
      "driver": null
    }
  ]
}
```

#### PATCH /api/admin/users/[id]

Edit user details.

**Request Body**:

```json
{
  "name": "Updated Name",
  "email": "new@email.com",
  "role": "DRIVER",
  "status": "ACTIVE"
}
```

**Response**:

```json
{
  "success": true,
  "user": { ... }
}
```

#### PUT /api/admin/users/[id]

Suspend or activate user.

**Request Body**:

```json
{
  "action": "suspend" // or "activate"
}
```

**Response**:

```json
{
  "success": true,
  "message": "User suspended successfully",
  "user": { ... }
}
```

**Validation**:

- Cannot suspend your own account
- Action must be "suspend" or "activate"

#### DELETE /api/admin/users/[id]

Delete user (soft or hard delete).

**Response (Soft Delete)**:

```json
{
  "success": true,
  "message": "User deactivated (has booking history)"
}
```

**Response (Hard Delete)**:

```json
{
  "success": true,
  "message": "User permanently deleted"
}
```

**Protection**:

- Cannot delete your own account
- Soft deletes users with booking history
- Hard deletes users without bookings

### Settings APIs

#### GET /api/admin/settings

Fetch current platform settings.

**Response**:

```json
{
  "settings": {
    "baseFare": 6.0,
    "perKm": 1.8,
    "wheelchairMult": 1.15,
    "requirePickupPin": true,
    "sendReceipts": true
  }
}
```

#### PATCH /api/admin/settings

Update platform settings.

**Request Body**:

```json
{
  "baseFare": 7.0,
  "perKm": 2.0,
  "wheelchairMult": 1.2,
  "requirePickupPin": false,
  "sendReceipts": true
}
```

**Validation**:

- `baseFare`: 0-100
- `perKm`: 0-50
- `wheelchairMult`: 1-3

**Response**:

```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": { ... }
}
```

**Audit Log**: Creates compliance log entry for settings changes.

### Finance APIs

#### GET /api/admin/finance

Fetch financial data with optional timeframe.

**Query Parameters**:

- `timeframe`: "week", "month", "year", or "all" (optional)

**Response**:

```json
{
  "totalRevenue": 15000.00,
  "platformCommission": 2250.00,
  "driverEarnings": 12750.00,
  "pendingPayouts": 3500.00,
  "paymentMethods": {
    "stripe": 120,
    "invoice": 30
  },
  "driverPayouts": [
    {
      "driverId": "driver_123",
      "driverName": "Jane Smith",
      "driverEmail": "jane@example.com",
      "totalEarnings": 1000.00,
      "commission": 150.00,
      "netPayout": 850.00,
      "rideCount": 25,
      "status": "pending"
    }
  ],
  "recentTransactions": [ ... ]
}
```

### Compliance APIs

#### GET /api/admin/compliance

Fetch all drivers with verification details.

**Response**:

```json
{
  "drivers": [
    {
      "id": "driver_123",
      "user": {
        "name": "John Driver",
        "email": "john@driver.com"
      },
      "licenseNumber": "UK123456",
      "insuranceExpiry": "2025-12-31T00:00:00.000Z",
      "dbsCheckDate": "2025-01-15T00:00:00.000Z",
      "dbsExpiryDate": "2028-01-15T00:00:00.000Z",
      "wheelchairTrainingDate": "2025-02-01T00:00:00.000Z",
      "docsVerified": true
    }
  ]
}
```

#### POST /api/admin/compliance/drivers/[id]/approve

Approve driver verification.

**Response**:

```json
{
  "success": true,
  "message": "Driver approved successfully"
}
```

### Support APIs

#### GET /api/admin/support

Fetch all support tickets.

**Response**:

```json
{
  "tickets": [
    {
      "id": "ticket_123",
      "userId": "user_123",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "subject": "Payment issue",
      "category": "BILLING",
      "priority": "HIGH",
      "status": "OPEN",
      "createdAt": "2025-11-09T00:00:00.000Z"
    }
  ]
}
```

#### POST /api/admin/support/broadcast

Send system-wide notification.

**Request Body**:

```json
{
  "title": "System Maintenance",
  "message": "Platform will be down for maintenance on Nov 15th from 2-4 AM.",
  "targetRole": "ALL" // or "RIDER", "DRIVER", "DISPATCHER"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Notification broadcast successfully"
}
```

### Dispatcher APIs

#### GET /api/admin/dispatchers

Fetch all dispatchers with performance metrics.

**Response**:

```json
{
  "dispatchers": [
    {
      "id": "dispatcher_123",
      "user": {
        "name": "Jane Dispatcher",
        "email": "jane@dispatch.com"
      },
      "region": "North London",
      "shift": "Morning (6AM-2PM)",
      "ridesDispatched": 150,
      "avgResponseTime": 45,
      "status": "ACTIVE",
      "lastActiveAt": "2025-11-09T15:30:00.000Z"
    }
  ]
}
```

#### POST /api/admin/dispatchers/[id]/assign

Assign region and/or shift to dispatcher.

**Request Body**:

```json
{
  "region": "North London",
  "shift": "Morning (6AM-2PM)"
}
```

**Validation**: At least region or shift must be provided.

**Response**:

```json
{
  "success": true,
  "message": "Dispatcher assignment updated successfully",
  "assignment": {
    "dispatcherId": "dispatcher_123",
    "region": "North London",
    "shift": "Morning (6AM-2PM)"
  }
}
```

---

## Database Schema

### User Model

```prisma
model User {
  id        String      @id
  email     String      @unique
  name      String?
  role      String?
  isAdmin   Boolean     @default(false)
  status    UserStatus  @default(ACTIVE)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  driver              Driver?
  rider               Rider?
  dispatcher          Dispatcher?
  supportTickets      SupportTicket[]
  createdNotifications SystemNotification[]
  complianceLogs      ComplianceLog[]
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  PENDING_VERIFICATION
  DEACTIVATED
}
```

### Driver Model (Compliance)

```prisma
model Driver {
  id                     String    @id
  user                   User      @relation(fields: [id], references: [id])
  licenseNumber          String?
  insuranceExpiry        DateTime?
  dbsCheckDate           DateTime?
  dbsExpiryDate          DateTime?
  wheelchairTrainingDate DateTime?
  docsVerified           Boolean   @default(false)
  verificationStatus     VerificationStatus?
  commissionRate         Float     @default(0.15)
  totalEarnings          Float     @default(0)
  pendingPayout          Float     @default(0)

  bookings               Booking[] @relation("DriverBookings")
  verificationDocuments  DriverDocument[]
}

enum VerificationStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}
```

### Dispatcher Model

```prisma
model Dispatcher {
  id               String    @id
  user             User      @relation(fields: [id], references: [id])
  region           String?
  shift            String?
  ridesDispatched  Int       @default(0)
  avgResponseTime  Int       @default(0)
  status           String    @default("ACTIVE")
  lastActiveAt     DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

### Support Ticket Model

```prisma
model SupportTicket {
  id          String                @id @default(cuid())
  userId      String
  user        User                  @relation(fields: [userId], references: [id])
  subject     String
  description String
  category    String                @default("GENERAL")
  priority    SupportTicketPriority @default(MEDIUM)
  status      SupportTicketStatus   @default(OPEN)
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt
}

enum SupportTicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum SupportTicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

### System Notification Model

```prisma
model SystemNotification {
  id         String   @id @default(cuid())
  createdBy  String
  creator    User     @relation(fields: [createdBy], references: [id])
  title      String
  message    String
  type       String   @default("BROADCAST")
  targetRole String   @default("ALL")
  isRead     Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

### Compliance Log Model

```prisma
model ComplianceLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  details   String
  timestamp DateTime @default(now())
}
```

---

## Security Best Practices

### 1. Admin Access Control

- Always verify `isAdmin: true` before allowing operations
- Use RoleGate component on all admin routes
- Check authentication in every API endpoint

### 2. Input Validation

- Validate all user inputs before database operations
- Apply range checks on numeric values
- Sanitize text inputs to prevent injection

### 3. Audit Logging

- Log all critical admin actions
- Track settings changes in ComplianceLog
- Include timestamp and admin user ID

### 4. User Protection

- Prevent admins from deleting/suspending themselves
- Soft delete users with booking history
- Require confirmations for destructive actions

### 5. Data Privacy

- GDPR compliance for user data
- Secure handling of sensitive information
- Proper data retention policies

---

## Troubleshooting

### TypeScript Errors for `isAdmin`

**Issue**: VS Code shows errors for `isAdmin` field not existing.

**Cause**: TypeScript server hasn't picked up new Prisma types.

**Solution**:

1. Run `npx prisma generate`
2. Restart VS Code or run "TypeScript: Restart TS Server"
3. Verify `isAdmin` exists in `node_modules/.prisma/client/index.d.ts`

### Database Schema Drift

**Issue**: Prisma types don't match database.

**Solution**:

```bash
npx prisma db push          # Sync schema to database
npx prisma generate         # Regenerate Prisma client
```

### Missing Admin Access

**Issue**: User can't access admin dashboard.

**Solution**:

```sql
-- Check current status
SELECT id, email, "isAdmin" FROM "User" WHERE email = 'your@email.com';

-- Grant admin access
UPDATE "User" SET "isAdmin" = true WHERE email = 'your@email.com';
```

### Settings Not Persisting

**Issue**: Settings changes don't save.

**Cause**: SystemSettings model may not be migrated yet.

**Current**: Settings API returns defaults and logs to ComplianceLog.

**Future**: Create SystemSettings model for proper persistence.

---

## Future Enhancements

### Planned Features

- [ ] Individual user detail pages
- [ ] Support ticket response system
- [ ] Dispatcher activity logs
- [ ] Payout initiation workflow
- [ ] Verification document uploads
- [ ] Real-time notifications via Ably
- [ ] Advanced analytics and reporting
- [ ] Export functionality (CSV/PDF)
- [ ] Multi-admin permission levels
- [ ] Scheduled maintenance announcements

---

## Support

For technical issues or questions:

- **Email**: support@havenride.com
- **Documentation**: `/docs`
- **Issue Tracker**: GitHub repository

---

**Last Updated**: November 9, 2025  
**Version**: 1.0  
**Status**: Production Ready
