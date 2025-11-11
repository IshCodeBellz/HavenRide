import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publish } from '@/lib/realtime/publish';

function generatePin() { const min = 1000, max = 999999; return Math.floor(Math.random()*(max-min+1))+min; }

export async function GET() {
  try {
    const list = await prisma.booking.findMany({ 
      orderBy: { createdAt: 'desc' },
      include: {
        driver: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        rider: {
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        ratings: {
          select: {
            driverRating: true,
            rideRating: true,
            driverComment: true,
            rideComment: true,
          }
        }
      }
    });
    return NextResponse.json(list || []);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { riderId, pickupAddress, dropoffAddress, pickupTime, pickupLat, pickupLng, dropoffLat, dropoffLng, requiresWheelchair, specialNotes, priceEstimate, paymentIntentId, riderPhone, voucherCode, voucherDiscount } = body;

    if (!riderId || !pickupAddress || !dropoffAddress || !pickupTime) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    if (!paymentIntentId) return NextResponse.json({ error: 'paymentIntentId required' }, { status: 400 });

    let finalRiderPhone = riderPhone as string | null | undefined;
    if (!finalRiderPhone) {
      const rp = await prisma.rider.findUnique({ where: { id: riderId } });
      finalRiderPhone = rp?.phone || null;
    }

    const booking = await prisma.booking.create({
      data: {
        riderId, pickupAddress, dropoffAddress, pickupTime: new Date(pickupTime),
        pickupLat, pickupLng, dropoffLat, dropoffLng,
        requiresWheelchair: !!requiresWheelchair, specialNotes: specialNotes || null,
        priceEstimate: priceEstimate || null, paymentIntentId, status: 'REQUESTED',
        pinCode: generatePin(), riderPhone: finalRiderPhone || null
      }
    });

    // Handle voucher redemption if provided
    if (voucherCode && voucherDiscount && voucherDiscount > 0) {
      const voucher = await prisma.voucherCode.findUnique({
        where: { code: voucherCode.toUpperCase().trim() },
      });

      if (voucher) {
        // Create voucher redemption record
        await prisma.voucherRedemption.create({
          data: {
            voucherId: voucher.id,
            bookingId: booking.id,
            discountAmount: voucherDiscount,
          },
        });

        // Update voucher usage count
        await prisma.voucherCode.update({
          where: { id: voucher.id },
          data: {
            currentUses: voucher.currentUses + 1,
          },
        });
      }
    }

    await publish('dispatch', 'booking_created', { id: booking.id });
    await publish(`booking:${booking.id}`, 'status', { status: booking.status });
    return NextResponse.json(booking, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
