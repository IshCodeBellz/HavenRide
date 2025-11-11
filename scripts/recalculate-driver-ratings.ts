import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function recalculateDriverRatings() {
  try {
    console.log("Starting driver rating recalculation...");

    // Get all drivers
    const drivers = await prisma.driver.findMany({
      select: {
        id: true,
      },
    });

    console.log(`Found ${drivers.length} drivers to process`);

    let updated = 0;
    let errors = 0;

    for (const driver of drivers) {
      try {
        // Get all completed bookings for this driver
        const driverBookings = await prisma.booking.findMany({
          where: {
            driverId: driver.id,
            status: "COMPLETED",
          },
          select: {
            id: true,
          },
        });

        // Get all ratings for these bookings
        const driverRatings = await prisma.rideRating.findMany({
          where: {
            bookingId: {
              in: driverBookings.map((b) => b.id),
            },
          },
          select: {
            driverRating: true,
          },
        });

        if (driverRatings.length > 0) {
          const avgRating =
            driverRatings.reduce((sum, r) => sum + r.driverRating, 0) /
            driverRatings.length;

          await prisma.driver.update({
            where: { id: driver.id },
            data: { rating: avgRating },
          });

          updated++;
          console.log(`✓ Driver ${driver.id}: ${avgRating.toFixed(2)} (${driverRatings.length} ratings)`);
        } else {
          // No ratings, set to null
          await prisma.driver.update({
            where: { id: driver.id },
            data: { rating: null },
          });
          updated++;
          console.log(`✓ Driver ${driver.id}: No ratings yet`);
        }
      } catch (error) {
        console.error(`✗ Error updating driver ${driver.id}:`, error);
        errors++;
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Drivers processed: ${drivers.length}`);
    console.log(`Successfully updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log("\nRecalculation complete!");
  } catch (error) {
    console.error("Error recalculating driver ratings:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

recalculateDriverRatings();

