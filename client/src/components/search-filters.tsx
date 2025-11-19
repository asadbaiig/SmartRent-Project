import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin } from "lucide-react";

interface SearchFiltersProps {
  onSearch: (filters: {
    city: string;
    propertyType: string;
    minRent: string;
    maxRent: string;
    bedrooms: string;
    aiSuggestions: boolean;
  }) => void;
  variant?: 'default' | 'compact';
}

export function SearchFilters({ onSearch, variant = 'default' }: SearchFiltersProps) {
  const [filters, setFilters] = useState({
    city: "",
    propertyType: "",
    minRent: "",
    maxRent: "",
    bedrooms: "",
    aiSuggestions: false,
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  const updateFilter = (key: string, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <section className={`${variant === 'compact' ? 'bg-transparent border-none shadow-none' : 'bg-white dark:bg-gray-800 shadow-sm border-b border-[#A187B0]/20 dark:border-gray-700 -mt-8 relative z-10'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`${variant === 'compact' ? 'rounded-lg border border-[#A187B0]/30 dark:border-gray-700 p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm' : 'bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-[#A187B0]/20 dark:border-gray-700 p-6'}`}>
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
              <Select value={filters.propertyType} onValueChange={(value) => updateFilter('propertyType', value)}>
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
              <Select value={`${filters.minRent}-${filters.maxRent}`} onValueChange={(value) => {
                const [min, max] = value.split('-');
                updateFilter('minRent', min);
                updateFilter('maxRent', max);
              }}>
                <SelectTrigger data-testid="select-budget">
                  <SelectValue placeholder="Any Budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any-any">Any Budget</SelectItem>
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
              <Select value={filters.bedrooms} onValueChange={(value) => updateFilter('bedrooms', value)}>
                <SelectTrigger data-testid="select-bedrooms">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3+</SelectItem>
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

          {/* AI Suggestions Toggle */}
          <div className={`${variant === 'compact' ? 'mt-3' : 'mt-4'} flex items-center justify-between`}>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="ai-suggestions" 
                checked={filters.aiSuggestions}
                onCheckedChange={(checked) => updateFilter('aiSuggestions', checked as boolean)}
                data-testid="checkbox-ai-suggestions"
              />
              <Label htmlFor="ai-suggestions" className="text-sm text-gray-700 dark:text-gray-300">
                Enable AI-powered location suggestions
              </Label>
              <Badge variant="secondary" className="text-xs bg-warning-100 text-warning-700">
                BETA
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
