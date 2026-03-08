import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Bed, Bath, Expand, Star, Share2 } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ShareDialog } from "@/components/share-dialog";
import { useAuth } from "@/hooks/use-auth";
import { Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";

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
    agent?: string;
    landlord?: {
      fullName: string;
      rating?: number;
      reviewCount?: number;
      verificationStatus: string;
    };
    aiSuggestedPrice?: string;
  };
  /** When true, skip entrance animation (e.g. when parent already animates) to avoid flicker */
  noEntranceAnimation?: boolean;
}

export function PropertyCard({ property, noEntranceAnimation }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  const propertyImage = useMemo(() => {
    if (!imageError && property.images?.length && currentImageIndex < property.images.length) {
      return property.images[currentImageIndex];
    }
    return DEFAULT_PROPERTY_IMAGE;
  }, [property.images, currentImageIndex, imageError]);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const handleImageError = () => {
    if (property.images && currentImageIndex < property.images.length - 1) {
      setCurrentImageIndex((i) => i + 1);
    } else {
      setImageError(true);
    }
  };

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete property");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Property deleted successfully" });
    },
    onError: (e: Error) => {
      toast({
        title: "Failed to delete property",
        description: e.message,
        variant: "destructive"
      });
    }
  });

  return (
    <>
      <Link
        href={`/properties/${property.id}`}
        className="block"
        onClick={() => {
          try {
            sessionStorage.setItem(`property:${property.id}`, JSON.stringify(property));
          } catch { }
        }}
        data-testid={`card-link-${property.id}`}
      >
        <motion.div
          className="h-full"
          initial={noEntranceAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={noEntranceAnimation ? undefined : { opacity: 1, y: 0 }}
          viewport={noEntranceAnimation ? undefined : { once: true, amount: 0.3 }}
          whileHover={{ y: -8 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700 group cursor-pointer">
            <div className="relative overflow-hidden rounded-t-xl">
              <img
                src={propertyImage}
                alt={property.title}
                onError={handleImageError}
                onLoad={() => setImageError(false)}
                className="w-full h-48 object-cover transform transition-transform duration-500 group-hover:scale-105 bg-gray-200 dark:bg-gray-700"
                loading="lazy"
              />

              {/* Overlay gradient for better text readability */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              {/* Price pill */}
              <div className="absolute bottom-3 left-3">
                <div className="px-3 py-1 rounded-full bg-white/90 backdrop-blur text-gray-900 text-sm font-semibold shadow">
                  ₨{Number(property.monthlyRent).toLocaleString()} <span className="text-xs font-normal text-gray-600">/month</span>
                </div>
              </div>

              {/* Status Badges */}
              <div className="absolute top-3 left-3 flex space-x-2">
                {property.landlord?.verificationStatus === 'verified' && (
                  <Badge className="bg-success-500 text-white text-[10px]">Verified</Badge>
                )}
                <Badge className="bg-primary-500 text-white text-[10px]">Smart Contract</Badge>
              </div>

              {/* AI Badge + Share - inset so badge isn't clipped by card */}
              <div className="absolute top-3 right-3 flex flex-col items-end gap-2 max-w-[calc(100%-0.75rem)]">
                {property.aiSuggestedPrice && (
                  <Badge className="bg-warning-500 text-white text-[10px] shrink-0">AI Recommended</Badge>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur shadow-md hover:shadow-lg transition-all duration-200 shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShareDialogOpen(true);
                  }}
                  title="Share property"
                >
                  <Share2 className="h-4 w-4 text-gray-700" />
                </Button>
                {user?.role === 'admin' && !property.id.startsWith('ds-') && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this property?")) {
                        deleteMutation.mutate();
                      }
                    }}
                    title="Delete property"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

            </div>

            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors line-clamp-1">
                  {property.title}
                </h3>
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

              {/* Landlord/Agent Info */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-600">
                      {property.agent
                        ? property.agent.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'PO'
                        : property.landlord?.fullName
                          ? property.landlord.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'PO'
                          : 'PO'}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {property.agent || property.landlord?.fullName || "Property Owner"}
                    </div>
                    {property.landlord?.rating ? (
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
                    ) : (
                      <div className="flex items-center space-x-1">
                        <div className="flex text-yellow-400 text-xs">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < 4 ? 'fill-current' : ''}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          (12 reviews)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge
                  variant="default"
                  className="text-xs bg-success-100 text-success-700"
                >
                  Verified
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </Link>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        propertyId={property.id}
        propertyTitle={property.title}
      />
    </>
  );
}
