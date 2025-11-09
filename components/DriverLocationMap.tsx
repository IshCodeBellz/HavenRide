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
  const routeLayerAdded = useRef(false);
  
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

    // Wait for map to load before adding route layer
    map.current.on('load', () => {
      if (!map.current) return;
      
      // Add source for the route line
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      // Add layer for the route line
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#00BCD4', // Teal/Cyan color
          'line-width': 4,
          'line-dasharray': [2, 2] // Dashed line
        }
      });

      routeLayerAdded.current = true;
    });

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

    // Add/update pickup marker (pin/drop icon)
    if (pickupLat && pickupLng) {
      if (pickupMarker.current) {
        pickupMarker.current.setLngLat([pickupLng, pickupLat]);
      } else {
        const el = document.createElement("div");
        el.className = "pickup-marker";
        el.style.width = "40px";
        el.style.height = "40px";
        el.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300796B"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>')`;
        el.style.backgroundSize = "contain";
        el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.3))";

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

    // Add/update driver marker (teal car)
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
        el.style.backgroundImage = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2300BCD4"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>')`;
        el.style.backgroundSize = "contain";
        el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.3))";

        driverMarker.current = new mapboxgl.Marker(el)
          .setLngLat([currentDriverLocation.lng, currentDriverLocation.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML("<strong>Driver</strong>")
          )
          .addTo(map.current);
      }
      
      // Update route line from driver to pickup
      if (pickupLat && pickupLng && map.current && routeLayerAdded.current) {
        const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource;
        if (routeSource) {
          routeSource.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [currentDriverLocation.lng, currentDriverLocation.lat],
                [pickupLng, pickupLat]
              ]
            }
          });
        }
      }
    }

    // Fit bounds to show all markers with dynamic zoom based on distance
    if (map.current && pickupLat && pickupLng) {
      const bounds = new mapboxgl.LngLatBounds();
      let pointCount = 0;
      
      if (pickupLat && pickupLng) {
        bounds.extend([pickupLng, pickupLat]);
        pointCount++;
      }
      if (dropoffLat && dropoffLng) {
        bounds.extend([dropoffLng, dropoffLat]);
        pointCount++;
      }
      if (currentDriverLocation) {
        bounds.extend([currentDriverLocation.lng, currentDriverLocation.lat]);
        pointCount++;
      }

      // Only fit bounds if we have at least 2 points
      if (pointCount >= 2) {
        // Calculate distance between driver and pickup for dynamic zoom
        let distance = 0;
        if (currentDriverLocation && pickupLat && pickupLng) {
          // Haversine formula to calculate distance in km
          const R = 6371;
          const dLat = ((pickupLat - currentDriverLocation.lat) * Math.PI) / 180;
          const dLng = ((pickupLng - currentDriverLocation.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((currentDriverLocation.lat * Math.PI) / 180) *
              Math.cos((pickupLat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = R * c;
        }

        // Dynamic padding and zoom based on distance
        // Closer distance = more padding (zooms in more)
        let padding = 100;
        let maxZoom = 15;
        
        if (distance > 0) {
          if (distance < 0.5) {
            // Very close (< 500m)
            padding = 150;
            maxZoom = 17;
          } else if (distance < 1) {
            // Close (< 1km)
            padding = 120;
            maxZoom = 16;
          } else if (distance < 3) {
            // Medium distance (< 3km)
            padding = 100;
            maxZoom = 15;
          } else if (distance < 10) {
            // Far (< 10km)
            padding = 80;
            maxZoom = 13;
          } else {
            // Very far (> 10km)
            padding = 60;
            maxZoom = 12;
          }
        }

        map.current.fitBounds(bounds, {
          padding,
          maxZoom,
          duration: 1000, // Smooth animation
        });
      } else if (pickupLat && pickupLng) {
        // If only one point, center on it
        map.current.setCenter([pickupLng, pickupLat]);
        map.current.setZoom(14);
      }
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
        const response = await fetch(`/api/drivers/${driverId}/location`);
        if (response.ok) {
          const data = await response.json();
          if (data.lastLat && data.lastLng) {
            setCurrentDriverLocation({
              lat: data.lastLat,
              lng: data.lastLng,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching driver location:", error);
      }
    };

    // Fetch immediately
    fetchDriverLocation();

    // Update every 5 seconds for real-time tracking
    const interval = setInterval(fetchDriverLocation, 5000);
    
    return () => clearInterval(interval);
  }, [driverId]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
}
