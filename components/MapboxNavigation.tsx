"use client";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface MapboxNavigationProps {
  destinationLat: number;
  destinationLng: number;
  destinationName?: string;
  onClose?: () => void;
  className?: string;
}

export default function MapboxNavigation({
  destinationLat,
  destinationLng,
  destinationName = "Destination",
  onClose,
  className = "w-full h-full",
}: MapboxNavigationProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const routeLayerAdded = useRef(false);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [instructions, setInstructions] = useState<string>("");
  const [distance, setDistance] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<any[]>([]);
  const watchId = useRef<number | null>(null);
  const updateRouteRef = useRef<((userLng: number, userLat: number) => Promise<void>) | null>(null);
  const currentStepRef = useRef(0);

  // Update route when location changes
  const updateRoute = async (userLng: number, userLat: number) => {
    if (!map.current) return;

    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        console.error("Mapbox token not found");
        setInstructions("Mapbox token not configured");
        return;
      }

      // If user location is same as destination, don't calculate route
      const distanceToDest = Math.sqrt(
        Math.pow(userLng - destinationLng, 2) + Math.pow(userLat - destinationLat, 2)
      );
      
      if (distanceToDest < 0.0001) {
        setInstructions("You have arrived at your destination!");
        setDistance("0 km");
        setDuration("0 min");
        return;
      }

      const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${userLng},${userLat};${destinationLng},${destinationLat}?geometries=geojson&steps=true&overview=full&access_token=${token}`;

      const response = await fetch(routeUrl);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Directions API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const geometry = route.geometry;

        // Update distance and duration
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);
        setDistance(`${distanceKm} km`);
        setDuration(`${durationMin} min`);

        // Extract steps for turn-by-turn navigation
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          const routeSteps = route.legs[0].steps;
          setSteps(routeSteps);
          
          // Find the current step based on user's position along the route
          let activeStepIndex = currentStepRef.current;
          let minDistance = Infinity;
          
          // Check steps starting from current position forward
          for (let index = currentStepRef.current; index < routeSteps.length; index++) {
            const step = routeSteps[index];
            if (step.maneuver && step.maneuver.location) {
              const stepLng = step.maneuver.location[0];
              const stepLat = step.maneuver.location[1];
              
              // Calculate distance to this step's location
              const distance = Math.sqrt(
                Math.pow(userLng - stepLng, 2) + Math.pow(userLat - stepLat, 2)
              );
              
              // If we're very close to this step (within ~50 meters), we've passed it
              // Use a threshold of ~0.0005 degrees (roughly 50 meters)
              if (distance < 0.0005 && index > activeStepIndex) {
                activeStepIndex = index + 1; // Move to next step
                minDistance = distance;
              } else if (distance < minDistance && index >= currentStepRef.current) {
                // This is the closest upcoming step
                minDistance = distance;
                activeStepIndex = index;
              }
            }
          }
          
          // Update current step if we've progressed
          if (activeStepIndex !== currentStepRef.current) {
            currentStepRef.current = activeStepIndex;
            setCurrentStep(activeStepIndex);
          }
          
          // Update current instruction - show the next step we need to take
          if (routeSteps.length > 0) {
            const activeStep = routeSteps[Math.min(activeStepIndex, routeSteps.length - 1)] || routeSteps[0];
            const currentInstruction = activeStep?.maneuver?.instruction || 
              routeSteps[0]?.maneuver?.instruction || 
              "Continue to destination";
            setInstructions(currentInstruction);
          }
        }

        // Remove existing route layer
        if (map.current.getSource("route")) {
          map.current.removeLayer("route");
          map.current.removeSource("route");
        }

        // Add route layer
        map.current.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: geometry,
          },
        });

        map.current.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#5C7E9B",
            "line-width": 6,
            "line-opacity": 0.75,
          },
        });

        routeLayerAdded.current = true;

        // Fit map to route bounds
        const coordinates = geometry.coordinates;
        const bounds = new mapboxgl.LngLatBounds(
          [userLng, userLat],
          [destinationLng, destinationLat]
        );

        coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });

        map.current.fitBounds(bounds, {
          padding: 100,
          maxZoom: 16,
        });
      }
    } catch (error) {
      console.error("Error updating route:", error);
      setInstructions("Unable to calculate route. Please check your connection.");
    }
  };

  // Store updateRoute in ref so it can be accessed in useEffect
  updateRouteRef.current = updateRoute;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-day-v1",
      center: [destinationLng, destinationLat],
      zoom: 15,
      pitch: 45,
      bearing: 0,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          
          // Center map on user location
          if (map.current) {
            map.current.setCenter([longitude, latitude]);
            map.current.setZoom(15);
          }

          // Add user location marker
          new mapboxgl.Marker({ color: "#5C7E9B" })
            .setLngLat([longitude, latitude])
            .addTo(map.current);

          // Start watching location with more frequent updates for navigation
          watchId.current = navigator.geolocation.watchPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              setCurrentLocation({ lat: latitude, lng: longitude });
              // Update route on every location change for real-time navigation
              if (updateRouteRef.current) {
                updateRouteRef.current(longitude, latitude);
              }
            },
            (error) => {
              // Handle watch position errors silently - user might have denied permission
              console.warn("Location tracking stopped:", error.message || "Permission denied");
            },
            { 
              enableHighAccuracy: true, 
              maximumAge: 0,
              timeout: 5000
            }
          );
        },
        (error) => {
          // Handle different error types
          const errorMessage = error.message || 
            (error.code === 1 ? "Permission denied" :
             error.code === 2 ? "Position unavailable" :
             error.code === 3 ? "Request timeout" : "Unknown error");
          
          console.warn("Could not get current location:", errorMessage);
          
          // Show route from destination to destination (will show as 0 distance)
          // This allows the map to still display the destination
          setCurrentLocation({ lat: destinationLat, lng: destinationLng });
          
          // Still try to calculate a route (will show destination point)
          if (map.current && updateRouteRef.current) {
            updateRouteRef.current(destinationLng, destinationLat);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      // Geolocation not supported
      console.warn("Geolocation is not supported by this browser");
      setCurrentLocation({ lat: destinationLat, lng: destinationLng });
      if (map.current && updateRouteRef.current) {
        updateRouteRef.current(destinationLng, destinationLat);
      }
    }

    // Add destination marker
    new mapboxgl.Marker({ color: "#5C7E9B" })
      .setLngLat([destinationLng, destinationLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div class="p-2"><strong>${destinationName}</strong></div>`
        )
      )
      .addTo(map.current);

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update route when current location is set
  useEffect(() => {
    if (currentLocation && map.current && updateRouteRef.current) {
      // Always update route when location changes for real-time navigation
      updateRouteRef.current(currentLocation.lng, currentLocation.lat);
    }
  }, [currentLocation]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !currentLocation) return;

    // Remove old marker
    const markers = document.querySelectorAll(".user-location-marker");
    markers.forEach((marker) => marker.remove());

    // Add new marker
    const el = document.createElement("div");
    el.className = "user-location-marker";
    el.style.width = "20px";
    el.style.height = "20px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = "#5C7E9B";
    el.style.border = "3px solid white";
    el.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";

    new mapboxgl.Marker({ element: el })
      .setLngLat([currentLocation.lng, currentLocation.lat])
      .addTo(map.current);

    // Update map center to follow user
    map.current.setCenter([currentLocation.lng, currentLocation.lat]);
  }, [currentLocation]);

  return (
    <div className={`relative ${className}`}>
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Navigation Instructions Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-lg text-[#5C7E9B]">Navigation</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[#5C7E9B]">
              {instructions || "Calculating route..."}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              {distance && <span>📏 {distance}</span>}
              {duration && <span>⏱️ {duration}</span>}
            </div>
            <p className="text-xs text-gray-500">
              To: {destinationName}
            </p>
          </div>
        </div>
      </div>

      {/* Step-by-step instructions (optional, can be expanded) */}
      {steps.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-h-32 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-lg p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">
              Next Steps:
            </p>
            <div className="space-y-1">
              {steps.slice(currentStep, currentStep + 3).map((step: any, index: number) => (
                <div
                  key={currentStep + index}
                  className={`text-xs ${
                    index === 0
                      ? "text-[#5C7E9B] font-semibold"
                      : "text-gray-600"
                  }`}
                >
                  {currentStep + index + 1}. {step.maneuver?.instruction || "Continue"}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

