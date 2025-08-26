import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Bed, Bath, Expand, Star, Heart, User } from "lucide-react";
import { Link } from "wouter";

interface PropertyCardProps {
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    area: string;
    monthlyRent: string;
    propertyType: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    images?: string[];
    isAvailable: boolean;
    landlord?: {
      fullName: string;
      rating?: number;
      reviewCount?: number;
      verificationStatus: string;
    };
    aiSuggestedPrice?: string;
  };
}

export function PropertyCard({ property }: PropertyCardProps) {
  const defaultImage = "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
  const propertyImage = property.images && property.images.length > 0 ? property.images[0] : defaultImage;

  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="relative">
        <img 
          src={propertyImage} 
          alt={property.title}
          className="w-full h-48 object-cover"
        />
        
        {/* Status Badges */}
        <div className="absolute top-3 left-3 flex space-x-2">
          {property.landlord?.verificationStatus === 'verified' && (
            <Badge className="bg-success-500 text-white text-xs">Verified</Badge>
          )}
          <Badge className="bg-primary-500 text-white text-xs">Smart Contract</Badge>
        </div>
        
        {/* AI Badge */}
        {property.aiSuggestedPrice && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-warning-500 text-white text-xs">AI Recommended</Badge>
          </div>
        )}

        {/* Favorite Button */}
        <Button 
          variant="secondary" 
          size="sm"
          className="absolute bottom-3 right-3 w-8 h-8 p-0 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-50 transition-colors"
          data-testid={`button-favorite-${property.id}`}
        >
          <Heart className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </Button>
      </div>

      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <Link href={`/properties/${property.id}`} className="flex-1" data-testid={`link-property-${property.id}`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 transition-colors">
              {property.title}
            </h3>
          </Link>
          <div className="text-right ml-4">
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              ₨{Number(property.monthlyRent).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">/month</div>
          </div>
        </div>

        <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm mb-3">
          <MapPin className="mr-1 h-4 w-4" />
          <span>{property.area}, {property.city}</span>
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          {property.bedrooms && (
            <span className="flex items-center">
              <Bed className="mr-1 h-4 w-4" />
              {property.bedrooms} Bed
            </span>
          )}
          {property.bathrooms && (
            <span className="flex items-center">
              <Bath className="mr-1 h-4 w-4" />
              {property.bathrooms} Bath
            </span>
          )}
          {property.sqft && (
            <span className="flex items-center">
              <Expand className="mr-1 h-4 w-4" />
              {property.sqft.toLocaleString()} sq ft
            </span>
          )}
        </div>

        {/* Landlord Info */}
        {property.landlord && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {property.landlord.fullName}
                </div>
                {property.landlord.rating && (
                  <div className="flex items-center space-x-1">
                    <div className="flex text-yellow-400 text-xs">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < Math.floor(property.landlord?.rating || 0) ? 'fill-current' : ''}`} 
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({property.landlord.reviewCount || 0} reviews)
                    </span>
                  </div>
                )}
              </div>
            </div>
            <Badge 
              variant={property.landlord.verificationStatus === 'verified' ? 'default' : 'secondary'}
              className={`text-xs ${
                property.landlord.verificationStatus === 'verified' 
                  ? 'bg-success-100 text-success-700' 
                  : 'bg-warning-100 text-warning-700'
              }`}
            >
              {property.landlord.verificationStatus === 'verified' ? 'Verified' : 'Pending'}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
