import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publish } from '@/lib/realtime/publish';

function generatePin() { const min = 1000, max = 999999; return Math.floor(Math.random()*(max-min+1))+min; }

export async function GET() {
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
      }
    }
  });
  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { riderId, pickupAddress, dropoffAddress, pickupTime, pickupLat, pickupLng, dropoffLat, dropoffLng, requiresWheelchair, specialNotes, priceEstimate, paymentIntentId, riderPhone } = body;

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

    await publish('dispatch', 'booking_created', { id: booking.id });
    await publish(`booking:${booking.id}`, 'status', { status: booking.status });
    return NextResponse.json(booking, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
