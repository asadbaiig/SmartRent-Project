import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchFilters } from "@/components/search-filters";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Plus } from "lucide-react";

export default function Properties() {
  const [filters, setFilters] = useState({
    city: "",
    propertyType: "",
    minRent: "",
    maxRent: "",
    bedrooms: "",
    aiSuggestions: false,
  });
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 12;

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

  const handleSearch = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setCurrentPage(0); // Reset to first page
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    // In a real implementation, you'd sort the results here
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Search Filters */}
      <SearchFilters onSearch={handleSearch} />

      {/* Main Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with sorting */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Properties</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isLoading ? 'Loading...' : `${properties.length} properties found`}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-48" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="ai-recommended">AI Recommended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Failed to load properties. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          {/* Properties Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }, (_, i) => (
                <PropertySkeleton key={i} />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-16">
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
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((property: any) => (
                <PropertyCard key={property.id} property={{
                  ...property,
                  landlord: {
                    fullName: "Property Owner", // This would come from joined data
                    rating: 4.5,
                    reviewCount: 12,
                    verificationStatus: "verified"
                  }
                }} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {properties.length > 0 && (
            <div className="flex justify-center items-center space-x-4 mt-12">
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
            </div>
          )}

          {/* Load More Alternative */}
          {properties.length >= pageSize && (
            <div className="text-center mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => prev + 1)}
                data-testid="button-load-more"
              >
                <Plus className="mr-2 h-4 w-4" />
                Load More Properties
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
