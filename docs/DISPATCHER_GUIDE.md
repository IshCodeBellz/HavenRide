# Dispatcher Role - Complete Guide

## Overview
The Dispatcher role in HavenRide is designed for operations staff who manage bookings in real-time, coordinate drivers, and ensure smooth service delivery. Dispatchers have elevated permissions to create bookings on behalf of riders, manually assign drivers, and monitor all operational aspects of the platform.

## Core Capabilities

### 1. Bookings Management
Dispatchers can view, create, and manage all bookings in the system.

#### Features:
- **View All Bookings**: Real-time dashboard showing:
  - New Requests (status: REQUESTED)
  - Active Rides (status: ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS)
  - Booking statistics and counts
  
- **Create Bookings**: Manual booking creation on behalf of riders
  - Fields: Rider identifier (email/phone), pickup address, dropoff address, wheelchair requirement, scheduled time, special notes
  - Automatic rider creation if new user
  - Real-time availability of wheelchair-capable drivers
  
- **Assign Drivers**: Manual driver assignment to bookings
  - Filter online drivers
  - Filter by wheelchair capability if required
  - View driver details: name, vehicle, rating, status
  - One-click assignment

#### API Endpoints:
- `GET /api/bookings` - Fetch all bookings
- `POST /api/dispatcher/bookings/create` - Create new booking
- `POST /api/bookings/[id]/status` - Update booking status and assign driver
- `GET /api/dispatcher/drivers` - Fetch all drivers with online status

#### Implementation:
```typescript
// Create booking
const response = await fetch("/api/dispatcher/bookings/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    riderIdentifier: "rider@example.com", // or phone number
    pickupAddress: "123 Main St",
    dropoffAddress: "456 Oak Ave",
    wheelchairRequired: true,
    scheduledFor: "2024-01-15T14:30:00", // optional
    notes: "Please call on arrival" // optional
  })
});

// Assign driver
const response = await fetch(`/api/bookings/${bookingId}/status`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    status: "ASSIGNED",
    driverId: "driver-id"
  })
});
```

### 2. Live Map & Tracking
Real-time visualization of all drivers and active rides.

#### Features:
- **Driver Positions**: Live tracking of all online drivers
- **Active Rides**: Visual display of pickup/dropoff locations
- **Driver List**: Sidebar showing all online drivers with details
- **Statistics**: Online drivers count, active rides, total drivers

#### Pages:
- `/dispatcher/map` - Live map view

#### Future Enhancements:
- Google Maps integration with markers
- Route polylines for active rides
- Driver-to-booking proximity calculations
- Geofencing and alerts

### 3. Communication System
Direct communication with drivers and riders.

#### Planned Features:
- **Chat Widget**: Real-time messaging per booking
- **Call Functionality**: Direct phone call integration
- **Message History**: Per-booking communication logs
- **Emergency Handling**: Priority communication for SOS/incidents

#### Database Schema:
```prisma
model Message {
  id        String     @id @default(cuid())
  booking   Booking    @relation(fields: [bookingId], references: [id])
  bookingId String
  sender    SenderType // RIDER, DRIVER, DISPATCHER
  text      String
  createdAt DateTime   @default(now())
}
```

### 4. Reports & Analytics
Comprehensive operational reports and performance metrics.

#### Features:
- **Date Range Filters**: Custom time period selection
- **Summary Statistics**:
  - Total bookings (all statuses)
  - Completed rides count
  - Canceled rides count
  - Total revenue (sum of finalFareAmount)
  
- **Driver Performance**:
  - Rides completed per driver
  - Average rating per driver
  - Online/offline status
  - Vehicle details
  
- **Recent Bookings Table**:
  - Booking ID, pickup address, status, fare, timestamp
  - Sortable and filterable
  
- **Export Functionality**: CSV export (planned)

#### Pages:
- `/dispatcher/reports` - Reports and analytics dashboard

#### API Endpoints:
- `GET /api/bookings` - Fetch all bookings for calculations
- `GET /api/dispatcher/drivers` - Fetch driver details

### 5. Alerts & Incidents
Handle emergency situations and operational issues.

#### Planned Features:
- **Real-time Alerts**: SOS button triggers, driver/rider issues
- **Incident Management**: Create, track, and resolve incidents
- **Escalation**: Escalate to admin for serious issues
- **Notification System**: Push notifications for critical events

