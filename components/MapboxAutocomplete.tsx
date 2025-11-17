"use client";
import { useEffect, useRef, useState } from "react";

interface MapboxAutocompleteProps {
  value: string;
  onChange: (
    address: string,
    coordinates: { lat: number; lng: number }
  ) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export default function MapboxAutocomplete({
  value,
  onChange,
  placeholder = "Enter address",
  label,
  required = false,
}: MapboxAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${token}&country=GB&limit=5`
      );
      const data = await response.json();
      setSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Geocoding error:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onChange(query, { lat: 0, lng: 0 }); // Clear coordinates while typing

    // Debounce the search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      searchAddress(query);
    }, 300);
  };

  const handleSelectSuggestion = (feature: any) => {
    const [lng, lat] = feature.center;
    const address = feature.place_name;
    onChange(address, { lat, lng });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      {label && (
        <label className="block text-sm font-medium mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5C7E9B] focus:border-transparent"
      />

      {loading && (
        <div className="absolute right-3 top-[50%] translate-y-[-50%]">
          <div className="w-5 h-5 border-2 border-[#5C7E9B] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((feature, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectSuggestion(feature)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0"
            >
              <div className="font-medium text-sm text-[#263238]">
                {feature.text}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {feature.place_name}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
