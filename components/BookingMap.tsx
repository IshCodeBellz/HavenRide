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
    console.log("Pickup marker effect triggered:", {
      pickup,
      hasMap: !!map.current,
    });

    if (!map.current) {
      console.log("No map instance yet");
      return;
    }

    if (!pickup) {
      console.log("No pickup coordinates");
      return;
    }

    if (pickup.lat === 0) {
      console.log("Pickup lat is 0, skipping");
      return;
    }

    console.log("Creating/updating pickup marker at:", pickup);

    // Remove existing marker if it exists
    if (pickupMarker.current) {
      console.log("Removing existing pickup marker");
      pickupMarker.current.remove();
      pickupMarker.current = null;
    }

    console.log("Creating new pickup marker");
    // Create custom marker element for pickup (A)
    const el = document.createElement("div");
    el.style.width = "40px";
    el.style.height = "50px";
    el.style.cursor = "pointer";
    el.innerHTML = `
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C12.268 0 6 6.268 6 14C6 24.5 20 48 20 48C20 48 34 24.5 34 14C34 6.268 27.732 0 20 0Z" 
              fill="#00796B" 
              stroke="white" 
              stroke-width="2"/>
        <circle cx="20" cy="14" r="8" fill="white"/>
        <text x="20" y="19" text-anchor="middle" font-size="14" font-weight="bold" fill="#00796B" font-family="Arial, sans-serif">A</text>
      </svg>
    `;

    pickupMarker.current = new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat([pickup.lng, pickup.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          "<strong>Pickup Location</strong>"
        )
      )
      .addTo(map.current);

    console.log("Pickup marker added to map", pickupMarker.current);

    updateMapBounds();
  }, [pickup]);

  // Update dropoff marker
  useEffect(() => {
    if (!map.current || !dropoff || dropoff.lat === 0) return;

    // Remove existing marker if it exists
    if (dropoffMarker.current) {
      dropoffMarker.current.remove();
      dropoffMarker.current = null;
    }

    // Create custom marker element for dropoff (B)
    const el = document.createElement("div");
    el.style.width = "40px";
    el.style.height = "50px";
    el.style.cursor = "pointer";
    el.innerHTML = `
      <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 0C12.268 0 6 6.268 6 14C6 24.5 20 48 20 48C20 48 34 24.5 34 14C34 6.268 27.732 0 20 0Z" 
              fill="#0F3D3E" 
              stroke="white" 
              stroke-width="2"/>
        <circle cx="20" cy="14" r="8" fill="white"/>
        <text x="20" y="19" text-anchor="middle" font-size="14" font-weight="bold" fill="#0F3D3E" font-family="Arial, sans-serif">B</text>
      </svg>
    `;

    dropoffMarker.current = new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat([dropoff.lng, dropoff.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          "<strong>Drop-off Location</strong>"
        )
      )
      .addTo(map.current);

    updateMapBounds();
  }, [dropoff]);

  // Update driver marker
  useEffect(() => {
    if (!map.current || !driverLocation) {
      console.log("BookingMap - Driver marker: No map or location", {
        hasMap: !!map.current,
        hasLocation: !!driverLocation,
        location: driverLocation,
      });
      return;
    }
    
    // Check if location is valid (not 0,0)
    if (driverLocation.lat === 0 && driverLocation.lng === 0) {
      console.log("BookingMap - Driver marker: Invalid location (0,0)");
      return;
    }

    console.log("BookingMap - Creating/updating driver marker at:", driverLocation);

    const createOrUpdateMarker = () => {
      if (!map.current) {
        console.log("BookingMap - Map not available in createOrUpdateMarker");
        return;
      }

      if (driverMarker.current) {
        // Update existing marker position
        console.log("BookingMap - Updating existing driver marker");
        driverMarker.current.setLngLat([driverLocation.lng, driverLocation.lat]);
      } else {
        console.log("BookingMap - Creating new driver marker");
        // Create custom car icon marker
        const el = document.createElement("div");
        el.style.width = "48px";
        el.style.height = "48px";
        el.style.cursor = "pointer";
        el.style.zIndex = "1"; // Behind ride request cards (which are z-10)
        el.innerHTML = `
          <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="car-shadow-booking" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.3"/>
              </filter>
            </defs>
            <g filter="url(#car-shadow-booking)">
              <path d="M8 20L10 14C10.5 12.5 12 11.5 13.5 11.5H34.5C36 11.5 37.5 12.5 38 14L40 20H44C45.1 20 46 20.9 46 22V24C46 25.1 45.1 26 44 26H42V36C42 37.1 41.1 38 40 38H38C36.9 38 36 37.1 36 36V34H12V36C12 37.1 11.1 38 10 38H8C6.9 38 6 37.1 6 36V26H4C2.9 26 2 25.1 2 24V22C2 20.9 2.9 20 4 20H8Z" 
                    fill="#00796B" 
                    stroke="white" 
                    stroke-width="2"/>
              <circle cx="14" cy="30" r="3" fill="white"/>
              <circle cx="34" cy="30" r="3" fill="white"/>
              <path d="M10 20H38L36 15H12L10 20Z" fill="#0F3D3E"/>
            </g>
          </svg>
        `;

        driverMarker.current = new mapboxgl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([driverLocation.lng, driverLocation.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML("<strong>Your Location</strong>")
          )
          .addTo(map.current);
        
        console.log("BookingMap - Driver marker added successfully");
      }

      updateMapBounds();
    };

    // Wait for map to be fully loaded
    if (map.current.loaded()) {
      createOrUpdateMarker();
    } else {
      map.current.once("load", createOrUpdateMarker);
    }
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
    } else if (driverLocation && driverLocation.lat !== 0) {
      // If only driver location, center on it
      map.current.setCenter([driverLocation.lng, driverLocation.lat]);
      map.current.setZoom(15);
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
