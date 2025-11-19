import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type MapProperty = {
  id: string;
  title: string;
  city?: string;
  area?: string;
  monthlyRent?: string | number;
  coordinates?: { lat: number; lng: number } | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

// Simple city fallback coordinates (Pakistan major cities)
const CITY_FALLBACK: Record<string, { lat: number; lng: number }> = {
  karachi: { lat: 24.8607, lng: 67.0011 },
  lahore: { lat: 31.5204, lng: 74.3587 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5651, lng: 73.0169 },
  faisalabad: { lat: 31.4504, lng: 73.1350 },
  multan: { lat: 30.1575, lng: 71.5249 },
  peshawar: { lat: 34.0151, lng: 71.5249 },
  quetta: { lat: 30.1798, lng: 66.9750 },
  hyderabad: { lat: 25.3960, lng: 68.3578 },
  gujranwala: { lat: 32.1877, lng: 74.1945 },
};

// Fix default marker icons for Leaflet with bundlers
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon as any;

// Colored marker icons per city
const COLOR_ICON_BASE = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img";
const coloredIcon = (color: "red" | "green" | "blue" | "orange" | "violet" | "grey" | "yellow") =>
  L.icon({
    iconUrl: `${COLOR_ICON_BASE}/marker-icon-2x-${color}.png`,
    iconRetinaUrl: `${COLOR_ICON_BASE}/marker-icon-2x-${color}.png`,
    shadowUrl: `${COLOR_ICON_BASE}/marker-shadow.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const CITY_COLOR: Record<string, ReturnType<typeof coloredIcon>> = {
  // requested distinct colors
  islamabad: coloredIcon("green"),
  karachi: coloredIcon("red"),
  multan: coloredIcon("orange"),
  faisalabad: coloredIcon("violet"),
  // other common cities
  lahore: coloredIcon("blue"),
  rawalpindi: coloredIcon("yellow"),
  peshawar: coloredIcon("grey"),
  quetta: coloredIcon("grey"),
  hyderabad: coloredIcon("grey"),
  gujranwala: coloredIcon("grey"),
};

// Pakistan map bounds (approx SW/NE corners)
const PAKISTAN_BOUNDS = L.latLngBounds(
  L.latLng(23.5, 60.9),  // SW
  L.latLng(37.1, 77.5)   // NE
);

interface MapViewProps {
  properties: MapProperty[];
  height?: number | string;
  highlightedProperty?: { id?: string; lat?: number; lng?: number } | null;
}

export function MapView({ properties, height = 520, highlightedProperty }: MapViewProps) {
  const containerRef = useState<HTMLDivElement | null>(null)[0];
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const parseCoordinate = (value: unknown) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const num = parseFloat(trimmed);
      return Number.isFinite(num) ? num : undefined;
    }
    return undefined;
  };

  const markers = useMemo(() => {
    const base = properties
      .map((p) => {
        const coordinateSource = p.coordinates || {
          lat: parseCoordinate(p.latitude),
          lng: parseCoordinate(p.longitude),
        };
        const lat = parseCoordinate(coordinateSource?.lat);
        const lng = parseCoordinate(coordinateSource?.lng);
        if (lat !== undefined && lng !== undefined) {
          return { ...p, lat, lng };
        }
        const cityKey = (p.city || "").toLowerCase().trim();
        const fallback = CITY_FALLBACK[cityKey];
        if (fallback) {
          return { ...p, lat: fallback.lat, lng: fallback.lng };
        }
        return null;
      })
      .filter(Boolean) as Array<MapProperty & { lat: number; lng: number }>;

    // Ensure requested major cities appear even if dataset lacks entries
    const requiredCities = ["islamabad", "karachi", "multan", "faisalabad"];
    const presentCities = new Set(base.map((m) => (m.city || "").toLowerCase().trim()).filter(Boolean));
    const extras: Array<MapProperty & { lat: number; lng: number }> = [];
    for (const c of requiredCities) {
      if (!presentCities.has(c)) {
        const fb = CITY_FALLBACK[c];
        if (fb) {
          extras.push({
            id: `city-${c}`,
            title: c[0].toUpperCase() + c.slice(1),
            city: c,
            area: "",
            monthlyRent: undefined,
            coordinates: { lat: fb.lat, lng: fb.lng },
            latitude: fb.lat,
            longitude: fb.lng,
            lat: fb.lat,
            lng: fb.lng,
          });
        }
      }
    }
    return [...base, ...extras];
  }, [properties]);

  const center = useMemo(() => {
    if (markers.length > 0) {
      const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
      const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
      return { lat: avgLat, lng: avgLng };
    }
    return { lat: 30.3753, lng: 69.3451 }; // Pakistan center approx
  }, [markers]);

  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    setMapReady(true);
  }, []);

  // Update map when highlighted property changes
  useEffect(() => {
    if (!mapInstance || !highlightedProperty) return;

    // Find or create highlighted marker
    const allMarkers: L.Marker[] = [];
    mapInstance.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        allMarkers.push(layer);
      }
    });

    let foundMarker: L.Marker | null = null;
    
    // Check if any existing marker matches
    allMarkers.forEach((marker) => {
      const latlng = marker.getLatLng();
      if (highlightedProperty.lat && highlightedProperty.lng) {
        if (Math.abs(latlng.lat - highlightedProperty.lat) < 0.001 && 
            Math.abs(latlng.lng - highlightedProperty.lng) < 0.001) {
          foundMarker = marker;
        }
      }
    });

    // If not found and we have coordinates, create a new marker
    if (!foundMarker && highlightedProperty.lat && highlightedProperty.lng) {
      const highlightIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
        iconSize: [35, 55],
        iconAnchor: [17, 55],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      foundMarker = L.marker([highlightedProperty.lat, highlightedProperty.lng], { icon: highlightIcon }).addTo(mapInstance);
      foundMarker.bindPopup(`<div class="font-semibold">Property Location</div>`);
    }

    // Center on and open popup for highlighted marker
    if (foundMarker) {
      mapInstance.setView([foundMarker.getLatLng().lat, foundMarker.getLatLng().lng], 15);
      foundMarker.openPopup();
    }
  }, [mapInstance, highlightedProperty]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <MapErrorBoundary>
        <div
          ref={(node) => {
            if (!node || mapInstance) return;
            // Initialize Leaflet map once the container is available
            try {
              const map = L.map(node, {
                center: [center.lat, center.lng],
                zoom: 6,
                zoomControl: true,
                scrollWheelZoom: false,
                maxBounds: PAKISTAN_BOUNDS,
                maxBoundsViscosity: 1.0,
                worldCopyJump: false,
              });
              L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              }).addTo(map);

              // Draw Pakistan boundary using GeoJSON; fallback to bounds rectangle
              const boundaryStyle: L.PathOptions = {
                color: "#16a34a",
                weight: 2,
                fill: false,
                opacity: 0.9,
              };
              fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries/PAK.geo.json")
                .then((r) => r.json())
                .then((geo) => {
                  try {
                    const gj = L.geoJSON(geo as any, { style: boundaryStyle });
                    gj.addTo(map);
                  } catch (e) {
                    // fallback to simple rectangle if parsing fails
                    L.rectangle(PAKISTAN_BOUNDS, boundaryStyle).addTo(map);
                  }
                })
                .catch(() => {
                  L.rectangle(PAKISTAN_BOUNDS, boundaryStyle).addTo(map);
                });

              // Add markers
              const markerBounds = L.latLngBounds([]);
              let highlightedMarker: L.Marker | null = null;
              let foundHighlighted = false;
              
              markers.forEach((m) => {
                const cityKey = (m.city || "").toLowerCase().trim();
                const isHighlighted = highlightedProperty && (
                  (highlightedProperty.id && m.id === highlightedProperty.id) ||
                  (highlightedProperty.lat && highlightedProperty.lng && 
                   Math.abs(m.lat - highlightedProperty.lat) < 0.001 && 
                   Math.abs(m.lng - highlightedProperty.lng) < 0.001)
                );
                
                if (isHighlighted) {
                  foundHighlighted = true;
                }
                
                // Use a special icon for highlighted property (larger, different color)
                const icon = isHighlighted 
                  ? L.icon({
                      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                      iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                      shadowUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
                      iconSize: [35, 55],
                      iconAnchor: [17, 55],
                      popupAnchor: [1, -34],
                      shadowSize: [41, 41],
                    })
                  : (CITY_COLOR[cityKey] || DefaultIcon);
                
                const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
                markerBounds.extend([m.lat, m.lng]);
                
                const parts: string[] = [];
                parts.push(`<div class="font-semibold">${m.title}</div>`);
                if (m.area || m.city) {
                  parts.push(
                    `<div class="text-xs text-gray-600">${[m.area, m.city]
                      .filter(Boolean)
                      .join(", ")}</div>`
                  );
                }
                if (m.monthlyRent) {
                  const price = Number(m.monthlyRent);
                  parts.push(
                    `<div class="text-sm font-medium">₨${Number.isFinite(price) ? price.toLocaleString() : m.monthlyRent}</div>`
                  );
                }
                marker.bindPopup(parts.join(""));
                
                if (isHighlighted) {
                  highlightedMarker = marker;
                }
              });

              // If highlighted property has coordinates but wasn't found in markers, add it
              if (highlightedProperty && !foundHighlighted && highlightedProperty.lat && highlightedProperty.lng) {
                const highlightIcon = L.icon({
                  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
                  shadowUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
                  iconSize: [35, 55],
                  iconAnchor: [17, 55],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41],
                });
                highlightedMarker = L.marker([highlightedProperty.lat, highlightedProperty.lng], { icon: highlightIcon }).addTo(map);
                highlightedMarker.bindPopup(`<div class="font-semibold">Property Location</div>`);
                markerBounds.extend([highlightedProperty.lat, highlightedProperty.lng]);
              }

              // If there's a highlighted property, center on it and open popup
              if (highlightedMarker) {
                map.setView([highlightedMarker.getLatLng().lat, highlightedMarker.getLatLng().lng], 15);
                highlightedMarker.openPopup();
              } else {
                // Fit to markers but restrict to Pakistan bounds
                const fitTo = markerBounds.isValid()
                  ? markerBounds
                  : PAKISTAN_BOUNDS;
                const bounded = PAKISTAN_BOUNDS.intersects(fitTo)
                  ? PAKISTAN_BOUNDS
                  : PAKISTAN_BOUNDS;
                map.fitBounds(bounded, { padding: [30, 30] });
              }

              setMapInstance(map);
            } catch (e) {
              console.error("[MapView] Failed to initialize Leaflet map:", e);
              throw e;
            }
          }}
          style={{ height, width: "100%" }}
        />
      </MapErrorBoundary>
    </div>
  );
}

export default MapView;

class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[MapErrorBoundary] Map rendering failed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center text-sm text-red-600 dark:text-red-400">
          Failed to render map: {this.state.error?.message ?? "Unknown error"}.
        </div>
      );
    }
    return this.props.children;
  }
}



