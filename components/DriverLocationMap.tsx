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
  status?: string; // Booking status to determine if route should be shown
}

export default function DriverLocationMap({
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  driverLat,
  driverLng,
  driverId,
  status,
}: DriverLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropoffMarker = useRef<mapboxgl.Marker | null>(null);
  const routeLayerAdded = useRef(false);

  // Use props directly instead of state to avoid conflicts
  const currentDriverLocation =
    driverLat && driverLng ? { lat: driverLat, lng: driverLng } : null;

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
    map.current.on("load", () => {
      if (!map.current) return;

      // Add source for the route line
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      // Add layer for the route line
      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#00BCD4", // Teal/Cyan color
          "line-width": 5,
          "line-opacity": 0.8,
        },
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

    console.log("DriverLocationMap - Updating markers:", {
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      currentDriverLocation,
      pickupMarkerExists: !!pickupMarker.current,
      dropoffMarkerExists: !!dropoffMarker.current,
      driverMarkerExists: !!driverMarker.current,
    });

    // Add/update pickup marker (pin/drop icon)
    if (pickupLat && pickupLng) {
      if (pickupMarker.current) {
        pickupMarker.current.setLngLat([pickupLng, pickupLat]);
        console.log("✅ Pickup marker updated");
      } else {
        const el = document.createElement("div");
        el.className = "pickup-marker";
        el.style.width = "40px";
        el.style.height = "50px";
        el.style.cursor = "pointer";
        el.style.zIndex = "1000"; // Ensure marker is on top
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
        el.style.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.4))";

        pickupMarker.current = new mapboxgl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([pickupLng, pickupLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              "<strong>Pickup Location</strong>"
            )
          )
          .addTo(map.current);

        console.log("✅ Pickup marker created at", [pickupLng, pickupLat]);
      }
    } else if (pickupMarker.current) {
      // Remove marker if pickup coordinates are no longer available
      pickupMarker.current.remove();
      pickupMarker.current = null;
      console.log("❌ Pickup marker removed - no coordinates");
    }

    // Add/update dropoff marker
    if (dropoffLat && dropoffLng) {
      if (dropoffMarker.current) {
        dropoffMarker.current.setLngLat([dropoffLng, dropoffLat]);
        console.log("✅ Dropoff marker updated");
      } else {
        const el = document.createElement("div");
        el.className = "dropoff-marker";
        el.style.width = "40px";
        el.style.height = "50px";
        el.style.cursor = "pointer";
        el.style.zIndex = "1000"; // Ensure marker is on top
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
        el.style.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.4))";

        dropoffMarker.current = new mapboxgl.Marker({
          element: el,
          anchor: "bottom",
        })
          .setLngLat([dropoffLng, dropoffLat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              "<strong>Dropoff Location</strong>"
            )
          )
          .addTo(map.current);

        console.log("✅ Dropoff marker created at", [dropoffLng, dropoffLat]);
      }
    } else if (dropoffMarker.current) {
      // Remove marker if dropoff coordinates are no longer available
      dropoffMarker.current.remove();
      dropoffMarker.current = null;
      console.log("❌ Dropoff marker removed - no coordinates");
    }

    // Add/update driver marker (teal car)
    // Show driver marker when driver location is available (regardless of status)
    if (currentDriverLocation) {
      console.log("DriverLocationMap - Driver location available:", {
        lat: currentDriverLocation.lat,
        lng: currentDriverLocation.lng,
        driverLat,
        driverLng,
      });
      if (driverMarker.current) {
        driverMarker.current.setLngLat([
          currentDriverLocation.lng,
          currentDriverLocation.lat,
        ]);
        console.log("✅ Driver marker updated to", [
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
        el.style.backgroundRepeat = "no-repeat";
        el.style.backgroundPosition = "center";
        el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.3))";
        el.style.cursor = "pointer";
        el.style.zIndex = "1000"; // Ensure marker is on top

        driverMarker.current = new mapboxgl.Marker({
          element: el,
          anchor: "center",
        })
          .setLngLat([currentDriverLocation.lng, currentDriverLocation.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(
              "<strong>Driver</strong>"
            )
          )
          .addTo(map.current);

        console.log("✅ Driver marker created at", [
          currentDriverLocation.lng,
          currentDriverLocation.lat,
        ]);
      }
    } else if (driverMarker.current) {
      // Remove marker if driver location is no longer available
      driverMarker.current.remove();
      driverMarker.current = null;
      console.log("❌ Driver marker removed - no location");
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, currentDriverLocation, driverLat, driverLng, status]);

  // Update route line (only if driver has accepted)
  useEffect(() => {
    if (!map.current || !routeLayerAdded.current) return;

    // Show route when status is ASSIGNED, EN_ROUTE, ARRIVED, IN_PROGRESS
    const shouldShowRoute = status && 
      (status === "ASSIGNED" || 
       status === "EN_ROUTE" || 
       status === "ARRIVED" || 
       status === "IN_PROGRESS");
    
    if (!shouldShowRoute) {
      // Hide route if driver hasn't accepted
      const routeSource = map.current.getSource("route") as mapboxgl.GeoJSONSource;
      if (routeSource) {
        routeSource.setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        });
      }
      return;
    }

    // Use Mapbox Directions API to get the actual route
    const drawRoute = async () => {
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) {
          console.error("Mapbox token not found");
          return;
        }

        let routeUrl = "";
        
        // Determine route based on status:
        // - ASSIGNED/EN_ROUTE/ARRIVED: driver to pickup
        // - IN_PROGRESS: driver to dropoff (or pickup to dropoff if no driver location)
        if ((status === "ASSIGNED" || status === "EN_ROUTE" || status === "ARRIVED") && 
            currentDriverLocation && pickupLat && pickupLng) {
          // Route from driver to pickup
          routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${currentDriverLocation.lng},${currentDriverLocation.lat};${pickupLng},${pickupLat}?geometries=geojson&access_token=${token}`;
        } else if (status === "IN_PROGRESS" && pickupLat && pickupLng && dropoffLat && dropoffLng) {
          // Route during ride
          if (currentDriverLocation) {
            // If driver location available, route from driver to dropoff
            routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${currentDriverLocation.lng},${currentDriverLocation.lat};${dropoffLng},${dropoffLat}?geometries=geojson&access_token=${token}`;
          } else {
            // Otherwise, route from pickup to dropoff
            routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLng},${pickupLat};${dropoffLng},${dropoffLat}?geometries=geojson&access_token=${token}`;
          }
        }

        if (!routeUrl || !map.current) {
          return;
        }

        const response = await fetch(routeUrl);
        if (!response.ok) {
          throw new Error(`Directions API error: ${response.status}`);
        }
        
        const data = await response.json();

        if (data.routes && data.routes[0] && map.current) {
          const route = data.routes[0].geometry;
          const routeSource = map.current.getSource("route") as mapboxgl.GeoJSONSource;
          
          if (routeSource) {
            routeSource.setData({
              type: "Feature",
              properties: {},
              geometry: route,
            });
            console.log("✅ Route updated with Directions API");
          }
        } else {
          console.warn("No route found in Directions API response");
        }
      } catch (error) {
        console.error("Error fetching route:", error);
        // Don't fallback to straight line - let the error be visible for debugging
      }
    };

    drawRoute();
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, currentDriverLocation, status]);

  // Fit bounds to show all markers with dynamic zoom based on distance
  useEffect(() => {
    // Exit early if map not ready or not loaded yet
    if (!map.current || !routeLayerAdded.current) return;

    // Type guard: ensure coordinates are valid numbers
    const isValidCoord = (val: any): val is number =>
      typeof val === "number" && !isNaN(val) && isFinite(val);

    if (!isValidCoord(pickupLat) || !isValidCoord(pickupLng)) {
      return;
    }

    // Calculate distance between driver and pickup for dynamic zoom
    let distance = 0;
    if (
      currentDriverLocation &&
      isValidCoord(currentDriverLocation.lat) &&
      isValidCoord(currentDriverLocation.lng)
    ) {
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

    // For IN_PROGRESS status, focus on driver and dropoff (destination route)
    if (status === "IN_PROGRESS" && isValidCoord(dropoffLat) && isValidCoord(dropoffLng)) {
      const bounds = new mapboxgl.LngLatBounds();
      let pointCount = 0;

      // Always include dropoff
      bounds.extend([dropoffLng, dropoffLat]);
      pointCount++;

      // Include driver location if available
      if (
        currentDriverLocation &&
        isValidCoord(currentDriverLocation.lat) &&
        isValidCoord(currentDriverLocation.lng)
      ) {
        bounds.extend([currentDriverLocation.lng, currentDriverLocation.lat]);
        pointCount++;
      } else {
        // If no driver location, include pickup as reference
        bounds.extend([pickupLng, pickupLat]);
        pointCount++;
      }

      if (pointCount >= 2) {
        try {
          map.current.fitBounds(bounds, {
            padding: 100,
            maxZoom: 15,
            duration: 1000,
          });
          console.log("DriverLocationMap - Focused on destination route (IN_PROGRESS)");
          return;
        } catch (error) {
          console.log("Error fitting bounds for IN_PROGRESS:", error);
        }
      }
    }

    // When driver is close to pickup, focus on driver-pickup area only
    // When driver is far, show all points (pickup, dropoff, driver)
    // Skip this for IN_PROGRESS status (handled above)
    if (
      status !== "IN_PROGRESS" &&
      currentDriverLocation &&
      isValidCoord(currentDriverLocation.lat) &&
      isValidCoord(currentDriverLocation.lng) &&
      distance > 0 &&
      distance < 5
    ) {
      // Driver is close - focus on driver and pickup only
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([pickupLng, pickupLat]);
      bounds.extend([currentDriverLocation.lng, currentDriverLocation.lat]);

      // Dynamic zoom based on distance - closer = more zoom
      let padding = 100;
      let zoom = 15;

      if (distance < 0.5) {
        // Very close (< 500m) - zoom in a lot
        padding = 150;
        zoom = 17;
      } else if (distance < 1) {
        // Close (< 1km)
        padding = 120;
        zoom = 16;
      } else if (distance < 2) {
        // Medium close (< 2km)
        padding = 100;
        zoom = 15;
      } else {
        // Medium (< 5km)
        padding = 80;
        zoom = 14;
      }

      try {
        map.current.fitBounds(bounds, {
          padding,
          maxZoom: zoom,
          duration: 1000,
        });
        console.log("DriverLocationMap - Focused on driver-pickup:", {
          distance: distance.toFixed(2) + " km",
          zoom,
        });
        return;
      } catch (error) {
        console.log("Error fitting bounds:", error);
      }
    }

    // Default: fit all points (pickup, dropoff, driver)
    const bounds = new mapboxgl.LngLatBounds();
    let pointCount = 0;

    bounds.extend([pickupLng, pickupLat]);
    pointCount++;

    if (isValidCoord(dropoffLat) && isValidCoord(dropoffLng)) {
      bounds.extend([dropoffLng, dropoffLat]);
      pointCount++;
    }

    if (
      currentDriverLocation &&
      isValidCoord(currentDriverLocation.lat) &&
      isValidCoord(currentDriverLocation.lng)
    ) {
      bounds.extend([currentDriverLocation.lng, currentDriverLocation.lat]);
      pointCount++;
    }

    if (pointCount >= 2) {
      try {
        map.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 15,
          duration: 1000,
        });
      } catch (error) {
        console.log("Error fitting bounds:", error);
        if (map.current) {
          map.current.setCenter([pickupLng, pickupLat]);
          map.current.setZoom(14);
        }
      }
    } else {
      map.current.setCenter([pickupLng, pickupLat]);
      map.current.setZoom(14);
    }
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, currentDriverLocation, status]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
    </div>
  );
}
