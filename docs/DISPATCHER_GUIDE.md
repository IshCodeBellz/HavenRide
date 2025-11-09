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
  
- **Assign Drivers**: Two assignment methods available
  - **Automated Assignment** ✅: One-click intelligent driver matching
    - Algorithm scores drivers by proximity (60%), rating (30%), wheelchair capability (10%)
    - Haversine distance calculation for accurate proximity
    - Filters eligible drivers (online, has location, wheelchair match if required)
    - Returns best match with distance and score details
    - Success message shows driver name, distance, and assignment score
  - **Manual Assignment**: Traditional modal-based assignment
    - Filter online drivers
    - Filter by wheelchair capability if required
    - View driver details: name, vehicle, rating, status
    - One-click selection from list

#### API Endpoints:
- `GET /api/bookings` - Fetch all bookings
- `POST /api/dispatcher/bookings/create` - Create new booking
- `POST /api/bookings/[id]/status` - Update booking status and assign driver
- `GET /api/dispatcher/drivers` - Fetch all drivers with online status
- `POST /api/dispatcher/auto-assign` - Automatically assign best driver to booking ✅

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

// Auto-assign best driver ✅
const response = await fetch("/api/dispatcher/auto-assign", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    bookingId: "booking-id",
    getSuggestions: false // optional: set to true to get top 5 suggestions without assigning
  })
});

// Response includes assignment details
{
  success: true,
  booking: { /* updated booking */ },
  assignment: {
    driverId: "driver-id",
    driverName: "John Smith",
    score: 87, // out of 100
    distance: "2.34", // in km
    reason: "Assigned based on proximity (2.3km) and rating (4.8)"
  }
}
```

### 1a. Automated Driver Assignment Algorithm ✅ IMPLEMENTED
Intelligent driver matching system using distance-based scoring and driver ratings.

#### Algorithm Details:
- **Haversine Distance Calculation**: Accurate proximity based on latitude/longitude coordinates
- **Weighted Scoring System**:
  - Distance: 60% weight (100 points for ≤5km, linear decay to 20km)
  - Rating: 30% weight (0-5 star rating converted to 0-100 scale)
  - Wheelchair Capability: 10% bonus if required and matched
- **Eligibility Filtering**:
  - Driver must be online (`isOnline = true`)
  - Driver must have location data (`lastLat` and `lastLng` not null)
  - If wheelchair required, driver must have `wheelchairCapable = true`
- **Best Match Selection**: Returns driver with highest composite score

#### Scoring Examples:
```
Driver A: 3km away, 4.5 rating, wheelchair-capable
- Distance score: 95/100 (3km = excellent proximity)
- Rating score: 90/100 (4.5/5 stars)
- Wheelchair bonus: +10
- Total: 60% × 95 + 30% × 90 + 10 = 94/100

Driver B: 8km away, 5.0 rating, standard vehicle
- Distance score: 82/100 (8km = good proximity)
- Rating score: 100/100 (5/5 stars)
- Wheelchair bonus: 0 (not required)
- Total: 60% × 82 + 30% × 100 = 79/100

Result: Driver A is assigned (higher score)
```

#### Files:
- `lib/assignment/auto-assign.ts` - Core algorithm with scoring functions
- `app/api/dispatcher/auto-assign/route.ts` - API endpoint with role verification

#### Functions:
```typescript
// Calculate great-circle distance between two coordinates
calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number

// Score distance on 0-100 scale (closer = higher score)
scoreDistance(distanceKm: number): number

// Convert 0-5 rating to 0-100 score (null = 50 neutral)
scoreRating(rating: number | null): number

// Find single best driver match
findBestDriver(drivers: Driver[], booking: Booking): DriverScore | null

// Get top N driver matches for suggestions
findTopDrivers(drivers: Driver[], booking: Booking, limit: number = 5): DriverScore[]

