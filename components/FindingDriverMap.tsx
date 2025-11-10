"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface FindingDriverMapProps {
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress?: string;
  children: React.ReactNode;
}

export default function FindingDriverMap({
  pickupLat,
  pickupLng,
  pickupAddress,
  children,
}: FindingDriverMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const [currentCenter, setCurrentCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Generate random point within city bounds
  const generateRandomPoint = (
    centerLat: number,
    centerLng: number,
    radiusKm: number = 5
  ): { lat: number; lng: number } => {
    // Convert radius from km to degrees (approximate)
    const radiusDeg = radiusKm / 111; // 1 degree ≈ 111 km

    // Generate random angle and distance
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radiusDeg;

    // Calculate new point
    const lat = centerLat + distance * Math.cos(angle);
    const lng = centerLng + distance * Math.sin(angle);

    return { lat, lng };
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not found");
      return;
    }

    mapboxgl.accessToken = token;

    // Use pickup location or default to London
    const centerLat = pickupLat || 51.5074;
    const centerLng = pickupLng || -0.1278;

    // Ensure container has dimensions
    if (mapContainer.current) {
      const rect = mapContainer.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Wait a bit for layout to settle
        setTimeout(() => {
          if (mapContainer.current && !map.current) {
            initializeMap(centerLat, centerLng);
          }
        }, 100);
        return;
      }
    }

    initializeMap(centerLat, centerLng);

    function initializeMap(lat: number, lng: number) {
      if (!mapContainer.current || map.current) return;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: 12,
      });

      map.current.on("load", () => {
        setCurrentCenter({ lat, lng });
        // Resize map to ensure it fills container
        if (map.current) {
          map.current.resize();
        }
      });

      // Set center even if load event doesn't fire
      setCurrentCenter({ lat, lng });

      // Resize after a short delay to ensure container is ready
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
        }
      }, 100);
    }

    return () => {
      // Cleanup markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [pickupLat, pickupLng]);

  // Update map with random points and zoom cycle every 15 seconds
  useEffect(() => {
    if (!map.current || !currentCenter) return;

    const baseZoom = 12;
    const zoomedInZoom = 15;
    const zoomDuration = 5000; // 5 seconds for zoom animation
    const holdDuration = 5000; // 5 seconds to hold

    // Helper to add timeout and track it
    const addTimeout = (callback: () => void, delay: number) => {
      const timeout = setTimeout(() => {
        callback();
        // Remove from array after execution
        timeoutsRef.current = timeoutsRef.current.filter((t) => t !== timeout);
      }, delay);
      timeoutsRef.current.push(timeout);
      return timeout;
    };

    // Function to show a random point and start zoom cycle
    const showRandomPoint = () => {
      if (!map.current) return;

      // Remove existing markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      // Generate one random point
      const radiusKm = 30; // 30km radius around city center
      const randomPoint = generateRandomPoint(
        currentCenter.lat,
        currentCenter.lng,
        radiusKm
      );

      // Create marker element
      const el = document.createElement("div");
      el.className = "random-point-marker";
      el.style.width = "16px";
      el.style.height = "16px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#00796B";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.4)";
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.3s ease";
      el.style.transform = "scale(1)";

      // Add marker to map
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([randomPoint.lng, randomPoint.lat])
        .addTo(map.current);

      markersRef.current.push(marker);

      // Phase 1: Center and zoom in simultaneously (5 seconds)
      map.current.flyTo({
        center: [randomPoint.lng, randomPoint.lat],
        zoom: zoomedInZoom,
        duration: zoomDuration,
      });

      // Phase 2: Hold at zoomed in (5 seconds)
      addTimeout(() => {
        if (!map.current) return;

        // Phase 3: Zoom out (5 seconds)
        map.current.flyTo({
          center: [randomPoint.lng, randomPoint.lat],
          zoom: baseZoom,
          duration: zoomDuration,
        });

        // Phase 4: After zoom out completes, move to next point
        // Total cycle: 5s (zoom in) + 5s (hold) + 5s (zoom out) = 15s
        addTimeout(() => {
          showRandomPoint();
        }, zoomDuration);
      }, zoomDuration + holdDuration); // Wait for zoom in + hold
    };

    // Start the cycle
    showRandomPoint();

    return () => {
      // Clear all timeouts
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      timeoutsRef.current = [];
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [currentCenter]);

  return (
    <div
      className="fixed inset-0 w-screen h-screen"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1,
      }}
    >
      {/* Map Background */}
      <div
        ref={mapContainer}
        className="absolute inset-0 bg-gray-200"
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          minHeight: "100vh",
          minWidth: "100vw",
        }}
      />

      {/* Content Overlay */}
      <div
        className="absolute inset-0 flex items-center justify-center p-4"
        style={{ zIndex: 10, pointerEvents: "none" }}
      >
        <div style={{ pointerEvents: "auto" }}>{children}</div>
      </div>
    </div>
  );
}
