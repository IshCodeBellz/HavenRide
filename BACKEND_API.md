# Backend API Documentation

## Profile & Rider Features

### User Profile
**Endpoint**: `/api/riders/profile`

**GET** - Fetch user profile
- Returns: `{ name, email, phone, imageUrl }`

**PUT** - Update user profile
- Body: `{ name?, phone? }`
- Updates name in Clerk, phone in database

---

### Saved Locations
**Endpoint**: `/api/riders/saved-locations`

**GET** - Fetch all saved locations for logged-in rider
- Returns: Array of saved locations

**POST** - Create new saved location
- Body: `{ label: string, address: string, latitude: number, longitude: number }`
- Example: `{ label: "Home", address: "123 Main St", latitude: 51.5074, longitude: -0.1278 }`

**Endpoint**: `/api/riders/saved-locations/[id]`

**PUT** - Update a saved location
- Body: `{ label?, address?, latitude?, longitude? }`

**DELETE** - Remove a saved location

---

### Accessibility Preferences
**Endpoint**: `/api/riders/preferences`

**GET** - Fetch rider accessibility preferences
- Returns: `{ alwaysRequestWheelchair: boolean, needsAssistance: boolean, phone: string }`

**PUT** - Update preferences
- Body: `{ alwaysRequestWheelchair?: boolean, needsAssistance?: boolean, phone?: string }`

---

### Payment Methods
**Endpoint**: `/api/riders/payment-methods`

**GET** - Fetch all payment methods for rider
- Returns: Array of payment methods (sorted by default first)

**POST** - Add new payment method
- Body: `{ stripePaymentMethodId: string, last4: string, brand: string, expiryMonth: number, expiryYear: number, isDefault?: boolean }`
- If `isDefault: true`, all other methods are set to non-default

**Endpoint**: `/api/riders/payment-methods/[id]`

**PUT** - Set payment method as default
- Automatically unsets all other defaults

**DELETE** - Remove payment method

---

## Dispatcher Features

### Automated Driver Assignment
**Endpoint**: `/api/dispatcher/auto-assign`

**POST** - Automatically assign best available driver to booking
- **Authentication**: Required (Clerk)
- **Authorization**: DISPATCHER role only (403 if not dispatcher)
- **Body**: 
  ```json
  {
    "bookingId": "string (required)",
    "getSuggestions": "boolean (optional, default: false)",
    "limit": "number (optional, default: 5, only used if getSuggestions=true)"
  }
  ```
- **Assignment Mode** (`getSuggestions: false`):
  - Finds best driver using intelligent algorithm
  - Automatically assigns driver to booking
  - Updates booking status to ASSIGNED
  - Returns:
    ```json
    {
      "success": true,
      "booking": { /* updated booking object */ },
      "assignment": {
        "driverId": "string",
        "driverName": "string",
        "score": 87,
        "distance": "2.34",
        "reason": "Assigned based on proximity (2.3km) and rating (4.8)"
      }
    }
    ```

- **Suggestions Mode** (`getSuggestions: true`):
  - Returns top N driver matches without assigning
  - Returns:
    ```json
    {
      "suggestions": [
        {
          "driverId": "string",
          "driverName": "string",
          "score": 94,
          "distance": "1.23",
          "rating": 4.8,
          "wheelchairCapable": true,
          "details": {
            "distanceScore": 98,
            "ratingScore": 96,
            "wheelchairMatch": true,
            "distance": 1.23
          }
        }
        // ... up to 'limit' matches
      ]
    }
    ```

**Algorithm Details**:
- **Eligibility Filtering**:
  - Driver must be online (`isOnline = true`)
  - Driver must have location (`lastLat` and `lastLng` not null)
  - If booking requires wheelchair, driver must have `wheelchairCapable = true`
  
- **Scoring System** (0-100 scale):
  - **Distance**: 60% weight
    - ≤5km: 100 points
    - 5-10km: 75-100 points (linear)
    - 10-20km: 50-75 points (linear)
    - >20km: 0-50 points (exponential decay)
  - **Rating**: 30% weight
    - 0-5 star rating converted to 0-100 scale
    - No rating (null): 50 points (neutral)
  - **Wheelchair Match**: 10% bonus
    - Applied only if booking requires wheelchair AND driver is capable

- **Distance Calculation**: Haversine formula for accurate great-circle distance

**Error Responses**:
- `401`: Unauthorized (no valid session)
- `403`: Forbidden (user is not a dispatcher)
- `400`: Bad request (missing bookingId, booking already assigned)
- `404`: Not found (booking doesn't exist, no online drivers, no suitable driver found)
- `500`: Internal server error

**Example Usage**:
```typescript
// Auto-assign best driver
const response = await fetch("/api/dispatcher/auto-assign", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ bookingId: "cm3abc123" })
});

// Get suggestions without assigning
const response = await fetch("/api/dispatcher/auto-assign", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 
    bookingId: "cm3abc123",
    getSuggestions: true,
    limit: 3
  })
});
```

---

## Database Schema Updates

### Rider Model
Added fields:
- `alwaysRequestWheelchair: Boolean` - Auto-request wheelchair vehicles
- `needsAssistance: Boolean` - Driver provides extra assistance
- Relations: `savedLocations[]`, `paymentMethods[]`

### SavedLocation Model (New)
- `id: String` (UUID)
- `riderId: String` (FK to Rider)
- `label: String` (e.g., "Home", "Work", "Hospital")
- `address: String`
- `latitude: Float`
- `longitude: Float`
- `createdAt, updatedAt: DateTime`

### PaymentMethod Model (New)
- `id: String` (UUID)
- `riderId: String` (FK to Rider)
- `stripePaymentMethodId: String` (Unique)
- `last4: String` (Last 4 digits)
- `brand: String` (e.g., "visa", "mastercard")
- `expiryMonth: Int`
- `expiryYear: Int`
- `isDefault: Boolean`
- `createdAt, updatedAt: DateTime`

---

## Migration Applied
Migration: `20251108165532_add_rider_features`
- Created `SavedLocation` table
- Created `PaymentMethod` table
- Added accessibility preference fields to `Rider` table

---

## Frontend Integration Notes

1. **Profile Page**: Use `/api/riders/profile` to fetch/update user info
2. **Saved Locations**: Use `/api/riders/saved-locations` for CRUD operations
3. **Accessibility Settings**: Use `/api/riders/preferences` for checkbox states
4. **Payment Methods**: Use `/api/riders/payment-methods` to manage cards

All endpoints require authentication via Clerk. Unauthorized requests return 401.
