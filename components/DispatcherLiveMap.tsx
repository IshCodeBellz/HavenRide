"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Driver {
  id: string;
  user: { name: string | null };
  lastLat: number | null;
  lastLng: number | null;
  isOnline: boolean;
  wheelchairCapable: boolean;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehiclePlate: string | null;
}

interface Booking {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  status: string;
  requiresWheelchair: boolean;
}

interface DispatcherLiveMapProps {
  drivers: Driver[];
  bookings: Booking[];
  className?: string;
  onDriverClick?: (driver: Driver) => void;
  onBookingClick?: (booking: Booking) => void;
}

export default function DispatcherLiveMap({
  drivers,
  bookings,
  className = "w-full h-full",
  onDriverClick,
  onBookingClick,
}: DispatcherLiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarkers = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const bookingMarkers = useRef<
    Map<string, { pickup: mapboxgl.Marker; dropoff: mapboxgl.Marker }>
  >(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-0.1278, 51.5074], // London default
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      // Cleanup markers
      driverMarkers.current.forEach((marker) => marker.remove());
      bookingMarkers.current.forEach(({ pickup, dropoff }) => {
        pickup.remove();
        dropoff.remove();
      });

      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update driver markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const onlineDrivers = drivers.filter(
      (d) => d.isOnline && d.lastLat && d.lastLng
    );
    const currentDriverIds = new Set(onlineDrivers.map((d) => d.id));

    // Remove markers for offline/missing drivers
    driverMarkers.current.forEach((marker, driverId) => {
      if (!currentDriverIds.has(driverId)) {
        marker.remove();
        driverMarkers.current.delete(driverId);
      }
    });

    // Add or update markers for online drivers
    onlineDrivers.forEach((driver) => {
      if (!driver.lastLat || !driver.lastLng) return;

      const existingMarker = driverMarkers.current.get(driver.id);

      if (existingMarker) {
        // Update position
        existingMarker.setLngLat([driver.lastLng, driver.lastLat]);
      } else {
        // Create new marker
        const el = document.createElement("div");
        el.className = "cursor-pointer transition-transform hover:scale-110";
        el.style.width = "40px";
        el.style.height = "40px";
        el.innerHTML = `
          <div class="relative">
            <div class="absolute inset-0 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl shadow-lg border-2 border-white">
              ${driver.wheelchairCapable ? "♿" : "🚐"}
            </div>
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <div class="font-semibold text-sm">${
              driver.user.name || "Driver"
            }</div>
            <div class="text-xs text-gray-600">${driver.vehicleMake || ""} ${
          driver.vehicleModel || ""
        }</div>
            <div class="text-xs text-gray-600">${
              driver.vehiclePlate || "N/A"
            }</div>
            ${
              driver.wheelchairCapable
                ? '<div class="text-xs text-amber-600 mt-1">♿ Wheelchair Accessible</div>'
                : ""
            }
            <div class="text-xs text-green-600 mt-1 font-medium">● Online</div>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([driver.lastLng, driver.lastLat])
          .setPopup(popup)
          .addTo(map.current!);

        if (onDriverClick) {
          el.addEventListener("click", () => onDriverClick(driver));
        }

        driverMarkers.current.set(driver.id, marker);
      }
    });

    // Fit bounds if we have drivers
    if (onlineDrivers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      onlineDrivers.forEach((driver) => {
        if (driver.lastLat && driver.lastLng) {
          bounds.extend([driver.lastLng, driver.lastLat]);
        }
      });

      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 14,
        duration: 1000,
      });
    }
  }, [drivers, mapLoaded, onDriverClick]);

  // Update booking markers (active bookings only)
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const activeBookings = bookings.filter(
      (b) =>
        b.status !== "COMPLETED" &&
        b.status !== "CANCELED" &&
        b.pickupLat &&
        b.pickupLng
    );
    const currentBookingIds = new Set(activeBookings.map((b) => b.id));

    // Remove markers for completed/canceled bookings
    bookingMarkers.current.forEach((markers, bookingId) => {
      if (!currentBookingIds.has(bookingId)) {
        markers.pickup.remove();
        markers.dropoff.remove();
        bookingMarkers.current.delete(bookingId);
      }
    });

    // Add or update markers for active bookings
    activeBookings.forEach((booking) => {
      if (!booking.pickupLat || !booking.pickupLng) return;

      const existingMarkers = bookingMarkers.current.get(booking.id);

      if (!existingMarkers) {
        // Create pickup marker
        const pickupEl = document.createElement("div");
        pickupEl.className = "cursor-pointer";
        pickupEl.style.width = "36px";
        pickupEl.style.height = "48px";
        pickupEl.innerHTML = `
          <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2C10.268 2 4 8.268 4 16C4 26 18 46 18 46C18 46 32 26 32 16C32 8.268 25.732 2 18 2Z" 
                  fill="${
                    booking.status === "REQUESTED" ? "#F59E0B" : "#00796B"
                  }" 
                  stroke="white" 
                  stroke-width="2"/>
            <circle cx="18" cy="16" r="6" fill="white"/>
            <text x="18" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="${
              booking.status === "REQUESTED" ? "#F59E0B" : "#00796B"
            }">P</text>
          </svg>
        `;

        const pickupPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2">
            <div class="font-semibold text-sm">Pickup Location</div>
            <div class="text-xs text-gray-600 mt-1">${
              booking.pickupAddress
            }</div>
            <div class="text-xs mt-1">
              <span class="px-2 py-1 rounded text-white text-xs font-medium" style="background-color: ${
                booking.status === "REQUESTED" ? "#F59E0B" : "#00796B"
              }">
                ${booking.status}
              </span>
            </div>
            ${
              booking.requiresWheelchair
                ? '<div class="text-xs text-amber-600 mt-1">♿ Wheelchair Required</div>'
                : ""
            }
          </div>
        `);

        const pickupMarker = new mapboxgl.Marker({
          element: pickupEl,
          anchor: "bottom",
        })
          .setLngLat([booking.pickupLng, booking.pickupLat])
          .setPopup(pickupPopup)
          .addTo(map.current!);

        if (onBookingClick) {
          pickupEl.addEventListener("click", () => onBookingClick(booking));
        }

        // Create dropoff marker if coordinates exist
        let dropoffMarker: mapboxgl.Marker | null = null;
        if (booking.dropoffLat && booking.dropoffLng) {
          const dropoffEl = document.createElement("div");
          dropoffEl.className = "cursor-pointer";
          dropoffEl.style.width = "36px";
          dropoffEl.style.height = "48px";
          dropoffEl.innerHTML = `
            <svg width="36" height="48" viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 2C10.268 2 4 8.268 4 16C4 26 18 46 18 46C18 46 32 26 32 16C32 8.268 25.732 2 18 2Z" 
                    fill="#0F3D3E" 
                    stroke="white" 
                    stroke-width="2"/>
              <circle cx="18" cy="16" r="6" fill="white"/>
              <text x="18" y="20" text-anchor="middle" font-size="10" font-weight="bold" fill="#0F3D3E">D</text>
            </svg>
          `;

          const dropoffPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="p-2">
              <div class="font-semibold text-sm">Drop-off Location</div>
              <div class="text-xs text-gray-600 mt-1">${booking.dropoffAddress}</div>
            </div>
          `);

          dropoffMarker = new mapboxgl.Marker({
            element: dropoffEl,
            anchor: "bottom",
          })
            .setLngLat([booking.dropoffLng, booking.dropoffLat])
            .setPopup(dropoffPopup)
            .addTo(map.current!);

          if (onBookingClick) {
            dropoffEl.addEventListener("click", () => onBookingClick(booking));
          }
        }

        if (dropoffMarker) {
          bookingMarkers.current.set(booking.id, {
            pickup: pickupMarker,
            dropoff: dropoffMarker,
          });
        }
      }
    });
  }, [bookings, mapLoaded, onBookingClick]);

  return (
    <div className={className}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
}
