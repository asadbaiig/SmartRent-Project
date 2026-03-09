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

// Pakistan major city coordinates
const CITY_FALLBACK: Record<string, { lat: number; lng: number }> = {
  karachi: { lat: 24.8607, lng: 67.0011 },
  lahore: { lat: 31.5204, lng: 74.3587 },
  islamabad: { lat: 33.6844, lng: 73.0479 },
  rawalpindi: { lat: 33.5651, lng: 73.0169 },
  faisalabad: { lat: 31.4504, lng: 73.135 },
  multan: { lat: 30.1575, lng: 71.5249 },
  peshawar: { lat: 34.0151, lng: 71.5249 },
  quetta: { lat: 30.1798, lng: 66.975 },
  hyderabad: { lat: 25.396, lng: 68.3578 },
  gujranwala: { lat: 32.1877, lng: 74.1945 },
};

// Province color palette
const PROVINCE_COLORS: Record<string, string> = {
  PUNJAB: "#6366f1",
  SINDH: "#10b981",
  "KHYBER PAKHTUNKHWA": "#f59e0b",
  BALOCHISTAN: "#94a3b8",
  "FEDERAL CAPITAL TERRITORY": "#8b5cf6",
  "GILGIT BALTISTAN": "#06b6d4",
  "AZAD KASHMIR": "#ec4899",
  FATA: "#f97316",
  "INDIAN OCCUPIED KASHMIR": "#64748b",
};

// Custom circle marker per city
const CITY_MARKER_COLORS: Record<string, string> = {
  islamabad: "#8b5cf6",
  karachi: "#10b981",
  lahore: "#6366f1",
  rawalpindi: "#a855f7",
  faisalabad: "#f59e0b",
  multan: "#ef4444",
  peshawar: "#f97316",
  quetta: "#dc2626",
  hyderabad: "#14b8a6",
  gujranwala: "#818cf8",
};

const PAKISTAN_BOUNDS = L.latLngBounds(L.latLng(23.5, 60.9), L.latLng(37.5, 79.5));

interface MapViewProps {
  properties: MapProperty[];
  height?: number | string;
  highlightedProperty?: { id?: string; lat?: number; lng?: number } | null;
}

