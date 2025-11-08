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
