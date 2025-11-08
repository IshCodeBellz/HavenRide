"use client";
import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface DriverLocationMapProps {
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  driverLat?: number;
  driverLng?: number;
  driverId?: string;
}

export default function DriverLocationMap({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  driverLat,
  driverLng,
  driverId,
}: DriverLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [currentDriverLocation, setCurrentDriverLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(driverLat && driverLng ? { lat: driverLat, lng: driverLng } : null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return; // Initialize map only once

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    // Default center to pickup location or London
    const centerLat = pickupLat || 51.5074;
    const centerLng = pickupLng || -0.1278;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [centerLng, centerLat],
      zoom: 13,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Update markers when coordinates change
  useEffect(() => {
    if (!map.current) return;

    // Add/update pickup marker
    if (pickupLat && pickupLng) {
      if (pickupMarker.current) {
        pickupMarker.current.setLngLat([pickupLng, pickupLat]);
      } else {
        const el = document.createElement("div");
        el.className = "pickup-marker";
        el.style.width = "40px";
        el.style.height = "40px";
        el.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300796B"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5" fill="white"/></svg>')`;
        el.style.backgroundSize = "contain";

        pickupMarker.current = new mapboxgl.Marker(el)
          .setLngLat([pickupLng, pickupLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              "<strong>Pickup Location</strong>"
            )
          )
          .addTo(map.current);
      }
    }

    // Add/update dropoff marker
    if (dropoffLat && dropoffLng) {
      if (dropoffMarker.current) {
        dropoffMarker.current.setLngLat([dropoffLng, dropoffLat]);
      } else {
        const el = document.createElement("div");
        el.className = "dropoff-marker";
        el.style.width = "40px";
        el.style.height = "40px";
        el.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230F3D3E"><path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm-1 16l-4-4 1.41-1.41L11 15.17l6.59-6.59L19 10l-8 8z"/></svg>')`;
        el.style.backgroundSize = "contain";

        dropoffMarker.current = new mapboxgl.Marker(el)
          .setLngLat([dropoffLng, dropoffLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              "<strong>Dropoff Location</strong>"
            )
          )
          .addTo(map.current);
      }
    }

    // Add/update driver marker
    if (currentDriverLocation) {
      if (driverMarker.current) {
        driverMarker.current.setLngLat([
          currentDriverLocation.lng,
          currentDriverLocation.lat,
        ]);
      } else {
        const el = document.createElement("div");
        el.className = "driver-marker";
        el.style.width = "50px";
        el.style.height = "50px";
        el.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23FF5722"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>')`;
        el.style.backgroundSize = "contain";
        el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.3))";

        driverMarker.current = new mapboxgl.Marker(el)
          .setLngLat([currentDriverLocation.lng, currentDriverLocation.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML("<strong>Driver</strong>")
          )
          .addTo(map.current);
      }
    }

    // Fit bounds to show all markers
    if (map.current && pickupLat && pickupLng) {
      const bounds = new mapboxgl.LngLatBounds();
      
      if (pickupLat && pickupLng) {
        bounds.extend([pickupLng, pickupLat]);
      }
      if (dropoffLat && dropoffLng) {
        bounds.extend([dropoffLng, dropoffLat]);
      }
      if (currentDriverLocation) {
        bounds.extend([currentDriverLocation.lng, currentDriverLocation.lat]);
      }

      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 15,
      });
    }
  }, [
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    currentDriverLocation,
  ]);

  // Poll for driver location updates
  useEffect(() => {
    if (!driverId) return;

    const fetchDriverLocation = async () => {
      try {
        // In a real implementation, this would fetch from an API
        // For now, we'll simulate movement
        if (currentDriverLocation && pickupLat && pickupLng) {
          // Simulate driver moving towards pickup
          const deltaLat = (pickupLat - currentDriverLocation.lat) * 0.05;
          const deltaLng = (pickupLng - currentDriverLocation.lng) * 0.05;
          
          setCurrentDriverLocation({
            lat: currentDriverLocation.lat + deltaLat,
            lng: currentDriverLocation.lng + deltaLng,
          });
        }
      } catch (error) {
        console.error("Error fetching driver location:", error);
      }
    };

    // Update every 5 seconds
    const interval = setInterval(fetchDriverLocation, 5000);
    
    return () => clearInterval(interval);
  }, [driverId, currentDriverLocation, pickupLat, pickupLng]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
}
