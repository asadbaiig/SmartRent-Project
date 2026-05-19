import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type SearchFiltersState = {
  city: string;
  propertyType: string;
  minRent: string;
  maxRent: string;
  bedrooms: string;
  aiSuggestions: boolean;
};

interface SearchFiltersProps {
  onSearch: (filters: SearchFiltersState) => void;
  variant?: 'default' | 'compact';
  /** When provided, the filter form is controlled by parent (e.g. after AI applies filters) */
  value?: Partial<SearchFiltersState>;
}

const defaultFilters: SearchFiltersState = {
  city: "",
  propertyType: "",
  minRent: "",
  maxRent: "",
  bedrooms: "",
  aiSuggestions: false,
};

export function SearchFilters({ onSearch, variant = 'default', value }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchFiltersState>(value ? { ...defaultFilters, ...value } : defaultFilters);

  // Sync with parent when value changes (e.g. after AI applies filters)
  useEffect(() => {
    if (value != null && typeof value === 'object') {
      setFilters((prev) => ({ ...prev, ...value }));
    }
  }, [value?.city, value?.propertyType, value?.minRent, value?.maxRent, value?.bedrooms]);

  const handleSearch = () => {
    onSearch(filters);
  };

  const updateFilter = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <section className={`${variant === 'compact' ? 'bg-transparent border-none shadow-none' : 'bg-white dark:bg-gray-800 shadow-sm border-b border-[#A187B0]/20 dark:border-gray-700 -mt-8 relative z-10'}`}>
      <div className={`${variant === 'compact' ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}`}>
        <div className={`${variant === 'compact' ? 'rounded-lg border border-[#A187B0]/30 dark:border-gray-700 p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm' : 'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-[#A187B0]/20 dark:border-gray-700 p-6'}`}>
          <div className={`${variant === 'compact' ? 'grid grid-cols-2 lg:grid-cols-6 gap-3' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4'}`}>
            {/* Location */}
            <div className={`${variant === 'compact' ? 'col-span-2 lg:col-span-2' : 'lg:col-span-2'}`}>
              <Label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="location"
                  type="text"
                  placeholder="Lahore, Karachi, Islamabad..."
                  className="pl-10"
                  value={filters.city}
                  onChange={(e) => updateFilter('city', e.target.value)}
                  data-testid="input-location"
                />
              </div>
            </div>

            {/* Property Type */}
            <div>
              <Label htmlFor="property-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </Label>
              <Select value={filters.propertyType || 'all'} onValueChange={(value) => updateFilter('propertyType', value === 'all' ? '' : value)}>
                <SelectTrigger data-testid="select-property-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Budget Range */}
            <div>
              <Label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Budget (PKR)
              </Label>
              <Select
                value={(() => {
                  const combo = filters.minRent && filters.maxRent ? `${filters.minRent}-${filters.maxRent}` : '';
                  const presets = ['10000-25000', '25000-50000', '50000-100000', '100000-999999'];
                  if (!combo) return 'any-any';
                  return presets.includes(combo) ? combo : combo; // custom range stays as combo so Select shows it
                })()}
                onValueChange={(value) => {
                  if (value === 'any-any') {
                    updateFilter('minRent', '');
                    updateFilter('maxRent', '');
                  } else {
                    const [min, max] = value.split('-');
                    updateFilter('minRent', min);
                    updateFilter('maxRent', max);
                  }
                }}
              >
                <SelectTrigger data-testid="select-budget">
                  <SelectValue placeholder="Any Budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any-any">Any Budget</SelectItem>
                  {filters.minRent && filters.maxRent && !['10000-25000', '25000-50000', '50000-100000', '100000-999999'].includes(`${filters.minRent}-${filters.maxRent}`) && (
                    <SelectItem value={`${filters.minRent}-${filters.maxRent}`}>
                      {formatCurrency(filters.minRent)} - {formatCurrency(filters.maxRent)}
                    </SelectItem>
                  )}
                  <SelectItem value="10000-25000">10k - 25k</SelectItem>
                  <SelectItem value="25000-50000">25k - 50k</SelectItem>
                  <SelectItem value="50000-100000">50k - 100k</SelectItem>
                  <SelectItem value="100000-999999">100k+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bedrooms */}
            <div>
              <Label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bedrooms
              </Label>
              <Select value={filters.bedrooms || 'any'} onValueChange={(value) => updateFilter('bedrooms', value === 'any' ? '' : value)}>
                <SelectTrigger data-testid="select-bedrooms">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3+">3+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button 
                onClick={handleSearch} 
                className={`w-full bg-gradient-primary hover:opacity-90 text-white ${variant === 'compact' ? 'h-10' : ''}`}
                data-testid="button-search"
              >
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
