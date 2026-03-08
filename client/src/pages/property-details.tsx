import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link, useParams } from "wouter";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatDialog } from "@/components/chat-dialog";
import { useState, useEffect } from "react";
import { 
  MapPin, 
  Bed, 
  Bath, 
  Expand, 
  Star, 
  Heart, 
  Share2,
  Phone,
  Mail,
  Shield,
  Bot,
  FileText,
  ArrowLeft,
  CheckCircle,
  Map
} from "lucide-react";

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
  const [mainImageError, setMainImageError] = useState(false);

  useEffect(() => {
    setMainImageError(false);
  }, [id]);

  // Fetch property details; use session cache as initial data to avoid loading flicker when navigating from list
  const { data: property, isLoading } = useQuery({
    queryKey: ['/api/properties', id],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/properties/${id}`);
        if (response.ok) {
          return response.json();
        }
      } catch {}
      try {
        const cached = sessionStorage.getItem(`property:${id}`);
        if (cached) return JSON.parse(cached);
      } catch {}
      throw new Error('Property not found');
    },
    enabled: !!id,
    initialData: () => {
      if (!id) return undefined;
      try {
        const cached = sessionStorage.getItem(`property:${id}`);
        return cached ? JSON.parse(cached) : undefined;
      } catch {
        return undefined;
      }
    },
  });

  const handleContactLandlord = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to contact the landlord",
        variant: "destructive",
      });
      return;
    }

    setIsContactDialogOpen(true);
  };

  const handleCallNow = () => {
    const phoneNumber = "+92 3365447781";
    window.location.href = `tel:${phoneNumber.replace(/\s/g, "")}`;
  };

  const handleFavorite = () => {
    if (!user) {
      toast({
        title: "Login Required", 
        description: "Please login to save properties",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Added to Favorites",
      description: "Property saved to your favorites list",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Property Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The property you're looking for doesn't exist.</p>
          <Button asChild data-testid="button-back-to-properties">
            <Link href="/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const defaultImages = [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800",
    "https://images.unsplash.com/photo-1502005229762-cf1b2da2db52?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=800"
  ];

  const propertyImages = property.images?.length ? property.images : defaultImages;
  const mainImageSrc = mainImageError ? defaultImages[0] : propertyImages[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="ghost" asChild data-testid="button-back">
            <Link href="/properties">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Properties
            </Link>
          </Button>
        </div>

        {/* Property Images aligned with layout (2/3 left, 1/3 reserved on right) */}
        <div className="mb-8">
          <div
            className="relative mx-auto max-w-5xl rounded-2xl overflow-hidden shadow-lg"
            style={{ aspectRatio: "16 / 9" }}
          >
            <img
              src={mainImageSrc}
              alt={property.title}
              onError={() => setMainImageError(true)}
              className="w-full h-full object-cover bg-gray-200 dark:bg-gray-700"
              loading="lazy"
              style={{ imageRendering: "auto" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {property.title}
                  </h1>
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                    <MapPin className="mr-1 h-4 w-4" />
                    <span>{property.area}, {property.city}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary-600 mb-1">
                    ₨{Number(property.monthlyRent).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">/month</div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className="bg-success-100 text-success-700">Verified Property</Badge>
                <Badge className="bg-primary-100 text-primary-700">Smart Contract</Badge>
                {property.aiSuggestedPrice && (
                  <Badge className="bg-warning-100 text-warning-700">AI Recommended</Badge>
                )}
              </div>

              {/* Property Details */}
              <div className="flex items-center space-x-6 text-gray-600 dark:text-gray-400">
                {property.bedrooms && (
                  <span className="flex items-center">
                    <Bed className="mr-1 h-4 w-4" />
                    {property.bedrooms} Bedrooms
                  </span>
                )}
                {property.bathrooms && (
                  <span className="flex items-center">
                    <Bath className="mr-1 h-4 w-4" />
                    {property.bathrooms} Bathrooms
                  </span>
                )}
                {property.sqft && (
                  <span className="flex items-center">
                    <Expand className="mr-1 h-4 w-4" />
                    {property.sqft.toLocaleString()} sq ft
                  </span>
                )}
                <Badge variant="secondary">{property.propertyType}</Badge>
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Description</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {property.description || "This is a beautiful property located in a prime location. It offers modern amenities and excellent connectivity to major areas of the city. Perfect for families and professionals looking for a comfortable living space."}
              </p>
            </div>

            <Separator />

            {/* Amenities */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Amenities</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  "Parking", "Security", "Elevator", "Generator", "Water Tank", "Garden",
                  "Gym", "Swimming Pool", "Community Hall", "Playground", "Mosque", "Shopping Center"
                ].map((amenity) => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-success-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Security Features */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Security & Trust</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="text-center p-4">
                  <Shield className="h-8 w-8 text-primary-500 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Blockchain Secured</h3>
                  <p className="text-xs text-gray-500">Contract stored on blockchain</p>
                </Card>
                <Card className="text-center p-4">
                  <Bot className="h-8 w-8 text-warning-500 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">AI Verified</h3>
                  <p className="text-xs text-gray-500">Price verified by AI</p>
                </Card>
                <Card className="text-center p-4">
                  <FileText className="h-8 w-8 text-success-500 mx-auto mb-2" />
                  <h3 className="font-semibold mb-1">Legal Compliance</h3>
                  <p className="text-xs text-gray-500">Follows local rental laws</p>
                </Card>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Property Owner</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <span className="text-xl font-semibold text-gray-600">
                      {property?.agent 
                        ? property.agent.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'PO'
                        : 'PO'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {property?.agent || "Property Owner"}
                  </h3>
                  <div className="flex items-center justify-center space-x-1 mt-1">
                    <div className="flex text-yellow-400 text-sm">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < 4 ? 'fill-current' : ''}`} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">(12 reviews)</span>
                  </div>
                  <Badge className="mt-2 bg-success-100 text-success-700">Verified</Badge>
                </div>

                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={handleContactLandlord}
                    data-testid="button-contact-landlord"
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    Contact Now
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    data-testid="button-send-message"
                    onClick={() => {
                      if (!user) {
                        toast({
                          title: "Login Required",
                          description: "Please login to send a message",
                          variant: "destructive",
                        });
                        return;
                      }
                      setIsChatDialogOpen(true);
                    }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* AI Pricing Info */}
            {property.aiSuggestedPrice && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bot className="h-5 w-5 text-warning-500" />
                    <span>AI Price Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Current Rent:</span>
                      <span className="font-semibold">₨{Number(property.monthlyRent).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">AI Suggested:</span>
                      <span className="font-semibold text-warning-600">₨{Number(property.aiSuggestedPrice).toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Based on location, amenities, and market trends
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Property Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Property Type:</span>
                  <span className="font-semibold capitalize">{property.propertyType}</span>
                </div>
                {property.securityDeposit && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Security Deposit:</span>
                    <span className="font-semibold">₨{Number(property.securityDeposit).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Availability:</span>
                  <Badge variant={property.isAvailable ? "default" : "secondary"}>
                    {property.isAvailable ? "Available" : "Not Available"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* View on Map */}
            {(property.latitude && property.longitude) || property.coordinates ? (
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    View this property on the map
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    asChild
                    data-testid="button-view-on-map"
                  >
                    <Link 
                      href={`/properties?view=map&propertyId=${property.id}${property.latitude && property.longitude ? `&lat=${property.latitude}&lng=${property.longitude}` : property.coordinates ? `&lat=${property.coordinates.lat}&lng=${property.coordinates.lng}` : ''}`}
                    >
                      <Map className="mr-2 h-4 w-4" />
                      View on Map
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Property Owner</DialogTitle>
            <DialogDescription>
              Get in touch with the property owner
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-xl font-semibold text-gray-600">
                  {property?.agent 
                    ? property.agent.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'PO'
                    : 'PO'}
                </span>
              </div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {property?.agent || "Property Owner"}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Phone: <span className="font-mono">+92 3365447781</span>
              </p>
            </div>
            <div className="flex flex-col space-y-2">
              <Button 
                className="w-full" 
                onClick={handleCallNow}
                data-testid="button-call-now"
              >
                <Phone className="mr-2 h-4 w-4" />
                Call Now
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsContactDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Dialog */}
      {property && (
        <ChatDialog
          open={isChatDialogOpen}
          onOpenChange={setIsChatDialogOpen}
          propertyId={property.id}
          propertyTitle={property.title}
          landlordName={property?.agent || "Property Owner"}
          landlordId={property.landlordId}
        />
      )}
    </div>
  );
}