// Generate human-readable assignment explanation
getAssignmentExplanation(result: DriverScore): string
```

#### UI Integration:
- **Purple "Auto-Assign Best Driver" button** on new request cards
- Loading state with spinner during assignment
- Success alert with driver name, distance, and score
- Falls back to error message if no drivers available
- "Manual Assignment" button available as alternative

#### Testing Recommendations:
1. Test with multiple online drivers at varying distances
2. Test wheelchair requirement filtering
3. Test with no online drivers (should return error)
4. Test with drivers missing location data (should be filtered out)
5. Test rating influence on selection (5.0 vs 3.0 rating)

### 2. Live Map & Tracking ✅ IMPLEMENTED
Real-time visualization of all drivers and active rides using Mapbox.

#### Features:
- **Live Driver Tracking**: Real-time positions of all online drivers with auto-refresh
- **Driver Markers**: Blue circular markers with emoji indicators (🚐 standard, ♿ wheelchair-capable)
- **Online Status**: Green indicator dot on active driver markers
- **Booking Markers**: Color-coded location pins
  - Amber: REQUESTED (awaiting assignment)
  - Teal: ASSIGNED/ACTIVE (en route or in progress)
- **Interactive Popups**: Click markers for detailed information
  - Driver popups: Name, vehicle, rating, wheelchair capability
  - Booking popups: Addresses, status, wheelchair requirement
- **Auto-fit Bounds**: Map automatically centers and zooms to show all markers
- **Map Legend**: Color-coded guide for driver/booking states
- **Statistics Bar**: Online drivers count, active rides, total drivers

#### Pages:
- `/dispatcher/map` - Full-screen live map view (600px height)

#### Components:
- `DispatcherLiveMap.tsx` - Main map component with Mapbox GL JS integration

#### Configuration:
```typescript
// Environment variable required
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieWVtaWJlbGxvIi...

// Map center (default: London)
center: [-0.1276, 51.5074]
zoom: 11
```

### 3. Communication System ✅ IMPLEMENTED
Direct real-time communication with drivers and riders via chat.

#### Features:
- **Chat Widget**: Real-time messaging per booking using Ably
- **Chat Buttons**: Available on all booking cards
  - New requests: Icon button next to assignment controls
  - Active rides: Full-width "Open Chat" button
- **Chat Modal**: Fixed overlay with dedicated chat interface
  - Modal header shows booking ID (first 8 characters)
  - Close button to dismiss
  - Real-time message delivery
- **Sender Identification**: Dispatcher messages clearly marked
- **Message History**: Full conversation history per booking
- **Ably Integration**: Sub-second message delivery

#### Components:
- `ChatWidget.tsx` - Reusable chat component with Ably integration

#### Usage:
```typescript
// In dispatcher console
<ChatWidget 
  bookingId="booking-id-here"
  sender="DISPATCHER"