#### Future Implementation:
```typescript
// Incident model (to be added)
model Incident {
  id          String   @id @default(cuid())
  bookingId   String?
  type        String   // "SOS", "ACCIDENT", "MECHANICAL", "BEHAVIOR", "OTHER"
  description String
  priority    String   // "LOW", "MEDIUM", "HIGH", "CRITICAL"
  status      String   // "OPEN", "IN_PROGRESS", "RESOLVED", "ESCALATED"
  reportedBy  String   // userId
  assignedTo  String?  // dispatcher/admin userId
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?
}
```

## User Interface

### Main Dashboard (`/dispatcher`)
- **Header**: Navigation buttons (Live Map, Reports, Create Booking)
- **Two-Column Layout**:
  - Left: New Requests (REQUESTED status)
  - Right: Active Rides (assigned but not completed)
- **Booking Cards**: Display pickup/dropoff, rider ID, status badge
- **Action Buttons**: "Assign to Driver" opens modal with online drivers
- **Real-time Updates**: Ably subscription for instant updates

### Create Booking Modal
- Form fields: Rider identifier, addresses, wheelchair checkbox, scheduled time, notes
- Validation: Required fields (identifier, pickup, dropoff)
- Loading state: "Creating..." button state
- Success: Auto-refresh bookings list
- Error handling: Display API error messages

### Driver Assignment Modal
- Booking details summary (pickup, dropoff, wheelchair requirement)
- Online drivers list (filtered by wheelchair capability if needed)
- Driver cards: Name, vehicle, rating, wheelchair badge
- One-click assignment: Click driver card to assign
- Auto-close: Modal closes after successful assignment

### Live Map Page (`/dispatcher/map`)
- Stats bar: Online drivers, active rides, total drivers
- Map placeholder: 500px height Google Maps container
- Driver list: Online drivers with details
- Auto-refresh: 5-second polling for real-time updates

### Reports Page (`/dispatcher/reports`)
- Date range picker: From/To date inputs
- Apply filter and Export CSV buttons
- Statistics cards: Total, completed, canceled, revenue
- Driver performance table: Sortable by rides/rating
- Recent bookings table: Last 10 bookings with details

## Real-time Updates

### Ably Integration
```typescript
// Subscribe to dispatcher channel
const channel = getChannel("dispatch");
channel.subscribe(() => {
  fetchBookings();
  fetchDrivers();
});

// Fallback polling (every 10 seconds)
const timer = setInterval(() => {
  fetchBookings();
  fetchDrivers();
}, 10000);
```

### Events:
- `booking:created` - New booking created
- `booking:assigned` - Driver assigned to booking
- `booking:updated` - Booking status changed
- `driver:online` - Driver went online
- `driver:offline` - Driver went offline
- `driver:location` - Driver location updated

## Security & Permissions

### Role Verification
All dispatcher endpoints verify the user's role:
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { role: true },
});

if (!user || user.role !== "DISPATCHER") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Protected Routes
- `RoleGate` component wraps all dispatcher pages
- Requires `DISPATCHER` role in user record
- Redirects unauthorized users to role-select

### Data Access
Dispatchers can:
- View all bookings (any rider, any driver)
- View all drivers (online status, location, details)
- Create bookings on behalf of riders
- Assign any online driver to any booking
- View financial data (fares, revenue)

Dispatchers cannot:
- Modify platform settings (admin-only)
- Delete users or drivers (admin-only)
- Access sensitive payment methods
- Change driver verification status (admin-only)

## Database Schema

### Dispatcher Model
```prisma
model Dispatcher {
  id              String   @id
  user            User     @relation(fields: [id], references: [id])
  region          String?  // "NORTH", "SOUTH", "EAST", "WEST"
  shift           String?  // "MORNING", "AFTERNOON", "NIGHT"
  ridesDispatched Int      @default(0)
  avgResponseTime Float?   // in seconds
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### Booking Model (Relevant Fields)
```prisma
model Booking {
  id                 String        @id @default(cuid())
  riderId            String
  driverId           String?
  pickupAddress      String
  dropoffAddress     String
  requiresWheelchair Boolean       @default(false)
  specialNotes       String?
  status             BookingStatus @default(REQUESTED)
  pickupTime         DateTime
  pinCode            Int
}
```

### Driver Model (Relevant Fields)
```prisma
model Driver {
  id                String   @id
  isOnline          Boolean  @default(false)
  vehicleMake       String?
  vehicleModel      String?
  vehiclePlate      String?
  wheelchairCapable Boolean  @default(false)
  rating            Float?
  lastLat           Float?
  lastLng           Float?
}
```

## Workflow Examples

### 1. Manual Booking Creation
1. Dispatcher receives phone call from rider
2. Click "Create Booking" button in header
3. Fill in form:
   - Rider: rider@example.com or +447123456789
   - Pickup: 123 Main Street, London
   - Dropoff: Hospital, 456 Oak Avenue
   - Wheelchair: Checked
   - Scheduled: Leave blank for immediate
   - Notes: "Patient needs assistance"
4. Click "Create Booking"
5. System creates rider if new, generates booking with pinCode
6. Booking appears in "New Requests" column
7. Dispatcher assigns wheelchair-capable driver

### 2. Driver Assignment
1. New booking appears in "New Requests"
2. Click "Assign to Driver" button
3. Modal opens showing:
   - Booking details (pickup, dropoff, wheelchair required)
   - List of online drivers (filtered for wheelchair if needed)
4. Click on available driver card
5. System sends assignment to driver
6. Booking moves to "Active Rides" column
7. Driver receives notification via Ably

### 3. Emergency Handling (Planned)
1. SOS alert appears in dashboard
2. Dispatcher clicks alert to view details
3. Modal shows: Booking info, alert type, timestamp
4. Dispatcher contacts driver/rider
5. Creates incident record if needed
6. Escalates to admin if serious
7. Resolves and closes incident

## Testing

### Test Accounts
Create test dispatcher account:
```sql
-- Set dispatcher role
UPDATE "User" 
SET role = 'DISPATCHER' 
WHERE email = 'dispatcher@havenride.test';

