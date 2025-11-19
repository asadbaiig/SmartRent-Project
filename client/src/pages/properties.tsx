import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchFilters } from "@/components/search-filters";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus, LayoutGrid, Map as MapIcon } from "lucide-react";
import MapView from "@/components/MapView";
import { DEMO_PROPERTIES } from "@/lib/demoData";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";

const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function Properties() {
  const [location, setLocation] = useLocation();
  const [filters, setFilters] = useState({
    city: "",
    propertyType: "",
    minRent: "",
    maxRent: "",
    bedrooms: "",
    aiSuggestions: false,
  });
  const [sortBy, setSortBy] = useState("latest");
  // Initialize viewMode from URL params if present
  const getInitialViewMode = (): 'list' | 'map' => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      return searchParams.get('view') === 'map' ? 'map' : 'list';
    }
    return 'list';
  };
  const [viewMode, setViewMode] = useState<'list' | 'map'>(getInitialViewMode());
  const [currentPage, setCurrentPage] = useState(0);
  const [highlightedProperty, setHighlightedProperty] = useState<{ id?: string; lat?: number; lng?: number } | null>(null);
  const pageSize = 12;

  // Parse URL parameters on mount and when location changes
  useEffect(() => {
    // Use window.location.search to get query string (wouter's useLocation doesn't include query params)
    const searchParams = new URLSearchParams(window.location.search);
    const viewParam = searchParams.get('view');
    const propertyId = searchParams.get('propertyId');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (viewParam === 'map') {
      setViewMode('map');
    }

    if (propertyId || (lat && lng)) {
      setHighlightedProperty({
        id: propertyId || undefined,
        lat: lat ? parseFloat(lat) : undefined,
        lng: lng ? parseFloat(lng) : undefined,
      });
    } else {
      setHighlightedProperty(null);
    }
  }, [location]);

  // Check URL params to sync view mode with URL when location changes
  // This runs when URL changes (e.g., from navigation or manual URL update)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const viewParam = searchParams.get('view');
    
    // Sync view mode with URL parameter - URL is the source of truth
    setViewMode(viewParam === 'map' ? 'map' : 'list');
  }, [location]); // Only depend on location to avoid loops

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (filters.city) queryParams.set('city', filters.city);
  if (filters.propertyType) queryParams.set('propertyType', filters.propertyType);
  if (filters.minRent) queryParams.set('minRent', filters.minRent);
  if (filters.maxRent) queryParams.set('maxRent', filters.maxRent);
  if (filters.bedrooms) queryParams.set('bedrooms', filters.bedrooms);
  queryParams.set('limit', pageSize.toString());
  queryParams.set('offset', (currentPage * pageSize).toString());

  // Fetch properties
  const { data: properties = [], isLoading, error } = useQuery({
    queryKey: ['/api/properties', queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(`/api/properties?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      return response.json();
    },
  });

  // When in map view, load properties from CSV for Islamabad, Lahore, and Karachi
  const { data: mapProperties = [], isLoading: isMapLoading } = useQuery({
    queryKey: ['/api/properties/map'],
    enabled: viewMode === 'map',
    queryFn: async () => {
      const response = await fetch('/api/properties/map');
      if (!response.ok) {
        throw new Error('Failed to fetch properties for map');
      }
      return response.json();
    },
    staleTime: 60_000,
  });

  // For map view, show all properties from CSV (Islamabad, Lahore, Karachi)
  const mapLimited = useMemo(() => {
    const source = (viewMode === 'map' && (mapProperties?.length || 0) > 0) ? (mapProperties as any[]) : (properties as any[]);
    
    // If in map view with filtered properties, return all of them (they're already filtered to Islamabad, Lahore, Karachi)
    if (viewMode === 'map' && mapProperties?.length > 0) {
      return source;
    }
    
    // For list view or when no map properties, limit to 6 per city
    const perCityLimit = 6;
    const cityToCount = new Map<string, number>();
    const results: any[] = [];
    for (const p of source) {
      const cityKey = (p.city || '').toString().trim().toLowerCase();
      if (!cityKey) continue;
      const count = cityToCount.get(cityKey) || 0;
      if (count >= perCityLimit) continue;
      cityToCount.set(cityKey, count + 1);
      results.push(p);
    }
    return results;
  }, [properties, mapProperties, viewMode]);

  const handleSearch = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(0); // Reset to first page
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  const handleViewModeChange = (mode: 'list' | 'map') => {
    setViewMode(mode);
    // Update URL to reflect the view mode change
    const url = new URL(window.location.href);
    if (mode === 'map') {
      url.searchParams.set('view', 'map');
    } else {
      url.searchParams.delete('view');
      // Keep propertyId, lat, lng if they exist (for highlighting)
    }
    // Update the URL without page reload
    window.history.pushState({}, '', url.toString());
    // Trigger location change for wouter
    setLocation(url.pathname + url.search);
  };

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Sort properties client-side by monthlyRent
  const sortedList = useMemo(() => {
    const src = (properties.length > 0 ? properties : DEMO_PROPERTIES) as any[];
    if (sortBy === "price-low" || sortBy === "price-high") {
      const toNum = (v: any) => {
        if (typeof v === "number") return v;
        if (typeof v === "string") {
          const n = parseFloat(v.replace(/[^\d.]/g, ""));
          return Number.isFinite(n) ? n : 0;
        }
        return 0;
      };
      const copy = [...src];
      copy.sort((a, b) => {
        const an = toNum(a.monthlyRent);
        const bn = toNum(b.monthlyRent);
        return sortBy === "price-low" ? an - bn : bn - an;
      });
      return copy;
    }
    // "latest" or others: preserve arrival order
    return src;
  }, [properties, sortBy]);

  const PropertySkeleton = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
      <Skeleton className="w-full h-48" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex space-x-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex justify-between items-center pt-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      className="min-h-screen bg-[#FFF5FF]/50 dark:bg-[#1a0f2e]"
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
    >
      {/* Fixed compact filters */}
      <motion.div className="bg-[#FFF5FF]/50 dark:bg-[#1a0f2e]/50" variants={pageVariants}>
        <SearchFilters onSearch={handleSearch} variant="compact" />
      </motion.div>

      {/* Main Content */}
      <motion.section className="py-8" variants={pageVariants}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            {/* Header with sorting */}
            <motion.div 
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3"
              variants={pageVariants}
            >
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Properties</h1>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Button asChild className="bg-gradient-primary hover:opacity-90 transition-opacity text-white" data-testid="button-list-property">
                  <Link href="/list-property">
                    <Plus className="mr-2 h-4 w-4" />
                    List Your Property
                  </Link>
                </Button>
                <div className="hidden md:flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <Button variant={viewMode === 'list' ? 'default' : 'ghost'} onClick={() => handleViewModeChange('list')} className={`h-9 rounded-none ${viewMode === 'list' ? '' : 'bg-transparent'}`}>
                    <LayoutGrid className="h-4 w-4 mr-2" /> List
                  </Button>
                  <Button variant={viewMode === 'map' ? 'default' : 'ghost'} onClick={() => handleViewModeChange('map')} className={`h-9 rounded-none ${viewMode === 'map' ? '' : 'bg-transparent'}`}>
                    <MapIcon className="h-4 w-4 mr-2" /> Map
                  </Button>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-48" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latest">Latest</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Error State */}
            {error && (
              <motion.div variants={pageVariants}>
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load properties. Please try again later.
                </AlertDescription>
              </Alert>
              </motion.div>
            )}

            {/* Properties Grid / Map */}
            {isLoading ? (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={listVariants}
              >
                {Array.from({ length: 9 }, (_, i) => (
                  <motion.div key={i} variants={itemVariants}>
                    <PropertySkeleton />
                  </motion.div>
                ))}
              </motion.div>
            ) : properties.length === 0 ? (
              <motion.div className="text-center py-16" variants={pageVariants}>
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No properties found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Try adjusting your search filters to find more properties.
                </p>
                <Button
                  variant="outline"
                  onClick={() => handleSearch({
                    city: "",
                    propertyType: "",
                    minRent: "",
                    maxRent: "",
                    bedrooms: "",
                    aiSuggestions: false,
                  })}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </motion.div>
            ) : viewMode === 'map' ? (
              <MapView
                properties={((mapLimited.length > 0 ? mapLimited : DEMO_PROPERTIES) as any[]).map((p) => ({
                  id: p.id,
                  title: p.title,
                  area: p.area,
                  city: p.city,
                  monthlyRent: p.monthlyRent,
                  coordinates: (p as any).coordinates || null,
                  latitude: (p as any).latitude ?? (p as any).lat ?? null,
                  longitude: (p as any).longitude ?? (p as any).lng ?? (p as any).long ?? null,
                }))}
                height={560}
                highlightedProperty={highlightedProperty}
              />
            ) : (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={listVariants}
                initial="hidden"
                animate="visible"
              >
                {sortedList.map((property: any) => (
                  <motion.div key={property.id} variants={itemVariants}>
                    <PropertyCard property={{
                      ...property,
                      landlord: property.agent ? undefined : {
                        fullName: "Property Owner",
                        rating: 4.5,
                        reviewCount: 12,
                        verificationStatus: "verified"
                      }
                    }} />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Pagination */}
            {properties.length > 0 && (
              <motion.div className="flex justify-center items-center space-x-4 mt-10" variants={pageVariants}>
                <Button
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {currentPage + 1}
                </span>
                <Button
                  variant="outline"
                  disabled={properties.length < pageSize}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