export function MapView({ properties, height = 520, highlightedProperty }: MapViewProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const parseCoordinate = (value: unknown) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
    if (typeof value === "string") {
      const num = parseFloat(value.trim());
      return Number.isFinite(num) ? num : undefined;
    }
    return undefined;
  };

  const markers = useMemo(() => {
    const base = properties
      .map((p) => {
        const src = p.coordinates || { lat: parseCoordinate(p.latitude), lng: parseCoordinate(p.longitude) };
        const lat = parseCoordinate(src?.lat);
        const lng = parseCoordinate(src?.lng);
        if (lat !== undefined && lng !== undefined) return { ...p, lat, lng };
        const fb = CITY_FALLBACK[(p.city || "").toLowerCase().trim()];
        if (fb) return { ...p, lat: fb.lat, lng: fb.lng };
        return null;
      })
      .filter(Boolean) as Array<MapProperty & { lat: number; lng: number }>;

    // Ensure major cities appear
    const present = new Set(base.map((m) => (m.city || "").toLowerCase().trim()));
    const extras: typeof base = [];
    for (const c of ["islamabad", "karachi", "multan", "faisalabad"]) {
      if (!present.has(c)) {
        const fb = CITY_FALLBACK[c];
        if (fb) extras.push({ id: `city-${c}`, title: c[0].toUpperCase() + c.slice(1), city: c, lat: fb.lat, lng: fb.lng } as any);
      }
    }
    return [...base, ...extras];
  }, [properties]);

  const center = useMemo(() => {
    if (markers.length > 0) {
      return { lat: markers.reduce((s, m) => s + m.lat, 0) / markers.length, lng: markers.reduce((s, m) => s + m.lng, 0) / markers.length };
    }
    return { lat: 30.3753, lng: 69.3451 };
  }, [markers]);

  // Pan to highlighted property
  useEffect(() => {
    if (!mapInstance || !highlightedProperty) return;
    if (highlightedProperty.lat && highlightedProperty.lng) {
      mapInstance.setView([highlightedProperty.lat, highlightedProperty.lng], 13, { animate: true });
    }
  }, [mapInstance, highlightedProperty]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <MapErrorBoundary>
        <div
          ref={(node) => {
            if (!node || mapInstance) return;
            try {
              const map = L.map(node, {
                center: [center.lat, center.lng],
                zoom: 6,
                zoomControl: false,
                scrollWheelZoom: false,
                maxBounds: PAKISTAN_BOUNDS,
                maxBoundsViscosity: 1.0,
              });

              // Zoom control top-right
              L.control.zoom({ position: "topright" }).addTo(map);

              // Professional CartoDB tile layer
              L.tileLayer(
                "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
                {
                  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                  subdomains: "abcd",
                  maxZoom: 19,
                }
              ).addTo(map);

              // Load local Pakistan district boundaries
              fetch("/pakistan-districts.geojson")
                .then((r) => r.json())
                .then((geo) => {
                  const boundaryLayer = L.geoJSON(geo as any, {
                    style: (feature) => {
                      const prov = (feature?.properties?.PROVINCE || "").toUpperCase();
                      const color = PROVINCE_COLORS[prov] || PROVINCE_COLORS[(feature?.properties?.PROVINCE || "")] || "#64748b";
                      const isIoK = prov === "INDIAN OCCUPIED KASHMIR" || prov === "IOK";
                      return {
                        color: color,
                        weight: isIoK ? 1.5 : 0.8,
                        opacity: isIoK ? 0.8 : 0.5,
                        fillColor: color,
                        fillOpacity: 0.03,
                      };
                    },
                    onEachFeature: (feature, layer) => {
                      const props = feature.properties || {};
                      layer.bindTooltip(
                        `<div style="font-weight:600;font-size:12px">${props.DISTRICT || ""}</div><div style="font-size:11px;color:#64748b">${props.PROVINCE || ""}</div>`,
                        { sticky: true, className: "district-tooltip" }
                      );
                      layer.on({
                        mouseover: (e) => {
                          const l = e.target;
                          l.setStyle({ fillOpacity: 0.15, weight: 1.8 });
                          l.bringToFront();
                        },
                        mouseout: (e) => {
                          boundaryLayer.resetStyle(e.target);
                        },
                      });
                    },
                  });
                  boundaryLayer.addTo(map);
                })
                .catch((err) => {
                  console.warn("[MapView] Could not load district boundaries:", err);
                  // Fallback: simple Pakistan border outline
                  L.rectangle(PAKISTAN_BOUNDS, { color: "#94a3b8", weight: 1.5, fill: false, opacity: 0.6 }).addTo(map);
                });

              // Add property markers
              const markerBounds = L.latLngBounds([]);
              let highlightedMarker: L.CircleMarker | null = null;

              markers.forEach((m) => {
                const cityKey = (m.city || "").toLowerCase().trim();
                const isHighlighted =
                  highlightedProperty &&
                  ((highlightedProperty.id && m.id === highlightedProperty.id) ||
                    (highlightedProperty.lat &&
                      highlightedProperty.lng &&
                      Math.abs(m.lat - highlightedProperty.lat) < 0.001 &&
                      Math.abs(m.lng - highlightedProperty.lng) < 0.001));

                const color = CITY_MARKER_COLORS[cityKey] || "#6366f1";
                const baseRadius = isHighlighted ? 14 : 10;
                const marker = L.circleMarker([m.lat, m.lng], {
                  radius: baseRadius,
                  fillColor: isHighlighted ? "#ef4444" : color,
                  color: isHighlighted ? "#fff" : "#fff",
                  weight: isHighlighted ? 3.5 : 2.5,
                  opacity: 1,
                  fillOpacity: isHighlighted ? 1 : 0.9,
                  interactive: true,
                  bubblingMouseEvents: false,
                  className: "property-marker",
                }).addTo(map);

                // Hover effects
                marker.on("mouseover", () => {
                  marker.setRadius(baseRadius + 4);
                  marker.setStyle({ weight: 3.5, fillOpacity: 1 });
                  marker.openPopup();
                });
                marker.on("mouseout", () => {
                  if (!isHighlighted) {
                    marker.setRadius(baseRadius);
                    marker.setStyle({ weight: 2.5, fillOpacity: 0.9 });
                  }
                });
                  // Click effect: open popup
                  marker.on("click", () => {
                    marker.openPopup();
                  });

                markerBounds.extend([m.lat, m.lng]);

                const parts: string[] = [];
                parts.push(`<div style="font-weight:700;font-size:13px;margin-bottom:2px">${m.title}</div>`);
                if (m.area || m.city) {
                  parts.push(`<div style="font-size:11px;color:#64748b">${[m.area, m.city].filter(Boolean).join(", ")}</div>`);
                }
                if (m.monthlyRent) {
                  const price = Number(m.monthlyRent);
                  parts.push(`<div style="font-size:13px;font-weight:600;color:#6366f1;margin-top:4px">₨${Number.isFinite(price) ? price.toLocaleString() : m.monthlyRent}/mo</div>`);
                }
                marker.bindPopup(`<div style="min-width:140px">${parts.join("")}</div>`);

                if (isHighlighted) {
                  highlightedMarker = marker;
                }
              });

              if (highlightedMarker) {
                map.setView([(highlightedMarker as L.CircleMarker).getLatLng().lat, (highlightedMarker as L.CircleMarker).getLatLng().lng], 13);
                (highlightedMarker as L.CircleMarker).openPopup();
              } else {
                const fitTo = markerBounds.isValid() ? markerBounds : PAKISTAN_BOUNDS;
                map.fitBounds(PAKISTAN_BOUNDS.intersects(fitTo) ? fitTo : PAKISTAN_BOUNDS, { padding: [30, 30] });
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