-- Create dispatcher record
INSERT INTO "Dispatcher" (id, region, shift, "ridesDispatched", "avgResponseTime", "createdAt", "updatedAt")
SELECT id, 'CENTRAL', 'DAY', 0, NULL, NOW(), NOW()
FROM "User" 
WHERE email = 'dispatcher@havenride.test';
```

### Test Scenarios
1. **Create Booking (New Rider)**:
   - Email: newrider@test.com
   - Verify user and rider records created
   - Verify booking appears in dashboard

2. **Create Booking (Existing Rider)**:
   - Use existing rider email
   - Verify no duplicate user created
   - Verify booking linked to correct rider

3. **Assign Driver (Wheelchair)**:
   - Create booking with wheelchair required
   - Verify only wheelchair-capable drivers shown
   - Assign and verify booking status updated

4. **Real-time Updates**:
   - Open dispatcher dashboard in two tabs
   - Create booking in admin panel
   - Verify booking appears in both tabs instantly

5. **Role Protection**:
   - Try accessing `/dispatcher` as RIDER role
   - Verify redirect to role-select
   - Try API endpoint as non-dispatcher
   - Verify 403 Forbidden response

## Troubleshooting

### Issue: Drivers Not Showing in Assignment Modal
**Solution**: 
- Check driver `isOnline` status in database
- Verify `/api/dispatcher/drivers` endpoint returns data
- Check wheelchair filter if booking requires wheelchair
- Ensure `fetchDrivers()` called on mount

### Issue: Bookings Not Updating in Real-time
**Solution**:
- Verify Ably API key in `.env.local`
- Check browser console for Ably connection errors
- Ensure `getChannel("dispatch")` returns valid channel
- Test fallback polling (should update every 10s)

### Issue: "Forbidden" Error on Create Booking
**Solution**:
- Verify user has DISPATCHER role in database
- Check Clerk authentication token is valid
- Ensure `/api/users/me` returns correct role
- Verify dispatcher record exists

### Issue: New Rider Creation Fails
**Solution**:
- Check database constraints on User/Rider models
- Verify email format is valid
- Check for duplicate email (should find existing)
- Review server logs for Prisma errors

## Future Enhancements

### Phase 1 (Q1 2024)
- [ ] Google Maps integration for live tracking
- [ ] Chat widget for dispatcher-driver-rider communication
- [ ] Incident management system
- [ ] CSV export for reports

### Phase 2 (Q2 2024)
- [ ] Advanced analytics (peak hours, demand heatmaps)
- [ ] Automated driver assignment algorithm
- [ ] Shift management and dispatcher scheduling
- [ ] Performance metrics per dispatcher

### Phase 3 (Q3 2024)
- [ ] Machine learning for demand prediction
- [ ] Route optimization suggestions
- [ ] Multi-language support
- [ ] Mobile app for dispatchers

## Support & Documentation

### Related Documentation
- [Admin Dashboard Guide](./ADMIN_DASHBOARD.md)
- [Role System Guide](./ROLE_SYSTEM_GUIDE.md)
- [Backend API Reference](../BACKEND_API.md)
- [Vercel Deployment](./VERCEL_DEPLOYMENT.md)

### API Reference
See [Backend API Documentation](../BACKEND_API.md) for detailed endpoint specifications.

### Contact
For technical support or feature requests, contact the development team.

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintainer**: HavenRide Development Team
