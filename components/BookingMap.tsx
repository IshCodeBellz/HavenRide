"use client";
import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface BookingMapProps {
  pickup?: { lat: number; lng: number } | null;
  dropoff?: { lat: number; lng: number } | null;
  driverLocation?: { lat: number; lng: number } | null;
  className?: string;
}

export default function BookingMap({
  pickup,
  dropoff,
  driverLocation,
  className = "w-full h-96",
}: BookingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarker = useRef<mapboxgl.Marker | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-0.1278, 51.5074], // London default
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update pickup marker
  useEffect(() => {
    if (!map.current || !pickup || pickup.lat === 0) return;

    if (pickupMarker.current) {
      pickupMarker.current.setLngLat([pickup.lng, pickup.lat]);
    } else {
      const el = document.createElement("div");
      el.className = "w-12 h-12";
      el.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 2C15.716 2 9 8.716 9 17C9 28.5 24 46 24 46C24 46 39 28.5 39 17C39 8.716 32.284 2 24 2Z" 
                fill="#00796B" 
                stroke="white" 
                stroke-width="2"/>
          <circle cx="24" cy="17" r="6" fill="white"/>
          <text x="24" y="21" text-anchor="middle" font-size="12" font-weight="bold" fill="#00796B">A</text>
        </svg>
      `;

      pickupMarker.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([pickup.lng, pickup.lat])
        .setPopup(
          new mapboxgl.Popup().setHTML("<strong>Pickup Location</strong>")
        )
        .addTo(map.current);
    }

    updateMapBounds();
  }, [pickup]);

  // Update dropoff marker
  useEffect(() => {
    if (!map.current || !dropoff || dropoff.lat === 0) return;

    if (dropoffMarker.current) {
      dropoffMarker.current.setLngLat([dropoff.lng, dropoff.lat]);
    } else {
      const el = document.createElement("div");
      el.className = "w-12 h-12";
      el.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 2C15.716 2 9 8.716 9 17C9 28.5 24 46 24 46C24 46 39 28.5 39 17C39 8.716 32.284 2 24 2Z" 
                fill="#0F3D3E" 
                stroke="white" 
                stroke-width="2"/>
          <circle cx="24" cy="17" r="6" fill="white"/>
          <text x="24" y="21" text-anchor="middle" font-size="12" font-weight="bold" fill="#0F3D3E">B</text>
        </svg>
      `;

      dropoffMarker.current = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([dropoff.lng, dropoff.lat])
        .setPopup(
          new mapboxgl.Popup().setHTML("<strong>Drop-off Location</strong>")
        )
        .addTo(map.current);
    }

    updateMapBounds();
  }, [dropoff]);

  // Update driver marker
  useEffect(() => {
    if (!map.current || !driverLocation || driverLocation.lat === 0) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
    } else {
      const el = document.createElement("div");
      el.className = "w-10 h-10";
      el.innerHTML = `
        <div class="relative">
          <div class="absolute inset-0 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg">
            🚐
          </div>
        </div>
      `;

      driverMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .setPopup(
          new mapboxgl.Popup().setHTML("<strong>Driver Location</strong>")
        )
        .addTo(map.current);
    }

    updateMapBounds();
  }, [driverLocation]);

  // Draw route between pickup and dropoff
  useEffect(() => {
    if (
      !map.current ||
      !pickup ||
      !dropoff ||
      pickup.lat === 0 ||
      dropoff.lat === 0
    )
      return;

    const drawRoute = async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?geometries=geojson&access_token=${token}`
        );
        const data = await response.json();

        if (data.routes && data.routes[0]) {
          const route = data.routes[0].geometry;

          // Remove existing route layer
          if (map.current?.getSource("route")) {
            map.current.removeLayer("route");
            map.current.removeSource("route");
          }

          // Add route layer
          map.current?.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: route,
            },
          });

          map.current?.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#00796B",
              "line-width": 4,
              "line-opacity": 0.75,
            },
          });
        }
      } catch (error) {
        console.error("Error drawing route:", error);
      }
    };

    drawRoute();
  }, [pickup, dropoff]);

  const updateMapBounds = () => {
    if (!map.current) return;

    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    if (pickup && pickup.lat !== 0) {
      bounds.extend([pickup.lng, pickup.lat]);
      hasPoints = true;
    }
    if (dropoff && dropoff.lat !== 0) {
      bounds.extend([dropoff.lng, dropoff.lat]);
      hasPoints = true;
    }
    if (driverLocation && driverLocation.lat !== 0) {
      bounds.extend([driverLocation.lng, driverLocation.lat]);
      hasPoints = true;
    }

    if (hasPoints) {
      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 15,
        duration: 1000,
      });
    }
  };

  return (
    <div
      className={`${className} rounded-xl overflow-hidden border border-gray-300`}
    >
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}
