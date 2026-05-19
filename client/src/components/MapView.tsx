import { Component, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
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

function parseCoordinate(value: unknown) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const num = parseFloat(value.trim());
    return Number.isFinite(num) ? num : undefined;
  }
  return undefined;
}

function formatRent(rent?: number | string) {
  const value = Number(rent);
  if (!Number.isFinite(value)) return rent ? String(rent) : "Price on request";
  if (value >= 100_000) return `Rs ${(value / 100_000).toFixed(value >= 1_000_000 ? 1 : 0)}L`;
  if (value >= 1_000) return `Rs ${(value / 1_000).toFixed(0)}k`;
  return `Rs ${value.toLocaleString()}`;
}

export function MapView({ properties, height = 520, highlightedProperty }: MapViewProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  const markers = useMemo(() => {
    const base = properties
      .map((p) => {
        const src = p.coordinates || { lat: parseCoordinate(p.latitude), lng: parseCoordinate(p.longitude) };
        const lat = parseCoordinate(src?.lat);
        const lng = parseCoordinate(src?.lng);
        if (lat !== undefined && lng !== undefined) return { ...p, lat, lng, hasRealCoordinates: true };
        const fb = CITY_FALLBACK[(p.city || "").toLowerCase().trim()];
        if (fb) return { ...p, lat: fb.lat, lng: fb.lng, hasRealCoordinates: false };
        return null;
      })
      .filter(Boolean) as Array<MapProperty & { lat: number; lng: number; hasRealCoordinates: boolean }>;

    const present = new Set(base.map((m) => (m.city || "").toLowerCase().trim()));
    const extras: typeof base = [];
    for (const city of ["islamabad", "karachi", "multan", "faisalabad"]) {
      if (!present.has(city)) {
        const fb = CITY_FALLBACK[city];
        extras.push({
          id: `city-${city}`,
          title: city[0].toUpperCase() + city.slice(1),
          city,
          lat: fb.lat,
          lng: fb.lng,
          hasRealCoordinates: false,
        } as any);
      }
    }

    return [...base, ...extras];
  }, [properties]);

  const markerGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        id: string;
        lat: number;
        lng: number;
        city?: string;
        area?: string;
        items: typeof markers;
        minRent?: number;
        isHighlighted: boolean;
      }
    >();

    for (const marker of markers) {
      const cityKey = (marker.city || "").toLowerCase().trim();
      const areaKey = (marker.area || "").toLowerCase().trim();
      const coordKey = marker.hasRealCoordinates
        ? `${marker.lat.toFixed(3)}:${marker.lng.toFixed(3)}`
        : `city:${cityKey || marker.lat.toFixed(2) + ":" + marker.lng.toFixed(2)}`;
      const key = `${coordKey}:${areaKey}`;
      const rent = Number(marker.monthlyRent);
      const isHighlighted =
        !!highlightedProperty &&
        ((highlightedProperty.id && marker.id === highlightedProperty.id) ||
          (highlightedProperty.lat &&
            highlightedProperty.lng &&
            Math.abs(marker.lat - highlightedProperty.lat) < 0.001 &&
            Math.abs(marker.lng - highlightedProperty.lng) < 0.001));

      const existing = groups.get(key);
      if (existing) {
        existing.items.push(marker);
        existing.isHighlighted = existing.isHighlighted || isHighlighted;
        if (Number.isFinite(rent)) existing.minRent = existing.minRent === undefined ? rent : Math.min(existing.minRent, rent);
      } else {
        groups.set(key, {
          id: key,
          lat: marker.lat,
          lng: marker.lng,
          city: marker.city,
          area: marker.area,
          items: [marker],
          minRent: Number.isFinite(rent) ? rent : undefined,
          isHighlighted,
        });
      }
    }

    return Array.from(groups.values());
  }, [highlightedProperty, markers]);

  const center = useMemo(() => {
    if (markers.length > 0) {
      return {
        lat: markers.reduce((sum, marker) => sum + marker.lat, 0) / markers.length,
        lng: markers.reduce((sum, marker) => sum + marker.lng, 0) / markers.length,
      };
    }
    return { lat: 30.3753, lng: 69.3451 };
  }, [markers]);

  useEffect(() => {
    if (!mapInstance || !highlightedProperty?.lat || !highlightedProperty?.lng) return;
    mapInstance.setView([highlightedProperty.lat, highlightedProperty.lng], 13, { animate: true });
  }, [mapInstance, highlightedProperty]);

  useEffect(() => {
    if (!mapInstance) return;

    if (!markerLayerRef.current) {
      markerLayerRef.current = L.layerGroup().addTo(mapInstance);
    }

    const markerLayer = markerLayerRef.current;
    markerLayer.clearLayers();

    const markerBounds = L.latLngBounds([]);
    let highlightedLayer: L.Marker | null = null;

    const popupForGroup = (group: (typeof markerGroups)[number]) => {
      const heading = group.items.length === 1 ? group.items[0].title : `${group.items.length.toLocaleString()} properties`;
      const location = [group.area, group.city].filter(Boolean).join(", ");
      const rows = group.items
        .slice(0, 5)
        .map((item) => `
          <a href="/properties/${item.id}" style="display:block;text-decoration:none;color:inherit;padding:8px 0;border-top:1px solid #e2e8f0">
            <div style="font-weight:650;font-size:12px;line-height:1.25">${item.title}</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px">${[item.area, item.city].filter(Boolean).join(", ")}</div>
            <div style="font-size:12px;font-weight:700;color:#4f46e5;margin-top:3px">${formatRent(item.monthlyRent)}/mo</div>
          </a>
        `)
        .join("");
      const more =
        group.items.length > 5
          ? `<div style="font-size:11px;color:#64748b;margin-top:6px">Showing 5 of ${group.items.length.toLocaleString()} properties. Zoom in or filter by area to narrow results.</div>`
          : "";
      const primary = group.items[0];
      const viewPrimary =
        primary && !primary.id.startsWith("city-")
          ? `<a href="/properties/${primary.id}" style="display:inline-block;margin-top:8px;padding:7px 10px;border-radius:6px;background:#4f46e5;color:white;font-size:12px;font-weight:700;text-decoration:none">View property</a>`
          : "";

      return `
        <div style="min-width:220px;max-width:280px">
          <div style="font-weight:800;font-size:14px;margin-bottom:2px">${heading}</div>
          ${location ? `<div style="font-size:12px;color:#64748b;margin-bottom:6px">${location}</div>` : ""}
          ${rows}
          ${more}
          ${viewPrimary}
        </div>
      `;
    };

    markerGroups.forEach((group) => {
      const count = group.items.length;
      const color = group.isHighlighted ? "#ef4444" : CITY_MARKER_COLORS[(group.city || "").toLowerCase().trim()] || "#4f46e5";
      const label = count > 1 ? count.toLocaleString() : formatRent(group.minRent);
      const markerClass = count > 1 ? "smart-map-marker smart-map-marker-cluster" : "smart-map-marker smart-map-marker-price";
      const width = count > 1 ? Math.min(78, 44 + Math.log10(count + 1) * 18) : 76;
      const icon = L.divIcon({
        className: "",
        html: `<div class="${markerClass}" style="--marker-color:${color};${group.isHighlighted ? "--marker-ring:#ef4444;" : ""}"><span>${label}</span></div>`,
        iconSize: [width, 38],
        iconAnchor: [width / 2, 38],
        popupAnchor: [0, -34],
      });

      const layer = L.marker([group.lat, group.lng], {
        icon,
        keyboard: true,
        title: count > 1 ? `${count} properties in ${group.area || group.city || "this area"}` : group.items[0].title,
      }).bindPopup(popupForGroup(group));

      layer.on("mouseover", () => layer.openPopup());
      layer.addTo(markerLayer);
      markerBounds.extend([group.lat, group.lng]);
      if (group.isHighlighted) highlightedLayer = layer;
    });

    if (highlightedLayer) {
      const latLng = highlightedLayer.getLatLng();
      mapInstance.setView(latLng, 13, { animate: true });
      highlightedLayer.openPopup();
    } else if (markerBounds.isValid()) {
      mapInstance.fitBounds(PAKISTAN_BOUNDS.intersects(markerBounds) ? markerBounds : PAKISTAN_BOUNDS, {
        padding: [30, 30],
        maxZoom: 12,
      });
    }
  }, [mapInstance, markerGroups]);

  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-white/95 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/95 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">Property map</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {properties.length.toLocaleString()} properties grouped into {markerGroups.length.toLocaleString()} map markers
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-5 rounded-full bg-indigo-600" />
            <span>Price pin</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">8</span>
            <span>Area group</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span>Selected</span>
          </span>
        </div>
      </div>

      <MapErrorBoundary>
        <div
          ref={(node) => {
            if (!node || mapInstance) return;
            try {
              const map = L.map(node, {
                center: [center.lat, center.lng],
                zoom: 6,
                zoomControl: false,
                scrollWheelZoom: true,
                maxBounds: PAKISTAN_BOUNDS,
                maxBoundsViscosity: 1.0,
              });

              L.control.zoom({ position: "topright" }).addTo(map);

              L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: "abcd",
                maxZoom: 19,
              }).addTo(map);

              fetch("/pakistan-districts.geojson")
                .then((response) => response.json())
                .then((geo) => {
                  const boundaryLayer = L.geoJSON(geo as any, {
                    style: (feature) => {
                      const province = (feature?.properties?.PROVINCE || "").toUpperCase();
                      const color = PROVINCE_COLORS[province] || "#64748b";
                      const isIoK = province === "INDIAN OCCUPIED KASHMIR" || province === "IOK";
                      return {
                        color,
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
                        { sticky: true, className: "district-tooltip" },
                      );
                      layer.on({
                        mouseover: (event) => {
                          const activeLayer = event.target;
                          activeLayer.setStyle({ fillOpacity: 0.15, weight: 1.8 });
                          activeLayer.bringToFront();
                        },
                        mouseout: (event) => {
                          boundaryLayer.resetStyle(event.target);
                        },
                      });
                    },
                  });
                  boundaryLayer.addTo(map);
                })
                .catch((err) => {
                  console.warn("[MapView] Could not load district boundaries:", err);
                  L.rectangle(PAKISTAN_BOUNDS, { color: "#94a3b8", weight: 1.5, fill: false, opacity: 0.6 }).addTo(map);
                });

              setMapInstance(map);
            } catch (error) {
              console.error("[MapView] Failed to initialize Leaflet map:", error);
              throw error;
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