/>
```

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

#### Future Enhancements:
- **Call Functionality**: Direct phone call integration
- **File Attachments**: Share images/documents in chat
- **Read Receipts**: Track message read status
- **Typing Indicators**: Show when others are typing

### 4. Reports & Analytics ✅ CSV EXPORT IMPLEMENTED
Comprehensive operational reports and performance metrics with export capabilities.

#### Features:
- **Date Range Filters**: Custom time period selection (from/to dates)
- **Summary Statistics**:
  - Total bookings (all statuses)
  - Completed rides count
  - Canceled rides count
  - Total revenue (sum of finalFareAmount)
  
- **Driver Performance**:
  - Rides completed per driver
  - Average rating per driver
  - Online/offline status
  - Vehicle details (make, model, plate)
  
- **Recent Bookings Table**:
  - Booking ID, pickup address, status, fare, timestamp
  - Sortable and filterable
  
- **CSV Export** ✅:
  - **Export Bookings**: Download filtered bookings as CSV
    - Columns: ID, Pickup Address, Dropoff Address, Status, Fare, Wheelchair, Date
    - Filename: `bookings_YYYY-MM-DD_to_YYYY-MM-DD.csv`
    - Respects date range filter
    - Sanitizes addresses (removes commas)
  - **Export Driver Performance**: Download driver metrics as CSV
    - Columns: Driver Name, Vehicle, Plate, Total Rides, Completed Rides, Rating, Status
    - Filename: `drivers_YYYY-MM-DD.csv`
    - Includes all drivers (online and offline)
  - Loading states with spinner during export generation
  - Automatic browser download via Blob/URL API

#### Pages:
- `/dispatcher/reports` - Reports and analytics dashboard

#### API Endpoints:
- `GET /api/bookings` - Fetch all bookings for calculations
- `GET /api/dispatcher/drivers` - Fetch driver details

#### Export Implementation:
```typescript
// Export bookings
const exportBookingsCSV = () => {
  const csv = [
    ["ID", "Pickup", "Dropoff", "Status", "Fare", "Wheelchair", "Date"],
    ...filteredBookings.map(b => [
      b.id,
      b.pickupAddress.replace(/,/g, ' '),
      b.dropoffAddress.replace(/,/g, ' '),
      b.status,
      b.finalFareAmount || 0,
      b.requiresWheelchair ? "Yes" : "No",
      new Date(b.createdAt).toLocaleString()
    ])
  ].map(row => row.join(",")).join("\n");
  
  // Download file
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bookings_${dateRange.from}_to_${dateRange.to}.csv`;
  a.click();
};
```

### 5. Alerts & Incidents ✅ SCHEMA IMPLEMENTED
Handle emergency situations and operational issues with structured incident tracking.

#### Implemented Database Schema:
```prisma
enum IncidentType {
  SOS
  ACCIDENT
  MECHANICAL
  BEHAVIOR
  DELAY
  OTHER
}

enum IncidentPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum IncidentStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  ESCALATED
  CLOSED
}

model Incident {
  id          String            @id @default(cuid())
  bookingId   String?
  booking     Booking?          @relation(fields: [bookingId], references: [id])
  type        IncidentType
  priority    IncidentPriority
  status      IncidentStatus    @default(OPEN)
  title       String
  description String
  location    String?
  reportedBy  String
  reporter    User              @relation("ReportedIncidents", fields: [reportedBy], references: [id])
  assignedTo  String?
  assignee    User?             @relation("AssignedIncidents", fields: [assignedTo], references: [id])
  resolution  String?
  resolvedAt  DateTime?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([bookingId])
  @@index([status])
  @@index([priority])
  @@index([createdAt])
}
```

#### Features (Schema Ready, UI Pending):
- **Incident Types**: SOS, Accident, Mechanical, Behavior, Delay, Other
- **Priority Levels**: Low, Medium, High, Critical
- **Status Tracking**: Open → In Progress → Resolved/Escalated → Closed
- **Booking Association**: Link incidents to specific bookings
- **Assignment**: Assign incidents to dispatchers/admins
- **Resolution Notes**: Document how incidents were resolved
- **Timestamps**: Track creation and resolution times

#### Planned UI Features:
- **Real-time Alerts**: SOS button triggers instant notification
- **Incident Dashboard**: View, filter, sort all incidents
- **Create Incident**: Form to report new incidents from bookings
- **Update Status**: Change incident status and add notes
- **Escalation**: One-click escalate to admin
- **Notification System**: Push notifications for critical events

#### Future API Endpoints:
- `POST /api/dispatcher/incidents/create` - Create new incident
- `GET /api/dispatcher/incidents` - List all incidents
- `GET /api/dispatcher/incidents/[id]` - Get incident details
- `PATCH /api/dispatcher/incidents/[id]/status` - Update incident status
- `POST /api/dispatcher/incidents/[id]/escalate` - Escalate to admin

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

### Phase 1 (Q1 2025) ✅ COMPLETED
- [x] Mapbox integration for live tracking ✅
- [x] Chat widget for dispatcher-driver-rider communication ✅
- [x] Incident management system (schema implemented) ✅
- [x] CSV export for reports ✅
- [x] Automated driver assignment algorithm ✅

### Phase 2 (Q1-Q2 2025)
- [ ] Incident management UI (create, view, resolve, escalate)
- [ ] Advanced analytics (peak hours, demand heatmaps)
- [ ] Route optimization suggestions
- [ ] Shift management and dispatcher scheduling
- [ ] Performance metrics per dispatcher
- [ ] Auto-assign with multiple suggestions mode

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

**Last Updated**: November 9, 2025  
**Version**: 2.0  
**Major Updates**: Live map tracking, automated driver assignment, chat integration, CSV exports, incident schema
**Maintainer**: HavenRide Development Team
