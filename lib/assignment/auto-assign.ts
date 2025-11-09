/**
 * Automated Driver Assignment Algorithm
 * 
 * Intelligently assigns drivers to bookings based on multiple factors:
 * - Proximity to pickup location
 * - Online availability
 * - Wheelchair capability (if required)
 * - Driver rating
 * - Current workload
 */

interface Driver {
  id: string;
  userId: string;
  isOnline: boolean;
  lastLat: number | null;
  lastLng: number | null;
  wheelchairCapable: boolean;
  rating: number | null;
  user: {
    name: string | null;
  };
}

interface Booking {
  id: string;
  pickupLat: number | null;
  pickupLng: number | null;
  requiresWheelchair: boolean;
}

interface DriverScore {
  driver: Driver;
  score: number;
  proximity: number;
  details: {
    distanceScore: number;
    ratingScore: number;
    wheelchairMatch: boolean;
    distance: number;
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 Latitude of point 1
 * @param lon1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lon2 Longitude of point 2
 * @returns Distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Score a driver based on distance (closer is better)
 * @param distance Distance in kilometers
 * @returns Score from 0-100
 */
function scoreDistance(distance: number): number {
  // Optimal range: 0-5km = 100 points
  // 5-10km = 75-100 points (linear decay)
  // 10-20km = 50-75 points
  // >20km = 0-50 points
  if (distance <= 5) return 100;
  if (distance <= 10) return 75 + (10 - distance) * 5;
  if (distance <= 20) return 50 + (20 - distance) * 2.5;
  return Math.max(0, 50 - (distance - 20) * 2);
}

/**
 * Score a driver based on their rating
 * @param rating Driver rating (0-5)
 * @returns Score from 0-100
 */
function scoreRating(rating: number | null): number {
  if (!rating || rating === 0) return 50; // New drivers get neutral score
  return rating * 20; // 5-star = 100, 4-star = 80, etc.
}

/**
 * Find the best driver for a booking using intelligent scoring
 * @param drivers List of available drivers
 * @param booking Booking details
 * @returns Best matched driver with scoring details
 */
export function findBestDriver(
  drivers: Driver[],
  booking: Booking
): DriverScore | null {
  if (!booking.pickupLat || !booking.pickupLng) {
    throw new Error("Booking must have pickup coordinates");
  }

  // Filter eligible drivers
  const eligibleDrivers = drivers.filter((driver) => {
    // Must be online
    if (!driver.isOnline) return false;

    // Must have location data
    if (!driver.lastLat || !driver.lastLng) return false;

    // If wheelchair required, driver must be capable
    if (booking.requiresWheelchair && !driver.wheelchairCapable) return false;

    return true;
  });

  if (eligibleDrivers.length === 0) {
    return null;
  }

  // Score each driver
  const scoredDrivers: DriverScore[] = eligibleDrivers.map((driver) => {
    const distance = calculateDistance(
      booking.pickupLat!,
      booking.pickupLng!,
      driver.lastLat!,
      driver.lastLng!
    );

    const distanceScore = scoreDistance(distance);
    const ratingScore = scoreRating(driver.rating);

    // Bonus points for wheelchair match when required
    const wheelchairBonus = booking.requiresWheelchair && driver.wheelchairCapable ? 10 : 0;

    // Weight factors:
    // Distance: 60% (most important - get driver there fast)
    // Rating: 30% (quality matters)
    // Wheelchair: 10% bonus (when applicable)
    const totalScore =
      distanceScore * 0.6 + ratingScore * 0.3 + wheelchairBonus;

    return {
      driver,
      score: totalScore,
      proximity: distance,
      details: {
        distanceScore,
        ratingScore,
        wheelchairMatch: booking.requiresWheelchair && driver.wheelchairCapable,
        distance,
      },
    };
  });

  // Sort by score (highest first)
  scoredDrivers.sort((a, b) => b.score - a.score);

  return scoredDrivers[0];
}

/**
 * Find top N best drivers for a booking
 * @param drivers List of available drivers
 * @param booking Booking details
 * @param limit Number of top drivers to return
 * @returns Array of top matched drivers with scores
 */
export function findTopDrivers(
  drivers: Driver[],
  booking: Booking,
  limit: number = 5
): DriverScore[] {
  if (!booking.pickupLat || !booking.pickupLng) {
    throw new Error("Booking must have pickup coordinates");
  }

  const eligibleDrivers = drivers.filter((driver) => {
    if (!driver.isOnline) return false;
    if (!driver.lastLat || !driver.lastLng) return false;
    if (booking.requiresWheelchair && !driver.wheelchairCapable) return false;
    return true;
  });

  const scoredDrivers: DriverScore[] = eligibleDrivers.map((driver) => {
    const distance = calculateDistance(
      booking.pickupLat!,
      booking.pickupLng!,
      driver.lastLat!,
      driver.lastLng!
    );

    const distanceScore = scoreDistance(distance);
    const ratingScore = scoreRating(driver.rating);
    const wheelchairBonus = booking.requiresWheelchair && driver.wheelchairCapable ? 10 : 0;

    const totalScore = distanceScore * 0.6 + ratingScore * 0.3 + wheelchairBonus;

    return {
      driver,
      score: totalScore,
      proximity: distance,
      details: {
        distanceScore,
        ratingScore,
        wheelchairMatch: booking.requiresWheelchair && driver.wheelchairCapable,
        distance,
      },
    };
  });

  scoredDrivers.sort((a, b) => b.score - a.score);

  return scoredDrivers.slice(0, limit);
}

/**
 * Get explanation of why a driver was chosen
 * @param result Driver score result
 * @returns Human-readable explanation
 */
export function getAssignmentExplanation(result: DriverScore): string {
  const { driver, details } = result;
  const reasons: string[] = [];

  if (details.distance < 2) {
    reasons.push("Very close to pickup location");
  } else if (details.distance < 5) {
    reasons.push("Close to pickup location");
  } else if (details.distance < 10) {
    reasons.push("Reasonable distance to pickup");
  }

  if (driver.rating && driver.rating >= 4.5) {
    reasons.push("Excellent rating");
  } else if (driver.rating && driver.rating >= 4.0) {
    reasons.push("Good rating");
  }

  if (details.wheelchairMatch) {
    reasons.push("Wheelchair accessible vehicle");
  }

  if (reasons.length === 0) {
    return "Best available driver";
  }

  return reasons.join(" • ");
}
